
export default `

precision mediump float;
uniform sampler2D textureMain;
uniform sampler2D textureSdf;
uniform vec3 lineColorIn;
uniform vec3 lineColorOut;
uniform float outlineAlpha;
varying vec2 vTextureCoord;

void main(void) {
  vec4 smpColorMain = texture2D(textureMain, vTextureCoord);
  vec4 smpColorSdf = texture2D(textureSdf, vTextureCoord);
  const float PI = 3.141592;

  const float maxarg = 0.7;
  const float oneMinusMaxarg = 1.0 - maxarg;
  const float invValue = 1.0 / (maxarg * maxarg * oneMinusMaxarg * oneMinusMaxarg);
  const float coefA = (1.0 - 2.0 * maxarg) * invValue;
  const float coefB = (3.0 * maxarg * maxarg - 1.0) * invValue;
  const float coefC = (-3.0 * maxarg * maxarg + 2.0 * maxarg) * invValue;
  float funcValue = coefA * pow(smpColorSdf.r, 3.0) + coefB * pow(smpColorSdf.r, 2.0) + coefC * smpColorSdf.r;

  vec3 lineColor = mix(lineColorOut, lineColorIn, funcValue) * (1.0 - smpColorMain.a);

  gl_FragColor = smpColorMain + vec4(lineColor, min(funcValue * 8.0, 1.0) * outlineAlpha);
}

`
