
import { WebGpuDevice } from "./webGpuDevice.js";
import histCshaderSrc from "../shaders/webgpu_createHistogram.comp.js";
import cdfCshaderSrc from "../shaders/webgpu_calcCdf.comp.js";
import equalizerCshaderSrc from "../shaders/webgpu_histogramEqualizer.comp.js";
import fullscreenVshaderSrc from "../shaders/webgpu_fullScreenTriangle.vert.js";
import drawTextureFshaderSrc from "../shaders/webgpu_drawTexture.frag.js";

export class HistogramEqualizer {
    constructor(inputWidth, inputHeight) {
        if (WebGpuDevice.gpu === null || WebGpuDevice.device === null) {
            console.error("WebGPU is not initialized.");
            return;    
        }

        this.inputWidth = inputWidth;
        this.inputHeight = inputHeight;
        this.inputTexture = WebGpuDevice.device.createTexture({
            size: [inputWidth, inputHeight],
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.outputTexture = WebGpuDevice.device.createTexture({
            size: [inputWidth, inputHeight],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.STORAGE_BINDING
        });

        this.histBuf = WebGpuDevice.device.createBuffer({
            size: HistogramEqualizer.histogramLevel * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.cdfBuf = WebGpuDevice.device.createBuffer({
            size: HistogramEqualizer.histogramLevel * 4,
            usage: GPUBufferUsage.STORAGE
        });

        this.histPipeline = WebGpuDevice.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: WebGpuDevice.device.createShaderModule({
                    code: histCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.histBindGroup = WebGpuDevice.device.createBindGroup({
            layout: this.histPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.inputTexture.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: this.histBuf }
                }
            ]
        });

        this.cdfPipeline = WebGpuDevice.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: WebGpuDevice.device.createShaderModule({
                    code: cdfCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.cdfBindGroup = WebGpuDevice.device.createBindGroup({
            layout: this.cdfPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.histBuf }
                },
                {
                    binding: 1,
                    resource: { buffer: this.cdfBuf }
                }
            ]
        });

        this.equalizerPipeline = WebGpuDevice.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: WebGpuDevice.device.createShaderModule({
                    code: equalizerCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.equalizerBindGroup = WebGpuDevice.device.createBindGroup({
            layout: this.equalizerPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.inputTexture.createView()
                },
                {
                    binding: 1,
                    resource: { buffer: this.cdfBuf }
                },
                {
                    binding: 2,
                    resource: this.outputTexture.createView()
                }
            ]
        });

        this.canvasSizeBuffer = WebGpuDevice.device.createBuffer({
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
                    code: drawTextureFshaderSrc
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
                    resource: this.outputTexture.createView()
                },
                {
                    binding: 1,
                    resource: this.sampler
                },
                {
                    binding: 2,
                    resource: { buffer: this.canvasSizeBuffer }
                }
            ]
        });
    }

    apply(inputImage, outputCanvases) {
            WebGpuDevice.device.queue.copyExternalImageToTexture(
            { source: inputImage },
            { texture: this.inputTexture },
            [this.inputWidth, this.inputHeight]
        );
        
        WebGpuDevice.device.queue.writeBuffer(this.histBuf, 0,
            new Uint32Array(HistogramEqualizer.histogramLevel));

        const encoder = WebGpuDevice.device.createCommandEncoder();
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.histPipeline);
            pass.setBindGroup(0, this.histBindGroup);
            pass.dispatchWorkgroups(Math.ceil(this.inputWidth / 16), 
                Math.ceil(this.inputHeight / 16));
            pass.end();
        }

        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.cdfPipeline);
            pass.setBindGroup(0, this.cdfBindGroup);
            pass.dispatchWorkgroups(1);
            pass.end();
        }

        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.equalizerPipeline);
            pass.setBindGroup(0, this.equalizerBindGroup);
            pass.dispatchWorkgroups(Math.ceil(this.inputWidth / 16), 
                Math.ceil(this.inputHeight / 16));
            pass.end();
        }

        WebGpuDevice.device.queue.submit([encoder.finish()]);

        const format = WebGpuDevice.gpu.getPreferredCanvasFormat();
        for (let i = 0; i < outputCanvases.length; i++) {
            const ctx = outputCanvases[i].getContext("webgpu");
            ctx.configure({
                device: WebGpuDevice.device,
                format: format,
                alphaMode: "opaque"
            });

            WebGpuDevice.device.queue.writeBuffer(
                this.canvasSizeBuffer, 0,
                new Float32Array([
                    outputCanvases[i].width,
                    outputCanvases[i].height
                ])
            );

            const renderEncoder = WebGpuDevice.device.createCommandEncoder();
            const pass = renderEncoder.beginRenderPass({
                colorAttachments: [{
                    view: ctx.getCurrentTexture().createView(),
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
    } 

    getOutputWebGPUTexture() {
        return this.outputTexture;
    }
}

HistogramEqualizer.histogramLevel = 256;
