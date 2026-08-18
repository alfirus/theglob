import { json } from '@sveltejs/kit';
import { execSync } from 'child_process';
import { platform } from 'os';
import type { RequestHandler } from './$types';

const os = platform();

/** Safe shell exec — returns trimmed stdout or empty string on failure. */
function sh(cmd: string, timeoutMs = 5000): string {
  try {
    return execSync(cmd, { timeout: timeoutMs, encoding: 'utf-8', windowsHide: true }).trim();
  } catch {
    return '';
  }
}

/** Windows-only PowerShell helper. */
function ps(cmd: string): string {
  return sh(`powershell -NoProfile -Command "${cmd}"`);
}

// ── Platform-specific gatherers ──────────────────────────────────────

function getCPU(): number {
  if (os === 'win32') {
    const raw = ps('Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage');
    return parseInt(raw) || 0;
  }
  if (os === 'darwin') {
    // Sample 1-second average from top
    const raw = sh("top -l 2 -n 0 | grep 'CPU usage' | tail -1");
    // e.g. "CPU usage: 12.34% user, 5.67% sys, 81.99% idle"
    const match = raw.match(/([\d.]+)%\s+idle/);
    if (match) return Math.round(100 - parseFloat(match[1]));
    return 0;
  }
  // Linux
  const raw = sh("top -bn1 | grep '^%Cpu' | head -1");
  // e.g. "%Cpu(s):  5.3 us,  2.1 sy,  0.0 ni, 91.8 id,  0.7 wa, ..."
  const match = raw.match(/([\d.]+)\s+id/);
  if (match) return Math.round(100 - parseFloat(match[1]));
  return 0;
}

function getRAM(): { percent: number; used: string; total: string } {
  const zero = { percent: 0, used: '0', total: '0' };

  if (os === 'win32') {
    const rawTotal = ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty TotalVisibleMemorySize');
    const rawFree = ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty FreePhysicalMemory');
    const totalKB = parseInt(rawTotal) || 0;
    const freeKB = parseInt(rawFree) || 0;
    if (totalKB === 0) return zero;
    const usedKB = totalKB - freeKB;
    return {
      percent: Math.round((usedKB / totalKB) * 100),
      used: (usedKB / 1048576).toFixed(1),
      total: (totalKB / 1048576).toFixed(1)
    };
  }

  if (os === 'darwin') {
    // hw.memsize is bytes, page size + vm_stat pages
    const rawTotal = sh('sysctl -n hw.memsize');
    const pageSize = parseInt(sh('sysctl -n hw.pagesize')) || 16384;
    const vmRaw = sh('vm_stat');
    // Parse free + speculative + inactive as "available-ish"
    const freePages = parseInt(vmRaw.match(/Pages free\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
    const inactivePages = parseInt(vmRaw.match(/Pages inactive\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
    const speculativePages = parseInt(vmRaw.match(/Pages speculative\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
    const totalBytes = parseInt(rawTotal) || 0;
    const freeBytes = (freePages + inactivePages + speculativePages) * pageSize;
    if (totalBytes === 0) return zero;
    const usedBytes = totalBytes - freeBytes;
    return {
      percent: Math.round((usedBytes / totalBytes) * 100),
      used: (usedBytes / (1024 ** 3)).toFixed(1),
      total: (totalBytes / (1024 ** 3)).toFixed(1)
    };
  }

  // Linux — read /proc/meminfo
  const meminfo = sh('cat /proc/meminfo');
  const totalKB = parseInt(meminfo.match(/^MemTotal:\s+(\d+)/m)?.[1] ?? '0') || 0;
  const availableKB = parseInt(meminfo.match(/^MemAvailable:\s+(\d+)/m)?.[1] ?? '0') || 0;
  if (totalKB === 0) return zero;
  const usedKB = totalKB - availableKB;
  return {
    percent: Math.round((usedKB / totalKB) * 100),
    used: (usedKB / 1048576).toFixed(1),
    total: (totalKB / 1048576).toFixed(1)
  };
}

function getGPU(): { percent: number; mem: string; total: string } {
  const zero = { percent: 0, mem: '0', total: '0' };

  // nvidia-smi works the same on all three platforms when an NVIDIA GPU is present
  const nvidiaRaw = sh('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits');
  if (nvidiaRaw) {
    const parts = nvidiaRaw.split(',').map(s => s.trim());
    return {
      percent: parseInt(parts[0]) || 0,
      mem: parts[1] || '0',
      total: parts[2] || '0'
    };
  }

  // macOS — try powermetrics (requires sudo, not reliable) or ioreg
  // For Apple Silicon there's no easy user-space GPU util; return memory-only fallback
  if (os === 'darwin') {
    // Try to get GPU model info via system_profiler (no live util %)
    // Just return zero util; Apple GPUs don't expose usage % easily
    return zero;
  }

  // Linux — try rocm-smi for AMD
  const rocmRaw = sh('rocm-smi --showuse --json 2>/dev/null');
  if (rocmRaw) {
    try {
      const parsed = JSON.parse(rocmRaw);
      const gpuKey = Object.keys(parsed).find(k => k.startsWith('card'));
      if (gpuKey) {
        return {
          percent: parseInt(parsed[gpuKey]['GPU use (%)'] ?? '0') || 0,
          mem: parsed[gpuKey]['GPU Memory Used (VRAM MB)'] ?? '0',
          total: parsed[gpuKey]['GPU Memory Total (VRAM MB)'] ?? '0'
        };
      }
    } catch { /* parse error */ }
  }

  return zero;
}

function getUptime(): string {
  if (os === 'win32') {
    const raw = ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime');
    if (!raw) return '?';
    const diff = Date.now() - new Date(raw).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
  }

  if (os === 'darwin') {
    // kern.boottime → "{ sec = 1787015878, usec = 350969 } ..."
    const raw = sh('sysctl kern.boottime');
    const secMatch = raw.match(/sec\s*=\s*(\d+)/);
    if (secMatch) {
      const diff = Date.now() - parseInt(secMatch[1]) * 1000;
      if (diff > 0) {
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
      }
    }
  }

  // Linux — uptime -s gives "2026-08-18 09:17:58"
  const bootStr = sh('uptime -s');
  if (bootStr) {
    const diff = Date.now() - new Date(bootStr).getTime();
    if (diff > 0) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
    }
  }

  // Fallback: parse uptime output directly
  const raw = sh('uptime');
  // e.g. "14:32  up 3 days,  2:15, ..."
  const match = raw.match(/up\s+(.+?),\s+\d+/);
  if (match) return match[1].trim();

  return '?';
}

// ── Handler ──────────────────────────────────────────────────────────

export const GET: RequestHandler = async () => {
  const fallback = {
    cpu: 0,
    ram: { percent: 0, used: '0', total: '0' },
    gpu: { percent: 0, mem: '0', total: '0' },
    uptime: '?'
  };

  try {
    const cpu = getCPU();
    const ram = getRAM();
    const gpu = getGPU();
    const uptime = getUptime();

    return json({ cpu, ram, gpu, uptime });
  } catch (err) {
    console.error('Stats error:', err);
    return json(fallback);
  }
};
