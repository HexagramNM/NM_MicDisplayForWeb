var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

var virtualBackCanvasSize = {width: 480, height: 360};
var virtualBackTextureInfo = {canvasName: "virtualBackTexture", isChanged: false};
var windowShareMode = false;
var trimmingMode = false;
