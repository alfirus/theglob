import type { NeuralNode } from './nodes';
import type { NeuralConnection, ConnectionSystem } from './connections';

// ─── Configuration ───────────────────────────────────────────────────────────
const MIN_PATH_HOPS = 4;
const MAX_PATH_HOPS = 8;
const MIN_EVENT_INTERVAL = 0.2;
const MAX_EVENT_INTERVAL = 0.8;
const NODE_ACTIVITY_DECAY = 0.95;
const MAX_SIMULTANEOUS_SIGNALS = 16;

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface NeuralSignal {
  path: NeuralConnection[];       // Array of connections forming the path
  connectionIndex: number;        // Current position in path
  progress: number;               // 0-1 progress along current connection
  speed: number;                  // How fast this signal moves
  active: boolean;                // Is this signal currently traveling?
}

export interface NeuralSimulation {
  signals: NeuralSignal[];
  eventTimer: number;             // Time until next event
  nextEventInterval: number;      // Variable interval
}

// ─── Find path through graph using BFS ──────────────────────────────────────
export function findNeuralPath(
  sourceId: number,
  targetId: number,
  maxHops: number,
  adjacency: Map<number, number[]>,
  connections: NeuralConnection[]
): NeuralConnection[] | null {
  const visited = new Set<number>();
  const queue: { nodeId: number; path: NeuralConnection[] }[] = [];

  // Start from source
  const sourceConns = adjacency.get(sourceId) || [];
  for (const connIdx of sourceConns) {
    const conn = connections[connIdx];
    const nextNode = conn.source === sourceId ? conn.target : conn.source;

    if (nextNode === targetId) {
      return [conn];
    }

    if (!visited.has(nextNode)) {
      visited.add(nextNode);
      queue.push({ nodeId: nextNode, path: [conn] });
    }
  }

  // BFS through the graph
  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.path.length >= maxHops) continue;

    const nodeConns = adjacency.get(current.nodeId) || [];
    for (const connIdx of nodeConns) {
      const conn = connections[connIdx];
      const nextNode = conn.source === current.nodeId ? conn.target : conn.source;

      if (nextNode === targetId) {
        return [...current.path, conn];
      }

      if (!visited.has(nextNode)) {
        visited.add(nextNode);
        queue.push({
          nodeId: nextNode,
          path: [...current.path, conn]
        });
      }
    }
  }

  return null;
}

// ─── Trigger a neural event ─────────────────────────────────────────────────
export function triggerNeuralEvent(
  nodes: NeuralNode[],
  connectionSystem: ConnectionSystem,
  simulation: NeuralSimulation
): void {
  // Find an active slot
  let slotIdx = -1;
  for (let i = 0; i < simulation.signals.length; i++) {
    if (!simulation.signals[i].active) {
      slotIdx = i;
      break;
    }
  }

  if (slotIdx === -1) return;

  // Pick a random source node (weighted toward active nodes)
  const activeNodes = nodes.filter(n => n.activity > 0.1);
  const sourceNode = activeNodes.length > 0
    ? activeNodes[Math.floor(Math.random() * activeNodes.length)]
    : nodes[Math.floor(Math.random() * nodes.length)];

  // Pick a random target (different from source)
  let targetNode: NeuralNode;
  do {
    targetNode = nodes[Math.floor(Math.random() * nodes.length)];
  } while (targetNode.id === sourceNode.id);

  // Find a path
  const pathLength = MIN_PATH_HOPS + Math.floor(Math.random() * (MAX_PATH_HOPS - MIN_PATH_HOPS + 1));
  const path = findNeuralPath(
    sourceNode.id,
    targetNode.id,
    pathLength,
    connectionSystem.adjacency,
    connectionSystem.connections
  );

  if (!path || path.length === 0) return;

  // Create signal
  simulation.signals[slotIdx] = {
    path,
    connectionIndex: 0,
    progress: 0,
    speed: 0.8 + Math.random() * 1.2,
    active: true
  };

  // Activate source node
  sourceNode.activity = 1.0;
}

// ─── Update all signals ─────────────────────────────────────────────────────
export function updateSignals(
  simulation: NeuralSimulation,
  nodes: NeuralNode[],
  _connectionSystem: ConnectionSystem,
  deltaTime: number
): void {
  for (let i = 0; i < simulation.signals.length; i++) {
    const signal = simulation.signals[i];
    if (!signal.active) continue;

    // Move along current connection
    signal.progress += deltaTime * signal.speed;

    // Activate the connection we're traveling on
    const currentConn = signal.path[signal.connectionIndex];
    if (currentConn) {
      currentConn.activity = 1.0;
    }

    if (signal.progress >= 1.0) {
      // Reached the end of this connection
      signal.connectionIndex++;
      signal.progress = 0;

      if (signal.connectionIndex >= signal.path.length) {
        // Signal completed its journey
        signal.active = false;

        // Final node gets full activity
        const lastConn = signal.path[signal.path.length - 1];
        if (lastConn) {
          const finalNodeId = lastConn.target;
          const finalNode = nodes.find(n => n.id === finalNodeId);
          if (finalNode) {
            finalNode.activity = 1.0;
          }
        }
      } else {
        // Activate the node at the connection junction
        if (signal.connectionIndex > 0) {
          const prevConn = signal.path[signal.connectionIndex - 1];
          const junctionNodeId = prevConn.target;
          const junctionNode = nodes.find(n => n.id === junctionNodeId);
          if (junctionNode) {
            junctionNode.activity = 1.0;
          }
        }
      }
    }
  }
}

// ─── Update node activity decay ─────────────────────────────────────────────
export function updateNodeActivities(nodes: NeuralNode[], deltaTime: number): void {
  for (const node of nodes) {
    node.activity *= NODE_ACTIVITY_DECAY;
    if (node.activity < 0.01) node.activity = 0;

    // Core nodes maintain some baseline activity
    if (node.isCore) {
      node.activity = Math.max(node.activity, 0.3);
    }
  }
}

// ─── Get core activity (for heartbeat) ──────────────────────────────────────
export function getCoreActivity(nodes: NeuralNode[]): number {
  let maxActivity = 0;
  for (const node of nodes) {
    if (node.isCore && node.activity > maxActivity) {
      maxActivity = node.activity;
    }
  }
  return maxActivity;
}

// ─── Update simulation timer ────────────────────────────────────────────────
export function updateSimulationTimer(
  simulation: NeuralSimulation,
  nodes: NeuralNode[],
  connectionSystem: ConnectionSystem,
  deltaTime: number
): void {
  simulation.eventTimer -= deltaTime;

  if (simulation.eventTimer <= 0) {
    triggerNeuralEvent(nodes, connectionSystem, simulation);

    // Random interval for next event
    simulation.nextEventInterval = MIN_EVENT_INTERVAL +
      Math.random() * (MAX_EVENT_INTERVAL - MIN_EVENT_INTERVAL);
    simulation.eventTimer = simulation.nextEventInterval;
  }
}

// ─── Create simulation ──────────────────────────────────────────────────────
export function createSimulation(): NeuralSimulation {
  const signals: NeuralSignal[] = [];
  for (let i = 0; i < MAX_SIMULTANEOUS_SIGNALS; i++) {
    signals.push({
      path: [],
      connectionIndex: 0,
      progress: 0,
      speed: 1,
      active: false
    });
  }

  return {
    signals,
    eventTimer: 0,
    nextEventInterval: 1.0
  };
}

/**
 * Pulse core nodes with a heartbeat rhythm (brainstem effect)
 */
export function pulseCoreNodes(nodes: NeuralNode[], time: number): void {
  const heartbeat = Math.pow(Math.max(0, Math.sin(time * 3.927)), 3.0);
  for (const node of nodes) {
    if (node.isCore) {
      node.activity = Math.min(1.0, node.activity + heartbeat * 0.3);
    }
  }
}
