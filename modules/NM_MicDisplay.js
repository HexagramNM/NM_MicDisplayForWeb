import {matIV} from "./minMatrix.js";
import {createShader,
	ShaderInfo} from "./createWebGLObj.js";
import {MicSignalManager} from "./micSignalManager.js";
import {MagicCircle} from "./magicCircle.js";
import {MicDftBar} from "./micDftBar.js";
import {MicEmitWave} from "./micEmitWave.js";
import {MicSoundWave} from "./micSoundWave.js";
import {VirtualBack} from "./virtualBack.js";
import {SharedWindow} from "./sharedWindow.js";

import normalVshaderSrc from "./../shaders/normalVshader.vert.js";
import normalFshaderSrc from "./../shaders/normalFshader.frag.js";
import cornerFadeFshaderSrc from "./../shaders/cornerFadeFshader.frag.js";
import virtualShareWindowFshaderSrc from "./../shaders/virtualShareWindowFshader.frag.js";

export class NM_MicDisplay {
	constructor(gl, micStream, sharedWindowMng, virtualBackImageProc) {
		this.previousMousePos = [null, null];
		this.canvasPositionInWindowShareMode = [0, 0];

		this.gl = gl;
		this.sharedWindowMng = sharedWindowMng;
		this.virtualBackImageProc = virtualBackImageProc;

		this.adjustCanvasSize(true);
		const c = document.getElementById('NM_MicDisplayOutput');
		c.addEventListener("mousedown", (e) => { this.mouseDownEvent(e); });
		c.addEventListener("mouseup", (e) => { this.mouseUpEvent(e); });
		c.addEventListener("mouseleave", (e) => { this.mouseUpEvent(e); });
		c.addEventListener("mousemove", (e) => { this.mouseMoveEvent(e); });

		const v_shader = createShader(this.gl, normalVshaderSrc, "x-shader/x-vertex");
		const f_shader = createShader(this.gl, normalFshaderSrc, "x-shader/x-fragment");
		const cornerFadeFshader = createShader(this.gl, cornerFadeFshaderSrc, "x-shader/x-fragment");
		const virtualShareWindowFshader = createShader(
			this.gl, virtualShareWindowFshaderSrc, "x-shader/x-fragment");

		const normalShaderInfo = new ShaderInfo(this.gl, v_shader, f_shader,
			['position', 'color', 'textureCoord'], [3, 4, 2],
			['mvpMatrix', 'texture', 'enableTexture', 'globalColor']);

		const virtualBackShaderInfo = new ShaderInfo(this.gl, v_shader, cornerFadeFshader,
			['position', 'color', 'textureCoord'], [3, 4, 2],
			['mvpMatrix', 'texture']);
		
		const virtualSharedWindowShaderInfo = new ShaderInfo(this.gl,
			v_shader, virtualShareWindowFshader,
			['position', 'color', 'textureCoord'], [3, 4, 2],
			['mvpMatrix', 'texture']);

		this.micSigMng = new MicSignalManager(micStream);
		this.magicCircle = new MagicCircle(this.gl, this.micSigMng, normalShaderInfo);
		this.micDftBar = new MicDftBar(
			this.gl, this.micSigMng, normalShaderInfo, MagicCircle.circleRadius);
		this.micEmitWave = new MicEmitWave(this.gl, this.micSigMng, normalShaderInfo);
		this.micSoundWave = new MicSoundWave(this.gl, this.micSigMng, normalShaderInfo);

		if (this.virtualBackImageProc.hasVirtualBack) {
			this.virtualBack = new VirtualBack(this.gl,
				this.virtualBackImageProc.originalSize.width,
				this.virtualBackImageProc.originalSize.height,
				virtualBackShaderInfo);
		}

		if (this.sharedWindowMng != null) {
			this.sharedWindow = new SharedWindow(
				this.gl, this.sharedWindowMng, virtualSharedWindowShaderInfo);
		}

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);

		this.vMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		this.pMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		this.vpMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		NM_MicDisplay.mat.lookAt([0.0, 9.0, -18.0], [0,2.0,0], [0, 1, 0], this.vMatrix);
		NM_MicDisplay.mat.perspective(60.0, c.width/c.height, 1.0, 100, this.pMatrix);
		NM_MicDisplay.mat.multiply(this.pMatrix, this.vMatrix, this.vpMatrix);
	}

	async waitForTextureLoading() {
		await this.magicCircle.waitForTextureLoading();
		await this.micEmitWave.waitForTextureLoading();
	}

	mouseDownEvent(event) {
		this.previousMousePos[0] = event.pageX;
		this.previousMousePos[1] = event.pageY;
	}

	mouseUpEvent(event) {
		this.previousMousePos[0] = null;
		this.previousMousePos[1] = null;
	}

	mouseMoveEvent(event) {
		if (this.previousMousePos[0] != null && this.previousMousePos[1] != null 
			&& this.sharedWindowMng != null && this.sharedWindowMng.windowShareMode) {
		
			this.canvasPositionInWindowShareMode[0] += event.pageX - this.previousMousePos[0];
			this.canvasPositionInWindowShareMode[1] += event.pageY - this.previousMousePos[1];
			this.previousMousePos[0] = event.pageX;
			this.previousMousePos[1] = event.pageY;
		}
	}

	adjustCanvasSize(initFlag) {
		var c = document.getElementById('NM_MicDisplayOutput');
		var currentWidth = document.documentElement.clientWidth;
		var currentHeight = document.documentElement.clientHeight;
		var widthMargin = 0;
		var heightMargin = 0;

		if (currentWidth * NM_MicDisplay.canvasSize.height / NM_MicDisplay.canvasSize.width > currentHeight) {
			currentWidth = currentHeight * NM_MicDisplay.canvasSize.width / NM_MicDisplay.canvasSize.height;
			widthMargin = (document.documentElement.clientWidth - currentWidth) * 0.5;
		}
		else {
			currentHeight = currentWidth * NM_MicDisplay.canvasSize.height / NM_MicDisplay.canvasSize.width;
			heightMargin = (document.documentElement.clientHeight - currentHeight) * 0.5;
		}
		if (this.sharedWindowMng != null &&this.sharedWindowMng.windowShareMode) {
			currentWidth *= NM_MicDisplay.canvasScaleInWindowShareMode;
			currentHeight *= NM_MicDisplay.canvasScaleInWindowShareMode;
			if (initFlag) {
				this.canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
				this.canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
			}
			if (this.canvasPositionInWindowShareMode[0] < 0) {
				this.canvasPositionInWindowShareMode[0] = 0;
			}
			if (this.canvasPositionInWindowShareMode[0] > (document.documentElement.clientWidth - currentWidth)) {
				this.canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
			}
			if (this.canvasPositionInWindowShareMode[1] < 0) {
				this.canvasPositionInWindowShareMode[1] = 0;
			}
			if (this.canvasPositionInWindowShareMode[1] > (document.documentElement.clientHeight - currentHeight)) {
				this.canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
			}
			widthMargin = this.canvasPositionInWindowShareMode[0];
			heightMargin = this.canvasPositionInWindowShareMode[1];
		}

		if (c.width != currentWidth || c.height != currentHeight) {
			c.width = currentWidth;
			c.height = currentHeight;
			this.gl.viewport(0, 0, c.width, c.height);
			this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
		}
		c.style.margin = heightMargin.toString() + "px " + widthMargin.toString() + "px";
	}

	draw() {
		if (this.sharedWindowMng != null && this.sharedWindowMng.windowShareBackEnable) {
			this.gl.clearColor(0.0, 0.0, 0.0, 0.2);
		}
		else {
			this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
		}
		this.gl.clearDepth(1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.micEmitWave.draw(this.vpMatrix);
		this.micDftBar.draw(this.vpMatrix);
		this.magicCircle.draw(this.vpMatrix);
		this.micSoundWave.draw(this.vpMatrix);

		if (this.virtualBack != null) {
			this.virtualBack.draw(this.vpMatrix);
		}

		if (this.sharedWindow != null) {
			this.sharedWindow.draw(this.vpMatrix);
		}

		this.gl.flush();
	}

	main() {
		this.adjustCanvasSize(false);
		
		this.micSigMng.update();
		this.micSoundWave.update();
		this.micEmitWave.update();
		this.magicCircle.update();
		if (this.virtualBack != null) {
			this.virtualBack.update();
		}

		if (this.sharedWindow != null) {
			this.sharedWindow.update();
		}
		this.draw();
	}
}

NM_MicDisplay.canvasSize = {width: 1280, height: 720}
NM_MicDisplay.canvasScaleInWindowShareMode = 0.4;
NM_MicDisplay.mat = new matIV();
