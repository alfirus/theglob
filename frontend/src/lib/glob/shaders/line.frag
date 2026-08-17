// Fragment shader for connection lines — activity-driven electric tendrils
uniform vec3 uColor;
uniform float uTime;

varying float vActivity;

void main() {
  // Activity drives brightness — not time-based pulsing
  float intensity = 0.15 + vActivity * 2.5;
  
  // Active connections glow brighter
  vec3 color = uColor * intensity;
  
  // Active connections shift toward white
  color = mix(color, vec3(1.0), vActivity * 0.3);
  
  float alpha = clamp(intensity * 0.4, 0.05, 0.8);
  
  gl_FragColor = vec4(color, alpha);
}
