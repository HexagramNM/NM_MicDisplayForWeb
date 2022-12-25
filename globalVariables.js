var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

var virtualBackCanvasSize = {width: 480, height: 360};
var virtualBackTextureSize = 512;
var virtualBackTextureInfo = {
    size: virtualBackTextureSize,
    textureData32: null,
    textureData8: null,
    isChanged: false
};
var virtualBackTextureBinary = new ArrayBuffer(virtualBackTextureInfo.size * virtualBackTextureInfo.size * 4);
virtualBackTextureInfo.textureData32 = new Uint32Array(virtualBackTextureBinary);
virtualBackTextureInfo.textureData8 = new Uint8Array(virtualBackTextureBinary);

var gl;
var texture_max;
var windowShareMode = false;
var windowShareBackEnable = false;
var trimmingMode = false;
