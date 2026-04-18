
export class WebGpuDevice {
    constructor() {
        throw new Error("This class cannot be instantiated directly.");
    }
}

WebGpuDevice.gpu = null;
WebGpuDevice.device = null;
WebGpuDevice.webgpuInit = async function() {
    WebGpuDevice.gpu = navigator.gpu;
    if (!WebGpuDevice.gpu) {
        console.error("WebGPU is not supported in this browser.");
        return;
    }

    const adapter = await WebGpuDevice.gpu.requestAdapter();
    WebGpuDevice.device = await adapter.requestDevice();
};