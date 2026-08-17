// Vertex shader for central core glow
uniform float uTime;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  
  // Heartbeat pulse: fast rise, slow fall
  float heartbeat = pow(max(0.0, sin(uTime * 3.927)), 4.0); // ~0.8s period
  float scale = 1.0 + heartbeat * uPulse * 0.08;
  
  vec3 pos = position * scale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
