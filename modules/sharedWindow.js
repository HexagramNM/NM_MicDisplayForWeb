
var virtualShareWindowTextureSize = 512;

//[[left, right], [top, bottom]]の順
var videoPercentRangeInWindowShareMode = [[0.0, 100.0], [0.0, 100.0]];
var SharedWindow_previousMousePos = [null, null];
var SharedWindow_mainTimer = null;

function ShareWindow_createTextureData() {
	var virtualShareWindowVideo = document.getElementById("virtualShareWindowVideo");
	var virtualShareWindowWidthOffset = virtualShareWindowVideo.width * videoPercentRangeInWindowShareMode[0][0] / 100.0;
	var virtualShareWindowWidthRange = virtualShareWindowVideo.width
		* (videoPercentRangeInWindowShareMode[0][1] - videoPercentRangeInWindowShareMode[0][0]) / 100.0;
	var virtualShareWindowHeightOffset = virtualShareWindowVideo.height * videoPercentRangeInWindowShareMode[1][0] / 100.0;
	var virtualShareWindowHeightRange = virtualShareWindowVideo.height
		* (videoPercentRangeInWindowShareMode[1][1] - videoPercentRangeInWindowShareMode[1][0]) / 100.0;

	virtualShareWindowVideo.width = virtualShareWindowVideo.videoWidth;
	virtualShareWindowVideo.height = virtualShareWindowVideo.videoHeight;
	g_virtualShareWindowTrimmedSize.width = virtualShareWindowWidthRange;
	g_virtualShareWindowTrimmedSize.height = virtualShareWindowHeightRange;

	if (g_virtualShareWindowTrimmedSize.width <= 0 || g_virtualShareWindowTrimmedSize.height == 0) {
		return;
	}

	var virtualShareWindowTexture = document.getElementById("virtualShareWindowTexture");
	var virtualShareWindowTextureCtx = virtualShareWindowTexture.getContext("2d");
	virtualShareWindowTextureCtx.drawImage(virtualShareWindowVideo, virtualShareWindowWidthOffset, virtualShareWindowHeightOffset,
		virtualShareWindowWidthRange, virtualShareWindowHeightRange,
		0, 0, virtualShareWindowTextureSize, virtualShareWindowTextureSize);

	if (g_virtualShareWindowTextureObj != null) {
		g_virtualShareWindowTextureObj.redraw();
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
		if (g_windowShareMode) {
			g_trimmingMode = !g_trimmingMode;
			SharedWindow_previousMousePos[0] = null;
			SharedWindow_previousMousePos[1] = null;
		}
	}
	else if (event.key == "r") {
		if (g_trimmingMode) {
			videoPercentRangeInWindowShareMode[0][0] = 0.0;
			videoPercentRangeInWindowShareMode[0][1] = 100.0;
			videoPercentRangeInWindowShareMode[1][0] = 0.0;
			videoPercentRangeInWindowShareMode[1][1] = 100.0;
		}
	}
	else if (event.key == "b") {
		if (g_windowShareMode) {
			g_windowShareBackEnable = !g_windowShareBackEnable;
		}
	}
	else if (event.key == "s") {
		g_trimmingMode = false;
		g_windowShareBackEnable = false;
		SharedWindow_previousMousePos[0] = null;
		SharedWindow_previousMousePos[1] = null;
		g_windowShareMode = !g_windowShareMode;
	}
}

function SharedWindow_mouseDownEvent(event) {
	if (g_trimmingMode) {
		SharedWindow_previousMousePos[0] = event.pageX;
		SharedWindow_previousMousePos[1] = event.pageY;
	}
}

function SharedWindow_mouseMoveEvent(event) {
	if (SharedWindow_previousMousePos[0] != null && SharedWindow_previousMousePos[1] != null && g_trimmingMode) {
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

export function SharedWindow_init() {
	if (g_hasShareWindow) {
		document.addEventListener("keyup", SharedWindow_keyUpEvent);
		document.addEventListener("mousedown", SharedWindow_mouseDownEvent);
		document.addEventListener("mousemove", SharedWindow_mouseMoveEvent);
		document.addEventListener("mouseup", SharedWindow_mouseUpEvent);
		document.addEventListener("mouseleave", SharedWindow_mouseUpEvent);
	}
	var virtualShareWindowTexture = document.getElementById("virtualShareWindowTexture");
	virtualShareWindowTexture.width = virtualShareWindowTextureSize;
	virtualShareWindowTexture.height = virtualShareWindowTextureSize;
	SharedWindow_mainTimer = setInterval(SharedWindow_main, 1000/30);
}

function SharedWindow_main() {
	if (!g_hasShareWindow) {
		return;
	}

	if (g_windowShareMode) {
        if (g_trimmingMode) {
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
	ShareWindow_createTextureData();
}
