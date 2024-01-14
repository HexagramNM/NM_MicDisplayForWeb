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

  smpColor.r = (grayScale * 0.5 + 0.2);
  smpColor.g = (grayScale * 0.6 + 0.2);
  smpColor.b = (grayScale * 0.6 + 0.4);

  edgeAlpha = clamp(vTextureCoord.x, 0.0, edgeRate) * invEdgeRate;
  edgeAlpha = min(clamp(1.0 - vTextureCoord.x, 0.0, edgeRate) * invEdgeRate, edgeAlpha);
  edgeAlpha = min(clamp(vTextureCoord.y, 0.0, edgeRate) * invEdgeRate, edgeAlpha);
  edgeAlpha = min(clamp(1.0 - vTextureCoord.y, 0.0, edgeRate) * invEdgeRate, edgeAlpha);

  smpColor.a = maxAlpha * edgeAlpha;

  gl_FragColor = vColor * smpColor;
}

`
