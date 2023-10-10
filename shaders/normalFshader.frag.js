
export default `

precision mediump float;
uniform int enableTexture;
uniform sampler2D texture;
uniform vec4 globalColor;
varying vec4 vColor;
varying vec2 vTextureCoord;
void main(void) {
  if (enableTexture != 0) {
       vec4 smpColor = texture2D(texture, vTextureCoord);
       gl_FragColor = vColor * smpColor * globalColor;
  }
  else {
       gl_FragColor = vColor * globalColor;
  }
}

`
