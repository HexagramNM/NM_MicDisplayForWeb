export default `

precision mediump float;
uniform sampler2D texture;
varying vec4 vColor;
varying vec2 vTextureCoord;
void main(void) {
  vec4 smpColor = texture2D(texture, vTextureCoord);
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

  edgeAlpha = clamp(vTextureCoord.x, 0.0, widthEdge) * invWidthEdge;
  edgeAlpha = min(clamp(1.0 - vTextureCoord.x, 0.0, widthEdge) * invWidthEdge, edgeAlpha);
  edgeAlpha = min(clamp(vTextureCoord.y, 0.0, heightEdge) * invHeightEdge, edgeAlpha);
  edgeAlpha = min(clamp(1.0 - vTextureCoord.y, 0.0, heightEdge) * invHeightEdge, edgeAlpha);

  smpColor.a = smpColor.a * maxAlpha  * edgeAlpha;
  gl_FragColor = vColor * smpColor;
}

`
