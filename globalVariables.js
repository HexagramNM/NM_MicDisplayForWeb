var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

var virtualBackCanvasSize = {width: 480, height: 360};
var virtualBackTextureSize = 512;
var virtualBackTextureInfo = {
    size: virtualBackTextureSize,
    textureData32: null,
    textureData8: null,
    mapTextureXToCanvas: null,
    mapTextureYToCanvas: null,
    isChanged: false
};
var virtualBackTextureBinary = new ArrayBuffer(virtualBackTextureInfo.size * virtualBackTextureInfo.size * 4);
virtualBackTextureInfo.textureData32 = new Uint32Array(virtualBackTextureBinary);
virtualBackTextureInfo.textureData8 = new Uint8Array(virtualBackTextureBinary);
virtualBackTextureInfo.mapTextureXToCanvas = new Array(virtualBackTextureInfo.size);
virtualBackTextureInfo.mapTextureYToCanvas = new Array(virtualBackTextureInfo.size);

var virtualShareWindowCanvasSize = {width: 480, height: 360};
var virtualShareWindowTextureSize = 512;
var virtualShareWindowTextureInfo = {
    size: virtualShareWindowTextureSize,
    textureData32: null,
    textureData8: null,
    mapTextureXToCanvas: null,
    mapTextureYToCanvas: null,
    isChanged: false
};
var virtualShareWindowTextureBinary = new ArrayBuffer(virtualShareWindowTextureInfo.size * virtualShareWindowTextureInfo.size * 4);
virtualShareWindowTextureInfo.textureData32 = new Uint32Array(virtualShareWindowTextureBinary);
virtualShareWindowTextureInfo.textureData8 = new Uint8Array(virtualShareWindowTextureBinary);
virtualShareWindowTextureInfo.mapTextureXToCanvas = new Array(virtualBackTextureInfo.size);
virtualShareWindowTextureInfo.mapTextureYToCanvas = new Array(virtualBackTextureInfo.size);

var gl;
var texture_max;
var hasShareWindow = false;
var windowShareMode = false;
var windowShareBackEnable = false;
var trimmingMode = false;
