// Fragment shader for connection lines — bright electric tendrils
uniform vec3 uColor;
uniform float uTime;

varying float vAge;

void main() {
  // Age-based opacity: new connections bright, old ones fade
  float ageFade = 1.0 - vAge * 0.5;
  
  // Pulsing effect — connections should feel alive
  float pulse = sin(uTime * 2.0 + vAge * 6.28) * 0.15 + 0.85;
  
  float alpha = ageFade * pulse * 1.2; // Much brighter than before
  
  gl_FragColor = vec4(uColor * 1.5, alpha); // Boost brightness
}
