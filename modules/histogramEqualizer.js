
import histCshaderSrc from "../shaders/webgpu_createHistogram.comp.js";
import cdfCshaderSrc from "../shaders/webgpu_calcCdf.comp.js";
import equalizerCshaderSrc from "../shaders/webgpu_histogramEqualizer.comp.js";
import fullscreenVshaderSrc from "../shaders/webgpu_fullScreenTriangle.vert.js";
import drawTextureFshaderSrc from "../shaders/webgpu_drawTexture.frag.js";

export class HistogramEqualizer {
    constructor(inputElementId, outputCanvasIds) {
        if (HistogramEqualizer.gpu === null || HistogramEqualizer.device === null) {
            console.error("WebGPU is not initialized.");
            return;    
        }

        this.inputElement = document.getElementById(inputElementId);
        this.outputCanvases = outputCanvasIds.map(id => document.getElementById(id));
        this.ctxs = this.outputCanvases.map(canvas => canvas.getContext("webgpu"));

        this.inputTexture = HistogramEqualizer.device.createTexture({
            size: [this.inputElement.width, this.inputElement.height],
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.outputTexture = HistogramEqualizer.device.createTexture({
            size: [this.inputElement.width, this.inputElement.height],
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.STORAGE_BINDING
        });

        this.histBuf = HistogramEqualizer.device.createBuffer({
            size: HistogramEqualizer.histogramLevel * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.cdfBuf = HistogramEqualizer.device.createBuffer({
            size: HistogramEqualizer.histogramLevel * 4,
            usage: GPUBufferUsage.STORAGE
        });

        this.histPipeline = HistogramEqualizer.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: HistogramEqualizer.device.createShaderModule({
                    code: histCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.histBindGroup = HistogramEqualizer.device.createBindGroup({
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

        this.cdfPipeline = HistogramEqualizer.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: HistogramEqualizer.device.createShaderModule({
                    code: cdfCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.cdfBindGroup = HistogramEqualizer.device.createBindGroup({
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

        this.equalizerPipeline = HistogramEqualizer.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: HistogramEqualizer.device.createShaderModule({
                    code: equalizerCshaderSrc
                }),
                entryPoint: "main"
            }
        });

        this.equalizerBindGroup = HistogramEqualizer.device.createBindGroup({
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

        this.canvasSizeBuffer = HistogramEqualizer.device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const format = HistogramEqualizer.gpu.getPreferredCanvasFormat();
        this.ctxs.forEach(ctx => {
            ctx.configure({
                device: HistogramEqualizer.device,
                format: format,
                alphaMode: "opaque"
            });
        });

        this.renderPipeline = HistogramEqualizer.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: HistogramEqualizer.device.createShaderModule({
                    code: fullscreenVshaderSrc
                }),
                entryPoint: "main"
            },
            fragment: {
                module: HistogramEqualizer.device.createShaderModule({
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

        this.sampler = HistogramEqualizer.device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });

        this.renderBindGroup = HistogramEqualizer.device.createBindGroup({
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

    apply() {
        HistogramEqualizer.device.queue.copyExternalImageToTexture(
            { source: this.inputElement },
            { texture: this.inputTexture },
            [this.inputElement.width, this.inputElement.height]
        );
        
        HistogramEqualizer.device.queue.writeBuffer(this.histBuf, 0,
            new Uint32Array(HistogramEqualizer.histogramLevel));

        const encoder = HistogramEqualizer.device.createCommandEncoder();
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.histPipeline);
            pass.setBindGroup(0, this.histBindGroup);
            pass.dispatchWorkgroups(Math.ceil(this.inputElement.width / 16), 
                Math.ceil(this.inputElement.height / 16));
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
            pass.dispatchWorkgroups(Math.ceil(this.inputElement.width / 16), 
                Math.ceil(this.inputElement.height / 16));
            pass.end();
        }

        HistogramEqualizer.device.queue.submit([encoder.finish()]);

        for (let i = 0; i < this.outputCanvases.length; i++) {
            HistogramEqualizer.device.queue.writeBuffer(
                this.canvasSizeBuffer, 0,
                new Float32Array([
                    this.outputCanvases[i].width,
                    this.outputCanvases[i].height
                ])
            );

            const renderEncoder = HistogramEqualizer.device.createCommandEncoder();
            const pass = renderEncoder.beginRenderPass({
                colorAttachments: [{
                    view: this.ctxs[i].getCurrentTexture().createView(),
                    clearValue: [0, 0, 0, 1],
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });
            pass.setPipeline(this.renderPipeline);
            pass.setBindGroup(0, this.renderBindGroup);
            pass.draw(3);
            pass.end();

            HistogramEqualizer.device.queue.submit([renderEncoder.finish()]);
        }
    } 
}

HistogramEqualizer.histogramLevel = 256;
HistogramEqualizer.samplingWidth = 256;
HistogramEqualizer.samplingHeight = 256;
HistogramEqualizer.gpu = null;
HistogramEqualizer.device = null;
HistogramEqualizer.webgpuInit = async function() {
    HistogramEqualizer.gpu = navigator.gpu;
    if (!HistogramEqualizer.gpu) {
        console.error("WebGPU is not supported in this browser.");
        return;
    }

    const adapter = await HistogramEqualizer.gpu.requestAdapter();
    HistogramEqualizer.device = await adapter.requestDevice();
};
