// Fragment shader for neural nodes — tight electric points (NO soft gas)
// Pattern: · ●● ·  (tight core, minimal halo)
uniform vec3 uColor;
uniform float uTime;
uniform float uActivityBoost;

varying float vBrightness;
varying float vPhase;
varying float vActivity;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // Tight falloff — the · ●● · pattern
  float d = distance(gl_PointCoord, vec2(0.5));
  float core = smoothstep(0.16, 0.0, d);
  float halo = smoothstep(0.30, 0.12, d);
  float intensity = core + halo * 0.2;
  
  // White-hot center, colored edge
  vec3 coreColor = vec3(1.0, 1.0, 1.0);
  vec3 edgeColor = uColor * 1.2;
  vec3 color = mix(edgeColor, coreColor, core);
  
  // Per-node color variation
  float colorShift = sin(uTime * 0.5 + vPhase * 6.28) * 0.1;
  color.r += colorShift;
  color.b -= colorShift * 0.5;
  
  // Activity makes nodes brighter and more white
  color = mix(color, vec3(1.0), vActivity * 0.4);
  
  // Activity boost amplifies brightness during thinking/streaming
  float boostMultiplier = 1.0 + uActivityBoost * 2.0;
  
  gl_FragColor = vec4(color * intensity * vBrightness * boostMultiplier, intensity);
}
