
export default `

precision mediump float;
uniform sampler2D texture;
uniform float thickness;
uniform float textureSize;
varying vec2 vTextureCoord;

void main(void) {
  float stepValue = 1.0 / thickness;
  float onePixel = 1.0 / textureSize;
  float result = texture2D(texture, vTextureCoord).r;
  result = max(result, texture2D(texture, vTextureCoord + vec2(onePixel, 0.0)).r - stepValue);
  result = max(result, texture2D(texture, vTextureCoord + vec2(-onePixel, 0.0)).r - stepValue);
  result = max(result, texture2D(texture, vTextureCoord + vec2(0.0, onePixel)).r - stepValue);
  result = max(result, texture2D(texture, vTextureCoord + vec2(0.0, -onePixel)).r - stepValue);
  gl_FragColor = vec4(result, 0.0, 0.0, 1.0);
}

`
