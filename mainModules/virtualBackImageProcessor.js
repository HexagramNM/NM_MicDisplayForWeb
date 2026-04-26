
import { 
    ImageSegmenter,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/+esm";
import { WebGpuDevice } from "./webGpuDevice.js";
import { HistogramEqualizer } from "./histogramEqualizer.js";
import fullscreenVshaderSrc from "../shaders/webgpu_fullScreenTriangle.vert.js";

export class VirtualBackImageProcessor {
    constructor(videoStream) {
        this.hasVirtualBack = false;
        this.mirrorVirtualBack = false;
        this.videoSize = {width: 1920, height: 1440};
        this.videoOffsetX = 0;
        this.maximumSourceAspect = 4.0 / 3.0; // width / height 
        this.sourceSize = {width: 1920, height: 1440};
        if (!videoStream 
            || videoStream.getVideoTracks().length <= 0) {
            
            return;
        }

        this.hasVirtualBack = true;
        this.initCanvas(videoStream);

        this.histogramEqualizer = new HistogramEqualizer(
            this.sourceSize.width, this.sourceSize.height);
    }

    initCanvas(videoStream) {
        const videoTracks = videoStream.getVideoTracks();
        this.videoSize.width = videoTracks[0].getSettings().width;
        this.videoSize.height = videoTracks[0].getSettings().height;
        this.sourceSize.width = this.videoSize.width;
        this.sourceSize.height = this.videoSize.height;
        
        if (this.videoSize.height > 0) {
            const aspect = this.videoSize.width / this.videoSize.height;
            if (aspect > this.maximumSourceAspect) {
                //16:9など4:3よりも幅が広い場合、4:3に収まるようクリッピング
                this.sourceSize.width = this.videoSize.height * this.maximumSourceAspect;
                this.videoOffsetX = ((this.videoSize.width - this.sourceSize.width) * 0.5) | 0;
            }
        }
        
        this.videoComponent = document.getElementById("virtualBackVideo");
        this.videoComponent.width = this.videoSize.width;
        this.videoComponent.height = this.videoSize.height;
        this.videoComponent.autoplay = true;
        this.videoComponent.srcObject = videoStream;
        this.videoCanvas = new OffscreenCanvas(
            this.sourceSize.width, this.sourceSize.height);
        this.videoCanvasCtx = this.videoCanvas.getContext("2d");
        this.equalizedCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
        this.textureCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
        this.textureCanvasCtx = this.textureCanvas.getContext("webgl2");
        this.textureDrawingUtils = new DrawingUtils(this.textureCanvasCtx);

        this.transparentTextureCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
        this.transparentTextureCanvasCtx = this.transparentTextureCanvas.getContext("2d");
        this.transparentTextureCanvasCtx.fillStyle = "transparent";
        this.transparentTextureCanvasCtx.fillRect(0, 0,
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
    }

    async initSegmentation() {
        if (!this.hasVirtualBack) {
            return;
        }

        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const modelPath = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
        const detectorConfig = {
            baseOptions: {
                modelAssetPath: modelPath,
                delegate: "GPU"
            },
            canvas: this.textureCanvas,
            outputCategoryMask: false,
            outputConfidenceMasks: true
        };

        this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, detectorConfig);
    }

    async processFrame() {
        if (!this.hasVirtualBack) {
            return;
        }

        this.videoCanvasCtx.drawImage(this.videoComponent,
            this.videoOffsetX, 0, this.sourceSize.width, this.sourceSize.height,
            0, 0, this.sourceSize.width, this.sourceSize.height);
        this.histogramEqualizer.apply(this.videoCanvas, this.equalizedCanvas, this.mirrorVirtualBack);

        const detectResult = await this.imageSegmenter.segment(this.equalizedCanvas);
        const confidenceMasks = detectResult.confidenceMasks;
        if (confidenceMasks.length >= 1) {
            this.textureDrawingUtils.drawConfidenceMask(
                confidenceMasks[0], [0, 0, 0, 0], this.equalizedCanvas);
        }

        confidenceMasks.forEach((mask) => mask.close());
        detectResult.close();
    }

    toggleMirror() {
        if (!this.hasVirtualBack) {
            return;
        }
        
        this.mirrorVirtualBack = !this.mirrorVirtualBack;
    }

    getOutputTextureCanvas() {
        if (!this.hasVirtualBack) {
            return null;
        }
        
        return this.textureCanvas;
    }

    getTransparentTextureCanvas() {
        if (!this.hasVirtualBack) {
            return null;
        }

        return this.transparentTextureCanvas;
    }
}

VirtualBackImageProcessor.segmentationCanvasSize = 256;
VirtualBackImageProcessor.virtualBackTextureSize = 1024;
