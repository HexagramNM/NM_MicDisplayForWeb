
import { 
    ImageSegmenter,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/+esm";
import { WebGpuDevice } from "./webGpuDevice.js";
import { HistogramEqualizer } from "./histogramEqualizer.js";
import fullscreenVshaderSrc from "../shaders/webgpu_fullScreenTriangle.vert.js";
import maskFshaderSrc from "../shaders/webgpu_maskTexture.frag.js";

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

        if (WebGpuDevice.gpu === null || WebGpuDevice.device === null) {
            console.error("WebGPU is not initialized.");
            return;    
        }
        
        this.histogramEqualizer = new HistogramEqualizer(
            this.sourceSize.width, this.sourceSize.height);
        
        this.maskTexture = WebGpuDevice.device.createTexture({
            size: [
                VirtualBackImageProcessor.segmentationCanvasSize,
                VirtualBackImageProcessor.segmentationCanvasSize
            ],
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.mirrorBuffer = WebGpuDevice.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.outputCanvasSizeBuffer = WebGpuDevice.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const format = WebGpuDevice.gpu.getPreferredCanvasFormat();
        this.renderPipeline = WebGpuDevice.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: WebGpuDevice.device.createShaderModule({
                    code: fullscreenVshaderSrc
                }),
                entryPoint: "main"
            },
            fragment: {
                module: WebGpuDevice.device.createShaderModule({
                    code: maskFshaderSrc
                }),
                entryPoint: "main",
                targets: [{
                    format: format
                }]
            },
            primitive: {
                topology: "triangle-list"
            }
        });

        this.sampler = WebGpuDevice.device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });

        this.renderBindGroup = WebGpuDevice.device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.histogramEqualizer.getOutputWebGPUTexture().createView(),
                },
                {
                    binding: 1,
                    resource: this.maskTexture.createView(),
                },
                {
                    binding: 2,
                    resource: this.sampler,
                },
                {
                    binding: 3,
                    resource: { buffer: this.mirrorBuffer }
                },
                {
                    binding: 4,
                    resource: { buffer: this.outputCanvasSizeBuffer }
                }
            ]
        });
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
        this.segmentationCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.segmentationCanvasSize,
            VirtualBackImageProcessor.segmentationCanvasSize);
        this.maskCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.segmentationCanvasSize,
            VirtualBackImageProcessor.segmentationCanvasSize);
        this.maskCanvasCtx = this.maskCanvas.getContext("webgl2");
        this.maskDrawingUtils = new DrawingUtils(this.maskCanvasCtx);
        this.textureCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
        this.textureCanvasCtx = this.textureCanvas.getContext("webgpu");
    }

    async initSegmentation() {
        if (!this.hasVirtualBack) {
            return;
        }

        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const modelPath = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
        const detectorConfig = {
            baseOptions: {
                modelAssetPath: modelPath,
                delegate: "GPU"
            },
            canvas: this.maskCanvas,
            outputCategoryMask: false,
            outputConfidenceMasks: true
        };

        this.imageSegmenter = await ImageSegmenter.createFromOptions(vision, detectorConfig);
        this.processSegment();
    }

    async processSegment() {
        setTimeout(() => {this.processSegment()}, VirtualBackImageProcessor.segmentInterval);
        const detectResult = await this.imageSegmenter.segment(this.segmentationCanvas);
        const confidenceMasks = detectResult.confidenceMasks;
        if (confidenceMasks.length > 0) {
            this.maskDrawingUtils.drawConfidenceMask(
                confidenceMasks[0], 
                VirtualBackImageProcessor.foregroundMaskColor,
                VirtualBackImageProcessor.backgroundMaskColor);
        }

        confidenceMasks.forEach((mask) => mask.close());
        detectResult.close();
    }

    processFrame() {
        if (!this.hasVirtualBack) {
            return;
        }

        this.videoCanvasCtx.drawImage(this.videoComponent,
            this.videoOffsetX, 0, this.sourceSize.width, this.sourceSize.height,
            0, 0, this.sourceSize.width, this.sourceSize.height);
        this.histogramEqualizer.apply(this.videoCanvas, [this.segmentationCanvas]);

        WebGpuDevice.device.queue.copyExternalImageToTexture(
            { source: this.maskCanvas },
            { texture: this.maskTexture },
            { 
                width: VirtualBackImageProcessor.segmentationCanvasSize,
                height: VirtualBackImageProcessor.segmentationCanvasSize
            }
        );

        const format = WebGpuDevice.gpu.getPreferredCanvasFormat();
        this.textureCanvasCtx.configure({
            device: WebGpuDevice.device,
            format: format,
            alphaMode: "premultiplied"
        });

        WebGpuDevice.device.queue.writeBuffer(
            this.mirrorBuffer, 0, new Uint32Array([this.mirrorVirtualBack ? 1 : 0])
        );

        WebGpuDevice.device.queue.writeBuffer(
            this.outputCanvasSizeBuffer, 0,
            new Float32Array([
                this.textureCanvas.width,
                this.textureCanvas.height
            ])
        );

        const renderEncoder = WebGpuDevice.device.createCommandEncoder();
        const pass = renderEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.textureCanvasCtx.getCurrentTexture().createView(),
                clearValue: [0, 0, 0, 1],
                loadOp: "clear",
                storeOp: "store"
            }]
        });
        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.renderBindGroup);
        pass.draw(3);
        pass.end();

        WebGpuDevice.device.queue.submit([renderEncoder.finish()]);
    }

    toggleMirror() {
        if (!this.hasVirtualBack) {
            return;
        }
        
        this.mirrorVirtualBack = !this.mirrorVirtualBack;
    }

    getOutputTextureCanvas() {
        if (!this.hasVirtualBack) {
            return;
        }
        
        return this.textureCanvas;
    }
}

VirtualBackImageProcessor.segmentationCanvasSize = 256;
VirtualBackImageProcessor.virtualBackTextureSize = 1024;
VirtualBackImageProcessor.segmentInterval = 1000.0 / 20.0;
VirtualBackImageProcessor.foregroundMaskColor = [255, 0, 0, 255];
VirtualBackImageProcessor.backgroundMaskColor = [0, 0, 0, 255];
