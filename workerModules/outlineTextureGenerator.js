
import { workerVersion } from "./workerVersion.js";

const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const createShader = createWebGLObj.createShader;
const ShaderInfo = createWebGLObj.ShaderInfo;
const PlaneBuffer = createWebGLObj.PlaneBuffer;
const imageVshaderSrc = (await import(`./../shaders/imageVshader.vert.js?v=${workerVersion}`)).default;
const binarizationFshaderSrc = (await import(`./../shaders/binarizationFshader.frag.js?v=${workerVersion}`)).default;
const jfaForCreatingSdfFshaderSrc = (await import(`./../shaders/jfaForCreatingSdfFshader.frag.js?v=${workerVersion}`)).default;
const outlineFshaderSrc = (await import(`./../shaders/outlineFshader.frag.js?v=${workerVersion}`)).default;

export class OutlineTextureGenerator {
    constructor(gl, sourceTexture, textureSize, originalWidth, originalHeight) {
        this.gl = gl;
        this.sourceTexture = sourceTexture;
        this.textureSize = textureSize;
        this.originalWidth = originalWidth;
        this.originalHeight = originalHeight;

        const imgShader = createShader(this.gl, imageVshaderSrc, "x-shader/x-vertex");
	    const binShader = createShader(this.gl, binarizationFshaderSrc, "x-shader/x-fragment");
	    const jfaShader = createShader(this.gl, jfaForCreatingSdfFshaderSrc, "x-shader/x-fragment");
        const outlineShader = createShader(this.gl, outlineFshaderSrc, "x-shader/x-fragment");

        this.binarizationShaderInfo = new ShaderInfo(this.gl, imgShader, binShader,
            ['position', 'textureCoord'], [3, 2], ['texture', 'alphaThreshold']);
        this.jfaShaderInfo = new ShaderInfo(this.gl, imgShader, jfaShader,
            ['position', 'textureCoord'], [3, 2],
            ['texture', 'stepSize', 'originalSize']);
        this.outlineShaderInfo = new ShaderInfo(this.gl, imgShader, outlineShader,
            ['position', 'textureCoord'], [3, 2],
            ['textureMain', 'textureSdf', 'originalSize', 'thickness',
            'lineColorIn', 'lineColorOut', 'outlineAlpha']);

        this.framebufferNum = 3;
        this.texture = new Array(this.framebufferNum);
        this.framebuffer = new Array(this.framebufferNum);

    	for (var i = 0; i < this.framebufferNum; i++) {
            this.framebuffer[i] = this.gl.createFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer[i]);

            const depthRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.textureSize, this.textureSize);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthRenderbuffer);

            this.texture[i] = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture[i]);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.textureSize, this.textureSize, 0,
                this.gl.RGBA, this.gl.FLOAT, null);
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
        this.gl.viewport(0, 0, this.textureSize, this.textureSize);
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

        this.gl.useProgram(this.jfaShaderInfo.program);
		this.settingVbo(this.jfaShaderInfo);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
        this.gl.uniform1i(this.jfaShaderInfo.uniLocation[0], 0);
        this.gl.uniform2f(this.jfaShaderInfo.uniLocation[2],
            this.originalWidth, this.originalHeight);

		var previousFramebufferId = 0;
		const useFramebufferNum = 2;
        const stepNum = Math.ceil(Math.log2(thickness)) + 1;
    	for (var i = stepNum; i >= 0; i--) {
            const currentFramebufferId = (previousFramebufferId + 1) % useFramebufferNum;
    		const stepSize = Math.pow(2, (i > 0 ? i - 1 : 0));
            this.gl.uniform1f(this.jfaShaderInfo.uniLocation[1], stepSize);
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
        this.gl.uniform2f(this.outlineShaderInfo.uniLocation[2],
            this.originalWidth, this.originalHeight);
        this.gl.uniform1f(this.outlineShaderInfo.uniLocation[3], thickness);
        this.gl.uniform3fv(this.outlineShaderInfo.uniLocation[4], lineColorIn);
        this.gl.uniform3fv(this.outlineShaderInfo.uniLocation[5], lineColorOut);
		this.gl.uniform1f(this.outlineShaderInfo.uniLocation[6], outlineAlpha);
        
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
