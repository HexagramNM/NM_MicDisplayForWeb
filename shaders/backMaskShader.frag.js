export default `

#define PI 3.141592
precision mediump float;
uniform sampler2D texture;
uniform float time;
varying vec4 vColor;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
  float grayScale = smpColor.r * 0.299 + smpColor.g * 0.587 + smpColor.b * 0.114;
  float canvasWidth = 480.0;
  float invCanvasWidth = 1.0 / 480.0;
  float canvasHeight = 360.0;
  float invCanvasHeight = 1.0 / 360.0;
  float edgeSize = 40.0;
  float invEdgeSize = 1.0 / 40.0;
  float widthEdge = edgeSize * invCanvasWidth;
  float heightEdge = edgeSize * invCanvasHeight;
  float invWidthEdge = canvasWidth * invEdgeSize;
  float invHeightEdge = canvasHeight * invEdgeSize;
  float maxAlpha = 250.0 / 255.0;
  float edgeAlpha = 1.0;

  smpColor.r = (grayScale * 0.725 + 0.025);
  smpColor.g = (grayScale * 0.75 + 0.1);
  smpColor.b = (grayScale * 0.8 + 0.2);

  vec3 outlineColor;
  float outlineAlpha = pow(sin(smpColor.a * PI), 6.0);
  outlineColor.r = outlineAlpha * 0.8;
  outlineColor.g = outlineAlpha * 1.0;
  outlineColor.b = 1.0;

  smpColor.r = (1.0 - outlineAlpha) * smpColor.r + outlineAlpha * outlineColor.r;
  smpColor.g = (1.0 - outlineAlpha) * smpColor.g + outlineAlpha * outlineColor.g;
  smpColor.b = (1.0 - outlineAlpha) * smpColor.b + outlineAlpha * outlineColor.b;
  smpColor.a = min(1.0, smpColor.a + outlineAlpha * 0.9);

  edgeAlpha = clamp(vTextureCoord.x, 0.0, widthEdge) * invWidthEdge;
  edgeAlpha = min(clamp(1.0 - vTextureCoord.x, 0.0, widthEdge) * invWidthEdge, edgeAlpha);
  edgeAlpha = min(clamp(vTextureCoord.y, 0.0, heightEdge) * invHeightEdge, edgeAlpha);
  edgeAlpha = min(clamp(1.0 - vTextureCoord.y, 0.0, heightEdge) * invHeightEdge, edgeAlpha);

  float sinValue = sin((vTextureCoord.y + time * 0.01) * 50.0 * PI);
  float stripeAlpha = max(sinValue * sinValue, 0.9);

  smpColor.a = smpColor.a * maxAlpha  * edgeAlpha * stripeAlpha;
  gl_FragColor = vColor * smpColor;
}

`
