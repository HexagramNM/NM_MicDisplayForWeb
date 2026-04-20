
import { workerVersion } from "./workerVersion.js";

var micDisplay = null;
var outputCanvas = null;

async function initMicDisplay(canvas, initialMicSignalData,
    hasVirtualBack, virtualBackInputWidth, virtualBackInputHeight, virtualBackTextureSize,
    hasSharedWindow) {
    if (!canvas || !(canvas.getContext)) {
        return;
    }

    outputCanvas = canvas;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const extNames = [
        'OES_texture_float',
        'OES_texture_float_linear',
        'EXT_float_blend',
        'WEBGL_color_buffer_float'
    ];
    for (var i = 0; i < extNames.length; i++) {
        const ext = gl.getExtension(extNames[i]);
        if (!ext) {
            return;
        }
    }

    const PlaneBuffer = (await import(`./createWebGLObj.js?v=${workerVersion}`)).PlaneBuffer;
    const NM_MicDisplay = (await import(`./NM_MicDisplay.js?v=${workerVersion}`)).NM_MicDisplay;

    PlaneBuffer.init(gl);
    micDisplay = new NM_MicDisplay(gl, initialMicSignalData,
        hasVirtualBack, virtualBackInputWidth, virtualBackInputHeight, virtualBackTextureSize,
        hasSharedWindow);
    await micDisplay.waitForTextureLoading();
    requestAnimationFrame(main);
}

function main() {
    const oneFrameTime = 1000.0 / 60.0;
    setTimeout(() => { requestAnimationFrame(main); }, oneFrameTime);
    micDisplay.main();
}

self.onmessage = async (e) => {
    if (e.data.type === "init") {
        try {
            await initMicDisplay(e.data.canvas, e.data.initialMicSignalData,
                e.data.hasVirtualBack, e.data.virtualBackInputWidth,
                e.data.virtualBackInputHeight, e.data.virtualBackTextureSize,
                e.data.hasSharedWindow
            );
            e.data.micSignalPort.onmessage = (e) => {
                micDisplay.updateMicSignalData(e.data);
            }
        } catch (error) {
            console.error("Error initializing mic display:", error);
        }
    }
    else if (e.data.type === "updateVirtualBackImage") {
        if (micDisplay == null || micDisplay.virtualBack == null) {
            return;
        }
        micDisplay.virtualBack.update(e.data.bitmap);
    }
    else if (e.data.type === "updateSharedWindowImage") {
        if (micDisplay == null || micDisplay.sharedWindow == null) {
            return;
        }
        micDisplay.sharedWindow.update(e.data.bitmap, e.data.width, e.data.height);
        micDisplay.windowShareBackEnable = e.data.windowShareBackEnable;
    }
    else if (e.data.type === "resizedCanvas") {
        if (outputCanvas == null || micDisplay == null) {
            return;
        }
        outputCanvas.width = e.data.width;
        outputCanvas.height = e.data.height;
        micDisplay.resizeCanvas(e.data.width, e.data.height);
    }
}
