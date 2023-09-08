var g_backgroundColor = {r: 50, g: 0, b: 0};
var g_backgroundColorCode = "#" + g_backgroundColor.r.toString(16).padStart(2, "0")
    + g_backgroundColor.g.toString(16).padStart(2, "0") + g_backgroundColor.b.toString(16).padStart(2, "0");

var g_virtualBackOriginalSize = {width: 960, height: 720}
var g_virtualShareWindowTrimmedSize = {width: 1920, height: 1080};

var g_gl;
var g_texture_max;
var g_hasShareWindow = false;
var g_windowShareMode = false;
var g_windowShareBackEnable = false;
var g_trimmingMode = false;

var g_virtualBackTextureObj = null;
var g_virtualShareWindowTextureObj = null;
