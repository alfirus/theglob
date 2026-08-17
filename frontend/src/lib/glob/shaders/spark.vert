// Vertex shader for sparks — bright traveling particles
uniform float uTime;

attribute float aProgress;
attribute float aActive;

varying float vProgress;
varying float vActive;

void main() {
  vProgress = aProgress;
  vActive = aActive;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Size pulses at midpoint of travel
  float sizeFactor = sin(aProgress * 3.14159) * 2.0 + 2.0;
  gl_PointSize = sizeFactor * aActive * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
