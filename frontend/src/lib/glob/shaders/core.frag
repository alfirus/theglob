// Fragment shader for central core glow — contained electric nucleus
uniform vec3 uColor;
uniform float uTime;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
  fresnel = pow(fresnel, 3.0); // Tighter falloff
  
  // Heartbeat pulse
  float heartbeat = pow(max(0.0, sin(uTime * 3.927)), 3.0);
  float pulse = 1.0 + heartbeat * uPulse * 0.5; // Less aggressive pulse
  
  // Contained glow
  float coreGlow = 0.3 + fresnel * 0.7;
  
  vec3 color = uColor * coreGlow * pulse * 1.8;
  float alpha = (0.2 + fresnel * 0.6) * pulse;
  
  gl_FragColor = vec4(color, alpha);
}
