import * as THREE from 'three';

// Vertex shader for central core glow
export const coreVertexShader = `
uniform float uTime;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  
  // Heartbeat pulse: fast rise, slow fall
  float heartbeat = pow(max(0.0, sin(uTime * 3.927)), 4.0);
  float scale = 1.0 + heartbeat * uPulse * 0.08;
  
  vec3 pos = position * scale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Fragment shader for central core glow — bright electric nucleus
export const coreFragmentShader = `
uniform vec3 uColor;
uniform float uTime;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  fresnel = pow(fresnel, 1.5);
  
  float heartbeat = pow(max(0.0, sin(uTime * 3.927)), 3.0);
  float pulse = 1.0 + heartbeat * uPulse;
  
  float coreGlow = 0.5 + fresnel * 0.5;
  
  vec3 color = uColor * coreGlow * pulse * 2.5;
  float alpha = (0.4 + fresnel * 0.6) * pulse;
  
  gl_FragColor = vec4(color, alpha);
}
`;

export function createCoreGlow(color: THREE.Color): {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
} {
  const geometry = new THREE.SphereGeometry(0.65, 32, 32);

  const material = new THREE.ShaderMaterial({
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 1.0 },
      uColor: { value: color }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  return { mesh, material };
}
