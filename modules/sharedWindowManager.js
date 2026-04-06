
export class SharedWindowManager {
    constructor() {
        //[[left, right], [top, bottom]]の順
		this.videoPercentRangeInWindowShareMode = [[0.0, 100.0], [0.0, 100.0]];
		this.windowShareMode = true;
        this.trimmingMode = false;
        this.windowShareBackEnable = false;
        this.previousMousePos = [null, null];

        document.addEventListener("keyup", (e) => this.keyUpEvent(e));
        document.addEventListener("mousedown", (e) => this.mouseDownEvent(e));
        document.addEventListener("mousemove", (e) => this.mouseMoveEvent(e));
        document.addEventListener("mouseup", (e) => this.mouseUpEvent(e));
        document.addEventListener("mouseleave", (e) => this.mouseUpEvent(e));
    }

    showTrimmingMode() {
        const trimmingBox = document.getElementById("trimmingBox");
        const underBackgroundVideo = document.getElementById("underBackground");
        const underBackgroundVideoWidth = underBackgroundVideo.videoWidth;
        const underBackgroundVideoHeight = underBackgroundVideo.videoHeight;
        const borderWidth = 3;
        var actualSize = 0;
        var brankSize = 0;
        var frameLinePos = [0, 0, 0, 0]; //[left, right, top, bottom]

        underBackgroundVideo.width = document.documentElement.clientWidth;
        underBackgroundVideo.height = document.documentElement.clientHeight;
        if (underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth > underBackgroundVideo.height) {
            //画面の横の長さが長く、左右に余白がある場合
            actualSize = underBackgroundVideo.height * underBackgroundVideoWidth / underBackgroundVideoHeight;
            brankSize = underBackgroundVideo.width - actualSize;
            frameLinePos[0] = (brankSize * 0.5
                + actualSize * (this.videoPercentRangeInWindowShareMode[0][0] / 100.0));
            frameLinePos[1] = (brankSize * 0.5
                + actualSize * (this.videoPercentRangeInWindowShareMode[0][1] / 100.0));
            frameLinePos[2] = (underBackgroundVideo.height
                * (this.videoPercentRangeInWindowShareMode[1][0] / 100.0));
            frameLinePos[3] = (underBackgroundVideo.height
                * (this.videoPercentRangeInWindowShareMode[1][1] / 100.0));
        }
        else {
            //画面の縦の長さが長く、上下に余白がある場合
            actualSize = underBackgroundVideo.width * underBackgroundVideoHeight / underBackgroundVideoWidth;
            brankSize = underBackgroundVideo.height - actualSize;
            frameLinePos[0] = (underBackgroundVideo.width
                * (this.videoPercentRangeInWindowShareMode[0][0] / 100.0));
            frameLinePos[1] = (underBackgroundVideo.width
                * (this.videoPercentRangeInWindowShareMode[0][1] / 100.0));
            frameLinePos[2] = (brankSize * 0.5
                + actualSize * (this.videoPercentRangeInWindowShareMode[1][0] / 100.0));
            frameLinePos[3] = (brankSize * 0.5
                + actualSize * (this.videoPercentRangeInWindowShareMode[1][1] / 100.0));
        }
        trimmingBox.style.left = frameLinePos[0] + "px";
        trimmingBox.style.top = frameLinePos[2] + "px";
        trimmingBox.style.width = (frameLinePos[1] - frameLinePos[0] - borderWidth * 2) + "px";
        trimmingBox.style.height = (frameLinePos[3] - frameLinePos[2] - borderWidth * 2) + "px";
        trimmingBox.style.display = "";
        underBackgroundVideo.style.margin = "0px 0px";
        underBackgroundVideo.style.cssText += "clip-path: none";
        underBackgroundVideo.style.visibility = "visible";
    }

    showTrimmedWindow() {
        const trimmingBox = document.getElementById("trimmingBox");
        trimmingBox.style.display = "none";
        const underBackgroundVideo = document.getElementById("underBackground");
        var videoElementSize = [0, 0]; //[width, height]
        var videoElementMargin = [0, 0]; //[xMargin, yMargin]
        const videoPercentDiff = [(this.videoPercentRangeInWindowShareMode[0][1] - this.videoPercentRangeInWindowShareMode[0][0]),
            (this.videoPercentRangeInWindowShareMode[1][1] - this.videoPercentRangeInWindowShareMode[1][0])]; //[width, height]
        const trimmedWindowSize = [underBackgroundVideo.videoWidth * (videoPercentDiff[0] / 100.0),
            underBackgroundVideo.videoHeight * (videoPercentDiff[1] / 100.0)]; //[width, height]

        if (document.documentElement.clientWidth * trimmedWindowSize[1] / trimmedWindowSize[0] > document.documentElement.clientHeight) {
            //トリミング後、左右に余白ができる場合
            videoElementSize[1] = document.documentElement.clientHeight * 100.0 / videoPercentDiff[1];
            videoElementSize[0] = videoElementSize[1] * underBackgroundVideo.videoWidth / underBackgroundVideo.videoHeight;
            videoElementMargin[1] = -videoElementSize[1] * this.videoPercentRangeInWindowShareMode[1][0] / 100.0;
            videoElementMargin[0] = -videoElementSize[0] * this.videoPercentRangeInWindowShareMode[0][0] / 100.0
                + (document.documentElement.clientWidth - videoElementSize[0] * videoPercentDiff[0] / 100.0) * 0.5;
        }
        else {
            //トリミング後、上下に余白ができる場合
            videoElementSize[0] = document.documentElement.clientWidth * 100.0 / videoPercentDiff[0];
            videoElementSize[1] = videoElementSize[0] * underBackgroundVideo.videoHeight / underBackgroundVideo.videoWidth;
            videoElementMargin[0] = -videoElementSize[0] * this.videoPercentRangeInWindowShareMode[0][0] / 100.0;
            videoElementMargin[1] = -videoElementSize[1] * this.videoPercentRangeInWindowShareMode[1][0] / 100.0
                + (document.documentElement.clientHeight - videoElementSize[1] * videoPercentDiff[1] / 100.0) * 0.5;
        }
        underBackgroundVideo.width = videoElementSize[0];
        underBackgroundVideo.height = videoElementSize[1];
        underBackgroundVideo.style.margin = videoElementMargin[1].toString() + "px "
            + videoElementMargin[0].toString() + "px";
        underBackgroundVideo.style.visibility = "visible";

        const leftPixel = videoElementSize[0] * this.videoPercentRangeInWindowShareMode[0][0] / 100.0;
        const rightPixel = videoElementSize[0] * this.videoPercentRangeInWindowShareMode[0][1] / 100.0;
        const topPixel = videoElementSize[1] * this.videoPercentRangeInWindowShareMode[1][0] / 100.0;
        const bottomPixel = videoElementSize[1] * this.videoPercentRangeInWindowShareMode[1][1] / 100.0;
        underBackgroundVideo.style.cssText += "clip-path: polygon(" 
            + leftPixel.toString() + "px " + topPixel.toString() + "px, "
            + rightPixel.toString() + "px " + topPixel.toString() + "px, "
            + rightPixel.toString() + "px " + bottomPixel.toString() + "px, "
            + leftPixel.toString() + "px " + bottomPixel.toString() + "px)";
    }

    keyUpEvent(event) {
        if (event.key == "t") {
            if (this.windowShareMode) {
                this.trimmingMode = !this.trimmingMode;
                this.previousMousePos[0] = null;
                this.previousMousePos[1] = null;
            }
        }
        else if (event.key == "r") {
            if (this.trimmingMode) {
                this.videoPercentRangeInWindowShareMode[0][0] = 0.0;
                this.videoPercentRangeInWindowShareMode[0][1] = 100.0;
                this.videoPercentRangeInWindowShareMode[1][0] = 0.0;
                this.videoPercentRangeInWindowShareMode[1][1] = 100.0;
            }
        }
        else if (event.key == "b") {
            if (this.windowShareMode) {
                this.windowShareBackEnable = !this.windowShareBackEnable;
            }
        }
        else if (event.key == "s") {
            this.trimmingMode = false;
            this.windowShareBackEnable = false;
            this.previousMousePos[0] = null;
            this.previousMousePos[1] = null;
            this.windowShareMode = !this.windowShareMode;
        }
    }

    mouseDownEvent(event) {
        if (this.trimmingMode) {
            this.previousMousePos[0] = event.pageX;
            this.previousMousePos[1] = event.pageY;
        }
    }

    mouseMoveEvent(event) {
        if (this.previousMousePos[0] != null && this.previousMousePos[1] != null && this.trimmingMode) {
            var underBackgroundVideo = document.getElementById("underBackground");
            var underBackgroundVideoWidth = underBackgroundVideo.videoWidth;
            var underBackgroundVideoHeight = underBackgroundVideo.videoHeight;
            var actualVideoSize = [0, 0]; //[width, height]
            var videoOffset = [0, 0]; //[xOffset, yOffset]
            var moveAmount = [event.pageX - this.previousMousePos[0],  event.pageY - this.previousMousePos[1]];

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
                    if (this.previousMousePos[xyIdx] >= actualVideoSize[xyIdx] * this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] / 100.0 + videoOffset[xyIdx] - 10
                        && this.previousMousePos[xyIdx] <= actualVideoSize[xyIdx] * this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] / 100.0 + videoOffset[xyIdx] + 10) {

                        minPercent = (minMaxIdx == 0 ? 0.0: this.videoPercentRangeInWindowShareMode[xyIdx][0] + 10.0);
                        maxPercent = (minMaxIdx == 0 ? this.videoPercentRangeInWindowShareMode[xyIdx][1] - 10.0: 100.0);
                        this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] += moveAmount[xyIdx] / actualVideoSize[xyIdx] * 100.0;
                        if (this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] < minPercent) {
                            this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] = minPercent;
                        }
                        else if (this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] > maxPercent) {
                            this.videoPercentRangeInWindowShareMode[xyIdx][minMaxIdx] = maxPercent;
                        }
                        break;
                    }
                }
            }

            this.previousMousePos[0] = event.pageX;
            this.previousMousePos[1] = event.pageY;
        }
    }

    mouseUpEvent(event) {
        this.previousMousePos[0] = null;
        this.previousMousePos[1] = null;
    }

    draw() {
        if (this.windowShareMode) {
            if (this.trimmingMode) {
                this.showTrimmingMode();
            }
            else {
                this.showTrimmedWindow();
            }
        }
        else {
            document.getElementById("trimmingBox").style.display = "none";
            document.getElementById("underBackground").style.visibility = "hidden";
        }
    }
}
