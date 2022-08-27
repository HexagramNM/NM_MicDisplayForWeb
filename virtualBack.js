//設定変数
var mapTextureXToCanvas = new Array(virtualBackTextureSize);
var mapTextureYToCanvas = new Array(virtualBackTextureSize);

var blasePoseNet = null;
var videoComponent = null;
var intermediateCanvas = null;
var intermediateCanvasCtx = null;

var mirrorVirtualBack = false;
var processedSegmentResult = null;
var segmentMaskImage = null;

function calcMapTextureToCanvas() {
    for (var idx = 0; idx < virtualBackTextureSize; idx++) {
        mapTextureXToCanvas[idx] = parseInt(idx * virtualBackCanvasSize.width / virtualBackTextureSize + 0.5);
        mapTextureYToCanvas[idx] = parseInt(idx * virtualBackCanvasSize.height / virtualBackTextureSize + 0.5);
    }
}

function VirtualBack_createTextureData(i_segmentMaskImage, i_ctxIntermediateImage) {
    var inputData = new Uint32Array(i_ctxIntermediateImage.data.buffer);
    var inputPixIdx = 0;
    var inputSegmentIdx = 0;
    var outputPixIdx = 0;

    if (i_segmentMaskImage != null) {
        for (var y = 0; y < virtualBackTextureSize; y++) {
            var yInputIdx = mapTextureYToCanvas[y] * virtualBackCanvasSize.width;
            for (var x = 0; x < virtualBackTextureSize; x++) {
                var currentX = x;
                if (mirrorVirtualBack) {
                    currentX = (virtualBackTextureSize - 1) - x;
                }
                inputPixIdx = yInputIdx + mapTextureXToCanvas[currentX];

                var alpha = (i_segmentMaskImage.data[inputPixIdx * 4 + 3]|0);
                virtualBackTextureInfo.textureData32[outputPixIdx] = ((alpha << 24) | (inputData[inputPixIdx] & 0x00ffffff));
                outputPixIdx++;
            }
        }
    }
    else {
        for (var y = 0; y < virtualBackTextureSize; y++) {
            for (var x = 0; x < virtualBackTextureSize; x++) {
                virtualBackTextureInfo.textureData32[outputPixIdx] = 0x00;
                outputPixIdx++;
            }
        }
    }
}

function VirtualBB_toggleMirror() {
    mirrorVirtualBack = !mirrorVirtualBack;
    //右クリックによるメニューを抑制
    return false;
}

async function VirtualBack_init(videoStream) {
    mirrorVirtualBack = false;
    calcMapTextureToCanvas();
    virtualBackTextureInfo.isChanged = true;

    intermediateCanvas = document.getElementById("intermediate");
    intermediateCanvas.width = virtualBackCanvasSize.width;
    intermediateCanvas.height = virtualBackCanvasSize.height;
    intermediateCanvasCtx = intermediateCanvas.getContext("2d");

    const detectorConfig = {
        runtime: "mediapipe",
        enableSegmentation: true,
        modelType:"lite",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose"
    };
    blazePoseNet = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);

    videoComponent = document.getElementById("video");
    videoComponent.width = virtualBackCanvasSize.width;
    videoComponent.height = virtualBackCanvasSize.height;
    videoComponent.autoplay = true;
    videoComponent.srcObject = videoStream;
}

async function VirtualBack_main() {
    //var startTime = performance.now();
    var ctxIntermediateImage = intermediateCanvasCtx.getImageData(0, 0, virtualBackCanvasSize.width, virtualBackCanvasSize.height);

    intermediateCanvasCtx.drawImage(videoComponent, 0, 0, virtualBackCanvasSize.width, virtualBackCanvasSize.height);

    var blazePosePromise = blazePoseNet.estimatePoses(intermediateCanvas);

    if (processedSegmentResult) {
        VirtualBack_createTextureData(segmentMaskImage, ctxIntermediateImage);
        virtualBackTextureInfo.isChanged = true;
    }
    processedSegmentResult = await blazePosePromise;
    if (processedSegmentResult.length > 0) {
        segmentMaskImage = await processedSegmentResult[0].segmentation.mask.toImageData();
    }
    else {
        segmentMaskImage = null;
    }

    //var endTime = performance.now();
    //console.log(endTime - startTime);

    setTimeout(arguments.callee, 1000/60);
}
