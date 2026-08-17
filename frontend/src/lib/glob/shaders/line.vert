// Vertex shader for connection lines — activity-driven
attribute float aActivity;
varying float vActivity;

void main() {
  vActivity = aActivity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
