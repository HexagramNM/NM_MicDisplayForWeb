
var requestTextureNum = 0;
var loadedTextureNum = 0;

export function create_vbo(data, isDynamic=false) {
	var vbo=g_gl.createBuffer();
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, vbo);
	if (isDynamic) {
		g_gl.bufferData(g_gl.ARRAY_BUFFER, new Float32Array(data), g_gl.DYNAMIC_DRAW);
	}
	else {
		g_gl.bufferData(g_gl.ARRAY_BUFFER, new Float32Array(data), g_gl.STATIC_DRAW);
	}
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, null);
	return vbo;
}

export function create_ibo(data) {
	var ibo = g_gl.createBuffer();
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, ibo);
	g_gl.bufferData(g_gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), g_gl.STATIC_DRAW);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, null);
	return ibo;
}

export function create_texture(source, number) {
	if (number >= g_texture_max) {
		return;
	}
    requestTextureNum++;
	var img = new Image();
	img.onload = function() {
		var tex = g_gl.createTexture();
		g_gl.activeTexture(g_gl["TEXTURE" + number.toString()]);
		g_gl.bindTexture(g_gl.TEXTURE_2D, tex);
		g_gl.texImage2D(g_gl.TEXTURE_2D, 0, g_gl.RGBA, g_gl.RGBA, g_gl.UNSIGNED_BYTE, img);
		g_gl.generateMipmap(g_gl.TEXTURE_2D);
		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MIN_FILTER, g_gl.NEAREST_MIPMAP_LINEAR);
		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MAG_FILTER, g_gl.LINEAR)
		loadedTextureNum++;
	};
	img.src = source;
}

export class DynamicTexture {
	constructor(canvasId, textureNumber) {
		this.sourceCanvas = document.getElementById(canvasId);
		this.canvasId = canvasId;
		this.textureNumber = textureNumber;
		if (textureNumber >= g_texture_max) {
			return;
		}
		this.tex = g_gl.createTexture();
		this.redraw();
	    requestTextureNum++;
		loadedTextureNum++;
	}

	redraw() {
		g_gl.activeTexture(g_gl["TEXTURE" + this.textureNumber.toString()]);
		g_gl.bindTexture(g_gl.TEXTURE_2D, this.tex);
		g_gl.texImage2D(g_gl.TEXTURE_2D, 0, g_gl.RGBA, g_gl.RGBA, g_gl.UNSIGNED_BYTE, this.sourceCanvas);
		g_gl.generateMipmap(g_gl.TEXTURE_2D);
		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MIN_FILTER, g_gl.NEAREST_MIPMAP_LINEAR);
		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MAG_FILTER, g_gl.LINEAR);
	}
}

export function create_shader(src, shaderType) {
    var shader;
    if (!src){return;}
		switch (shaderType) {
			case "x-shader/x-vertex":
				shader=g_gl.createShader(g_gl.VERTEX_SHADER);
				break;
			case "x-shader/x-fragment":
				shader=g_gl.createShader(g_gl.FRAGMENT_SHADER);
				break;
			default:
				return;
		}
    g_gl.shaderSource(shader, src);
    g_gl.compileShader(shader);
    if (g_gl.getShaderParameter(shader, g_gl.COMPILE_STATUS)) {
        return shader;
    } else {
        alert(g_gl.getShaderInfoLog(shader));
    }
}

export function create_program(vs, fs) {
    var program=g_gl.createProgram();
    g_gl.attachShader(program, vs);
    g_gl.attachShader(program, fs);
    g_gl.linkProgram(program);
    if (g_gl.getProgramParameter(program, g_gl.LINK_STATUS)) {
        g_gl.useProgram(program);
        return program;
    } else {
        alert(g_gl.getProgramInfoLog(program));
    }
}

export function finish_load_texture() {
    return (requestTextureNum == loadedTextureNum);
}
