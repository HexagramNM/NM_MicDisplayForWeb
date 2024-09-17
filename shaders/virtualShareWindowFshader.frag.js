export default `

#define PI 3.141592
precision mediump float;
uniform sampler2D texture;
uniform float time;
varying vec4 vColor;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float maxAlpha = 200.0 / 255.0;
  float edgeAlpha = 1.0;
  float edgeRate = 0.02;
  float invEdgeRate = 1.0 / 0.02;
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;

  float maxR = 0.8;
  float maxG = 0.8;
  float maxB = 1.0;
  float u = -0.169 * maxR - 0.331 * maxG + 0.5 * maxB;
  float v = 0.5 * maxR - 0.419 * maxG - 0.081 * maxB;
  smpColor.r = grayScale + 1.402 * v;
  smpColor.g = grayScale - 0.344 * u - 0.714 * v;
  smpColor.b = grayScale + 1.772 * u;

  edgeAlpha = clamp(vTextureCoord.x, 0.0, edgeRate) * invEdgeRate;
  edgeAlpha = min(clamp(1.0 - vTextureCoord.x, 0.0, edgeRate) * invEdgeRate, edgeAlpha);
  edgeAlpha = min(clamp(vTextureCoord.y, 0.0, edgeRate) * invEdgeRate, edgeAlpha);
  edgeAlpha = min(clamp(1.0 - vTextureCoord.y, 0.0, edgeRate) * invEdgeRate, edgeAlpha);

  smpColor.a = maxAlpha * edgeAlpha;

  gl_FragColor = vColor * smpColor;
}

`
