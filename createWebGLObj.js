
var requestTextureNum = 0;
var loadedTextureNum = 0;
var textureProcess = new Array();

function create_vbo(data, isDynamic=false) {
	var vbo=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	if (isDynamic) {
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
	}
	else {
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	return vbo;
}

function create_ibo(data) {
	var ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	return ibo;
}

function create_texture(source, number) {
	if (number >= texture_max) {
		return;
	}
    requestTextureNum++;
	var img = new Image();
	img.onload = function() {
		var tex = gl.createTexture();
		gl.activeTexture(gl["TEXTURE" + number.toString()]);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		loadedTextureNum++;
	};
	img.src = source;
}

function create_dynamic_texture(canvasId, number) {
	if (number >= texture_max) {
		return;
	}
	var sourceCanvas = document.getElementById(canvasId);
	var tex = gl.createTexture();
	dynamicTextureSetting();
	textureProcess.push(dynamicTextureSetting);
    requestTextureNum++;
	loadedTextureNum++;

	function dynamicTextureSetting() {
		gl.activeTexture(gl["TEXTURE" + number.toString()]);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}
}

function create_shader(id) {
    var shader;
    var scriptElement=document.getElementById(id);
    if (!scriptElement){return;}
    switch(scriptElement.type) {
        case 'x-shader/x-vertex':
            shader=gl.createShader(gl.VERTEX_SHADER);
            break;
        case 'x-shader/x-fragment':
            shader=gl.createShader(gl.FRAGMENT_SHADER);
            break;
        default:
            return;
    }
    gl.shaderSource(shader, scriptElement.text);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    } else {
        alert(gl.getShaderInfoLog(shader));
    }
}

function create_program(vs, fs) {
    var program=gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        return program;
    } else {
        alert(gl.getProgramInfoLog(program));
    }
}

function finish_load_texture() {
    return (requestTextureNum == loadedTextureNum);
}

function process_dynamic_texture() {
    if (finish_load_texture()) {
        for (var idx = 0; idx < textureProcess.length; idx++) {
            textureProcess[idx]();
        }
    }
    setTimeout(arguments.callee, 1000/60);
}
