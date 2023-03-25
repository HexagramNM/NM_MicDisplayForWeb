//設定変数
var blazePoseCanvasSize = 128;
var virtualBackTextureSize = 1024;

var blasePoseNet = null;

var virtualBackVideoComponent = null;
var virtualBackIntermediateCanvas = null;
var virtualBackIntermediateCanvasCtx = null;
var virtualBackBlazePoseCanvas = null;
var virtualBackBlazePoseCanvasCtx = null;
var virtualBackPreviousFrameCanvas = null;
var virtualBackPreviousFrameCanvasCtx = null;
var virtualBackMaskCanvas = null;
var virtualBackMaskCanvasCtx = null;
var virtualBackTextureCanvas = null;
var virtualBackTextureCanvasCtx = null;

var mirrorVirtualBack = false;
var processedSegmentResult = null;

async function VirtualBack_drawTextureCanvas(i_processedSegmentResult) {
    virtualBackTextureCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    if (mirrorVirtualBack) {
        virtualBackTextureCanvasCtx.scale(-1, 1);
        virtualBackTextureCanvasCtx.translate(-virtualBackTextureSize, 0);
    }
    if (i_processedSegmentResult.length > 0) {
        virtualBackTextureCanvasCtx.globalCompositeOperation = "source-over";
        virtualBackTextureCanvasCtx.drawImage(virtualBackPreviousFrameCanvas, 0, 0,
            virtualBackIntermediateCanvas.width, virtualBackIntermediateCanvas.height,
            0, 0, virtualBackTextureSize, virtualBackTextureSize);

        var maskImage = await i_processedSegmentResult[0].segmentation.mask.toImageData();
        virtualBackMaskCanvasCtx.putImageData(maskImage, 0, 0);
        virtualBackTextureCanvasCtx.globalCompositeOperation = "destination-in";
        virtualBackTextureCanvasCtx.drawImage(virtualBackMaskCanvas, 0, 0,
            blazePoseCanvasSize, blazePoseCanvasSize,
            0, 0, virtualBackTextureSize, virtualBackTextureSize);
    }
    else {
        virtualBackTextureCanvasCtx.globalCompositeOperation = "destination-out";
        virtualBackTextureCanvasCtx.beginPath();
        virtualBackTextureCanvasCtx.fillStyle = "rgba(0, 0, 0, 1)";
        virtualBackTextureCanvasCtx.fillRect(0, 0, virtualBackTextureSize, virtualBackTextureSize);
    }
}

async function VirtualBack_init(videoStream) {
    mirrorVirtualBack = false;

    videoTracks = videoStream.getVideoTracks();
    if (videoTracks.length <= 0) {
        return;
    }
    virtualBackOriginalSize.width = videoTracks[0].getSettings().width;
    virtualBackOriginalSize.height = videoTracks[0].getSettings().height;

    virtualBackVideoComponent = document.getElementById("virtualBackVideo");
    virtualBackVideoComponent.width = virtualBackOriginalSize.width;
    virtualBackVideoComponent.height = virtualBackOriginalSize.height;
    virtualBackVideoComponent.autoplay = true;
    virtualBackVideoComponent.srcObject = videoStream;

    virtualBackIntermediateCanvas = document.getElementById("virtualBackIntermediate");
    virtualBackIntermediateCanvas.width = virtualBackOriginalSize.width;
    virtualBackIntermediateCanvas.height = virtualBackOriginalSize.height;
    virtualBackIntermediateCanvasCtx = virtualBackIntermediateCanvas.getContext("2d");

    virtualBackBlazePoseCanvas = document.getElementById("virtualBackBlazePose");
    virtualBackBlazePoseCanvas.width = blazePoseCanvasSize;
    virtualBackBlazePoseCanvas.height = blazePoseCanvasSize;
    virtualBackBlazePoseCanvasCtx = virtualBackBlazePoseCanvas.getContext("2d");

    virtualBackPreviousFrameCanvas = document.getElementById("virtualBackPreviousFrame");
    virtualBackPreviousFrameCanvas.width = virtualBackOriginalSize.width;
    virtualBackPreviousFrameCanvas.height = virtualBackOriginalSize.height;
    virtualBackPreviousFrameCanvasCtx = virtualBackPreviousFrameCanvas.getContext("2d");

    virtualBackMaskCanvas = document.getElementById("virtualBackMask");
    virtualBackMaskCanvas.width = blazePoseCanvasSize;
    virtualBackMaskCanvas.height = blazePoseCanvasSize;
    virtualBackMaskCanvasCtx = virtualBackMaskCanvas.getContext("2d");

    virtualBackTextureCanvas = document.getElementById("virtualBackTexture");
    virtualBackTextureCanvas.width = virtualBackTextureSize;
    virtualBackTextureCanvas.height = virtualBackTextureSize;
    virtualBackTextureCanvasCtx = virtualBackTextureCanvas.getContext("2d");

    const detectorConfig = {
        runtime: "mediapipe",
        enableSegmentation: true,
        modelType: "lite",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose"
    };
    blazePoseNet = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);

}

async function VirtualBack_main() {
    //var startTime = performance.now();
    virtualBackIntermediateCanvasCtx.drawImage(virtualBackVideoComponent, 0, 0,
        virtualBackOriginalSize.width, virtualBackOriginalSize.height);
    virtualBackBlazePoseCanvasCtx.drawImage(virtualBackIntermediateCanvas, 0, 0,
        virtualBackOriginalSize.width, virtualBackOriginalSize.height,
        0, 0, blazePoseCanvasSize, blazePoseCanvasSize);

    var blazePosePromise = blazePoseNet.estimatePoses(virtualBackBlazePoseCanvas);
    if (processedSegmentResult) {
        await VirtualBack_drawTextureCanvas(processedSegmentResult);
    }
    processedSegmentResult = await blazePosePromise;

    virtualBackPreviousFrameCanvasCtx.drawImage(virtualBackIntermediateCanvas, 0, 0,
        virtualBackOriginalSize.width, virtualBackOriginalSize.height);

    //var endTime = performance.now();
    //console.log(endTime - startTime);

    setTimeout(arguments.callee, 1000/60);
}
