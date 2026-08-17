// Vertex shader for sparks — bright traveling particles
uniform float uTime;

attribute float aProgress;
attribute float aSpawnTime;

varying float vProgress;
varying float vAge;

void main() {
  vProgress = aProgress;
  
  // Calculate age of this spark
  float age = uTime - aSpawnTime;
  vAge = age;
  
  // Fade out near end of life
  float lifeFade = 1.0 - smoothstep(0.3, 0.5, age);
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Size varies with progress (brightest at midpoint)
  float sizeFactor = sin(aProgress * 3.14159) * 2.0 + 2.0;
  gl_PointSize = sizeFactor * lifeFade * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
