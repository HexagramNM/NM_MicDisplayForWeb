var NM_MicDisplay_loadedTextureNum = 0;
var NM_MicDisplay_count = 0;
var gl;
var texture_max;

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

var attLocation = new Array();
var attStride = new Array();
var uniLocation = new Array();
var index = [
	0, 2, 1,
	1, 2, 3
];
var texture;
var position_vbo;
var color_vbo;
var texture_vbo;
var index_ibo;
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
var textureProcess = new Array();

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

function create_vbo(data, isDynamic=false) {
	var vbo=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	if (isDynamic) {
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
	}
	else {
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	return vbo;
}

function create_ibo(data) {
	var ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	return ibo;
}

function create_texture(source, number) {
	if (number >= texture_max) {
		return;
	}
	var img = new Image();
	img.onload = function() {
		var tex = gl.createTexture();
		gl.activeTexture(gl["TEXTURE" + number.toString()]);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		texture[number] = tex;
		NM_MicDisplay_loadedTextureNum++;
	};
	img.src = source;
}

function create_texture_from_canvas(canvasInfo, number) {
	if (number >= texture_max) {
		return;
	}
	var sourceCanvas = document.getElementById(canvasInfo.canvasName);
	var tex = gl.createTexture();
	dynamicTextureSetting();
	texture[number] = tex;
	textureProcess.push(dynamicTextureSetting);
	NM_MicDisplay_loadedTextureNum++;

	function dynamicTextureSetting() {
		if (canvasInfo.isChanged) {
			canvasInfo.isChanged = false;
			gl.activeTexture(gl["TEXTURE" + number.toString()]);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	}
}

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

function NM_MicDisplay_createPlaneBuffer() {
	var vertex_position = [
		-1.0, 1.0, 0.0,
		1.0, 1.0, 0.0,
		-1.0, -1.0, 0.0,
		1.0,-1.0,0.0

	];
	var vertex_color = [
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0,
		1.0,1.0,1.0,1.0
	];
	var texture_coord=[
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];
	defaultGlobalColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	circleColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	circleLightColor = new Float32Array([1.0, 0.5, 0.5, 0.0]);
	emitWaveColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
	position_vbo = create_vbo(vertex_position);
	color_vbo = create_vbo(vertex_color);
	texture_vbo = create_vbo(texture_coord);
	index_ibo = create_ibo(index);
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
	var soundWaveIndex_data = new Float32Array(soundDisplayLength * 6);
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
	soundWaveIndex_vbo = create_ibo(soundWaveIndex_data);
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
	if (NM_MicDisplay_previousMousePos[0] != null && NM_MicDisplay_previousMousePos[1] != null) {
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
	if (windowShareMode) {
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
		gl.viewport(0, 0, c.width, c.height);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
	}
	c.style.margin = heightMargin.toString() + "px " + widthMargin.toString() + "px";
}

async function NM_MicDisplay_init(micStream) {
	var c = document.getElementById('NM_MicDisplayOutput');
	if (!c || !(c.getContext)) {
		return;
	}
	gl=c.getContext('webgl')||c.getContext('experimental-webgl');
	NM_MicDislay_adjustCanvasSize(true);
	c.addEventListener("mousedown", NM_MicDisplay_mouseDownEvent);
	c.addEventListener("mouseup", NM_MicDisplay_mouseUpEvent);
	c.addEventListener("mouseleave", NM_MicDisplay_mouseUpEvent);
	c.addEventListener("mousemove", NM_MicDisplay_mouseMoveEvent);
	await NM_MicDisplay_micInit(micStream);

	var v_shader=create_shader('vshader');
	var f_shader=create_shader('fshader');

	var prg=create_program(v_shader, f_shader);
	texture_max = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	texture = new Array(texture_max);

	attLocation[0]=gl.getAttribLocation(prg, 'position');
	attLocation[1]=gl.getAttribLocation(prg, 'color');
	attLocation[2]=gl.getAttribLocation(prg, 'textureCoord');
	attStride[0]=3;
	attStride[1]=4;
	attStride[2]=2;

	NM_MicDisplay_createPlaneBuffer();
	NM_MicDisplay_createDftBarBuffer()
	NM_MicDisplay_createSoundWaveBuffer();

	gl.enable(gl.BLEND);
	gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'pointSize');
	uniLocation[2] = gl.getUniformLocation(prg, 'enableTexture');
	uniLocation[3] = gl.getUniformLocation(prg, 'texture');
	uniLocation[4] = gl.getUniformLocation(prg, 'globalColor');

	create_texture('image/redCircle.png?'+new Date().getTime(), 0);
	create_texture('image/redCircleLight.png?'+new Date().getTime(), 1);
	create_texture('image/redCircleWave.png?'+new Date().getTime(), 2);
	create_texture_from_canvas(virtualBackTextureInfo, 3);

	m.lookAt([0.0, 9.0, -18.0], [0,2.0,0], [0, 1, 0], vMatrix);
	m.perspective(60.0, c.width/c.height, 1.0, 100, pMatrix);
	m.multiply(pMatrix, vMatrix, vpMatrix);

	function create_shader(id) {
		var shader;
		var scriptElement=document.getElementById(id);
		if (!scriptElement){return;}
		switch(scriptElement.type) {
			case 'x-shader/x-vertex':
				shader=gl.createShader(gl.VERTEX_SHADER);
				break;
			case 'x-shader/x-fragment':
				shader=gl.createShader(gl.FRAGMENT_SHADER);
				break;
			default:
				return;
		}
		gl.shaderSource(shader, scriptElement.text);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			return shader;
		} else {
			alert(gl.getShaderInfoLog(shader));
		}
	}

	function create_program(vs, fs) {
		var program=gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.useProgram(program);
			return program;
		} else {
			alert(gl.getProgramInfoLog(program));
		}
	}
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

	//音量による魔法陣の透過率
	var waveAlphaMaxRate = 150.0;
	var alphaRate = (currentWaveLevel > waveAlphaMaxRate ? 1.0: currentWaveLevel / waveAlphaMaxRate);
	circleColor[3] = 0.3 + 0.7 * alphaRate;
	circleLightColor[3] = 0.7 *alphaRate;

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

function NM_MicDisplay_drawEmitWave() {
	gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, color_vbo);
	gl.enableVertexAttribArray(attLocation[1]);
	gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, texture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_ibo);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 1);
	gl.uniform1i(uniLocation[3], 2);

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

			gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
			gl.uniform4fv(uniLocation[4], emitWaveColor);
			gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
		}
	}
}

function NM_MicDisplay_drawDftBar() {
	//後ろの枠
	gl.bindBuffer(gl.ARRAY_BUFFER, dftBarFramePosition_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, dftBarFrameDummyTexture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, dftBarFrameIndex_ibo);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 0);
	gl.uniform1i(uniLocation[3], 0);
	gl.uniform4fv(uniLocation[4], defaultGlobalColor);
	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		for (var levelIdx = 0; levelIdx < previousDftWaveLevel[dftElemIdx]; levelIdx++) {
			gl.bindBuffer(gl.ARRAY_BUFFER, dftBarFrameColor_vboArray[levelIdx]);
			gl.enableVertexAttribArray(attLocation[1]);
			gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);

			m.identity(mMatrix);
			m.rotate(mMatrix, (75.0 - 150.0 * dftElemIdx / (dftElementNum - 1)) * Math.PI / 180.0, [0.0, 1.0, 0.0], mMatrix);
			m.translate(mMatrix, [0.0, 0.5 + 1.0 * levelIdx, circleRadius + 0.4], mMatrix);
			m.multiply(vpMatrix, mMatrix, mvpMatrix);

			gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
			gl.drawElements(gl.TRIANGLES, dftBarFrameIndex_data.length, gl.UNSIGNED_SHORT, 0);
		}
	}

	//前の枠
	gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, texture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_ibo);
	for (var dftElemIdx = 0; dftElemIdx < dftElementNum; dftElemIdx++) {
		for (var levelIdx = 0; levelIdx < currentDftWaveLevel[dftElemIdx]; levelIdx++) {
			gl.bindBuffer(gl.ARRAY_BUFFER, dftBarColor_vboArray[levelIdx]);
			gl.enableVertexAttribArray(attLocation[1]);
			gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);

			m.identity(mMatrix);
			m.rotate(mMatrix, (75.0 - 150.0 * dftElemIdx / (dftElementNum - 1)) * Math.PI / 180.0, [0.0, 1.0, 0.0], mMatrix);
			m.translate(mMatrix, [0.0, 0.5 + 1.0 * levelIdx, circleRadius + 0.2], mMatrix);
			m.scale(mMatrix, [0.8, 0.4, 1.0], mMatrix);
			m.multiply(vpMatrix, mMatrix, mvpMatrix);

			gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
			gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
		}
	}
}

function NM_MicDisplay_drawCircle() {
	gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, color_vbo);
	gl.enableVertexAttribArray(attLocation[1]);
	gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, texture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_ibo);

	var rad=(NM_MicDisplay_count%720)*Math.PI/360;
	var x = Math.cos(rad);
	var y = Math.sin(rad);
	m.identity(mMatrix);
	m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
	m.rotate(mMatrix, Math.PI / 2.0, [1.0, 0.0, 0.0], mMatrix);
	m.scale(mMatrix, [circleRadius, circleRadius, 1.0], mMatrix);

	//魔法陣発光部分
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 1);
	gl.uniform1i(uniLocation[3], 1);
	gl.uniform4fv(uniLocation[4], circleLightColor);
	gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

	//魔法陣本体
	m.translate(mMatrix, [0.0, 0.0, -0.001], mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 1);
	gl.uniform1i(uniLocation[3], 0);
	gl.uniform4fv(uniLocation[4], circleColor);
	gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_drawWave() {
	gl.bindBuffer(gl.ARRAY_BUFFER, soundWavePosition_vbo);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, soundWavePosition_data);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, soundWaveColor_vbo);
	gl.enableVertexAttribArray(attLocation[1]);
	gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, soundWaveDummyTexture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, soundWaveIndex_vbo);

	m.identity(mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 0);
	gl.uniform1i(uniLocation[3], 0);
	gl.uniform4fv(uniLocation[4], defaultGlobalColor);
	gl.drawElements(gl.TRIANGLES, soundDisplayLength * 6, gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_drawCapture() {
	gl.bindBuffer(gl.ARRAY_BUFFER, position_vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, color_vbo);
	gl.enableVertexAttribArray(attLocation[1]);
	gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, texture_vbo);
	gl.enableVertexAttribArray(attLocation[2]);
	gl.vertexAttribPointer(attLocation[2], attStride[2], gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_ibo);

	//virtualBackCanvasSizeはglobalVariables.js内の変数
	var aspect = virtualBackCanvasSize.height / virtualBackCanvasSize.width;
	m.identity(mMatrix);
	m.translate(mMatrix, [0.0, 5.5, -6.0], mMatrix);
	m.rotate(mMatrix, Math.PI, [0.0, 1.0, 0.0], mMatrix);
	m.scale(mMatrix, [captureWidth, captureWidth * aspect, 1.0], mMatrix);
	m.multiply(vpMatrix, mMatrix, mvpMatrix);
	gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	gl.uniform1f(uniLocation[1], 1.0);
	gl.uniform1i(uniLocation[2], 1);
	gl.uniform1i(uniLocation[3], 3);
	gl.uniform4fv(uniLocation[4], defaultGlobalColor);
	gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
}

function NM_MicDisplay_main(){
	NM_MicDislay_adjustCanvasSize(false);
	if (NM_MicDisplay_loadedTextureNum >= 3) {
		for (var idx = 0; idx < textureProcess.length; idx++) {
			textureProcess[idx]();
		}
		NM_MicDisplay_updateWave();

		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		NM_MicDisplay_drawEmitWave();
		NM_MicDisplay_drawDftBar();
		NM_MicDisplay_drawCircle();
		NM_MicDisplay_drawWave();
		NM_MicDisplay_drawCapture();
		gl.flush();
		NM_MicDisplay_count++;
	}
	setTimeout(arguments.callee, 1000/60);
}
