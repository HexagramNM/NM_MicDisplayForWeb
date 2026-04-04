import { HistogramEqualizer } from "./histogramEqualizer.js";

export class VirtualBackImageProcessor {
    constructor(gl, videoStream, blazePoseModelType) {
        this.gl = gl;
        
        this.hasVirtualBack = false;
        this.mirrorVirtualBack = false;
        this.originalSize = {width: 960, height: 720};

        this.blazePoseNet = null;
        this.blazePoseModelType = blazePoseModelType;
        this.blazePosePromise = null;
        this.processedSegmentResult = null;

        if (!videoStream 
            || videoStream.getVideoTracks().length <= 0) {
            
            return;
        }

        this.hasVirtualBack = true;
        this.initCanvas(videoStream);
        this.intermediateCanvasEqualizer = new HistogramEqualizer("virtualBackVideoSource", "virtualBackIntermediate");
    }

    initCanvas(videoStream) {
        const videoTracks = videoStream.getVideoTracks();
        this.originalSize.width = videoTracks[0].getSettings().width;
        this.originalSize.height = videoTracks[0].getSettings().height;
        
        this.videoComponent = document.getElementById("virtualBackVideo");
        this.videoComponent.width = this.originalSize.width;
        this.videoComponent.height = this.originalSize.height;
        this.videoComponent.autoplay = true;
        this.videoComponent.srcObject = videoStream;
        this.videoCanvas = document.getElementById("virtualBackVideoSource");
        this.videoCanvas.width = VirtualBackImageProcessor.virtualBackTextureSize;
        this.videoCanvas.height = VirtualBackImageProcessor.virtualBackTextureSize;
        this.videoCanvasCtx = this.videoCanvas.getContext("2d", {willReadFrequently: true});
        this.intermediateCanvas = document.getElementById("virtualBackIntermediate");
        this.intermediateCanvas.width = VirtualBackImageProcessor.virtualBackTextureSize;
        this.intermediateCanvas.height = VirtualBackImageProcessor.virtualBackTextureSize;
        this.blazePoseCanvas = document.getElementById("virtualBackBlazePose");
        this.blazePoseCanvas.width = VirtualBackImageProcessor.blazePoseCanvasSize;
        this.blazePoseCanvas.height = VirtualBackImageProcessor.blazePoseCanvasSize;
        this.blazePoseCanvasCtx = this.blazePoseCanvas.getContext("2d", {willReadFrequently: true});
        this.previousFrameCanvas = document.getElementById("virtualBackPreviousFrame");
        this.previousFrameCanvas.width = VirtualBackImageProcessor.virtualBackTextureSize;
        this.previousFrameCanvas.height = VirtualBackImageProcessor.virtualBackTextureSize;
        this.previousFrameCanvasCtx = this.previousFrameCanvas.getContext("2d");

        this.maskCanvas = document.getElementById("virtualBackMask");
        this.maskCanvas.width = VirtualBackImageProcessor.blazePoseCanvasSize;
        this.maskCanvas.height = VirtualBackImageProcessor.blazePoseCanvasSize;
        this.maskCanvasCtx = this.maskCanvas.getContext("2d");

        this.textureCanvas = document.getElementById("virtualBackTexture");
        this.textureCanvas.width = VirtualBackImageProcessor.virtualBackTextureSize;
        this.textureCanvas.height = VirtualBackImageProcessor.virtualBackTextureSize;
        this.textureCanvasCtx = this.textureCanvas.getContext("2d");
    }

    async startBlazePose() {
        if (!this.hasVirtualBack) {
            return;
        }

        const detectorConfig = {
            runtime: "mediapipe",
            enableSegmentation: true,
            modelType: this.blazePoseModelType,
            solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose"
        };

        this.blazePoseNet = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);
    }

    async drawTextureCanvas() {
        if (!this.hasVirtualBack || this.processedSegmentResult == null) {
            return;
        }
        this.textureCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
        if (this.mirrorVirtualBack) {
            this.textureCanvasCtx.scale(-1, 1);
            this.textureCanvasCtx.translate(-VirtualBackImageProcessor.virtualBackTextureSize, 0);
        }

        if (this.processedSegmentResult.length > 0) {
            this.textureCanvasCtx.globalCompositeOperation = "source-over";
            this.textureCanvasCtx.drawImage(this.previousFrameCanvas, 0, 0,
                VirtualBackImageProcessor.virtualBackTextureSize,
                VirtualBackImageProcessor.virtualBackTextureSize);

            var maskImage = await this.processedSegmentResult[0].segmentation.mask.toImageData();
            this.maskCanvasCtx.putImageData(maskImage, 0, 0);
            this.textureCanvasCtx.globalCompositeOperation = "destination-in";
            this.textureCanvasCtx.drawImage(this.maskCanvas, 0, 0,
                VirtualBackImageProcessor.blazePoseCanvasSize, 
                VirtualBackImageProcessor.blazePoseCanvasSize,
                0, 0, VirtualBackImageProcessor.virtualBackTextureSize, 
                VirtualBackImageProcessor.virtualBackTextureSize);
        }
        else {
            this.textureCanvasCtx.globalCompositeOperation = "destination-out";
            this.textureCanvasCtx.beginPath();
            this.textureCanvasCtx.fillStyle = "rgba(0, 0, 0, 1)";
            this.textureCanvasCtx.fillRect(0, 0, 
                VirtualBackImageProcessor.virtualBackTextureSize,
                VirtualBackImageProcessor.virtualBackTextureSize);
        }
    }

    preprocess() {
        if (!this.hasVirtualBack) {
            return;
        }
        this.blazePosePromise = new Promise(async (resolve) => {
            this.videoCanvasCtx.drawImage(this.videoComponent,
                0, 0, this.originalSize.width, this.originalSize.height,
                0, 0, VirtualBackImageProcessor.virtualBackTextureSize, VirtualBackImageProcessor.virtualBackTextureSize);
            this.intermediateCanvasEqualizer.apply();
            this.blazePoseCanvasCtx.drawImage(this.intermediateCanvas,
                0, 0, VirtualBackImageProcessor.virtualBackTextureSize, VirtualBackImageProcessor.virtualBackTextureSize,
                0, 0, VirtualBackImageProcessor.blazePoseCanvasSize, VirtualBackImageProcessor.blazePoseCanvasSize);
            resolve(await this.blazePoseNet.estimatePoses(this.blazePoseCanvas));
        });
    }

    async postprocess() {
        if (!this.hasVirtualBack) {
            return;
        }

        this.processedSegmentResult = await this.blazePosePromise;
        this.previousFrameCanvasCtx.drawImage(this.intermediateCanvas, 0, 0);
    }

    toggleMirror() {
        if (!this.hasVirtualBack) {
            return;
        }
        
        this.mirrorVirtualBack = !this.mirrorVirtualBack;
    }
}

VirtualBackImageProcessor.blazePoseCanvasSize = 256;
VirtualBackImageProcessor.virtualBackTextureSize = 1024;
