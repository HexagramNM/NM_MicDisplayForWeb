
import { workerVersion } from "./workerVersion.js";

const matIV = (await import(`./minMatrix.js?v=${workerVersion}`)).matIV;
const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const createVbo = createWebGLObj.createVbo;
const createIbo = createWebGLObj.createIbo;
const PlaneBuffer = createWebGLObj.PlaneBuffer;

export class MicDftBar {
    constructor(gl, micSigMng, normalShaderInfo, circleRadius) {
        
        this.gl = gl;
        this.micSigMng = micSigMng;
        this.normalShaderInfo = normalShaderInfo;
        this.circleRadius = circleRadius;

        this.defaultGlobalColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        this.createDftBarBuffer();
        this.mMatrix = MicDftBar.mat.identity(MicDftBar.mat.create());
        this.mvpMatrix = MicDftBar.mat.identity(MicDftBar.mat.create());
    }

    createDftBarBuffer() {
        const vertex = [
            -0.8, 0.4, 0.0,
            -0.72, 0.32, 0.0,
            0.8, 0.4, 0.0,
            0.72, 0.32, 0.0,
            -0.8, -0.4, 0.0,
            -0.72, -0.32, 0.0,
            0.8, -0.4, 0.0,
            0.72, -0.32, 0.0
        ];
        this.positionVbo = createVbo(this.gl, vertex);
    
        const textureCoord_dummy = [
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0
        ];
        this.textureDummyVbo = createVbo(this.gl, textureCoord_dummy);

        this.barColorVboArray = new Array(this.micSigMng.dftBarMaxLevel);
        this.frameColorVboArray = new Array(this.micSigMng.dftBarMaxLevel);

        const baseColor = new Float32Array(4);
        const barColor_data = new Float32Array(4 * 4);
        const barFrameColor_data = new Float32Array(8 * 4);
        const oneThirdDftBarMaxLevel = this.micSigMng.dftBarMaxLevel / 3.0
        for (let levelIdx = 0; levelIdx < this.micSigMng.dftBarMaxLevel; levelIdx++) {
            if (levelIdx < Math.floor(oneThirdDftBarMaxLevel)) {
                baseColor[0] = 1.0;
                baseColor[1] = 0.5 + 0.5 * levelIdx / oneThirdDftBarMaxLevel;
                baseColor[2] = 0.0;
            }
            else if (levelIdx < 2 * oneThirdDftBarMaxLevel) {
                baseColor[0] = 1.0 - (levelIdx - oneThirdDftBarMaxLevel) / oneThirdDftBarMaxLevel;
                baseColor[1] = 1.0;
                baseColor[2] = 0.0;
            }
            else {
                baseColor[0] = 0.0;
                baseColor[1] = 1.0;
                baseColor[2] = (levelIdx - 2.0 * oneThirdDftBarMaxLevel) / oneThirdDftBarMaxLevel;
            }
            baseColor[3] = 0.3 + 0.7 * levelIdx / (this.micSigMng.dftBarMaxLevel - 1.0);

            for (var planeVertexIdx = 0; planeVertexIdx < 4; planeVertexIdx++) {
                for (var colorIdx = 0; colorIdx < 4; colorIdx++) {
                    barColor_data[planeVertexIdx * 4 + colorIdx] = baseColor[colorIdx];
                    if (planeVertexIdx == 1) {
                        barColor_data[planeVertexIdx * 4 + colorIdx] += 0.5;
                        if (barColor_data[planeVertexIdx * 4 + colorIdx] > 1.0) {
                            barColor_data[planeVertexIdx * 4 + colorIdx] = 1.0
                        }
                    }
                    else if (planeVertexIdx == 2) {
                        barColor_data[planeVertexIdx * 4 + colorIdx] *= 0.7;
                    }
                }
            }
    
            for (var frameVertexIdx = 0; frameVertexIdx < 8; frameVertexIdx++) {
                for (var colorIdx = 0; colorIdx < 4; colorIdx++) {
                    barFrameColor_data[frameVertexIdx * 4 + colorIdx] = baseColor[colorIdx];
                    if (frameVertexIdx == 2 || frameVertexIdx == 3) {
                        barFrameColor_data[frameVertexIdx * 4 + colorIdx] += 0.5;
                        if (barFrameColor_data[frameVertexIdx * 4 + colorIdx] > 1.0) {
                            barFrameColor_data[frameVertexIdx * 4 + colorIdx] = 1.0
                        }
                    }
                    else if (frameVertexIdx == 4 || frameVertexIdx == 5) {
                        barFrameColor_data[frameVertexIdx * 4 + colorIdx] *= 0.7;
                    }
                }
            }
    
            this.barColorVboArray[levelIdx] = createVbo(this.gl, barColor_data);
            this.frameColorVboArray[levelIdx] = createVbo(this.gl, barFrameColor_data);
        }
    
        const dftBarFrameIndex_data = [
            0, 1, 2, 2, 1, 3,
            2, 3, 6, 6, 3, 7,
            6, 7, 4, 4, 7, 5,
            4, 5, 0, 0, 5, 1
        ];
        this.iboLength = dftBarFrameIndex_data.length;
        this.ibo = createIbo(this.gl, dftBarFrameIndex_data);
    }

    draw(vpMatrix) {
        this.gl.useProgram(this.normalShaderInfo.program);

        //後ろの枠
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVbo);
        this.normalShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureDummyVbo);
        this.normalShaderInfo.enableAttribute(2);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 0);
        this.gl.uniform4fv(this.normalShaderInfo.uniLocation[3], this.defaultGlobalColor);
        for (var dftElemIdx = 0; dftElemIdx < this.micSigMng.dftElementNum; dftElemIdx++) {
            for (var levelIdx = 0; levelIdx < this.micSigMng.previousDftWaveLevel[dftElemIdx]; levelIdx++) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.frameColorVboArray[levelIdx]);
                this.normalShaderInfo.enableAttribute(1);
                
                MicDftBar.mat.identity(this.mMatrix);
                MicDftBar.mat.rotate(this.mMatrix, 
                    (75.0 - 150.0 * dftElemIdx / (this.micSigMng.dftElementNum - 1)) * Math.PI / 180.0, 
                    [0.0, 1.0, 0.0], this.mMatrix);
                MicDftBar.mat.translate(this.mMatrix, 
                    [0.0, 0.5 + 1.0 * levelIdx, this.circleRadius + 0.4], this.mMatrix);
                MicDftBar.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);

                this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
                this.gl.drawElements(this.gl.TRIANGLES, this.iboLength, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        // 前のパネル
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.positionVbo);
        this.normalShaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, PlaneBuffer.planeTextureVbo);
        this.normalShaderInfo.enableAttribute(2);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, PlaneBuffer.ibo);
        
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[1], 0);
        this.gl.uniform1i(this.normalShaderInfo.uniLocation[2], 0);

        for (var dftElemIdx = 0; dftElemIdx < this.micSigMng.dftElementNum; dftElemIdx++) {
            for (var levelIdx = 0; levelIdx < this.micSigMng.currentDftWaveLevel[dftElemIdx]; levelIdx++) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.barColorVboArray[levelIdx]);
                this.normalShaderInfo.enableAttribute(1);

                MicDftBar.mat.identity(this.mMatrix);
                MicDftBar.mat.rotate(this.mMatrix,
                    (75.0 - 150.0 * dftElemIdx / (this.micSigMng.dftElementNum - 1)) * Math.PI / 180.0,
                    [0.0, 1.0, 0.0], this.mMatrix);
                MicDftBar.mat.translate(this.mMatrix, 
                    [0.0, 0.5 + 1.0 * levelIdx, this.circleRadius + 0.2], this.mMatrix);
                MicDftBar.mat.scale(this.mMatrix, [0.8, 0.4, 1.0], this.mMatrix);
                MicDftBar.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);

                this.gl.uniformMatrix4fv(this.normalShaderInfo.uniLocation[0], false, this.mvpMatrix);
                this.gl.drawElements(this.gl.TRIANGLES, PlaneBuffer.iboLength, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
}

MicDftBar.mat = new matIV();
