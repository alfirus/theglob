<script lang="ts">
  import { onMount } from 'svelte';

  let stats = $state({
    cpu: 0,
    ram: { percent: 0, used: '0', total: '0' },
    gpu: { percent: 0, mem: '0', total: '0' },
    uptime: ''
  });

  onMount(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) stats = await res.json();
      } catch { /* ignore */ }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  });
</script>

<div class="stats-panel">
  <div class="stat">
    <span class="label">CPU</span>
    <div class="bar">
      <div class="fill cpu" style="width: {stats.cpu}%"></div>
    </div>
    <span class="value">{stats.cpu}%</span>
  </div>

  <div class="stat">
    <span class="label">RAM</span>
    <div class="bar">
      <div class="fill ram" style="width: {stats.ram.percent}%"></div>
    </div>
    <span class="value">{stats.ram.used}/{stats.ram.total} GB</span>
  </div>

  <div class="stat">
    <span class="label">GPU</span>
    <div class="bar">
      <div class="fill gpu" style="width: {stats.gpu.percent}%"></div>
    </div>
    <span class="value">{stats.gpu.percent}% · {stats.gpu.mem}MB</span>
  </div>

  <div class="uptime">up {stats.uptime}</div>
</div>

<style>
  .stats-panel {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 50;
    width: 200px;
    background: rgba(10, 15, 30, 0.7);
    border: 1px solid rgba(68, 136, 255, 0.12);
    border-radius: 12px;
    padding: 14px;
    backdrop-filter: blur(10px);
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    color: rgba(136, 170, 255, 0.5);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .bar {
    height: 3px;
    background: rgba(68, 136, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .fill.cpu {
    background: linear-gradient(90deg, #4488ff, #66aaff);
  }

  .fill.ram {
    background: linear-gradient(90deg, #44cc88, #66eebb);
  }

  .fill.gpu {
    background: linear-gradient(90deg, #cc8844, #eeaa66);
  }

  .value {
    color: rgba(200, 220, 255, 0.6);
    font-size: 10px;
  }

  .uptime {
    color: rgba(136, 170, 255, 0.3);
    font-size: 9px;
    text-align: right;
    border-top: 1px solid rgba(68, 136, 255, 0.08);
    padding-top: 6px;
  }
</style>
