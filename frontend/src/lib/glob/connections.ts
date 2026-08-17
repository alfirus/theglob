import * as THREE from 'three';

export interface Connection {
  startIdx: number;
  endIdx: number;
  age: number;
}

const CONNECTION_DISTANCE = 0.55; // Wider range for more connections

export function findConnections(
  positions: Float32Array,
  count: number,
  maxConnections = 600 // Much more connections for visible neural network
): Connection[] {
  const connections: Connection[] = [];
  const distSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

  for (let i = 0; i < count && connections.length < maxConnections; i++) {
    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];

    // Check more neighbors for denser network
    const startJ = i + 1;
    const endJ = Math.min(i + 40, count);

    for (let j = startJ; j < endJ; j++) {
      const jx = positions[j * 3];
      const jy = positions[j * 3 + 1];
      const jz = positions[j * 3 + 2];

      const dx = ix - jx;
      const dy = iy - jy;
      const dz = iz - jz;
      const dSq = dx * dx + dy * dy + dz * dz;

      if (dSq < distSq) {
        connections.push({ startIdx: i, endIdx: j, age: Math.random() });
      }
    }
  }

  return connections;
}

export function buildLineGeometry(
  connections: Connection[],
  positions: Float32Array
): THREE.BufferGeometry {
  const vertexCount = connections.length * 2;
  const verts = new Float32Array(vertexCount * 3);
  const ages = new Float32Array(vertexCount);

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    const si = conn.startIdx * 3;
    const ei = conn.endIdx * 3;

    // Start vertex
    verts[i * 6] = positions[si];
    verts[i * 6 + 1] = positions[si + 1];
    verts[i * 6 + 2] = positions[si + 2];
    ages[i * 2] = conn.age;

    // End vertex
    verts[i * 6 + 3] = positions[ei];
    verts[i * 6 + 4] = positions[ei + 1];
    verts[i * 6 + 5] = positions[ei + 2];
    ages[i * 2 + 1] = conn.age;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));

  return geometry;
}

// Vertex shader for lines
export const lineVertexShader = `
attribute float aAge;
varying float vAge;

void main() {
  vAge = aAge;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for lines — bright electric tendrils
export const lineFragmentShader = `
uniform vec3 uColor;
uniform float uTime;

varying float vAge;

void main() {
  float ageFade = 1.0 - vAge * 0.5;
  float pulse = sin(uTime * 2.0 + vAge * 6.28) * 0.15 + 0.85;
  float alpha = ageFade * pulse * 1.2;
  
  gl_FragColor = vec4(uColor * 1.5, alpha);
}
`;

export function createConnectionMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: lineVertexShader,
    fragmentShader: lineFragmentShader,
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export interface ConnectionSystem {
  lineSegments: THREE.LineSegments;
  material: THREE.ShaderMaterial;
  connections: Connection[];
  positions: Float32Array;
  count: number;
}

export function createConnections(
  nodePositions: Float32Array,
  nodeCount: number,
  color: THREE.Color
): ConnectionSystem {
  const connections = findConnections(nodePositions, nodeCount);
  const geometry = buildLineGeometry(connections, nodePositions);
  const material = createConnectionMaterial(color);
  const lineSegments = new THREE.LineSegments(geometry, material);

  return {
    lineSegments,
    material,
    connections,
    positions: nodePositions,
    count: nodeCount
  };
}

// Periodically refresh connections — mutate ~20% of connections
export function refreshConnections(system: ConnectionSystem): void {
  const refreshCount = Math.floor(system.connections.length * 0.2);

  for (let i = 0; i < refreshCount; i++) {
    const idx = Math.floor(Math.random() * system.connections.length);
    system.connections[idx].age = Math.random();
  }

  // Rebuild geometry
  const newGeometry = buildLineGeometry(system.connections, system.positions);
  system.lineSegments.geometry.dispose();
  system.lineSegments.geometry = newGeometry;
}
