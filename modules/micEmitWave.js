import {
    ImageTexture,
    PlaneBuffer
} from "./createWebGLObj.js";
import {matIV} from "./minMatrix.js";

export class MicEmitWave {
    constructor(gl, micSigMng, normalShaderInfo) {
        this.gl = gl;
        this.micSigMng = micSigMng;
        this.normalShaderInfo = normalShaderInfo;

	    this.emitWaveIsDisplay = new Array(MicEmitWave.emitWaveNum);
	    this.emitWaveDisplayCount = new Array(MicEmitWave.emitWaveNum);
        this.emitWaveColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);

        for (var emitIdx = 0; emitIdx < MicEmitWave.emitWaveNum; emitIdx++) {
            this.emitWaveIsDisplay[emitIdx] = false;
            this.emitWaveDisplayCount[emitIdx] = 0;
        }

        this.wavTexture = new ImageTexture(this.gl,
            "image/redCircleWave.png?" + new Date().getTime());
        this.mMatrix = MicEmitWave.mat.identity(MicEmitWave.mat.create());
        this.mvpMatrix = MicEmitWave.mat.identity(MicEmitWave.mat.create());
    }

    async waitForTextureLoading() {
        await this.wavTexture.waitForLoad();
    }

    update() {
        //音量上昇による波動発射状態の管理
        for (var emitIdx = 0; emitIdx < MicEmitWave.emitWaveNum; emitIdx++) {
            //カウント管理
            if (this.emitWaveIsDisplay[emitIdx]) {
                this.emitWaveDisplayCount[emitIdx]++;
                if (this.emitWaveDisplayCount[emitIdx] > 10) {
                    this.emitWaveIsDisplay[emitIdx] = false;
                }
            }
        }

        if (this.micSigMng.pulseEmit) {
            //発射登録
            for (var emitIdx = 0; emitIdx < MicEmitWave.emitWaveNum; emitIdx++) {
                if (!this.emitWaveIsDisplay[emitIdx]) {
                    this.emitWaveIsDisplay[emitIdx] = true;
                    this.emitWaveDisplayCount[emitIdx] = 0;
                    break;
                }
            }
        }
    }

    draw(vpMatrix) {
        this.gl.useProgram(this.normalShaderInfo.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        this.normalShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.colorVbo);
        this.normalShaderInfo.enableAttribute(1);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.planeTextureVbo);
        this.normalShaderInfo.enableAttribute(2);
        this.gl.vertexAttribPointer(this.normalShaderInfo.attLocation[2], this.normalShaderInfo.attStride[2], this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.wavTexture.texId);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 1);

        for (var emitIdx = 0; emitIdx < MicEmitWave.emitWaveNum; emitIdx++) {
            if (this.emitWaveIsDisplay[emitIdx]) {
                var scale = 1.0 + 3.0 * this.emitWaveDisplayCount[emitIdx] / 10.0;
                var alpha = 0.7 * (1.0 - this.emitWaveDisplayCount[emitIdx] / 10.0);
                MicEmitWave.mat.identity(this.mMatrix);
                MicEmitWave.mat.rotate(this.mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], this.mMatrix);
                MicEmitWave.mat.translate(this.mMatrix, [0.0, 0.0, 0.001 * this.emitWaveDisplayCount[emitIdx]], this.mMatrix);
                MicEmitWave.mat.scale(this.mMatrix, [MicEmitWave.circleRadius * scale, MicEmitWave.circleRadius * scale, 1.0], this.mMatrix);
                MicEmitWave.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
                this.emitWaveColor[3] = alpha

                this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
                this.gl.uniform4fv(this.normalShaderInfo.uniLocation[3], this.emitWaveColor);
                this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

MicEmitWave.mat = new matIV();
MicEmitWave.emitWaveNum = 50;
MicEmitWave.circleRadius = 13.0;
