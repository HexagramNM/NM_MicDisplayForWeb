
import { workerVersion } from "./workerVersion.js";

const matIV = (await import(`./minMatrix.js?v=${workerVersion}`)).matIV;
const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const BitmapTexture = createWebGLObj.BitmapTexture;
const PlaneBuffer = createWebGLObj.PlaneBuffer;
const OutlineTextureGenerator = (await import(`./outlineTextureGenerator.js?v=${workerVersion}`)).OutlineTextureGenerator;
const VirtualBackEffector = (await import(`./virtualBackEffector.js?v=${workerVersion}`)).VirtualBackEffector;

export class VirtualBack {
    constructor(gl, inputWidth, inputHeight, textureSize, virtualBackShaderInfo) {
        this.gl = gl;
        this.virtualBackShaderInfo = virtualBackShaderInfo;
        this.inputTexture = new BitmapTexture(gl);

        this.mMatrix = VirtualBack.mat.identity(VirtualBack.mat.create());
        this.mvpMatrix = VirtualBack.mat.identity(VirtualBack.mat.create());
        
        this.aspect = 0.0;
        if (inputWidth > 0.0) {
            this.aspect = inputHeight / inputWidth;
        }

        this.effector = new VirtualBackEffector(
            this.gl, this.inputTexture.texId, textureSize);

        this.outlineTexture = new OutlineTextureGenerator(
            this.gl, this.effector.getOutputTexture(),
            textureSize, inputWidth, inputHeight);
    }

    updateTexture(bitmap) {
        this.inputTexture.redraw(bitmap);
    }

    update() {
        this.effector.applyEffect();
        this.outlineTexture.generateOutline(16, 0.5, [0.8, 1.0, 1.0], [0.0, 0.0, 1.0], 1.0);
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
