
export default `

precision highp float;
uniform sampler2D textureMain;
uniform sampler2D textureSdf;
uniform vec2 originalSize;
uniform float thickness;
uniform vec3 lineColorIn;
uniform vec3 lineColorOut;
uniform float outlineAlpha;
varying vec2 vTextureCoord;

void main(void) {
  const float inf = 10000000.0;
  vec4 smpColorMain = texture2D(textureMain, vTextureCoord);
  vec4 smpColorSdf = texture2D(textureSdf, vTextureCoord);

  vec2 imagePos = vTextureCoord * originalSize;
  float dist = distance(imagePos, smpColorSdf.rg * originalSize)
    + smpColorSdf.b * inf;
  float sdfValue = 1.0 - clamp(dist / thickness, 0.0, 1.0);
 
  const float maxarg = 0.7;
  const float oneMinusMaxarg = 1.0 - maxarg;
  const float invValue = 1.0 / (maxarg * maxarg * oneMinusMaxarg * oneMinusMaxarg);
  const float coefA = (1.0 - 2.0 * maxarg) * invValue;
  const float coefB = (3.0 * maxarg * maxarg - 1.0) * invValue;
  const float coefC = (-3.0 * maxarg + 2.0) * maxarg * invValue;
  float funcValue = coefA * pow(sdfValue, 3.0) + coefB * pow(sdfValue, 2.0) + coefC * sdfValue;
  
  vec3 lineColor = mix(lineColorOut, lineColorIn, funcValue) * (1.0 - smpColorMain.a);
  gl_FragColor = smpColorMain + vec4(lineColor, min(funcValue * 8.0, 1.0) * outlineAlpha);
}

`
