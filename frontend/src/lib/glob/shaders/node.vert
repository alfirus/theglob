// Vertex shader for neural nodes — tight electric points
uniform float uTime;
uniform float uBrightness;

attribute float aPhase;
attribute float aBrightness;
attribute float aActivity;

varying float vBrightness;
varying float vPhase;
varying float vActivity;

void main() {
  vPhase = aPhase;
  vActivity = aActivity;
  
  // Gentle breathing oscillation per node
  float breathe = sin(uTime * 0.8 + aPhase * 6.2831) * 0.15 + 0.85;
  
  // Activity boosts brightness significantly
  float activityBoost = 1.0 + aActivity * 3.0;
  vBrightness = aBrightness * breathe * uBrightness * activityBoost;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // Size scales with activity — active nodes are bigger
  float sizeBase = 2.0 + aActivity * 3.0;
  gl_PointSize = (sizeBase + vBrightness * 1.5) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
