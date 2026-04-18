
import { WebGpuDevice } from "./webGpuDevice.js";
import { HistogramEqualizer } from "./histogramEqualizer.js";
import fullscreenVshaderSrc from "../shaders/webgpu_fullScreenTriangle.vert.js";
import maskFshaderSrc from "../shaders/webgpu_maskTexture.frag.js";

export class VirtualBackImageProcessor {
    constructor(videoStream, blazePoseModelType) {
        this.hasVirtualBack = false;
        this.mirrorVirtualBack = false;
        this.blazePoseNet = null;
        this.originalSize = {width: 1920, height: 1440};
        if (!videoStream 
            || videoStream.getVideoTracks().length <= 0) {
            
            return;
        }

        this.hasVirtualBack = true;
        this.initCanvas(videoStream);
        this.blazePoseModelType = blazePoseModelType;

        if (WebGpuDevice.gpu === null || WebGpuDevice.device === null) {
            console.error("WebGPU is not initialized.");
            return;    
        }
        
        this.histogramEqualizer = new HistogramEqualizer(
            this.originalSize.width, this.originalSize.height);
        
        this.maskTexture = WebGpuDevice.device.createTexture({
            size: [
                VirtualBackImageProcessor.blazePoseCanvasSize,
                VirtualBackImageProcessor.blazePoseCanvasSize
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
                    resource: this.histogramEqualizer.getOutputWebGPUTexture().createView()
                },
                {
                    binding: 1,
                    resource: this.maskTexture.createView()
                },
                {
                    binding: 2,
                    resource: this.sampler
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
        this.originalSize.width = videoTracks[0].getSettings().width;
        this.originalSize.height = videoTracks[0].getSettings().height;
        
        this.videoComponent = document.getElementById("virtualBackVideo");
        this.videoComponent.width = this.originalSize.width;
        this.videoComponent.height = this.originalSize.height;
        this.videoComponent.autoplay = true;
        this.videoComponent.srcObject = videoStream;
        this.blazePoseCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.blazePoseCanvasSize,
            VirtualBackImageProcessor.blazePoseCanvasSize);
        this.textureCanvas = new OffscreenCanvas(
            VirtualBackImageProcessor.virtualBackTextureSize,
            VirtualBackImageProcessor.virtualBackTextureSize);
        this.textureCanvasCtx = this.textureCanvas.getContext("webgpu");
    }

    async initBlazePose() {
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

    async processFrame() {
        if (!this.hasVirtualBack) {
            return;
        }

        this.histogramEqualizer.apply(this.videoComponent, [this.blazePoseCanvas]);
        const processedSegmentResult = await this.blazePoseNet.estimatePoses(this.blazePoseCanvas);

        if (processedSegmentResult.length > 0) {
            const maskImage = await processedSegmentResult[0].segmentation.mask.toImageData();
            WebGpuDevice.device.queue.copyExternalImageToTexture(
                { source: maskImage },
                { texture: this.maskTexture },
                [
                    VirtualBackImageProcessor.blazePoseCanvasSize,
                    VirtualBackImageProcessor.blazePoseCanvasSize
                ]
            );
        }

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

VirtualBackImageProcessor.blazePoseCanvasSize = 256;
VirtualBackImageProcessor.virtualBackTextureSize = 1024;
