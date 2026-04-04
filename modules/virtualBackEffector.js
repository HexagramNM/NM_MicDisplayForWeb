import {
    createShader,
    ShaderInfo,
    PlaneBuffer
} from "./createWebGLObj.js";
import imageVshaderSrc from "./../shaders/imageVshader.vert.js";
import backMaskFshaderSrc from "./../shaders/backMaskFshader.frag.js";

export class VirtualBackEffector {
    constructor(gl, sourceTexture, textureSize) {
        this.gl = gl;
        this.sourceTexture = sourceTexture;
        this.textureSize = textureSize;
        this.startTime = performance.now();

        const imgShader = createShader(this.gl, imageVshaderSrc, "x-shader/x-vertex");
        const bmShader = createShader(this.gl, backMaskFshaderSrc, "x-shader/x-fragment");
        this.backMaskShaderInfo = new ShaderInfo(this.gl, imgShader, bmShader,
            ['position', 'textureCoord'], [3, 2], ['texture', 'time']);

        this.outputTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.outputTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.textureSize, this.textureSize, 0,
            this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        this.framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        this.depthRenderbuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthRenderbuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16,
            this.textureSize, this.textureSize);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT,
            this.gl.RENDERBUFFER, this.depthRenderbuffer);
        
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D, this.outputTexture, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    applyEffect() {
        const time = (performance.now() - this.startTime) * VirtualBackEffector.timeRate;
        const previousViewPort = this.gl.getParameter(this.gl.VIEWPORT);
        this.gl.viewport(0, 0, this.textureSize, this.textureSize);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clearDepth(1.0);

        this.gl.useProgram(this.backMaskShaderInfo.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        this.backMaskShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.imageTextureVbo);
        this.backMaskShaderInfo.enableAttribute(1);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture);
        this.gl.uniform1i(this.backMaskShaderInfo.uniLocation[0], 0);
        this.gl.uniform1f(this.backMaskShaderInfo.uniLocation[1], time);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.gl.viewport(previousViewPort[0], previousViewPort[1],
            previousViewPort[2], previousViewPort[3]);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
    }

    getOutputTexture() {
        return this.outputTexture;
    }
}

VirtualBackEffector.timeRate = 60.0 / 50000.0
