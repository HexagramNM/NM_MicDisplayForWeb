var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

var virtualBackOriginalSize = {width: 960, height: 720}
var virtualShareWindowTrimmedSize = {width: 1920, height: 1080};

var gl;
var texture_max;
var hasShareWindow = false;
var windowShareMode = false;
var windowShareBackEnable = false;
var trimmingMode = false;
