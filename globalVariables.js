var g_backgroundColor = {r: 50, g: 0, b: 0};
var g_backgroundColorCode = "#" + g_backgroundColor.r.toString(16).padStart(2, "0")
    + g_backgroundColor.g.toString(16).padStart(2, "0") + g_backgroundColor.b.toString(16).padStart(2, "0");

var g_blazePoseModelType = "lite";
var g_virtualBackOriginalSize = {width: 960, height: 720};
var g_virtualShareWindowTrimmedSize = {width: 1920, height: 1080};

var g_virtualBackPreviousBlazePoseCanvas = null;
var g_virtualBackPreviousBlazePoseCanvasCtx = null;

var g_gl;
var g_plane_index = [
	0, 2, 1,
	1, 2, 3
];
var g_plane_position_vbo;
var g_plane_color_vbo;
var g_plane_texture_vbo;
var g_image_texture_vbo;
var g_plane_index_ibo;

function g_createPlaneBuffer() {
  var vertex_position = [
		-1.0, 1.0, 0.0,
		1.0, 1.0, 0.0,
		-1.0, -1.0, 0.0,
		1.0,-1.0,0.0

	];
	var vertex_color = [
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0
	];
	var plane_texture_coord=[
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];
  var image_texture_coord=[
		0.0, 1.0,
		1.0, 1.0,
		0.0, 0.0,
		1.0, 0.0
	];
  function create_vbo(data) {
  	var vbo=g_gl.createBuffer();
  	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, vbo);
  	g_gl.bufferData(g_gl.ARRAY_BUFFER, new Float32Array(data), g_gl.STATIC_DRAW);
  	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, null);
  	return vbo;
  }
  function create_ibo(data) {
  	var ibo = g_gl.createBuffer();
  	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, ibo);
  	g_gl.bufferData(g_gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), g_gl.STATIC_DRAW);
  	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, null);
  	return ibo;
  }
	g_plane_position_vbo = create_vbo(vertex_position);
	g_plane_color_vbo = create_vbo(vertex_color);
	g_plane_texture_vbo = create_vbo(plane_texture_coord);
  g_image_texture_vbo = create_vbo(image_texture_coord);
	g_plane_index_ibo = create_ibo(g_plane_index);
}

var g_texture_max;
var g_hasVirtualBack = false;
var g_hasShareWindow = false;
var g_windowShareMode = false;
var g_windowShareBackEnable = false;
var g_trimmingMode = false;

var g_virtualBackTextureObj = null;
var g_virtualShareWindowTextureObj = null;
