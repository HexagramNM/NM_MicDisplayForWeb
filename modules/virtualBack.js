
//設定変数
var blazePoseCanvasSize = 256;
var virtualBackTextureSize = 1024;

var blazePoseNet = null;

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
var virtualBackYuvPixelArray = null;
var virtualBackHistogram = null;
const HISTOGRAM_LEVEL = 512;

var mirrorVirtualBack = false;
var blazePosePromise = null;
var processedSegmentResult = null;

export async function VirtualBack_drawTextureCanvas() {
    if (processedSegmentResult == null) {
        return;
    }
    virtualBackTextureCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    if (mirrorVirtualBack) {
        virtualBackTextureCanvasCtx.scale(-1, 1);
        virtualBackTextureCanvasCtx.translate(-virtualBackTextureSize, 0);
    }

    if (processedSegmentResult.length > 0) {
        virtualBackTextureCanvasCtx.globalCompositeOperation = "source-over";
        virtualBackTextureCanvasCtx.drawImage(virtualBackPreviousFrameCanvas, 0, 0,
            virtualBackIntermediateCanvas.width, virtualBackIntermediateCanvas.height,
            0, 0, virtualBackTextureSize, virtualBackTextureSize);

        var maskImage = await processedSegmentResult[0].segmentation.mask.toImageData();
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

    if (g_virtualBackTextureObj != null) {
        g_virtualBackTextureObj.redraw();
    }
}

export function VirtualBack_toggleMirror() {
    mirrorVirtualBack = !mirrorVirtualBack;
}

export async function VirtualBack_init(videoStream) {
    mirrorVirtualBack = false;

    var videoTracks = videoStream.getVideoTracks();
    if (videoTracks.length <= 0) {
        return;
    }
    g_virtualBackOriginalSize.width = videoTracks[0].getSettings().width;
    g_virtualBackOriginalSize.height = videoTracks[0].getSettings().height;
    virtualBackYuvPixelArray = new Float32Array(
        g_virtualBackOriginalSize.width * g_virtualBackOriginalSize.height * 4);
    virtualBackHistogram = new Uint32Array(HISTOGRAM_LEVEL);

    virtualBackVideoComponent = document.getElementById("virtualBackVideo");
    virtualBackVideoComponent.width = g_virtualBackOriginalSize.width;
    virtualBackVideoComponent.height = g_virtualBackOriginalSize.height;
    virtualBackVideoComponent.autoplay = true;
    virtualBackVideoComponent.srcObject = videoStream;

    virtualBackIntermediateCanvas = document.getElementById("virtualBackIntermediate");
    virtualBackIntermediateCanvas.width = g_virtualBackOriginalSize.width;
    virtualBackIntermediateCanvas.height = g_virtualBackOriginalSize.height;
    virtualBackIntermediateCanvasCtx = virtualBackIntermediateCanvas.getContext("2d");

    virtualBackBlazePoseCanvas = document.getElementById("virtualBackBlazePose");
    virtualBackBlazePoseCanvas.width = blazePoseCanvasSize;
    virtualBackBlazePoseCanvas.height = blazePoseCanvasSize;
    virtualBackBlazePoseCanvasCtx = virtualBackBlazePoseCanvas.getContext("2d");

    virtualBackPreviousFrameCanvas = document.getElementById("virtualBackPreviousFrame");
    virtualBackPreviousFrameCanvas.width = g_virtualBackOriginalSize.width;
    virtualBackPreviousFrameCanvas.height = g_virtualBackOriginalSize.height;
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
        modelType: g_blazePoseModelType,
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose"
    };
    blazePoseNet = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);
}

function histogram_equalization() {
    var virtualBackIntermediateImageData 
        = virtualBackIntermediateCanvasCtx.getImageData(0, 0, 
        g_virtualBackOriginalSize.width, g_virtualBackOriginalSize.height);
    
    var sourceImagePixelNum = g_virtualBackOriginalSize.width * g_virtualBackOriginalSize.height;
    for (var idx = 0; idx < HISTOGRAM_LEVEL; idx++) {
        virtualBackHistogram[idx] = 0;
    }

    for (var pidx = 0; pidx < sourceImagePixelNum; pidx++) {
        const headPos = pidx * 4;
        const r = virtualBackIntermediateImageData.data[headPos];
        const g = virtualBackIntermediateImageData.data[headPos + 1];
        const b = virtualBackIntermediateImageData.data[headPos + 2];
        const y = 0.299 * r + 0.587 * g + 0.114 * b;

        virtualBackYuvPixelArray[headPos] = y; 
        virtualBackYuvPixelArray[headPos + 1] = -0.169 * r - 0.331 * g + 0.5 * b;
        virtualBackYuvPixelArray[headPos + 2] = 0.5 * r - 0.419 * g + 0.081 * b;

        virtualBackHistogram[(y * (HISTOGRAM_LEVEL / 256) | 0)]++;
    }

    for (var idx = 1; idx < HISTOGRAM_LEVEL; idx++) {
        virtualBackHistogram[idx] = virtualBackHistogram[idx - 1] + virtualBackHistogram[idx];
    }

    for (var pidx = 0; pidx < sourceImagePixelNum; pidx++) {
        const headPos = pidx * 4;
        const intY = (virtualBackYuvPixelArray[headPos] * (HISTOGRAM_LEVEL / 256) | 0);
        const newY = 255.0 * virtualBackHistogram[intY] / sourceImagePixelNum;
        const u = virtualBackYuvPixelArray[headPos + 1];
        const v = virtualBackYuvPixelArray[headPos + 2];

        virtualBackIntermediateImageData.data[headPos] = newY + 1.402 * v;
        virtualBackIntermediateImageData.data[headPos + 1] = newY - 0.344 * u - 0.714 * v;
        virtualBackIntermediateImageData.data[headPos + 2] = newY + 1.772 * u;
    }

    virtualBackIntermediateCanvasCtx.putImageData(virtualBackIntermediateImageData, 0, 0);
}

export async function VirtualBack_preprocess() {
    virtualBackIntermediateCanvasCtx.drawImage(virtualBackVideoComponent, 0, 0);

    histogram_equalization();

    virtualBackBlazePoseCanvasCtx.drawImage(virtualBackIntermediateCanvas, 0, 0,
        g_virtualBackOriginalSize.width, g_virtualBackOriginalSize.height,
        0, 0, blazePoseCanvasSize, blazePoseCanvasSize);

    blazePosePromise = blazePoseNet.estimatePoses(virtualBackBlazePoseCanvas);
}

export async function VirtualBack_postprocess() {
    processedSegmentResult = await blazePosePromise;

    virtualBackPreviousFrameCanvasCtx.drawImage(virtualBackIntermediateCanvas, 0, 0);
}
