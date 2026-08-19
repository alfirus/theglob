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
    // Fallback: try without trailing dot on idle
    const altMatch = raw.match(/([\d.]+)%\s*idle/);
    if (altMatch) return Math.round(100 - parseFloat(altMatch[1]));
    return 0;
  }
  // Linux — multiple top output formats across distros
  const raw = sh("top -bn2 -d 0.5 | grep '%Cpu' | tail -1") || sh("top -bn1 | head -30 | grep '[Cc]pu'");
  // e.g. "%Cpu(s):  5.3 us,  2.1 sy, ... 91.8 id" or "%Cpu0:  6.2 us, ...
  const match = raw.match(/([\d.]+)\s+id/);
  if (match) return Math.round(100 - parseFloat(match[1]));
  // Fallback for modern procps-ng format: "Cpu(s), 1.3 us, 2.4 sy, 96.3 id"
  const altMatch = raw.match(/[,\s]([\d.]+)\s+id/);
  if (altMatch) return Math.round(100 - parseFloat(altMatch[1]));
  // Last resort: use Node's os.loadavg() as approximation
  const load = require('os').loadavg();
  const cores = require('os').cpus().length || 1;
  return Math.min(Math.round((load[0] / cores) * 100), 100);
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
    // hw.memsize is bytes, vm_stat gives page-level breakdown
    const rawTotal = sh('sysctl -n hw.memsize');
    const totalBytes = parseInt(rawTotal) || 0;
    if (totalBytes <= 0) return zero;

    // Fallback to Node's os.totalmem() which is always reliable
    const fallbackTotal = require('os').totalmem();
    const pageSize = parseInt(sh('sysctl -n hw.pagesize')) || 16384;
    const vmRaw = sh('vm_stat');

    let availableBytes: number;
    if (vmRaw && vmRaw.includes('Pages free')) {
      // Parse free + inactive + speculative as "available-ish"
      const freePages = parseInt(vmRaw.match(/Pages free\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
      const inactivePages = parseInt(vmRaw.match(/Pages inactive\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
      const speculativePages = parseInt(vmRaw.match(/Pages speculative\s*:\s*(\d+)/)?.[1] ?? '0') || 0;
      availableBytes = (freePages + inactivePages + speculativePages) * pageSize;
    } else {
      // vm_stat unavailable — use Node os.freemem() directly
      availableBytes = require('os').freemem();
    }

    const usedBytes = Math.max(0, totalBytes - availableBytes);
    return {
      percent: Math.min(Math.round((usedBytes / totalBytes) * 100), 100),
      used: (usedBytes / (1024 ** 3)).toFixed(1),
      total: (totalBytes / (1024 ** 3)).toFixed(1)
    };
  }

  // Linux — read /proc/meminfo, with fallback to Node os() functions
  const meminfo = sh('cat /proc/meminfo');
  if (meminfo) {
    const totalKB = parseInt(meminfo.match(/^MemTotal:\s+(\d+)/m)?.[1] ?? '0') || 0;
    // MemAvailable added in kernel 3.14; fall back to MemFree + Buffers + Cached
    let availableKB = parseInt(meminfo.match(/^MemAvailable:\s+(\d+)/m)?.[1]);
    if (isNaN(availableKB)) {
      const free = parseInt(meminfo.match(/^MemFree:\s+(\d+)/m)?.[1] ?? '0') || 0;
      const buffers = parseInt(meminfo.match(/^Buffers:\s+(\d+)/m)?.[1] ?? '0') || 0;
      const cached = parseInt(meminfo.match(/^Cached:\s+(\d+)/m)?.[1] ?? '0') || 0;
      availableKB = free + buffers + cached;
    }
    if (totalKB > 0) {
      const usedKB = Math.max(0, totalKB - availableKB);
      return {
        percent: Math.min(Math.round((usedKB / totalKB) * 100), 100),
        used: (usedKB / 1048576).toFixed(1),
        total: (totalKB / 1048576).toFixed(1)
      };
    }
  }

  // Linux fallback — use Node os() functions directly
  const nTotal = require('os').totalmem();
  const nFree = require('os').freemem();
  const used = Math.max(0, nTotal - nFree);
  return {
    percent: Math.min(Math.round((used / (nTotal || 1)) * 100), 100),
    used: (used / (1024 ** 3)).toFixed(1),
    total: ((nTotal || 0) / (1024 ** 3)).toFixed(1)
  };
}

function getGPU(): { percent: number; mem: string; total: string } {
  const zero = { percent: 0, mem: '0', total: '0' };

  // ── NVIDIA (all platforms) ───────────────────────────────────────
  try {
    const nvidiaRaw = sh('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits');
    if (nvidiaRaw && nvidiaRaw.trim().length > 0) {
      const parts = nvidiaRaw.split(',').map(s => s.trim());
      if (parts.length === 3 && !isNaN(parseInt(parts[0]))) {
        return {
          percent: parseInt(parts[0]) || 0,
          mem: parts[1] || '0',
          total: parts[2] || '0'
        };
      }
    }
  } catch { /* nvidia-smi not available */ }

  // ── macOS — GPU via system_profiler (Apple Silicon + Intel) ───────
  if (os === 'darwin') {
    const spRaw = sh('system_profiler SPDisplaysDataType');
    if (spRaw) {
      // Extract VRAM info from output
      const vramMatch = spRaw.match(/Chipset Model:\s*(.+)/);
      return {
        percent: 0, // Apple Silicon doesn't expose GPU util via user-space
        mem: vramMatch ? vramMatch[1].trim() : '0',
        total: vramMatch ? vramMatch[1].trim() : '0'
      };
    }
    return zero;
  }

  // ── Linux — AMD via rocm-smi, Intel iGPU fallback ────────────────
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

  // Linux Intel iGPU fallback — try intel_gpu_top or /sys/class/drm/card0/gt_total_freq/MHz
  const intelTotal = sh('cat /sys/class/drm/card0/gt_total_freq/MHz 2>/dev/null');
  if (intelTotal && parseInt(intelTotal) > 0) {
    return { percent: 0, mem: '0', total: '0' };
  }

  // Linux — try glxinfo for Intel iGPU info as last resort
  const glxRaw = sh('glxinfo 2>/dev/null | grep -i "opengl renderer"');
  if (glxRaw) {
    return { percent: 0, mem: '0', total: glxRaw.trim() };
  }

  return zero;
}

/** Format ms into human-readable uptime string. */
function formatUptime(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0 || days === 0 && hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getUptime(): string {
  // ── Windows: LastBootUpTime from CIM ─────────────────────────────
  if (os === 'win32') {
    try {
      const raw = ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime');
      if (!raw) return '?';
      const bootTime = new Date(raw);
      if (isNaN(bootTime.getTime())) return '?';
      return formatUptime(Date.now() - bootTime.getTime());
    } catch {
      // Fallback: parse system up time from WMIC
      try {
        const wmicRaw = sh('wmic os get LastBootUpTime 2>nul');
        const dateStr = wmicRaw.split('\n').filter(l => l.match(/^\d{8}/))?.[0]?.trim();
        if (dateStr) return formatUptime(Date.now() - new Date(dateStr).getTime());
      } catch { /* ignore */ }
    }
  }

  // ── macOS: sysctl kern.boottime with vm_stat fallback ────────────
  if (os === 'darwin') {
    try {
      const raw = sh('sysctl kern.boottime');
      const secMatch = raw.match(/sec\s*=\s*(\d+)/);
      if (secMatch) {
        return formatUptime(Date.now() - parseInt(secMatch[1]) * 1000);
      }
    } catch { /* ignore */ }

    // Fallback: Node's os.uptime()
    const nodeUp = require('os').uptime();
    if (nodeUp > 0) return formatUptime(nodeUp * 1000);
  }

  // ── Linux: uptime -s → boot time, then raw uptime as fallback ───
  try {
    const bootStr = sh('uptime -s');
    if (bootStr) {
      const diff = Date.now() - new Date(bootStr).getTime();
      if (diff > 0 && !isNaN(diff)) return formatUptime(diff);
    }
  } catch { /* ignore */ }

  // Fallback: parse raw "uptime" output for various formats
  const raw = sh('uptime');
  // Format A: "up 3 days, 2:15, ..."
  let match = raw.match(/up\s+(\d+)\s+day/i);
  if (match) {
    const rest = raw.split(match[0])[1] || '';
    const timeMatch = rest.match(/(\d+):(\d+)/);
    if (timeMatch) return `${match[1]}d ${timeMatch[1]}h ${timeMatch[2]}m`;
  }
  // Format B: "up 2:15, ..." (no days)
  match = raw.match(/up\s+(\d+):(\d+)/);
  if (match) return `${parseInt(match[1])}h ${match[2]}m`;
  // Format C: "up X min" or "up just now"
  match = raw.match(/up\s+([\d]+)\s+min/);
  if (match) return `${match[1]}m`;

  // Final fallback: Node's os.uptime()
  const nodeUp = require('os').uptime();
  if (nodeUp > 0) return formatUptime(nodeUp * 1000);

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
