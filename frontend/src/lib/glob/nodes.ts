import * as THREE from 'three';

// Fibonacci sphere distribution for ~300 neural nodes
export function fibonacciSphere(n: number, radius = 1.0): [number, number, number][] {
  const points: [number, number, number][] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    points.push([x, y, z]);
  }

  return points;
}

export interface NodeData {
  positions: Float32Array;
  phases: Float32Array;
  brightnesses: Float32Array;
  count: number;
}

export function createNodeData(count = 300): NodeData {
  const points = fibonacciSphere(count);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const brightnesses = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const [x, y, z] = points[i];
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    phases[i] = Math.random();
    brightnesses[i] = 0.5 + Math.random() * 0.5;
  }

  return { positions, phases, brightnesses, count };
}

export function createNodeGeometry(data: NodeData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(data.brightnesses, 1));

  return geometry;
}

// Vertex shader source for nodes — tight electric points
export const nodeVertexShader = `
uniform float uTime;
uniform float uBrightness;

attribute float aPhase;
attribute float aBrightness;

varying float vBrightness;
varying float vPhase;

void main() {
  vPhase = aPhase;
  
  float breathe = sin(uTime * 0.8 + aPhase * 6.2831) * 0.15 + 0.85;
  vBrightness = aBrightness * breathe * uBrightness;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Smaller, tighter nodes
  gl_PointSize = (3.0 + vBrightness * 2.0) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader source for nodes — sharp electric points (NO soft gas)
export const nodeFragmentShader = `
uniform vec3 uColor;
uniform float uTime;

varying float vBrightness;
varying float vPhase;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // SHARP core — almost a star, not a soft blob
  float core = pow(1.0 - dist * 2.0, 8.0);
  
  // Tiny glow ring (very tight)
  float glow = exp(-dist * 12.0) * 0.6;
  
  float intensity = core + glow;
  
  // White-hot center, colored edge
  vec3 coreColor = vec3(1.0, 1.0, 1.0);
  vec3 edgeColor = uColor * 1.2;
  vec3 color = mix(edgeColor, coreColor, core);
  
  // Per-node color variation
  float colorShift = sin(uTime * 0.5 + vPhase * 6.28) * 0.1;
  color.r += colorShift;
  color.b -= colorShift * 0.5;
  
  gl_FragColor = vec4(color * intensity * vBrightness, intensity);
}
`;

export function createNodeMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: nodeVertexShader,
    fragmentShader: nodeFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uBrightness: { value: 1.2 }, // Sharp nodes don't need excessive brightness
      uColor: { value: color }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export function createNodes(
  count: number,
  color: THREE.Color
): { points: THREE.Points; material: THREE.ShaderMaterial; data: NodeData } {
  const data = createNodeData(count);
  const geometry = createNodeGeometry(data);
  const material = createNodeMaterial(color);
  const points = new THREE.Points(geometry, material);

  return { points, material, data };
}
