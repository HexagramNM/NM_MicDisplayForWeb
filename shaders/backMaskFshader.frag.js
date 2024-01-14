export default `

#define PI 3.141592
precision mediump float;
uniform sampler2D texture;
uniform float time;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;
  smpColor.r = (grayScale * 0.725 + 0.025);
  smpColor.g = (grayScale * 0.75 + 0.1);
  smpColor.b = (grayScale * 0.8 + 0.2);
  smpColor.a = step(0.5, smpColor.a);

  float sinValue = sin((vTextureCoord.y + time * 0.01) * 50.0 * PI);
  float stripeAlpha = max(sinValue * sinValue, 0.9);

  smpColor.a = smpColor.a * stripeAlpha;
  gl_FragColor = smpColor;
}

`
