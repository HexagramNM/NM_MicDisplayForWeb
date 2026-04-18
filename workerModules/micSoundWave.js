
import { workerVersion } from "./workerVersion.js";

const matIV = (await import(`./minMatrix.js?v=${workerVersion}`)).matIV;
const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const createVbo = createWebGLObj.createVbo;
const createIbo = createWebGLObj.createIbo;

export class MicSoundWave {
    constructor(gl, micSigMng, normalShaderInfo) {
        this.gl = gl;
        this.micSigMng = micSigMng;
        this.normalShaderInfo = normalShaderInfo;
        
        this.soundDisplayLength = micSigMng.soundDisplayLength;
        this.waveStartBlendRate = 0.35;
        this.waveRadius = 9.0;
        this.waveHeight = 5.0;
        this.waveLineWidthHalf = 0.08;
        this.waveOffsetHeight = 4.0;

        this.defaultGlobalColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        this.createSoundWaveBuffer();
        this.mMatrix = MicSoundWave.mat.identity(MicSoundWave.mat.create());
        this.mvpMatrix = MicSoundWave.mat.identity(MicSoundWave.mat.create());
    } 

    createSoundWaveBuffer() {
        this.position_data = new Float32Array(this.soundDisplayLength * 2 * 3);
        var color_data = new Float32Array(this.soundDisplayLength * 2 * 4);
        var dummyTexture_data = new Float32Array(this.soundDisplayLength * 2 * 2);
        var index_data = new Int32Array(this.soundDisplayLength * 6);
        var currentAngle = Math.PI / 2.0;
        const stepAngle = 2.0 * Math.PI / this.soundDisplayLength;
        for (var idx = 0; idx < this.soundDisplayLength; idx++) {
            this.position_data[idx * 3] = this.waveRadius * Math.cos(currentAngle);
            this.position_data[idx * 3 + 1] = this.waveOffsetHeight + this.waveLineWidthHalf;
            this.position_data[idx * 3 + 2] = this.waveRadius * Math.sin(currentAngle);
            this.position_data[(idx + this.soundDisplayLength) * 3] = this.position_data[idx * 3];
            this.position_data[(idx + this.soundDisplayLength) * 3 + 1] = this.waveOffsetHeight - this.waveLineWidthHalf;
            this.position_data[(idx + this.soundDisplayLength) * 3 + 2] = this.position_data[idx * 3 + 2];
            currentAngle += stepAngle;

            color_data[idx * 4] = 0.0;
            color_data[idx * 4 + 1] = (idx < this.soundDisplayLength / 2 ? idx * 2.0 / this.soundDisplayLength: 1.0);
            color_data[idx * 4 + 2] = (idx < this.soundDisplayLength / 2 ? 1.0: 2.0 - idx * 2.0 / this.soundDisplayLength);
            if (idx < this.soundDisplayLength * this.waveStartBlendRate) {
                color_data[idx * 4 + 3] = idx / (this.soundDisplayLength * this.waveStartBlendRate);
            }
            else if (idx > this.soundDisplayLength * (1.0 - this.waveStartBlendRate)) {
                color_data[idx * 4 + 3] = (this.soundDisplayLength - idx) / (this.soundDisplayLength * this.waveStartBlendRate);
            }
            else {
                color_data[idx * 4 + 3] = 1.0;
            }
            for (var colorIdx = 0; colorIdx < 4 * this.soundDisplayLength; colorIdx++) {
                color_data[(idx + this.soundDisplayLength) * 4 + colorIdx] = color_data[idx * 4 + colorIdx];
            }

            dummyTexture_data[idx * 2] = 0.0;
            dummyTexture_data[idx * 2 + 1] = 0.0;
            dummyTexture_data[(idx + this.soundDisplayLength) * 2] = 0.0;
            dummyTexture_data[(idx + this.soundDisplayLength) * 2 + 1] = 0.0;
    
            index_data[idx * 6] = idx;
            index_data[idx * 6 + 1] = idx + this.soundDisplayLength;
            index_data[idx * 6 + 2] = (idx + 1) % this.soundDisplayLength;
            index_data[idx * 6 + 3] = index_data[idx * 6 + 2];
            index_data[idx * 6 + 4] = idx + this.soundDisplayLength;
            index_data[idx * 6 + 5] = index_data[idx * 6 + 2] + this.soundDisplayLength;
        }

        this.position_vbo = createVbo(this.gl, this.position_data, true);
        this.color_vbo = createVbo(this.gl, color_data);
        this.dummyTexture_vbo = createVbo(this.gl, dummyTexture_data);
        this.index_ibo = createIbo(this.gl, index_data);
    }

    update() {
        for (var idx = 0; idx < this.soundDisplayLength; idx++) {
            const value = this.micSigMng.waveDataFloat[idx];
            const height = this.waveOffsetHeight + value * this.waveHeight;
            this.position_data[idx * 3 + 1] = height + this.waveLineWidthHalf;
            this.position_data[(idx + this.soundDisplayLength) * 3 + 1] = height - this.waveLineWidthHalf;
        }
    }

    draw(vpMatrix) {
        this.gl.useProgram(this.normalShaderInfo.program);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.position_vbo);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.position_data);
        this.normalShaderInfo.enableAttribute(0)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.color_vbo);
        this.normalShaderInfo.enableAttribute(1)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dummyTexture_vbo);
        this.normalShaderInfo.enableAttribute(2)
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.index_ibo);
    
        MicSoundWave.mat.identity(this.mMatrix);
        MicSoundWave.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
        this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 0);
        this.gl.uniform4fv(this.normalShaderInfo.uniLocation[3], this.defaultGlobalColor);
        this.gl.drawElements(this.gl.TRIANGLES, this.soundDisplayLength * 6, this.gl.UNSIGNED_SHORT, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
}

MicSoundWave.mat = new matIV();
