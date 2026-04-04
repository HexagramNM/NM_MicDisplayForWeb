import {
    createShader,
    ShaderInfo,
    PlaneBuffer
} from "./createWebGLObj.js";
import imageVshaderSrc from "./../shaders/imageVshader.vert.js";
import binarizationFshaderSrc from "./../shaders/binarizationFshader.frag.js";
import sdfFshaderSrc from "./../shaders/sdfFshader.frag.js";
import outlineFshaderSrc from "./../shaders/outlineFshader.frag.js";

export class OutlineTextureGenerator {
    constructor(gl, sourceTexture, textureSize, tmpTextureShrinkRate) {
        this.gl = gl;
        this.sourceTexture = sourceTexture;
        this.textureSize = textureSize;
        this.tmpTextureShrinkRate = tmpTextureShrinkRate;

        const imgShader = createShader(this.gl, imageVshaderSrc, "x-shader/x-vertex");
	    const binShader = createShader(this.gl, binarizationFshaderSrc, "x-shader/x-fragment");
	    const sdfShader = createShader(this.gl, sdfFshaderSrc, "x-shader/x-fragment");
        const outlineShader = createShader(this.gl, outlineFshaderSrc, "x-shader/x-fragment");

        this.binarizationShaderInfo = new ShaderInfo(this.gl, imgShader, binShader,
            ['position', 'textureCoord'], [3, 2], ['texture', 'alphaThreshold']);
        this.sdfShaderInfo = new ShaderInfo(this.gl, imgShader, sdfShader,
            ['position', 'textureCoord'], [3, 2], ['texture', 'thickness', 'textureSize']);
        this.outlineShaderInfo = new ShaderInfo(this.gl, imgShader, outlineShader,
            ['position', 'textureCoord'], [3, 2],
            ['textureMain', 'textureSdf', 'lineColorIn', 'lineColorOut', 'outlineAlpha']);

        this.framebufferNum = 3;
        this.texture = new Array(this.framebufferNum);
        this.framebuffer = new Array(this.framebufferNum);

    	for (var i = 0; i < this.framebufferNum; i++) {
            const textureSize = this.textureSize
                / (i == this.framebufferNum - 1 ? 1 : this.tmpTextureShrinkRate);
            this.framebuffer[i] = this.gl.createFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer[i]);

            const depthRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, textureSize, textureSize);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthRenderbuffer);

            this.texture[i] = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture[i]);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, textureSize, textureSize, 0,
            this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      	    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture[i], 0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    	}
    }

    settingVbo(shaderInfo) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        shaderInfo.enableAttribute(0);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.imageTextureVbo);
        shaderInfo.enableAttribute(1);
}

    generateOutline(thickness, alphaThreshold, lineColorIn, lineColorOut, outlineAlpha) {
        if (lineColorIn.length != 3 || lineColorOut.length != 3) {
            return;
        }

        const previousViewport = this.gl.getParameter(this.gl.VIEWPORT);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.viewport(0, 0, this.textureSize / this.tmpTextureShrinkRate, this.textureSize / this.tmpTextureShrinkRate);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clearDepth(1.0);

		this.gl.useProgram(this.binarizationShaderInfo.program);
		this.settingVbo(this.binarizationShaderInfo);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
    	this.gl.uniform1i(this.binarizationShaderInfo.uniLocation[0], 0);
        this.gl.uniform1f(this.binarizationShaderInfo.uniLocation[1], alphaThreshold);

    	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer[0]);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    	this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

        this.gl.useProgram(this.sdfShaderInfo.program);
		this.settingVbo(this.sdfShaderInfo);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
        this.gl.uniform1i(this.sdfShaderInfo.uniLocation[0], 0);
        this.gl.uniform1f(this.sdfShaderInfo.uniLocation[1], thickness / this.tmpTextureShrinkRate);
        this.gl.uniform1f(this.sdfShaderInfo.uniLocation[2], this.textureSize / this.tmpTextureShrinkRate);

		var previousFramebufferId = 0;
		const useFramebufferNum = 2;
    	for (var i = 0; i < thickness / this.tmpTextureShrinkRate; i++) {
            const currentFramebufferId = (previousFramebufferId + 1) % useFramebufferNum;
    		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer[currentFramebufferId]);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture[previousFramebufferId]);
    		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    		this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
    		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            previousFramebufferId = currentFramebufferId;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);

        this.gl.useProgram(this.outlineShaderInfo.program);
		this.settingVbo(this.outlineShaderInfo);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
        this.gl.uniform1i(this.outlineShaderInfo.uniLocation[0], 0);
        this.gl.uniform1i(this.outlineShaderInfo.uniLocation[1], 1);
        this.gl.uniform3fv(this.outlineShaderInfo.uniLocation[2], lineColorIn);
        this.gl.uniform3fv(this.outlineShaderInfo.uniLocation[3], lineColorOut);
		this.gl.uniform1f(this.outlineShaderInfo.uniLocation[4], outlineAlpha);

        this.gl.viewport(0, 0, this.textureSize, this.textureSize);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer[this.framebufferNum - 1]);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture[previousFramebufferId]);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.viewport(previousViewport[0], previousViewport[1],
            previousViewport[2], previousViewport[3]);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
    }

    getOutputTexture() {
        return this.texture[this.framebufferNum - 1];
    }
}
