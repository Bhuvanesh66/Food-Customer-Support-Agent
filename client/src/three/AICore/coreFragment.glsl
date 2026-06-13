uniform float uTime;
uniform vec3 uColorA;   // core color (state-driven)
uniform vec3 uColorB;   // rim color (state-driven)
uniform float uGlow;    // emissive intensity (state-driven)

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel rim — bright at grazing angles.
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5);

  // Internal energy from the noise field (the "neural" shimmer).
  float energy = 0.5 + 0.5 * sin(vNoise * 6.0 + uTime * 1.5);

  vec3 base = mix(uColorA, uColorB, fresnel);
  vec3 color = base * (0.35 + energy * 0.5) + uColorB * fresnel * 1.4;
  color *= uGlow;

  // Slight transparency in the core, opaque at the rim → glassy depth.
  float alpha = clamp(0.45 + fresnel * 0.7, 0.0, 1.0);

  gl_FragColor = vec4(color, alpha);
}
