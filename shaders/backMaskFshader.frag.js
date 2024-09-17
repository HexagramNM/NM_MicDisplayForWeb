export default `

#define PI 3.141592
precision mediump float;
uniform sampler2D texture;
uniform float time;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;
  
  // grayScale = 1.0 -> r = 0.75, g = 0.85, b = 1.0
  float u = 0.0919;
  float v = 0.09985;
  smpColor.r = grayScale + 1.402 * v;
  smpColor.g = grayScale - 0.344 * u - 0.714 * v;
  smpColor.b = grayScale + 1.772 * u;
  smpColor.a = step(0.5, smpColor.a);

  float sinValue = sin((vTextureCoord.y + time * 0.01) * 50.0 * PI);
  float stripeAlpha = max(sinValue * sinValue, 0.9);

  smpColor.a = smpColor.a * stripeAlpha;
  gl_FragColor = smpColor;
}

`
