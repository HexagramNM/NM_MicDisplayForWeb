export function createVbo(gl, data, isDynamic=false) {
    const vbo = gl.createBuffer();
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

export function createIbo(gl, data) {
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
}

export class ImageTexture {
    constructor(gl, source) {
        this.gl = gl;
        this.texId = gl.createTexture();
        this.source = source;
    }

    async waitForLoad() {
        const response = await fetch(this.source);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texId);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

export class BitmapTexture {
    constructor(gl) {
        this.gl = gl;
        this.texId = gl.createTexture();
    }

    redraw(bitmap) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texId);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

export class PlaneBuffer {
    static init(gl) {
        const planeIndex = [
            0, 2, 1,
            1, 2, 3
        ];
        const vertexPosition = [
            -1.0, 1.0, 0.0,
            1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0
        ];
        const vertexColor = [
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0
        ];
        const planeTextureCoord=[
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ];
        const imageTextureCoord=[
            0.0, 1.0,
            1.0, 1.0,
            0.0, 0.0,
            1.0, 0.0
        ];

        PlaneBuffer.iboLength = planeIndex.length;
        PlaneBuffer.positionVbo = createVbo(gl, vertexPosition);
        PlaneBuffer.colorVbo = createVbo(gl, vertexColor);
        PlaneBuffer.planeTextureVbo = createVbo(gl, planeTextureCoord);
        PlaneBuffer.imageTextureVbo = createVbo(gl, imageTextureCoord);
        PlaneBuffer.ibo = createIbo(gl, planeIndex);
    }
}

PlaneBuffer.iboLength = 0;
PlaneBuffer.positionVbo = null;
PlaneBuffer.colorVbo = null;
PlaneBuffer.planeTextureVbo = null;
PlaneBuffer.imageTextureVbo = null;
PlaneBuffer.ibo = null;

export function createShader(gl, src, shaderType) {
    var shader = null;
    if (!src) { return; }
    switch (shaderType) {
    case "x-shader/x-vertex":
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
    case "x-shader/x-fragment":
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
    default:
        return;
    }
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    } else {
        alert(gl.getShaderInfoLog(shader));
    }
}

export function createProgram(gl, vs, fs) {
    var program = gl.createProgram();
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

export class ShaderInfo {
    constructor(gl, vs, fs, attrLoc, attrSt, uniLoc) {
        this.gl = gl;
        this.program = createProgram(gl, vs, fs);
        this.attLocation = new Array();
        this.attStride = attrSt;
        this.uniLocation = new Array();

        for (var idx = 0; idx < attrLoc.length; idx++) {
            this.attLocation[idx] = this.gl.getAttribLocation(this.program, attrLoc[idx]);
        }

        for (var idx = 0; idx < uniLoc.length; idx++) {
            this.uniLocation[idx] = this.gl.getUniformLocation(this.program, uniLoc[idx]);
        }
    }

    enableAttribute(idx) {
        this.gl.enableVertexAttribArray(this.attLocation[idx]);
        this.gl.vertexAttribPointer(this.attLocation[idx], this.attStride[idx], this.gl.FLOAT, false, 0, 0);
    }
}
