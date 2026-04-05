
export default `

precision highp float;
uniform sampler2D texture;
uniform float stepSize;
uniform vec2 originalSize;
varying vec2 vTextureCoord;

void main(void) {
  const float inf = 10000000.0;
  vec4 result = texture2D(texture, vTextureCoord);
  vec2 imagePos = vTextureCoord * originalSize;
  float dist = distance(imagePos, result.rg * originalSize)
    + result.b * inf;
  vec2 invOriginalSize = vec2(1.0) / originalSize;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec4 candidate = texture2D(texture,
        vTextureCoord + vec2(x, y) * invOriginalSize * stepSize);
      float candidateDist = distance(imagePos, candidate.rg * originalSize)
        + candidate.b * inf;
      float det = step(candidateDist, dist);
      result = mix(result, candidate, det);
      dist = mix(dist, candidateDist, det);
    }
  }

  result.a = 1.0;
  gl_FragColor = vec4(result);
}

`
