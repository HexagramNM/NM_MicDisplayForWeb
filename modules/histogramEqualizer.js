import {
    createVbo,
    createIbo,
    createShader,
    ShaderInfo,
    CanvasTexture
} from "./createWebGLObj.js";
import imageVshaderSrc from "./../shaders/imageVshader.vert.js";
import histogramEqualizerFshaderSrc from "../shaders/histogramEqualizerFshader.frag.js";


export class HistogramEqualizer {
    constructor(inputCanvasId, outputCanvasId) {
        this.inputCanvas = document.getElementById(inputCanvasId);
        this.inputCanvasCtx = this.inputCanvas.getContext("2d");

        this.outputCanvas = document.getElementById(outputCanvasId);
        this.gl = this.outputCanvas.getContext("webgl") || this.outputCanvas.getContext("experimental-webgl");
        this.inputTexture = new CanvasTexture(this.gl, inputCanvasId);
        
        this.vertShader = createShader(this.gl, imageVshaderSrc, "x-shader/x-vertex");
        this.fragShader = createShader(this.gl, histogramEqualizerFshaderSrc, "x-shader/x-fragment");
        this.shaderInfo = new ShaderInfo(this.gl, this.vertShader, this.fragShader,
            ["position", "textureCoord"], [3, 2], ["texture", "cdf"]);

        this.histogram = new Uint32Array(HistogramEqualizer.histogramLevel);
        this.cdf = new Uint8ClampedArray(HistogramEqualizer.histogramLevel);
        this.cdfTexture = this.gl.createTexture();

        this.gl.enable(this.gl.BLEND);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.planePositionVbo = createVbo(this.gl, 
            [
                -1.0, 1.0, 0.0,
                1.0, 1.0, 0.0,
                -1.0, -1.0, 0.0,
                1.0, -1.0, 0.0
            ]);
        this.planeTextureCoordVbo = createVbo(this.gl,
            [
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
                1.0, 1.0
            ]);
        this.planeIbo = createIbo(this.gl,
            [
                0, 2, 1,
                1, 2, 3
            ]);
        this.planeIboLength = 6;
    }

    calcCDF() {
        const canvasPixelData 
            = this.inputCanvasCtx.getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
        
        const sourceImagePixelNum 
            = HistogramEqualizer.samplingWidth * HistogramEqualizer.samplingHeight;
        for (var idx = 0; idx < HistogramEqualizer.histogramLevel; idx++) {
            this.histogram[idx] = 0;
        }
        
        var mul = HistogramEqualizer.histogramLevel / 256.0;
        const stepWidth = Math.floor(this.inputCanvas.width / HistogramEqualizer.samplingWidth);
        const stepHeight = Math.floor(this.inputCanvas.height / HistogramEqualizer.samplingHeight);

        for (var y = 0; y < this.inputCanvas.height; y += stepHeight) {
            for (var x = 0; x < this.inputCanvas.width; x += stepWidth) {
                const pixelPos = (y * this.inputCanvas.width + x) * 4;
                const r = canvasPixelData.data[pixelPos];
                const g = canvasPixelData.data[pixelPos + 1];
                const b = canvasPixelData.data[pixelPos + 2];
                const yValue = 0.299 * r + 0.587 * g + 0.114 * b;
                this.histogram[(yValue * mul | 0)]++;
            }
        }
    
        for (var idx = 1; idx < HistogramEqualizer.histogramLevel; idx++) {
            this.histogram[idx] = this.histogram[idx - 1] + this.histogram[idx];
        }
    
        mul = 255.0 / sourceImagePixelNum;
        for (var idx = 0; idx < HistogramEqualizer.histogramLevel; idx++) {
            this.cdf[idx] = (this.histogram[idx] * mul | 0);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.cdfTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, HistogramEqualizer.histogramLevel, 1, 0,
            this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, this.cdf);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    apply() {
        this.inputTexture.redraw();
        this.calcCDF();

        this.gl.viewport(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.planePositionVbo);
        this.shaderInfo.enableAttribute(0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.planeTextureCoordVbo);
        this.shaderInfo.enableAttribute(1);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.planeIbo);

        this.gl.useProgram(this.shaderInfo.program);

        this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.inputTexture.texId);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.cdfTexture);

    	this.gl.uniform1i(this.shaderInfo.uniLocation[0], 0);
        this.gl.uniform1i(this.shaderInfo.uniLocation[1], 1);

        this.gl.drawElements(this.gl.TRIANGLES, this.planeIboLength, this.gl.UNSIGNED_SHORT, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    } 
}

HistogramEqualizer.histogramLevel = 256;
HistogramEqualizer.samplingWidth = 256;
HistogramEqualizer.samplingHeight = 256;
