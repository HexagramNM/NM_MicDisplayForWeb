//設定変数
var virtualBackCanvasSize = {width: 480, height: 360};
var virtualBackTextureSize = 512;
var mapTextureXToCanvas = new Array(virtualBackTextureSize);
var mapTextureYToCanvas = new Array(virtualBackTextureSize);
var mapTextureEdgeX = new Array(virtualBackTextureSize);
var mapTextureEdgeY = new Array(virtualBackTextureSize);
var softEdgeRange = 6;

var bodyPixNet = null;
var videoComponent = null;
var intermediateCanvas = null;
var intermediateCanvasCtx = null;
var virtualBackTextureCanvas = null;
var virtualBackTextureCanvasCtx = null;
var mirrorVirtualBack = false;
var maskWeight = new Array(virtualBackCanvasSize.height * virtualBackCanvasSize.width);
var processedSegmentResult = null;

function convertSegmentMaskToMaskWeight(i_segmentResult, i_maskWeight) {
    var pixIdx = 0;
    for (var y = 0; y < virtualBackCanvasSize.height; y++) {
        for (var x = 0; x < virtualBackCanvasSize.width; x++) {
            if (i_segmentResult.data[pixIdx] == 1) {
                i_maskWeight[pixIdx] = 0;
            }
            else {
                i_maskWeight[pixIdx] = softEdgeRange;
            }
            pixIdx++;
        }
    }

    for (var count = 1; count < softEdgeRange; count++) {
        pixIdx = 0;
        for (var y = 0; y < virtualBackCanvasSize.height; y++) {
            for (var x = 0; x < virtualBackCanvasSize.width; x++) {
                if (i_maskWeight[pixIdx] >= count) {
                    if (x >= 1) {
                        if (i_maskWeight[pixIdx - 1] < count) {
                            i_maskWeight[pixIdx] = count;
                        }
                    }
                    if (x < virtualBackCanvasSize.width - 1) {
                        if (i_maskWeight[pixIdx + 1] < count) {
                            i_maskWeight[pixIdx] = count;
                        }
                    }
                    if (y >= 1) {
                        if (i_maskWeight[pixIdx - virtualBackCanvasSize.width] < count) {
                            i_maskWeight[pixIdx] = count;
                        }
                    }
                    if (y < virtualBackCanvasSize.height - 1) {
                        if (i_maskWeight[pixIdx + virtualBackCanvasSize.width] < count) {
                            i_maskWeight[pixIdx] = count;
                        }
                    }
                }
                pixIdx++;
            }
        }
    }

    pixIdx = 0;
    var rangeInv = 1.0 / softEdgeRange;
    for (var y = 0; y < virtualBackCanvasSize.height; y++) {
        for (var x = 0; x < virtualBackCanvasSize.width; x++) {
            i_maskWeight[pixIdx] *= rangeInv;
            pixIdx++;
        }
    }
}

function drawMaskedTexture(i_ctxInputImage, i_maskWeight) {
    var inputBytes = i_ctxInputImage.data;
    var outputImageData = new ImageData(virtualBackTextureSize, virtualBackTextureSize);
    var outputBytes = outputImageData.data;
    var outputPixIdx = 0;
    var edgeSize = 40;
    var maxAlpha = 180;
    for (var y = 0; y < virtualBackTextureSize; y++) {
        var yInputIdx = mapTextureYToCanvas[y] * virtualBackCanvasSize.width;
        for (var x = 0; x < virtualBackTextureSize; x++) {
            var currentX = x;
            if (mirrorVirtualBack) {
                currentX = (virtualBackTextureSize - 1) - x;
            }
            var edgeDistance = (mapTextureEdgeX[currentX] < mapTextureEdgeY[y] ? mapTextureEdgeX[currentX]: mapTextureEdgeY[y]);
            var inputPixIdx = yInputIdx + mapTextureXToCanvas[currentX];
            var byteBaseInputIdx = 4 * inputPixIdx;
            var byteBaseOutputIdx = 4 * outputPixIdx;

            var currentAlpha = maxAlpha * (1.0 - i_maskWeight[inputPixIdx]) + 0.5;
            if (edgeDistance < edgeSize) {
                currentAlpha *= edgeDistance / edgeSize;
            }
            outputBytes[byteBaseOutputIdx + 3] = parseInt(currentAlpha);

            if (outputBytes[byteBaseOutputIdx + 3] <= 0) {
                outputBytes[byteBaseOutputIdx + 0] = 0;
                outputBytes[byteBaseOutputIdx + 1] = 0;
                outputBytes[byteBaseOutputIdx + 2] = 0;
            }
            else {
                var grayScale = inputBytes[byteBaseInputIdx + 0] * 0.299 + inputBytes[byteBaseInputIdx + 1] * 0.587
                    + inputBytes[byteBaseInputIdx + 2] * 0.114;
                outputBytes[byteBaseOutputIdx + 0] = parseInt(grayScale * 0.45 + 255 * 0.05 + 0.5);
                outputBytes[byteBaseOutputIdx + 1] = parseInt(grayScale * 0.6 + 255 * 0.2 + 0.5);
                outputBytes[byteBaseOutputIdx + 2] = parseInt(grayScale * 0.6 + 255 * 0.4 + 0.5);
            }

            outputPixIdx++;
        }
    }
    outputImageData.data = outputBytes;
    virtualBackTextureCanvasCtx.putImageData(outputImageData, 0, 0);
}

function VirtualBB_toggleMirror() {
    mirrorVirtualBack = !mirrorVirtualBack
}

async function VirtualBack_init(videoStream) {
    mirrorVirtualBack = false;
    for (var idx = 0; idx < virtualBackTextureSize; idx++) {
        mapTextureXToCanvas[idx] = parseInt(idx * virtualBackCanvasSize.width / virtualBackTextureSize + 0.5);
        mapTextureYToCanvas[idx] = parseInt(idx * virtualBackCanvasSize.height / virtualBackTextureSize + 0.5);
        mapTextureEdgeX[idx] = (mapTextureXToCanvas[idx] < virtualBackCanvasSize.width - 1 - mapTextureXToCanvas[idx]
            ? mapTextureXToCanvas[idx] : virtualBackCanvasSize.width - 1 - mapTextureXToCanvas[idx]);
        mapTextureEdgeY[idx] = (mapTextureYToCanvas[idx] < virtualBackCanvasSize.height - 1 - mapTextureYToCanvas[idx]
            ? mapTextureYToCanvas[idx] : virtualBackCanvasSize.height - 1 - mapTextureYToCanvas[idx]);
    }

    virtualBackTextureCanvas = document.getElementById("virtualBackTexture");
    virtualBackTextureCanvas.width = virtualBackTextureSize;
    virtualBackTextureCanvas.height =virtualBackTextureSize;
    virtualBackTextureCanvasCtx = virtualBackTextureCanvas.getContext("2d");
    virtualBackTextureCanvasCtx.font = "30px serif";
    virtualBackTextureCanvasCtx.fillStyle = "white";

    intermediateCanvas = document.getElementById("intermediate");
    intermediateCanvas.width = virtualBackCanvasSize.width;
    intermediateCanvas.height = virtualBackCanvasSize.height;
    intermediateCanvasCtx = intermediateCanvas.getContext("2d");

    bodyPixNet = await bodyPix.load( {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 4
    });
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

    var bodyPixPromise = bodyPixNet.segmentPerson(intermediateCanvas, {
        flipHorizontal: false
    });
    if (processedSegmentResult) {
        convertSegmentMaskToMaskWeight(processedSegmentResult, maskWeight);
        drawMaskedTexture(ctxIntermediateImage, maskWeight);
    }
    processedSegmentResult = await bodyPixPromise;
    //var endTime = performance.now();
    //console.log(endTime - startTime);

    setTimeout(arguments.callee, 1000/60);
}
