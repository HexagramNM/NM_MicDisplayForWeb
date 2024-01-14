
import {matIV} from "./minMatrix.js";
import {create_vbo,
	create_ibo,
	create_shader,
	create_program,
	create_texture,
	DynamicTexture,
	finish_load_texture} from "./createWebGLObj.js";
import {VirtualBackEffector} from "./virtualBackEffector.js";
import {OutlineTextureGenerator} from "./outlineTextureGenerator.js";

import normalVshaderSrc from "./../shaders/normalVshader.vert.js";
import normalFshaderSrc from "./../shaders/normalFshader.frag.js";
import cornerFadeFshaderSrc from "./../shaders/cornerFadeFshader.frag.js";
import virtualShareWindowFshaderSrc from "./../shaders/virtualShareWindowFshader.frag.js";

var NM_MicDisplay_count = 0;
var NM_MicDisplay_fps = 60.0;
var NM_MicDisplay_previousTimestamp = null;

var virtualBackEffector;
var outlineTextureGenerator;

var micAnalyser;
var waveData;
var frequencyData;
var currentWaveLevel;
var previousWaveLevel;
var previousEmitStatus;
var emitWaveIsDisplay;
var emitWaveDisplayCount;
var currentDftWaveLevel;
var previousDftWaveLevel;
var dftBarCount;

var m = new matIV();
var mMatrix = m.identity(m.create());
var vMatrix = m.identity(m.create());
var pMatrix = m.identity(m.create());
var vpMatrix = m.identity(m.create());
var mvpMatrix = m.identity(m.create());

var normalShaderInfo = {
	program: null,
	attLocation: new Array(),
	attStride: new Array(),
	uniLocation: new Array()
}

var virtualBackShaderInfo = {
	program: null,
	attLocation: new Array(),
	attStride: new Array(),
	uniLocation: new Array()
}

var virtualShareWindowShaderInfo = {
	program: null,
	attLocation: new Array(),
	attStride: new Array(),
	uniLocation: new Array()
}

var defaultGlobalColor;
var circleColor;
var circleLightColor
var emitWaveColor;
var dftBarColor_vboArray;
var dftBarFramePosition_vbo;
var dftBarFrameColor_vboArray;
var dftBarFrameDummyTexture_vbo;
var dftBarFrameIndex_data;
var dftBarFrameIndex_ibo;
var soundDisplayLength;
var soundWavePosition_data;
var soundWavePosition_vbo;
var soundWaveColor_vbo;
var soundWaveDummyTexture_vbo;
var soundWaveIndex_ibo;

var virtualShareWindowPlaneNum = 21;
var virtualShareWindowPosition_data;
var virtualShareWindowPosition_vbo;
var virtualShareWindowColor_vbo;
var virtualShareWindowTexture_vbo;
var virtualShareWindowIndex_ibo;

var NM_MicDisplay_canvasSize = {width: 1280, height: 720};
var canvasScaleInWindowShareMode = 0.4;
var NM_MicDisplay_previousMousePos = [null, null];
var canvasPositionInWindowShareMode = [0, 0];
var circleRadius = 13.0;
var dftElementNum = 19;
var dftBarMaxLevel = 12;
var emitWaveNum = 50;
var waveStartBlendRate = 0.35;
var waveRadius = 9.0;
var waveHeight = 5.0;
var waveLevelRateThreshold = 1.2;
var waveLineWidthHalf = 0.08;
var waveOffsetHeight = 4.0;
var captureWidth = 7.0;
var virtualShareWindowHeight = 5.0;
var virtualShareWindowRadius = 12.0;
var virtualShareWindowYPos = 4.0;
var virtualShareWindowTiltAngle = Math.PI * 80.0 / 180.0;
var virtualShareWindowTiltSin = Math.sin(virtualShareWindowTiltAngle);
var virtualShareWindowTiltCos = Math.cos(virtualShareWindowTiltAngle);

async function NM_MicDisplay_micInit(micStream) {
	const audioCtx = new AudioContext();
	const input = audioCtx.createMediaStreamSource(micStream);
	micAnalyser = audioCtx.createAnalyser();
	input.connect(micAnalyser);

	micAnalyser.fftSize = 4096;
	soundDisplayLength = micAnalyser.frequencyBinCount;
	waveData = new Uint8Array(soundDisplayLength);
	frequencyData = new Uint8Array(micAnalyser.fftSize);
	previousEmitStatus = false;
	emitWaveIsDisplay = new Array(emitWaveNum);
	emitWaveDisplayCount = new Array(emitWaveNum);
	currentDftWaveLevel = new Array(dftElementNum);
	previousDftWaveLevel = new Array(dftElementNum);
	dftBarCount = new Array(dftElementNum);

	currentWaveLevel = 0.0;
	micAnalyser.getByteTimeDomainData(waveData);
	for (var idx = 0; idx < soundDisplayLength; idx++) {
		var value = (waveData[idx] - 128.0) / 128.0;
		currentWaveLevel += Math.abs(value);
	}
	previousWaveLevel = currentWaveLevel;

	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		currentDftWaveLevel[dftElemIdx] = 0.0;
		previousDftWaveLevel[dftElemIdx] = 0.0;
		dftBarCount[dftElemIdx] = 0;
	}

	for (var emitIdx = 0; emitIdx < emitWaveNum; emitIdx++) {
		emitWaveIsDisplay[emitIdx] = false;
		emitWaveDisplayCount[emitIdx] = 0;
	}
}

function NM_MicDisplay_initColor() {
	defaultGlobalColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	circleColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	circleLightColor = new Float32Array([1.0, 0.5, 0.5, 0.0]);
	emitWaveColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
}

function NM_MicDisplay_createDftBarBuffer() {
	var vertex = [
		-0.8, 0.4, 0.0,
		-0.72, 0.32, 0.0,
		0.8, 0.4, 0.0,
		0.72, 0.32, 0.0,
		-0.8, -0.4, 0.0,
		-0.72, -0.32, 0.0,
		0.8, -0.4, 0.0,
		0.72, -0.32, 0.0
	];
	dftBarFramePosition_vbo = create_vbo(vertex);

	var textureCoord_dummy = [
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0
	];
	dftBarFrameDummyTexture_vbo = create_vbo(textureCoord_dummy);

	dftBarColor_vboArray = new Array(dftBarMaxLevel);
	dftBarFrameColor_vboArray = new Array(dftBarMaxLevel);
	var baseColor = new Float32Array(4);
	var barColor_data = new Float32Array(4 * 4);
	var barFrameColor_data = new Float32Array(8 * 4);
	for (var levelIdx = 0; levelIdx < dftBarMaxLevel; levelIdx++) {
		if (levelIdx < dftBarMaxLevel / 3) {
			baseColor[0] = 1.0;
			baseColor[1] = 0.5 + 0.5 * levelIdx / (dftBarMaxLevel / 3.0);
			baseColor[2] = 0.0;
		}
		else if (levelIdx < 2 * dftBarMaxLevel / 3.0) {
			baseColor[0] = 1.0 - (levelIdx - dftBarMaxLevel / 3.0) / (dftBarMaxLevel / 3.0);
			baseColor[1] = 1.0;
			baseColor[2] = 0.0;
		}
		else {
			baseColor[0] = 0.0;
			baseColor[1] = 1.0;
			baseColor[2] = (levelIdx - 2.0 * dftBarMaxLevel / 3.0) / (dftBarMaxLevel / 3.0);
		}
		baseColor[3] = 0.3 + 0.7 * levelIdx / (dftBarMaxLevel - 1.0);

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

		dftBarColor_vboArray[levelIdx] = create_vbo(barColor_data);
		dftBarFrameColor_vboArray[levelIdx] = create_vbo(barFrameColor_data);
	}

	dftBarFrameIndex_data = [
		0, 1, 2, 2, 1, 3,
		2, 3, 6, 6, 3, 7,
		6, 7, 4, 4, 7, 5,
		4, 5, 0, 0, 5, 1
	];
	dftBarFrameIndex_ibo = create_ibo(dftBarFrameIndex_data);
}

function NM_MicDisplay_createSoundWaveBuffer() {
	soundWavePosition_data = new Float32Array(soundDisplayLength * 2 * 3);
	var soundWaveColor_data = new Float32Array(soundDisplayLength * 2 * 4);
	var soundWaveDummyTexture_data = new Float32Array(soundDisplayLength * 2 * 2);
	var soundWaveIndex_data = new Int32Array(soundDisplayLength * 6);
	var currentAngle = Math.PI / 2.0;
	var stepAngle = 2.0 * Math.PI / soundDisplayLength;
	for (var idx = 0; idx < soundDisplayLength; idx++) {
		soundWavePosition_data[idx * 3] = waveRadius * Math.cos(currentAngle);
		soundWavePosition_data[idx * 3 + 1] = waveOffsetHeight + waveLineWidthHalf;
		soundWavePosition_data[idx * 3 + 2] = waveRadius * Math.sin(currentAngle);
		soundWavePosition_data[(idx + soundDisplayLength) * 3] = soundWavePosition_data[idx * 3];
		soundWavePosition_data[(idx + soundDisplayLength) * 3 + 1] = waveOffsetHeight - waveLineWidthHalf;
		soundWavePosition_data[(idx + soundDisplayLength) * 3 + 2] = soundWavePosition_data[idx * 3 + 2];
		currentAngle += stepAngle;

		soundWaveColor_data[idx * 4] = 0.0;
		soundWaveColor_data[idx * 4 + 1] = (idx < soundDisplayLength / 2 ? idx * 2.0 / soundDisplayLength: 1.0);
		soundWaveColor_data[idx * 4 + 2] = (idx < soundDisplayLength / 2 ? 1.0: 2.0 - idx * 2.0 / soundDisplayLength);
		if (idx < soundDisplayLength * waveStartBlendRate) {
			soundWaveColor_data[idx * 4 + 3] = idx / (soundDisplayLength * waveStartBlendRate);
		}
		else if (idx > soundDisplayLength * (1.0 - waveStartBlendRate)) {
			soundWaveColor_data[idx * 4 + 3] = (soundDisplayLength - idx) / (soundDisplayLength * waveStartBlendRate);
		}
		else {
			soundWaveColor_data[idx * 4 + 3] = 1.0;
		}
		for (var colorIdx = 0; colorIdx < 4 * soundDisplayLength; colorIdx++) {
			soundWaveColor_data[(idx + soundDisplayLength) * 4 + colorIdx] = soundWaveColor_data[idx * 4 + colorIdx];
		}

		soundWaveDummyTexture_data[idx * 2] = 0.0;
		soundWaveDummyTexture_data[idx * 2 + 1] = 0.0;
		soundWaveDummyTexture_data[(idx + soundDisplayLength) * 2] = 0.0;
		soundWaveDummyTexture_data[(idx + soundDisplayLength) * 2 + 1] = 0.0;

		soundWaveIndex_data[idx * 6] = idx;
		soundWaveIndex_data[idx * 6 + 1] = idx + soundDisplayLength;
		soundWaveIndex_data[idx * 6 + 2] = (idx + 1) % soundDisplayLength;
		soundWaveIndex_data[idx * 6 + 3] = soundWaveIndex_data[idx * 6 + 2];
		soundWaveIndex_data[idx * 6 + 4] = idx + soundDisplayLength;
		soundWaveIndex_data[idx * 6 + 5] = soundWaveIndex_data[idx * 6 + 2] + soundDisplayLength;
	}

	soundWavePosition_vbo = create_vbo(soundWavePosition_data, true);
	soundWaveColor_vbo = create_vbo(soundWaveColor_data);
	soundWaveDummyTexture_vbo = create_vbo(soundWaveDummyTexture_data);
	soundWaveIndex_ibo = create_ibo(soundWaveIndex_data);
}

function NM_MicDisplay_createVirtualShareWindowBuffeer() {
	virtualShareWindowPosition_data = new Float32Array((virtualShareWindowPlaneNum + 1) * 2 * 3);
	var virtualShareWindowColor_data = new Float32Array((virtualShareWindowPlaneNum + 1) * 2 * 4);
	var virtualShareWindowTexture_data = new Float32Array((virtualShareWindowPlaneNum + 1) * 2 * 2);
	var virtualShareWindowIndex_data = new Int32Array(virtualShareWindowPlaneNum * 6);

	NM_MicDisplay_updateVirtualShareWindow();
	for (var idx = 0; idx < virtualShareWindowPlaneNum + 1; idx++) {
		for (var cIdx = 0; cIdx < 8; cIdx++) {
			virtualShareWindowColor_data[idx * 8 + cIdx] = 1.0;
		}

		virtualShareWindowTexture_data[idx * 4] = idx / virtualShareWindowPlaneNum;
		virtualShareWindowTexture_data[idx * 4 + 1] = 0.0;
		virtualShareWindowTexture_data[idx * 4 + 2] = idx / virtualShareWindowPlaneNum;
		virtualShareWindowTexture_data[idx * 4 + 3] = 1.0;
	}

	for (var idx = 0; idx < virtualShareWindowPlaneNum; idx++) {
		virtualShareWindowIndex_data[idx * 6] = idx * 2;
		virtualShareWindowIndex_data[idx * 6 + 1] = idx * 2 + 1;
		virtualShareWindowIndex_data[idx * 6 + 2] = idx * 2 + 2;
		virtualShareWindowIndex_data[idx * 6 + 3] = idx * 2 + 2;
		virtualShareWindowIndex_data[idx * 6 + 4] = idx * 2 + 1;
		virtualShareWindowIndex_data[idx * 6 + 5] = idx * 2 + 3;
	}

	virtualShareWindowPosition_vbo = create_vbo(virtualShareWindowPosition_data, true);
	virtualShareWindowColor_vbo = create_vbo(virtualShareWindowColor_data);
	virtualShareWindowTexture_vbo = create_vbo(virtualShareWindowTexture_data);
	virtualShareWindowIndex_ibo = create_ibo(virtualShareWindowIndex_data);
}

function NM_MicDisplay_mouseDownEvent(event) {
	NM_MicDisplay_previousMousePos[0] = event.pageX;
	NM_MicDisplay_previousMousePos[1] = event.pageY;
}

function NM_MicDisplay_mouseUpEvent(event) {
	NM_MicDisplay_previousMousePos[0] = null;
	NM_MicDisplay_previousMousePos[1] = null;
}

function NM_MicDisplay_mouseMoveEvent(event) {
	if (NM_MicDisplay_previousMousePos[0] != null && NM_MicDisplay_previousMousePos[1] != null && g_windowShareMode) {
		canvasPositionInWindowShareMode[0] += event.pageX - NM_MicDisplay_previousMousePos[0];
		canvasPositionInWindowShareMode[1] += event.pageY - NM_MicDisplay_previousMousePos[1];
		NM_MicDisplay_previousMousePos[0] = event.pageX;
		NM_MicDisplay_previousMousePos[1] = event.pageY;
	}
}

function NM_MicDislay_adjustCanvasSize(initFlag) {
	var c = document.getElementById('NM_MicDisplayOutput');
	var currentWidth = document.documentElement.clientWidth;
	var currentHeight = document.documentElement.clientHeight;
	var widthMargin = 0;
	var heightMargin = 0;

	if (currentWidth * NM_MicDisplay_canvasSize.height / NM_MicDisplay_canvasSize.width > currentHeight) {
		currentWidth = currentHeight * NM_MicDisplay_canvasSize.width / NM_MicDisplay_canvasSize.height;
		widthMargin = (document.documentElement.clientWidth - currentWidth) * 0.5;
	}
	else {
		currentHeight = currentWidth * NM_MicDisplay_canvasSize.height / NM_MicDisplay_canvasSize.width;
		heightMargin = (document.documentElement.clientHeight - currentHeight) * 0.5;
	}
	if (g_windowShareMode) {
		currentWidth *= canvasScaleInWindowShareMode;
		currentHeight *= canvasScaleInWindowShareMode;
		if (initFlag) {
			canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
			canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
		}
		if (canvasPositionInWindowShareMode[0] < 0) {
			canvasPositionInWindowShareMode[0] = 0;
		}
		if (canvasPositionInWindowShareMode[0] > (document.documentElement.clientWidth - currentWidth)) {
			canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
		}
		if (canvasPositionInWindowShareMode[1] < 0) {
			canvasPositionInWindowShareMode[1] = 0;
		}
		if (canvasPositionInWindowShareMode[1] > (document.documentElement.clientHeight - currentHeight)) {
			canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
		}
		widthMargin = canvasPositionInWindowShareMode[0];
		heightMargin = canvasPositionInWindowShareMode[1];
	}

	if (c.width != currentWidth || c.height != currentHeight) {
		c.width = currentWidth;
		c.height = currentHeight;
		g_gl.viewport(0, 0, c.width, c.height);
		g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
	}
	c.style.margin = heightMargin.toString() + "px " + widthMargin.toString() + "px";
}

export async function NM_MicDisplay_init(micStream) {
	var c = document.getElementById('NM_MicDisplayOutput');
	if (!c || !(c.getContext)) {
		return;
	}
	g_gl=c.getContext('webgl')||c.getContext('experimental-webgl');
	g_texture_max = g_gl.getParameter(g_gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	g_createPlaneBuffer();

	NM_MicDislay_adjustCanvasSize(true);
	c.addEventListener("mousedown", NM_MicDisplay_mouseDownEvent);
	c.addEventListener("mouseup", NM_MicDisplay_mouseUpEvent);
	c.addEventListener("mouseleave", NM_MicDisplay_mouseUpEvent);
	c.addEventListener("mousemove", NM_MicDisplay_mouseMoveEvent);
	await NM_MicDisplay_micInit(micStream);

	var v_shader=create_shader(normalVshaderSrc, "x-shader/x-vertex");
	var f_shader=create_shader(normalFshaderSrc, "x-shader/x-fragment");
	var cornerFadeFshader=create_shader(cornerFadeFshaderSrc, "x-shader/x-fragment");
	var virtualShareWindowFshader=create_shader(virtualShareWindowFshaderSrc, "x-shader/x-fragment");

	//normalShaderのプログラム設定
	normalShaderInfo.program = create_program(v_shader, f_shader);
	setupCommonShaderProgram(normalShaderInfo);
	normalShaderInfo.uniLocation[2] = g_gl.getUniformLocation(normalShaderInfo.program, 'enableTexture');
	normalShaderInfo.uniLocation[3] = g_gl.getUniformLocation(normalShaderInfo.program, 'globalColor');

	//virtualBackShaderのプログラム設定
	virtualBackShaderInfo.program = create_program(v_shader, cornerFadeFshader);
	setupCommonShaderProgram(virtualBackShaderInfo);

	virtualShareWindowShaderInfo.program = create_program(v_shader, virtualShareWindowFshader);
	setupCommonShaderProgram(virtualShareWindowShaderInfo);
	virtualShareWindowShaderInfo.uniLocation[2] = g_gl.getUniformLocation(virtualShareWindowShaderInfo.program, 'time');

	NM_MicDisplay_initColor();
	NM_MicDisplay_createDftBarBuffer()
	NM_MicDisplay_createSoundWaveBuffer();
	NM_MicDisplay_createVirtualShareWindowBuffeer();

	g_gl.enable(g_gl.BLEND);
	g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
	g_gl.enable(g_gl.DEPTH_TEST);
	g_gl.depthFunc(g_gl.LEQUAL);

	create_texture('image/redCircle.png?'+new Date().getTime(), 0);
	create_texture('image/redCircleLight.png?'+new Date().getTime(), 1);
	create_texture('image/redCircleWave.png?'+new Date().getTime(), 2);
	g_virtualBackTextureObj = new DynamicTexture("virtualBackTexture", 3);
	g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_WRAP_S, g_gl.CLAMP_TO_EDGE);
	g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_WRAP_T, g_gl.CLAMP_TO_EDGE);

	g_virtualShareWindowTextureObj = new DynamicTexture("virtualShareWindowTexture", 4);
	var virtualBackTextureSize = document.getElementById("virtualBackTexture").width;
	virtualBackEffector = new VirtualBackEffector(virtualBackTextureSize, 5);
	outlineTextureGenerator = new OutlineTextureGenerator(virtualBackTextureSize, 2, 5, 6);

	m.lookAt([0.0, 9.0, -18.0], [0,2.0,0], [0, 1, 0], vMatrix);
	m.perspective(60.0, c.width/c.height, 1.0, 100, pMatrix);
	m.multiply(pMatrix, vMatrix, vpMatrix);

	function setupCommonShaderProgram(shaderInfo) {
	    shaderInfo.attLocation[0]=g_gl.getAttribLocation(shaderInfo.program, 'position');
	    shaderInfo.attLocation[1]=g_gl.getAttribLocation(shaderInfo.program, 'color');
	    shaderInfo.attLocation[2]=g_gl.getAttribLocation(shaderInfo.program, 'textureCoord');
	    shaderInfo.attStride[0]=3;
	    shaderInfo.attStride[1]=4;
	    shaderInfo.attStride[2]=2;
	    shaderInfo.uniLocation[0] = g_gl.getUniformLocation(shaderInfo.program, 'mvpMatrix');
	    shaderInfo.uniLocation[1] = g_gl.getUniformLocation(shaderInfo.program, 'texture');
	}
	NM_MicDisplay_previousTimestamp =  performance.now();
	requestAnimationFrame(NM_MicDisplay_main);
}

function NM_MicDisplay_updateWave() {
	//音声波形
	micAnalyser.getByteTimeDomainData(waveData);
	currentWaveLevel = 0.0;
	for (var idx = 0; idx < soundDisplayLength; idx++) {
		var value = (waveData[idx] - 128.0) / 128.0;
		var height = waveOffsetHeight + value * waveHeight;
		soundWavePosition_data[idx * 3 + 1] = height + waveLineWidthHalf;
		soundWavePosition_data[(idx + soundDisplayLength) * 3 + 1] = height - waveLineWidthHalf;

		currentWaveLevel += Math.abs(value);
	}
}

function NM_MicDisplay_updateEmitWave() {
	//音量上昇による波動発射状態の管理
	for (var emitIdx = 0; emitIdx < emitWaveNum; emitIdx++) {
		//カウント管理
		if (emitWaveIsDisplay[emitIdx]) {
			emitWaveDisplayCount[emitIdx]++;
			if (emitWaveDisplayCount[emitIdx] > 10) {
				emitWaveIsDisplay[emitIdx] = false;
			}
		}
	}

	if (currentWaveLevel > 50 && currentWaveLevel >= 1.2 * previousWaveLevel) {
		if (!previousEmitStatus) {
			//発射登録
			for (var emitIdx = 0; emitIdx < emitWaveNum; emitIdx++) {
				if (!emitWaveIsDisplay[emitIdx]) {
					emitWaveIsDisplay[emitIdx] = true;
					emitWaveDisplayCount[emitIdx] = 0;
					break;
				}
			}
			previousEmitStatus = true;
		}
	}
	if (currentWaveLevel < previousWaveLevel) {
		previousEmitStatus = false;
	}

	previousWaveLevel = currentWaveLevel;
}

function NM_MicDisplay_updateCircleAlpha() {
	//音量による魔法陣の透過率
	var waveAlphaMaxRate = 150.0;
	var alphaRate = (currentWaveLevel > waveAlphaMaxRate ? 1.0: currentWaveLevel / waveAlphaMaxRate);
	circleColor[3] = 0.3 + 0.7 * alphaRate;
	circleLightColor[3] = 0.7 *alphaRate;
}

function NM_MicDisplay_updateDftLevel() {
	//FFTによる周波数レベルの取得
	micAnalyser.getByteFrequencyData(frequencyData);
	var dftLevelMaxRate = 0.75;
	var frequencyRange = 30;
	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		var avg = 0;
		for (var freqIdx = 0; freqIdx < frequencyRange; freqIdx++) {
			avg += frequencyData[dftElemIdx * frequencyRange + freqIdx] / 255.0;
		}
		avg /= frequencyRange;
		currentDftWaveLevel[dftElemIdx] = parseInt(dftBarMaxLevel * (avg > dftLevelMaxRate ? 1.0: avg / dftLevelMaxRate));
		if (currentDftWaveLevel[dftElemIdx] >= previousDftWaveLevel[dftElemIdx]) {
			previousDftWaveLevel[dftElemIdx] = currentDftWaveLevel[dftElemIdx]
			dftBarCount[dftElemIdx] = 0;
		}
		dftBarCount[dftElemIdx]++;
		if (dftBarCount[dftElemIdx] > 10) {
			if (previousDftWaveLevel[dftElemIdx] > 0) {
				previousDftWaveLevel[dftElemIdx]--;
			}
			dftBarCount[dftElemIdx] = 0;
		}
	}
}

function NM_MicDisplay_updateVirtualShareWindow() {
	var virtualShareWindowWidth = 0.0;
	if (g_virtualShareWindowTrimmedSize.height > 0) {
		virtualShareWindowWidth = virtualShareWindowHeight * g_virtualShareWindowTrimmedSize.width / g_virtualShareWindowTrimmedSize.height;
	}

	var upperRadius = virtualShareWindowRadius + virtualShareWindowHeight * 0.5 * virtualShareWindowTiltCos;
	var lowerRadius = virtualShareWindowRadius - virtualShareWindowHeight * 0.5 * virtualShareWindowTiltCos;
	var upperCircleLength = 2.0 * Math.PI * upperRadius;
	var currentAngle = Math.PI + Math.PI * virtualShareWindowWidth / upperCircleLength;
	var stepAngle = 2.0 * Math.PI * virtualShareWindowWidth / (upperCircleLength * virtualShareWindowPlaneNum);
	for (var idx = 0; idx < virtualShareWindowPlaneNum + 1; idx++) {
		virtualShareWindowPosition_data[idx * 6] = upperRadius * Math.sin(currentAngle);
		virtualShareWindowPosition_data[idx * 6 + 1] = virtualShareWindowYPos + virtualShareWindowHeight * 0.5 * virtualShareWindowTiltSin;
		virtualShareWindowPosition_data[idx * 6 + 2] = upperRadius * Math.cos(currentAngle);
		virtualShareWindowPosition_data[idx * 6 + 3] = lowerRadius * Math.sin(currentAngle);
		virtualShareWindowPosition_data[idx * 6 + 4] = virtualShareWindowYPos - virtualShareWindowHeight * 0.5 * virtualShareWindowTiltSin;
		virtualShareWindowPosition_data[idx * 6 + 5] = lowerRadius * Math.cos(currentAngle);
		currentAngle -= stepAngle;
	}
}

function NM_MicDisplay_drawEmitWave() {
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_position_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[0], normalShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_color_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[1]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[1], normalShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_texture_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[2], normalShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, g_plane_index_ibo);
	g_gl.uniform1i(normalShaderInfo.uniLocation[1], 2);
	g_gl.uniform1i(normalShaderInfo.uniLocation[2], 1);

	for (var emitIdx = 0; emitIdx < emitWaveNum; emitIdx++) {
		if (emitWaveIsDisplay[emitIdx]) {
			var scale = 1.0 + 3.0 * emitWaveDisplayCount[emitIdx] / 10.0;
			var alpha = 0.7 * (1.0 - emitWaveDisplayCount[emitIdx] / 10.0);
			m.identity(mMatrix);
			m.rotate(mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], mMatrix);
			m.translate(mMatrix, [0.0, 0.0, 0.001 * emitWaveDisplayCount[emitIdx]], mMatrix);
			m.scale(mMatrix, [circleRadius * scale, circleRadius * scale, 1.0], mMatrix);
			m.multiply(vpMatrix, mMatrix, mvpMatrix);
			emitWaveColor[3] = alpha

			g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
			g_gl.uniform4fv(normalShaderInfo.uniLocation[3], emitWaveColor);
			g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
		}
	}
}

function NM_MicDisplay_drawDftBarBackFrame() {
	//後ろの枠
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, dftBarFramePosition_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[0], normalShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, dftBarFrameDummyTexture_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[2], normalShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, dftBarFrameIndex_ibo);
	g_gl.uniform1i(normalShaderInfo.uniLocation[1], 0);
	g_gl.uniform1i(normalShaderInfo.uniLocation[2], 0);
	g_gl.uniform4fv(normalShaderInfo.uniLocation[3], defaultGlobalColor);
	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		for (var levelIdx = 0; levelIdx < previousDftWaveLevel[dftElemIdx]; levelIdx++) {
			g_gl.bindBuffer(g_gl.ARRAY_BUFFER, dftBarFrameColor_vboArray[levelIdx]);
			g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[1]);
			g_gl.vertexAttribPointer(normalShaderInfo.attLocation[1], normalShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);

			m.identity(mMatrix);
			m.rotate(mMatrix, (75.0 - 150.0 * dftElemIdx / (dftElementNum - 1)) * Math.PI / 180.0, [0.0, 1.0, 0.0], mMatrix);
			m.translate(mMatrix, [0.0, 0.5 + 1.0 * levelIdx, circleRadius + 0.4], mMatrix);
			m.multiply(vpMatrix, mMatrix, mvpMatrix);

			g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
			g_gl.drawElements(g_gl.TRIANGLES, dftBarFrameIndex_data.length, g_gl.UNSIGNED_SHORT, 0);
		}
	}
}

function NM_MicDisplay_drawDftBarFrontBody() {
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_position_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[0], normalShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_texture_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[2], normalShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, g_plane_index_ibo);
	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		for (var levelIdx = 0; levelIdx < currentDftWaveLevel[dftElemIdx]; levelIdx++) {
			g_gl.bindBuffer(g_gl.ARRAY_BUFFER, dftBarColor_vboArray[levelIdx]);
			g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[1]);
			g_gl.vertexAttribPointer(normalShaderInfo.attLocation[1], normalShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);

			m.identity(mMatrix);
			m.rotate(mMatrix, (75.0 - 150.0 * dftElemIdx / (dftElementNum - 1)) * Math.PI / 180.0, [0.0, 1.0, 0.0], mMatrix);
			m.translate(mMatrix, [0.0, 0.5 + 1.0 * levelIdx, circleRadius + 0.2], mMatrix);
			m.scale(mMatrix, [0.8, 0.4, 1.0], mMatrix);
			m.multiply(vpMatrix, mMatrix, mvpMatrix);

			g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
			g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
		}
	}
}

function NM_MicDisplay_drawCircle() {
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_position_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[0], normalShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_color_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[1]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[1], normalShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_texture_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[2], normalShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, g_plane_index_ibo);

	var rad=(NM_MicDisplay_count - Math.floor(NM_MicDisplay_count / 720.0) * 720.0) * Math.PI/360;
	var x = Math.cos(rad);
	var y = Math.sin(rad);
	m.identity(mMatrix);
	m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
	m.rotate(mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], mMatrix);
	m.scale(mMatrix, [circleRadius, circleRadius, 1.0], mMatrix);

	//魔法陣発光部分
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
	g_gl.uniform1i(normalShaderInfo.uniLocation[1], 1);
	g_gl.uniform1i(normalShaderInfo.uniLocation[2], 1);
	g_gl.uniform4fv(normalShaderInfo.uniLocation[3], circleLightColor);
	g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);

	//魔法陣本体
	m.translate(mMatrix, [0.0, 0.0, -0.001], mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
	g_gl.uniform1i(normalShaderInfo.uniLocation[1], 0);
	g_gl.uniform1i(normalShaderInfo.uniLocation[2], 1);
	g_gl.uniform4fv(normalShaderInfo.uniLocation[3], circleColor);
	g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_drawWave() {
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, soundWavePosition_vbo);
	g_gl.bufferSubData(g_gl.ARRAY_BUFFER, 0, soundWavePosition_data);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[0], normalShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, soundWaveColor_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[1]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[1], normalShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, soundWaveDummyTexture_vbo);
	g_gl.enableVertexAttribArray(normalShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(normalShaderInfo.attLocation[2], normalShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, soundWaveIndex_ibo);

	m.identity(mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	g_gl.uniformMatrix4fv(normalShaderInfo.uniLocation[0], false, mvpMatrix);
	g_gl.uniform1i(normalShaderInfo.uniLocation[1], 0);
	g_gl.uniform1i(normalShaderInfo.uniLocation[2], 0);
	g_gl.uniform4fv(normalShaderInfo.uniLocation[3], defaultGlobalColor);
	g_gl.drawElements(g_gl.TRIANGLES, soundDisplayLength * 6, g_gl.UNSIGNED_SHORT, 0);
}

export function NM_MicDisplay_editCaptureTexture() {
	virtualBackEffector.applyEffect(NM_MicDisplay_count / 50.0, 3);
	var effResultTex = virtualBackEffector.getOutputTexture();
	g_gl.activeTexture(g_gl.TEXTURE7);
	g_gl.bindTexture(g_gl.TEXTURE_2D, effResultTex);
	outlineTextureGenerator.generateOutline(20, 0.5, [0.8, 1.0, 1.0], [0.0, 0.0, 1.0], 1.0, 7);
	var outlineResultTex = outlineTextureGenerator.getOutputTexture();
	g_gl.activeTexture(g_gl.TEXTURE7);
	g_gl.bindTexture(g_gl.TEXTURE_2D, outlineResultTex);
}

function NM_MicDisplay_drawCapture() {
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_position_vbo);
	g_gl.enableVertexAttribArray(virtualBackShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(virtualBackShaderInfo.attLocation[0], virtualBackShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_color_vbo);
	g_gl.enableVertexAttribArray(virtualBackShaderInfo.attLocation[1]);
	g_gl.vertexAttribPointer(virtualBackShaderInfo.attLocation[1], virtualBackShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_texture_vbo);
	g_gl.enableVertexAttribArray(virtualBackShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(virtualBackShaderInfo.attLocation[2], virtualBackShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, g_plane_index_ibo);

	//virtualBackCanvasSizeはglobalVariables.js内の変数
	var aspect = 0.0;
	if (g_virtualBackOriginalSize.width > 0.0) {
		aspect = g_virtualBackOriginalSize.height / g_virtualBackOriginalSize.width;
	}

	m.identity(mMatrix);
	m.translate(mMatrix, [0.0, 5.5, -6.0], mMatrix);
	m.rotate(mMatrix, Math.PI, [0.0, 1.0, 0.0], mMatrix);
	m.scale(mMatrix, [captureWidth, captureWidth * aspect, 1.0], mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	g_gl.uniformMatrix4fv(virtualBackShaderInfo.uniLocation[0], false, mvpMatrix);
	g_gl.uniform1i(virtualBackShaderInfo.uniLocation[1], 7);
	g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_drawVirtualShareWindow() {
	if (!g_hasShareWindow) {
		return;
	}
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, virtualShareWindowPosition_vbo);
	g_gl.bufferSubData(g_gl.ARRAY_BUFFER, 0, virtualShareWindowPosition_data);
	g_gl.enableVertexAttribArray(virtualShareWindowShaderInfo.attLocation[0]);
	g_gl.vertexAttribPointer(virtualShareWindowShaderInfo.attLocation[0], virtualShareWindowShaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, virtualShareWindowColor_vbo);
	g_gl.enableVertexAttribArray(virtualShareWindowShaderInfo.attLocation[1]);
	g_gl.vertexAttribPointer(virtualShareWindowShaderInfo.attLocation[1], virtualShareWindowShaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ARRAY_BUFFER, virtualShareWindowTexture_vbo);
	g_gl.enableVertexAttribArray(virtualShareWindowShaderInfo.attLocation[2]);
	g_gl.vertexAttribPointer(virtualShareWindowShaderInfo.attLocation[2], virtualShareWindowShaderInfo.attStride[2], g_gl.FLOAT, false, 0, 0);
	g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, virtualShareWindowIndex_ibo);

	m.identity(mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	g_gl.uniformMatrix4fv(virtualShareWindowShaderInfo.uniLocation[0], false, mvpMatrix);
	g_gl.uniform1i(virtualShareWindowShaderInfo.uniLocation[1], 4);
	g_gl.uniform1f(virtualShareWindowShaderInfo.uniLocation[2], NM_MicDisplay_count / 50.0);
	g_gl.drawElements(g_gl.TRIANGLES, virtualShareWindowPlaneNum * 6, g_gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_draw() {
	if (g_windowShareBackEnable) {
		g_gl.clearColor(0.0, 0.0, 0.0, 0.2);
	}
	else {
		g_gl.clearColor(0.0, 0.0, 0.0, 0.0);
	}
	g_gl.clearDepth(1.0);
	g_gl.clear(g_gl.COLOR_BUFFER_BIT | g_gl.DEPTH_BUFFER_BIT);
	g_gl.useProgram(normalShaderInfo.program);
	NM_MicDisplay_drawEmitWave();
	NM_MicDisplay_drawDftBarBackFrame();
	NM_MicDisplay_drawDftBarFrontBody();
	NM_MicDisplay_drawCircle();
	NM_MicDisplay_drawWave();
	g_gl.useProgram(virtualBackShaderInfo.program);
	NM_MicDisplay_drawCapture();
	g_gl.useProgram(virtualShareWindowShaderInfo.program);
	NM_MicDisplay_drawVirtualShareWindow();
	g_gl.flush();
}

export function NM_MicDisplay_main() {
	NM_MicDislay_adjustCanvasSize(false);
	if (finish_load_texture()) {
		NM_MicDisplay_updateWave();
		NM_MicDisplay_updateEmitWave();
		NM_MicDisplay_updateCircleAlpha();
		NM_MicDisplay_updateDftLevel();
		NM_MicDisplay_updateVirtualShareWindow();
		NM_MicDisplay_draw();
	}
	var endTime = performance.now();
	NM_MicDisplay_count += (endTime - NM_MicDisplay_previousTimestamp) * NM_MicDisplay_fps * 0.001;
	NM_MicDisplay_previousTimestamp = endTime;
}
