// Fragment shader for neural nodes — sharp electric points (NO soft gas)
uniform vec3 uColor;
uniform float uTime;

varying float vBrightness;
varying float vPhase;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // SHARP core — almost a star, not a soft blob
  // Using high exponent to create tight bright point
  float core = pow(1.0 - dist * 2.0, 8.0);
  
  // Tiny glow ring (very tight)
  float glow = exp(-dist * 12.0) * 0.6;
  
  // Combine: bright sharp point + minimal glow
  float intensity = core + glow;
  
  // White-hot center, colored edge
  vec3 coreColor = vec3(1.0, 1.0, 1.0);
  vec3 edgeColor = uColor * 1.2;
  vec3 color = mix(edgeColor, coreColor, core);
  
  // Per-node color variation
  float colorShift = sin(uTime * 0.5 + vPhase * 6.28) * 0.1;
  color.r += colorShift;
  color.b -= colorShift * 0.5;
  
  gl_FragColor = vec4(color * intensity * vBrightness, intensity);
}
