// Fragment shader for sparks — bright electric action potentials
uniform vec3 uCoreColor;
uniform vec3 uHaloColor;
uniform float uTime;

varying float vProgress;
varying float vAge;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // Very bright white core
  float core = 1.0 - smoothstep(0.0, 0.1, dist);
  core = pow(core, 0.5); // Broader bright center
  
  // Electric halo
  float halo = 1.0 - smoothstep(0.05, 0.35, dist);
  halo = pow(halo, 1.5);
  
  // Outer glow
  float outerGlow = 1.0 - smoothstep(0.15, 0.5, dist);
  outerGlow = pow(outerGlow, 3.0) * 0.5;
  
  // Life fade — quick in, slow out
  float lifeFade = smoothstep(0.0, 0.1, vAge) * (1.0 - smoothstep(0.3, 0.6, vAge));
  
  // Combine: white hot core + electric halo
  vec3 color = mix(uHaloColor * 1.5, uCoreColor * 3.0, core);
  
  float alpha = (core * 1.5 + halo * 0.8 + outerGlow * 0.3) * lifeFade;
  
  gl_FragColor = vec4(color, alpha); // Extra brightness for bloom to catch
}
