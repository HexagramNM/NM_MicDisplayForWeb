
import { workerVersion } from "./workerVersion.js";

const matIV = (await import(`./minMatrix.js?v=${workerVersion}`)).matIV;
const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const createShader = createWebGLObj.createShader;
const ShaderInfo = createWebGLObj.ShaderInfo;
const MagicCircle = (await import(`./magicCircle.js?v=${workerVersion}`)).MagicCircle;
const MicDftBar = (await import(`./micDftBar.js?v=${workerVersion}`)).MicDftBar;
const MicEmitWave = (await import(`./micEmitWave.js?v=${workerVersion}`)).MicEmitWave;
const MicSoundWave = (await import(`./micSoundWave.js?v=${workerVersion}`)).MicSoundWave;
const VirtualBack = (await import(`./virtualBack.js?v=${workerVersion}`)).VirtualBack;
const SharedWindow = (await import(`./sharedWindow.js?v=${workerVersion}`)).SharedWindow;

const normalVshaderSrc = (await import(`./../shaders/normalVshader.vert.js?v=${workerVersion}`)).default;
const normalFshaderSrc = (await import(`./../shaders/normalFshader.frag.js?v=${workerVersion}`)).default;
const cornerFadeFshaderSrc = (await import(`./../shaders/cornerFadeFshader.frag.js?v=${workerVersion}`)).default;
const virtualShareWindowFshaderSrc = (await import(`./../shaders/virtualShareWindowFshader.frag.js?v=${workerVersion}`)).default;

export class NM_MicDisplay {
	constructor(gl, micSignalData,
		hasVirtualBack, virtualBackInputWidth, virtualBackInputHeight, virtualBackTextureSize,
		hasSharedWindow) {
		this.gl = gl;
		this.micSignalData = micSignalData;
		this.windowShareBackEnable = false;

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

		
		this.magicCircle = new MagicCircle(this.gl, this.micSignalData, normalShaderInfo);
		this.micDftBar = new MicDftBar(
			this.gl, this.micSignalData, normalShaderInfo, MagicCircle.circleRadius);
		this.micEmitWave = new MicEmitWave(this.gl, this.micSignalData, normalShaderInfo);
		this.micSoundWave = new MicSoundWave(this.gl, this.micSignalData, normalShaderInfo);

		if (hasVirtualBack) {
			this.virtualBack = new VirtualBack(this.gl,
				virtualBackInputWidth,
				virtualBackInputHeight,
				virtualBackTextureSize,
				virtualBackShaderInfo);
		}

		if (hasSharedWindow) {
			this.sharedWindow = new SharedWindow(
				this.gl, virtualSharedWindowShaderInfo);
		}

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);

		this.vMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		this.pMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		this.vpMatrix = NM_MicDisplay.mat.identity(NM_MicDisplay.mat.create());
		NM_MicDisplay.mat.lookAt([0.0, 8.8, -18.0], [0,1.8,0], [0, 1, 0], this.vMatrix);
		NM_MicDisplay.mat.perspective(60.0, 1.0, 1.0, 100, this.pMatrix);
		NM_MicDisplay.mat.multiply(this.pMatrix, this.vMatrix, this.vpMatrix);
	}

	async waitForTextureLoading() {
		await this.magicCircle.waitForTextureLoading();
		await this.micEmitWave.waitForTextureLoading();
	}

	updateMicSignalData(micSignalData) {
		micSignalData.pulseEmit = (this.micSignalData.pulseEmit || micSignalData.pulseEmit)
		Object.assign(this.micSignalData, micSignalData);
	}

	resizeCanvas(width, height) {
		NM_MicDisplay.mat.perspective(60.0, width/height, 1.0, 100, this.pMatrix);
		NM_MicDisplay.mat.multiply(this.pMatrix, this.vMatrix, this.vpMatrix);
		this.gl.viewport(0, 0, width, height);
		this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE);
	}

	draw() {
		if (this.windowShareBackEnable) {
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
		this.micEmitWave.update();
		this.magicCircle.update();
		this.micSoundWave.update();

		this.draw();
	}
}

NM_MicDisplay.mat = new matIV();
