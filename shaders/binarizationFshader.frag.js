
export default `

precision highp float;
uniform sampler2D texture;
uniform float alphaThreshold;
varying vec2 vTextureCoord;

void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float currentB = step(smpColor.a, alphaThreshold);
  gl_FragColor = vec4(vTextureCoord.x, vTextureCoord.y, currentB, 1.0);
}

`
