import * as THREE from 'three';

const AMBIENT_COUNT = 50;
const DRIFT_RADIUS = 2.5;

export interface AmbientSystem {
  points: THREE.Points;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
}

export function createAmbientParticles(color: THREE.Color): AmbientSystem {
  const positions = new Float32Array(AMBIENT_COUNT * 3);
  const velocities = new Float32Array(AMBIENT_COUNT * 3);

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    // Random positions around the globe
    positions[i * 3] = (Math.random() - 0.5) * DRIFT_RADIUS * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * DRIFT_RADIUS * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * DRIFT_RADIUS * 2;

    // Very slow drift velocities
    velocities[i * 3] = (Math.random() - 0.5) * 0.002;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: color,
    size: 0.015,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);

  return { points, material, velocities };
}

export function updateAmbient(system: AmbientSystem, deltaTime: number): void {
  const posAttr = system.points.geometry.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const ix = i * 3;
    const iy = i * 3 + 1;
    const iz = i * 3 + 2;

    // Update positions
    posAttr.array[ix] += system.velocities[ix] * deltaTime * 60;
    posAttr.array[iy] += system.velocities[iy] * deltaTime * 60;
    posAttr.array[iz] += system.velocities[iz] * deltaTime * 60;

    // Wrap around if too far
    for (const axis of [ix, iy, iz]) {
      if (Math.abs(posAttr.array[axis]) > DRIFT_RADIUS) {
        system.velocities[axis] *= -1;
      }
    }

    // Slight random drift change
    if (Math.random() < 0.01) {
      system.velocities[ix] += (Math.random() - 0.5) * 0.0005;
      system.velocities[iy] += (Math.random() - 0.5) * 0.0005;
      system.velocities[iz] += (Math.random() - 0.5) * 0.0005;

      // Clamp velocity
      for (const axis of [ix, iy, iz]) {
        system.velocities[axis] = Math.max(-0.005, Math.min(0.005, system.velocities[axis]));
      }
    }
  }

  posAttr.needsUpdate = true;
}
