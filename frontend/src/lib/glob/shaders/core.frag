// Fragment shader for core pulse — heartbeat indicator
uniform vec3 uColor;
uniform float uTime;
uniform float uPulse;

varying float vPulse;

void main() {
  // Simple glow driven by pulse value
  float intensity = vPulse * 2.0;
  vec3 color = uColor * intensity;
  
  gl_FragColor = vec4(color, intensity * 0.3);
}
