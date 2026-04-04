import {
    ImageTexture,
    PlaneBuffer
} from "./createWebGLObj.js";
import {matIV} from "./minMatrix.js";

export class MagicCircle {
    constructor(gl, micSigMng, normalShaderInfo) {
        this.gl = gl;
        this.micSigMng = micSigMng;
        this.normalShaderInfo = normalShaderInfo;

        this.circleColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	    this.circleLightColor = new Float32Array([1.0, 0.5, 0.5, 0.0]); 
        this.count = 0.0;
        this.previousTimeStamp = performance.now();

        this.circleTexture = new ImageTexture(this.gl,
            "image/redCircle.png?" + new Date().getTime());

        this.circleLightTexture = new ImageTexture(this.gl,
            "image/redCircleLight.png?" + new Date().getTime());

        this.mMatrix = MagicCircle.mat.identity(MagicCircle.mat.create());
        this.mvpMatrix = MagicCircle.mat.identity(MagicCircle.mat.create());
    }

    async waitForTextureLoading() {
        await this.circleTexture.waitForLoad();
        await this.circleLightTexture.waitForLoad();
    }

    update() {
        //音量による魔法陣の透過率
        const waveAlphaMaxRate = 150.0;
        const alphaRate = (this.micSigMng.currentWaveLevel > waveAlphaMaxRate
            ? 1.0 : this.micSigMng.currentWaveLevel / waveAlphaMaxRate);
        this.circleColor[3] = 0.3 + 0.7 * alphaRate;
        this.circleLightColor[3] = 0.7 * alphaRate;

        const endTime = performance.now();
        this.count += (endTime - this.previousTimeStamp) * MagicCircle.fps * 0.001;
        this.previousTimeStamp = endTime;
    }

    draw(vpMatrix) {
        this.gl.useProgram(this.normalShaderInfo.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        this.normalShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.colorVbo);
        this.normalShaderInfo.enableAttribute(1);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.planeTextureVbo);
        this.normalShaderInfo.enableAttribute(2);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
    
        const rad = (this.count - Math.floor(this.count / 720.0) * 720.0) * Math.PI / 360;
        MagicCircle.mat.identity(this.mMatrix);
        MagicCircle.mat.rotate(this.mMatrix, rad, [0.0, 1.0, 0.0], this.mMatrix);
        MagicCircle.mat.rotate(this.mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], this.mMatrix);
        MagicCircle.mat.scale(this.mMatrix, [MagicCircle.circleRadius, MagicCircle.circleRadius, 1.0], this.mMatrix);
    
        //魔法陣発光部分
        MagicCircle.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
        this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleLightTexture.texId);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 1);
        this.gl.uniform4fv(this.normalShaderInfo.uniLocation[3], this.circleLightColor);
        this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
    
        //魔法陣本体
        MagicCircle.mat.translate(this.mMatrix, [0.0, 0.0, -0.001], this.mMatrix);
        MagicCircle.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
        this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleTexture.texId);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 1);
        this.gl.uniform4fv(this.normalShaderInfo.uniLocation[3], this.circleColor);
        this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

MagicCircle.mat = new matIV();
MagicCircle.circleRadius = 13.0;
MagicCircle.fps = 60.0;
