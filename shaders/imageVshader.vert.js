
export default `

attribute vec3 position;
attribute vec2 textureCoord;
varying vec2 vTextureCoord;
void main(void) {
  vTextureCoord = textureCoord;
  gl_Position = vec4(position, 1.0);
}

`
