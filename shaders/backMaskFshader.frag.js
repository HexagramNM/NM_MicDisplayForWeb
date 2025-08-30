export default `

#define PI 3.141592
#define HISTOGRAM_NUM 256

precision mediump float;
uniform sampler2D texture;
uniform float time;
uniform sampler2D cdf;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;
  float newGrayScale = texture2D(cdf, vec2(grayScale, 0.0)).r;

  float u = -0.169 * smpColor.r - 0.331 * smpColor.g + 0.5 * smpColor.b;
  float v = 0.5 * smpColor.r - 0.419 * smpColor.g - 0.081 * smpColor.b;
  
  float maxR = 0.75;
  float maxG = 0.85;
  float maxB = 1.0;
  float targetU = -0.169 * maxR - 0.331 * maxG + 0.5 * maxB;
  float targetV = 0.5 * maxR - 0.419 * maxG - 0.081 * maxB;

  float weight = 0.8;
  float mixU = weight * targetU + (1.0 - weight) * u;
  float mixV = weight * targetV + (1.0 - weight) * v;

  smpColor.r = newGrayScale + 1.402 * mixV;
  smpColor.g = newGrayScale - 0.344 * mixU - 0.714 * mixV;
  smpColor.b = newGrayScale + 1.772 * mixU;
  smpColor.a = step(0.5, smpColor.a);

  float sinValue = sin((vTextureCoord.y + time * 0.01) * 50.0 * PI);
  float stripeAlpha = max(sinValue * sinValue, 0.9);

  smpColor.a = smpColor.a * stripeAlpha;
  gl_FragColor = smpColor;
}

`
