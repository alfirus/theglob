// Vertex shader for neural nodes — tight electric points
uniform float uTime;
uniform float uBrightness;

attribute float aPhase;
attribute float aBrightness;

varying float vBrightness;
varying float vPhase;

void main() {
  vPhase = aPhase;
  
  // Gentle breathing oscillation per node
  float breathe = sin(uTime * 0.8 + aPhase * 6.2831) * 0.15 + 0.85;
  vBrightness = aBrightness * breathe * uBrightness;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Smaller, tighter nodes — NOT big soft blobs
  gl_PointSize = (3.0 + vBrightness * 2.0) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
