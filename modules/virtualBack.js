import {
    CanvasTexture,
    PlaneBuffer
} from "./createWebGLObj.js";
import {matIV} from "./minMatrix.js";
import { OutlineTextureGenerator } from "./outlineTextureGenerator.js";
import {VirtualBackEffector} from "./virtualBackEffector.js";

export class VirtualBack {
    constructor(gl, width, height, virtualBackShaderInfo) {
        this.gl = gl;
        this.virtualBackShaderInfo = virtualBackShaderInfo;
        this.virtualBackTexture = new CanvasTexture(this.gl, "virtualBackTexture");
        const virtualBackTextureSize = document.getElementById("virtualBackTexture").width;

        this.mMatrix = VirtualBack.mat.identity(VirtualBack.mat.create());
        this.mvpMatrix = VirtualBack.mat.identity(VirtualBack.mat.create());
        
        this.aspect = 0.0;
        if (width > 0.0) {
            this.aspect = height / width;
        }

        this.effector = new VirtualBackEffector(
            this.gl, this.virtualBackTexture.texId, virtualBackTextureSize);

        this.outlineTexture = new OutlineTextureGenerator(
            this.gl, this.effector.getOutputTexture(), virtualBackTextureSize, 4.0);
    }

    update() {
        this.virtualBackTexture.redraw();
        this.effector.applyEffect();
        this.outlineTexture.generateOutline(12, 0.5, [0.8, 1.0, 1.0], [0.0, 0.0, 1.0], 1.0);
    }

    draw(vpMatrix) {
        this.gl.useProgram(this.virtualBackShaderInfo.program);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        this.virtualBackShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.colorVbo);
        this.virtualBackShaderInfo.enableAttribute(1);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.planeTextureVbo);
        this.virtualBackShaderInfo.enableAttribute(2);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.outlineTexture.getOutputTexture());

        VirtualBack.mat.identity(this.mMatrix);
        VirtualBack.mat.translate(this.mMatrix, [0.0, 5.5, -6.0], this.mMatrix);
        VirtualBack.mat.rotate(this.mMatrix, Math.PI, [0.0, 1.0, 0.0], this.mMatrix);
        VirtualBack.mat.scale(this.mMatrix, [VirtualBack.captureWidth, VirtualBack.captureWidth * this.aspect, 1.0], this.mMatrix);
        VirtualBack.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
        this.gl.uniformMatrix4fv(this.virtualBackShaderInfo.uniLocation[0], false, this.mvpMatrix);
        this.gl.uniform1i(this.virtualBackShaderInfo.uniLocation[1], 0);
        this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

VirtualBack.mat = new matIV();
VirtualBack.captureWidth = 6.5;
