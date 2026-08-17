// Vertex shader for core pulse — used for heartbeat animation reference
uniform float uTime;
uniform float uPulse;

varying float vPulse;

void main() {
  vPulse = uPulse;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
