// Vertex shader for connection lines
attribute float aAge;

varying float vAge;

void main() {
  vAge = aAge;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
