// ─── Core (Neural Nucleus) Utilities ─────────────────────────────────────────
// The core is NOT a separate mesh — it's dense center nodes in the main node system.
// This module provides utility functions for core behavior.

// ─── Configuration ───────────────────────────────────────────────────────────
const HEARTBEAT_PERIOD = 1.6; // seconds per heartbeat cycle

// ─── Heartbeat pulse value (0-1) ────────────────────────────────────────────
export function getHeartbeat(time: number): number {
  const cycle = (time % HEARTBEAT_PERIOD) / HEARTBEAT_PERIOD;

  // Double-pulse heartbeat shape
  let pulse = 0;

  // First beat (fast rise, fast fall)
  if (cycle < 0.15) {
    pulse = Math.sin(cycle / 0.15 * Math.PI);
  }
  // Second beat (slightly delayed)
  else if (cycle >= 0.2 && cycle < 0.35) {
    pulse = Math.sin((cycle - 0.2) / 0.15 * Math.PI) * 0.7;
  }

  return pulse;
}

// ─── Type export (backward compatibility) ────────────────────────────────────
// CoreGlow is no longer a separate mesh — kept as empty type for imports
export type CoreGlow = Record<string, never>;
