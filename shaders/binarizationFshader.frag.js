
export default `

precision mediump float;
uniform sampler2D texture;
uniform float alphaThreshold;
varying vec2 vTextureCoord;

void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float currentR = step(alphaThreshold, smpColor.a);
  gl_FragColor = vec4(currentR, 0.0, 0.0, 1.0);
}

`
