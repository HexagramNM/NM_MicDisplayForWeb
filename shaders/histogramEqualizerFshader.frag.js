export default `

#define HISTOGRAM_NUM 256

precision mediump float;
uniform sampler2D texture;
uniform sampler2D cdf;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;
  float newGrayScale = clamp(texture2D(cdf, vec2(grayScale, 0.0)).r, 0.0, 1.0);

  float u = -0.169 * smpColor.r - 0.331 * smpColor.g + 0.5 * smpColor.b;
  float v = 0.5 * smpColor.r - 0.419 * smpColor.g - 0.081 * smpColor.b;

  smpColor.r = clamp(newGrayScale + 1.402 * v, 0.0, 1.0);
  smpColor.g = clamp(newGrayScale - 0.344 * u - 0.714 * v, 0.0, 1.0);
  smpColor.b = clamp(newGrayScale + 1.772 * u, 0.0, 1.0);
  gl_FragColor = smpColor;
}

`
