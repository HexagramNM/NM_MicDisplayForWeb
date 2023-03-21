
//[[left, right], [top, bottom]]の順
var videoPercentRangeInWindowShareMode = [[0.0, 100.0], [0.0, 100.0]];
var SharedWindow_previousMousePos = [null, null];

function ShareWindow_drawUnderBackgroundCanvas() {
	var underBackgroundVideo = document.getElementById("underBackground");
	underBackgroundVideo.videoWidth = underBackgroundVideo.videoWidth;
	underBackgroundVideo.videoHeight = underBackgroundVideo.videoHeight;
	virtualShareWindowCanvasSize.width = underBackgroundVideo.videoWidth;
	virtualShareWindowCanvasSize.height = underBackgroundVideo.videoHeight;

	if (virtualShareWindowCanvasSize.width <= 0 || virtualShareWindowCanvasSize.height == 0) {
		return;
	}

	var underBackgroundCanvas = document.getElementById("underBackgroundCanvas");
	underBackgroundCanvas.width = virtualShareWindowCanvasSize.width;
	console.log(virtualShareWindowCanvasSize.width);
	underBackgroundCanvas.height = virtualShareWindowCanvasSize.height;
	underBackgroundCanvasCtx = underBackgroundCanvas.getContext("2d");
	underBackgroundCanvasCtx.drawImage(underBackgroundVideo, 0, 0,
		underBackgroundCanvas.width, underBackgroundCanvas.height);
}

function SharedWindow_calcMapTextureToCanvas() {
	if (virtualShareWindowCanvasSize.width <= 0 || virtualShareWindowCanvasSize.height == 0) {
		return;
	}

	var underBackgroundWidthOffset = virtualShareWindowCanvasSize.width * videoPercentRangeInWindowShareMode[0][0] / 100.0;
	var underBackgroundWidthRange = virtualShareWindowCanvasSize.width * (videoPercentRangeInWindowShareMode[0][1] - videoPercentRangeInWindowShareMode[0][0]) / 100.0;
	var underBackgroundHeightOffset = virtualShareWindowCanvasSize.height * videoPercentRangeInWindowShareMode[1][0] / 100.0;
	var underBackgroundHeightRange = virtualShareWindowCanvasSize.height * (videoPercentRangeInWindowShareMode[1][1] - videoPercentRangeInWindowShareMode[1][0]) / 100.0;

    for (var idx = 0; idx < virtualShareWindowTextureSize; idx++) {
        virtualShareWindowTextureInfo.mapTextureXToCanvas[idx] = parseInt(idx * underBackgroundWidthRange / virtualShareWindowTextureSize + underBackgroundWidthOffset + 0.5);
        virtualShareWindowTextureInfo.mapTextureYToCanvas[idx] = parseInt(idx * underBackgroundHeightRange / virtualShareWindowTextureSize + underBackgroundHeightOffset + 0.5);
    }
}

function ShareWindow_createTextureData() {
	if (virtualShareWindowCanvasSize.width <= 0 || virtualShareWindowCanvasSize.height == 0) {
		return;
	}

	var underBackgroundVideo = document.getElementById("underBackgroundCanvas");
	var underBackgroundCtx = underBackgroundVideo.getContext("2d");
	var underBackgroundCtxImage = underBackgroundCtx.getImageData(0, 0, virtualShareWindowCanvasSize.width, virtualShareWindowCanvasSize.height);
    var inputData = new Uint32Array(underBackgroundCtxImage.data.buffer);
    var inputPixIdx = 0;
    var outputPixIdx = 0;

	for (var y = 0; y < virtualShareWindowTextureSize; y++) {
		var yInputIdx = virtualShareWindowTextureInfo.mapTextureYToCanvas[y] * virtualShareWindowCanvasSize.width;
		for (var x = 0; x < virtualShareWindowTextureSize; x++) {
			inputPixIdx = yInputIdx + virtualShareWindowTextureInfo.mapTextureXToCanvas[x];
			virtualShareWindowTextureInfo.textureData32[outputPixIdx] = ((0xff << 24) | (inputData[inputPixIdx] & 0x00ffffff));
			outputPixIdx++;
		}
	}
}

function SharedWindow_showTrimmingMode() {
	var trimmingBox = document.getElementById("trimmingBox");
	var underBackgroundVideo = document.getElementById("underBackground");
	var underBackgroundVideoWidth = underBackgroundVideo.videoWidth;
	var underBackgroundVideoHeight = underBackgroundVideo.videoHeight;
	var actualSize = 0;
	var brankSize = 0;
	var borderWidth = 3;
	var frameLinePos = [0, 0, 0, 0]; //[left, right, top, bottom]

	underBackgroundVideo.width = document.documentElement.clientWidth;
	underBackgroundVideo.height = document.documentElement.clientHeight;
	if (underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth > underBackgroundVideo.height) {
		//画面の横の長さが長く、左右に余白がある場合
		actualSize = underBackgroundVideo.height * underBackgroundVideoWidth / underBackgroundVideoHeight;
		brankSize = underBackgroundVideo.width - actualSize;
		frameLinePos[0] = (brankSize * 0.5 + actualSize * (videoPercentRangeInWindowShareMode[0][0] / 100.0));
		frameLinePos[1] = (brankSize * 0.5 + actualSize * (videoPercentRangeInWindowShareMode[0][1] / 100.0));
		frameLinePos[2] = (underBackgroundVideo.height * (videoPercentRangeInWindowShareMode[1][0] / 100.0));
		frameLinePos[3] = (underBackgroundVideo.height * (videoPercentRangeInWindowShareMode[1][1] / 100.0));
	}
	else {
		//画面の縦の長さが長く、上下に余白がある場合
		actualSize = underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth;
		brankSize = underBackgroundVideo.height - actualSize;
		frameLinePos[0] = (underBackgroundVideo.width * (videoPercentRangeInWindowShareMode[0][0] / 100.0));
		frameLinePos[1] = (underBackgroundVideo.width * (videoPercentRangeInWindowShareMode[0][1] / 100.0));
		frameLinePos[2] = (brankSize * 0.5 + actualSize * (videoPercentRangeInWindowShareMode[1][0] / 100.0));
		frameLinePos[3] = (brankSize * 0.5 + actualSize * (videoPercentRangeInWindowShareMode[1][1] / 100.0));
	}
	trimmingBox.style.left = frameLinePos[0] + "px";
	trimmingBox.style.top = frameLinePos[2] + "px";
	trimmingBox.style.width = (frameLinePos[1] - frameLinePos[0] - borderWidth * 2) + "px";
	trimmingBox.style.height = (frameLinePos[3] - frameLinePos[2] - borderWidth * 2) + "px";
	trimmingBox.style.display = "";
	underBackgroundVideo.style.margin = "0px 0px";
	underBackgroundVideo.style.cssText += "clip-path: none";
	underBackgroundVideo.style.display = "";
}

function SharedWindow_showTrimmedWindow() {
    var trimmingBox = document.getElementById("trimmingBox");
    trimmingBox.style.display = "none";
	var underBackgroundVideo = document.getElementById("underBackground");
	var videoElementSize = [0, 0]; //[width, height]
	var videoElementMargin = [0, 0]; //[xMargin, yMargin]
	var videoPercentDiff = [(videoPercentRangeInWindowShareMode[0][1] - videoPercentRangeInWindowShareMode[0][0]),
		(videoPercentRangeInWindowShareMode[1][1] - videoPercentRangeInWindowShareMode[1][0])]; //[width, height]
	var trimmedWindowSize = [underBackgroundVideo.videoWidth * (videoPercentDiff[0] / 100.0),
		underBackgroundVideo.videoHeight * (videoPercentDiff[1] / 100.0)]; //[width, height]

	if (document.documentElement.clientWidth * trimmedWindowSize[1] / trimmedWindowSize[0] > document.documentElement.clientHeight) {
		//トリミング後、左右に余白ができる場合
		videoElementSize[1] = document.documentElement.clientHeight * 100.0 / videoPercentDiff[1];
		videoElementSize[0] = videoElementSize[1] * underBackgroundVideo.videoWidth / underBackgroundVideo.videoHeight;
		videoElementMargin[1] = -videoElementSize[1] * videoPercentRangeInWindowShareMode[1][0] / 100.0;
		videoElementMargin[0] = -videoElementSize[0] * videoPercentRangeInWindowShareMode[0][0] / 100.0
			+ (document.documentElement.clientWidth - videoElementSize[0] * videoPercentDiff[0] / 100.0) * 0.5;
	}
	else {
		//トリミング後、上下に余白ができる場合
		videoElementSize[0] = document.documentElement.clientWidth * 100.0 / videoPercentDiff[0];
		videoElementSize[1] = videoElementSize[0] * underBackgroundVideo.videoHeight / underBackgroundVideo.videoWidth;
		videoElementMargin[0] = -videoElementSize[0] * videoPercentRangeInWindowShareMode[0][0] / 100.0;
		videoElementMargin[1] = -videoElementSize[1] * videoPercentRangeInWindowShareMode[1][0] / 100.0
			+ (document.documentElement.clientHeight - videoElementSize[1] * videoPercentDiff[1] / 100.0) * 0.5;
	}
	underBackgroundVideo.width = videoElementSize[0];
	underBackgroundVideo.height = videoElementSize[1];
	underBackgroundVideo.style.margin = videoElementMargin[1].toString() + "px "
		+ videoElementMargin[0].toString() + "px";
	underBackgroundVideo.style.display = "";

	var leftPixel = videoElementSize[0] * videoPercentRangeInWindowShareMode[0][0] / 100.0;
	var rightPixel = videoElementSize[0] * videoPercentRangeInWindowShareMode[0][1] / 100.0;
	var topPixel = videoElementSize[1] * videoPercentRangeInWindowShareMode[1][0] / 100.0;
	var bottomPixel = videoElementSize[1] * videoPercentRangeInWindowShareMode[1][1] / 100.0;
	underBackgroundVideo.style.cssText += "clip-path: polygon(" + leftPixel.toString() + "px " + topPixel.toString() + "px, "
										+ rightPixel.toString() + "px " + topPixel.toString() + "px, "
										+ rightPixel.toString() + "px " + bottomPixel.toString() + "px, "
										+ leftPixel.toString() + "px " + bottomPixel.toString() + "px)";
}

function SharedWindow_keyUpEvent(event) {
	if (event.key == "t") {
		if (windowShareMode) {
			trimmingMode = !trimmingMode;
			SharedWindow_previousMousePos[0] = null;
			SharedWindow_previousMousePos[1] = null;
		}
	}
	else if (event.key == "r") {
		if (trimmingMode) {
			videoPercentRangeInWindowShareMode[0][0] = 0.0;
			videoPercentRangeInWindowShareMode[0][1] = 100.0;
			videoPercentRangeInWindowShareMode[1][0] = 0.0;
			videoPercentRangeInWindowShareMode[1][1] = 100.0;
		}
	}
	else if (event.key == "b") {
		if (windowShareMode) {
			windowShareBackEnable = !windowShareBackEnable;
		}
	}
	else if (event.key == "s") {
		trimmingMode = false;
		SharedWindow_previousMousePos[0] = null;
		SharedWindow_previousMousePos[1] = null;
		windowShareMode = !windowShareMode;
	}
}

function SharedWindow_mouseDownEvent(event) {
	if (trimmingMode) {
		SharedWindow_previousMousePos[0] = event.pageX;
		SharedWindow_previousMousePos[1] = event.pageY;
	}
}

function SharedWindow_mouseMoveEvent(event) {
	if (SharedWindow_previousMousePos[0] != null && SharedWindow_previousMousePos[1] != null && trimmingMode) {
		var underBackgroundVideo = document.getElementById("underBackground");
		var underBackgroundVideoWidth = underBackgroundVideo.videoWidth;
		var underBackgroundVideoHeight = underBackgroundVideo.videoHeight;
		var actualVideoSize = [0, 0]; //[width, height]
		var videoOffset = [0, 0]; //[xOffset, yOffset]
		var moveAmount = [event.pageX - SharedWindow_previousMousePos[0],  event.pageY - SharedWindow_previousMousePos[1]];

		if (underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth > underBackgroundVideo.height) {
			//画面の横の長さが長く、左右に余白がある場合
			actualVideoSize[0] = underBackgroundVideo.height * underBackgroundVideoWidth / underBackgroundVideoHeight;
			actualVideoSize[1] = underBackgroundVideo.height;
			videoOffset[0] = (underBackgroundVideo.width - actualVideoSize[0]) * 0.5;
		}
		else {
			//画面の縦の長さが長く、上下に余白がある場合
			actualVideoSize[0] = underBackgroundVideo.width;
			actualVideoSize[1] = underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth;
			videoOffset[1] = (underBackgroundVideo.height - actualVideoSize[1]) * 0.5;
		}

		var minPercent = 0.0;
		var maxPercent = 0.0;
		for (var xyIdx = 0; xyIdx < 2; xyIdx++) {
			for (var minMaxIdx = 0; minMaxIdx < 2; minMaxIdx++) {
				if (SharedWindow_previousMousePos[xyIdx] >= actualVideoSize[xyIdx] * videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] / 100.0 + videoOffset[xyIdx] - 10
					&& SharedWindow_previousMousePos[xyIdx] <= actualVideoSize[xyIdx] * videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] / 100.0 + videoOffset[xyIdx] + 10) {

					minPercent = (minMaxIdx == 0 ? 0.0: videoPercentRangeInWindowShareMode[xyIdx][0] + 10.0);
					maxPercent = (minMaxIdx == 0 ? videoPercentRangeInWindowShareMode[xyIdx][1] - 10.0: 100.0);
					videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] += moveAmount[xyIdx] / actualVideoSize[xyIdx] * 100.0;
					if (videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] < minPercent) {
						videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] = minPercent;
					}
					else if (videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] > maxPercent) {
						videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] = maxPercent;
					}
					break;
				}
			}
		}

		SharedWindow_previousMousePos[0] = event.pageX;
		SharedWindow_previousMousePos[1] = event.pageY;
	}
}

function SharedWindow_mouseUpEvent(event) {
	SharedWindow_previousMousePos[0] = null;
	SharedWindow_previousMousePos[1] = null;
}

function SharedWindow_init() {
	if (hasShareWindow) {
		document.addEventListener("keyup", SharedWindow_keyUpEvent);
		document.addEventListener("mousedown", SharedWindow_mouseDownEvent);
		document.addEventListener("mousemove", SharedWindow_mouseMoveEvent);
		document.addEventListener("mouseup", SharedWindow_mouseUpEvent);
		document.addEventListener("mouseleave", SharedWindow_mouseUpEvent);
	}
}

function SharedWindow_main() {
	if (!hasShareWindow) {
		return;
	}

	if (windowShareMode) {
        if (trimmingMode) {
    		SharedWindow_showTrimmingMode();
    	}
    	else {
            SharedWindow_showTrimmedWindow();
    	}
	}
	else {
		document.getElementById("trimmingBox").style.display = "none";
		document.getElementById("underBackground").style.display = "none";
	}
	ShareWindow_drawUnderBackgroundCanvas()
	SharedWindow_calcMapTextureToCanvas()
	ShareWindow_createTextureData()
	virtualShareWindowTextureInfo.isChanged = true;
    setTimeout(arguments.callee, 1000/60);
}
