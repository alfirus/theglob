import { json } from '@sveltejs/kit';
import { execSync } from 'child_process';
import type { RequestHandler } from './$types';

function ps(cmd: string): string {
  return execSync(`powershell -NoProfile -Command "${cmd}"`, {
    timeout: 5000,
    encoding: 'utf-8',
    windowsHide: true
  }).trim();
}

export const GET: RequestHandler = async () => {
  const fallback = { cpu: 0, ram: { percent: 0, used: '0', total: '0' }, gpu: { percent: 0, mem: '0', total: '0' }, uptime: '?' };

  try {
    const cpu = parseInt(ps('Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage')) || 0;
    const ramTotalKB = parseInt(ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty TotalVisibleMemorySize')) || 0;
    const ramFreeKB = parseInt(ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty FreePhysicalMemory')) || 0;
    const ramUsedKB = ramTotalKB - ramFreeKB;
    const ramPct = ramTotalKB > 0 ? Math.round((ramUsedKB / ramTotalKB) * 100) : 0;
    const ramUsedGB = (ramUsedKB / 1048576).toFixed(1);
    const ramTotalGB = (ramTotalKB / 1048576).toFixed(1);

    let gpuPct = 0, gpuMem = '0', gpuTotal = '0';
    try {
      const gpuRaw = ps('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits');
      const parts = gpuRaw.split(',').map(s => s.trim());
      gpuPct = parseInt(parts[0]) || 0;
      gpuMem = parts[1] || '0';
      gpuTotal = parts[2] || '0';
    } catch { /* nvidia-smi not available */ }

    let uptime = '?';
    try {
      const bootTime = ps('Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime');
      const boot = new Date(bootTime);
      const diff = Date.now() - boot.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      uptime = `${hours}h ${mins}m`;
    } catch { /* ignore */ }

    return json({ cpu, ram: { percent: ramPct, used: ramUsedGB, total: ramTotalGB }, gpu: { percent: gpuPct, mem: gpuMem, total: gpuTotal }, uptime });
  } catch (err) {
    console.error('Stats error:', err);
    return json(fallback);
  }
};
