import * as THREE from 'three';
import type { Connection } from './connections';

const MAX_SPARKS = 20; // More sparks for electric feel

export interface Spark {
  connectionIdx: number;
  progress: number;
  speed: number;
  active: boolean;
  spawnTime: number;
}

export interface SparkSystem {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  sparks: Spark[];
  time: number;
}

// Vertex shader for sparks
export const sparkVertexShader = `
uniform float uTime;
uniform float uPointScale;

attribute float aProgress;
attribute float aSpawnTime;
attribute float aActive;

varying float vProgress;
varying float vAge;

void main() {
  vProgress = aProgress;
  
  float age = uTime - aSpawnTime;
  vAge = age;
  
  float lifeFade = 1.0 - smoothstep(0.3, 0.5, age);
  float isActive = aActive;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  float sizeFactor = sin(aProgress * 3.14159) * 2.0 + 2.0;
  gl_PointSize = sizeFactor * lifeFade * isActive * uPointScale * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for sparks — bright electric action potentials
export const sparkFragmentShader = `
uniform vec3 uCoreColor;
uniform vec3 uHaloColor;

varying float vProgress;
varying float vAge;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // Very bright white core
  float core = 1.0 - smoothstep(0.0, 0.1, dist);
  core = pow(core, 0.5);
  
  // Electric halo
  float halo = 1.0 - smoothstep(0.05, 0.35, dist);
  halo = pow(halo, 1.5);
  
  // Outer glow
  float outerGlow = 1.0 - smoothstep(0.15, 0.5, dist);
  outerGlow = pow(outerGlow, 3.0) * 0.5;
  
  // Life fade
  float lifeFade = smoothstep(0.0, 0.1, vAge) * (1.0 - smoothstep(0.3, 0.6, vAge));
  
  vec3 color = mix(uHaloColor * 1.5, uCoreColor * 3.0, core);
  float alpha = (core * 1.5 + halo * 0.8 + outerGlow * 0.3) * lifeFade;
  
  gl_FragColor = vec4(color, alpha);
}
`;

export function createSparkSystem(
  coreColor: THREE.Color,
  haloColor: THREE.Color
): SparkSystem {
  const maxSparks = MAX_SPARKS;
  const positions = new Float32Array(maxSparks * 3);
  const progressAttr = new Float32Array(maxSparks);
  const spawnTimeAttr = new Float32Array(maxSparks);
  const activeAttr = new Float32Array(maxSparks);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progressAttr, 1));
  geometry.setAttribute('aSpawnTime', new THREE.BufferAttribute(spawnTimeAttr, 1));
  geometry.setAttribute('aActive', new THREE.BufferAttribute(activeAttr, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: sparkVertexShader,
    fragmentShader: sparkFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoreColor: { value: coreColor },
      uHaloColor: { value: haloColor },
      uPointScale: { value: 1.0 }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);

  const sparks: Spark[] = [];
  for (let i = 0; i < maxSparks; i++) {
    sparks.push({
      connectionIdx: -1,
      progress: 0,
      speed: 1.0,
      active: false,
      spawnTime: 0
    });
  }

  return { points, material, sparks, time: 0 };
}

export function updateSparks(
  system: SparkSystem,
  connections: Connection[],
  nodePositions: Float32Array,
  deltaTime: number,
  spawnInterval: number
): void {
  system.time += deltaTime;

  const posAttr = system.points.geometry.getAttribute('position') as THREE.BufferAttribute;
  const progAttr = system.points.geometry.getAttribute('aProgress') as THREE.BufferAttribute;
  const spawnAttr = system.points.geometry.getAttribute('aSpawnTime') as THREE.BufferAttribute;
  const activeAttr = system.points.geometry.getAttribute('aActive') as THREE.BufferAttribute;

  // Update existing sparks
  for (let i = 0; i < system.sparks.length; i++) {
    const spark = system.sparks[i];

    if (spark.active) {
      spark.progress += deltaTime * spark.speed;

      if (spark.progress >= 1.0) {
        spark.active = false;
        activeAttr.setX(i, 0);
        continue;
      }

      // Interpolate position along connection
      const conn = connections[spark.connectionIdx];
      if (conn) {
        const si = conn.startIdx * 3;
        const ei = conn.endIdx * 3;

        const t = spark.progress;
        posAttr.setXYZ(
          i,
          nodePositions[si] * (1 - t) + nodePositions[ei] * t,
          nodePositions[si + 1] * (1 - t) + nodePositions[ei + 1] * t,
          nodePositions[si + 2] * (1 - t) + nodePositions[ei + 2] * t
        );
        progAttr.setX(i, spark.progress);
        spawnAttr.setX(i, spark.spawnTime);
      }
    }
  }

  // Spawn new sparks at random intervals
  if (connections.length > 0 && Math.random() < deltaTime / spawnInterval) {
    // Find an inactive slot
    for (let i = 0; i < system.sparks.length; i++) {
      if (!system.sparks[i].active) {
        const connIdx = Math.floor(Math.random() * connections.length);
        system.sparks[i] = {
          connectionIdx: connIdx,
          progress: 0,
          speed: 1.5 + Math.random() * 1.5,
          active: true,
          spawnTime: system.time
        };
        activeAttr.setX(i, 1);
        break;
      }
    }
  }

  posAttr.needsUpdate = true;
  progAttr.needsUpdate = true;
  spawnAttr.needsUpdate = true;
  activeAttr.needsUpdate = true;
}
