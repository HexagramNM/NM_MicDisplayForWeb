import {PlaneBuffer} from "./createWebGLObj.js";
import {NM_MicDisplay} from "./NM_MicDisplay.js";
import {SharedWindowManager} from "./sharedWindowManager.js";
import {VirtualBackImageProcessor} from "./virtualBackImageProcessor.js";

export class NM_MicDisplayStarter {
    constructor() {
        this.micDisplay = null;
        this.cameraDeviceLists = [];
        this.noCamera = false;
        this.selectedCameraDeviceId = null;
        this.micDeviceLists = [];
        this.selectedMicDeviceId = null;

        this.virtualBackImageProc = null;
        this.sharedWindowMng = null;
        this.hasShareWindow = false;
    }

    async onLoad() {
        // 許可ダイアログの発生（確認後、各トラックは停止させる）
        try {
            // firefoxだとgetUserMediaでストリームを取得しないと、ラベルを取得できない。
            // またすぐに停止してしまっても、ラベルを取得できない。
            await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            }).then((s) => {
                return new Promise(
                    (resolve, reject) => {
                        this.createDeviceSelector();
                        setTimeout(() => {resolve(s)}, 1000);
                    }
                );
            }).then((s) => {s.getTracks().forEach(track => track.stop());});
        }
        catch(err) {
            //拒否された場合
            document.getElementById("easyInst").style.display = "none";
            document.getElementById("errorPermission").style.display = "";
            return;
        }

        // 前回の設定の復元
        this.loadOption("cameraSelect");
        this.loadOption("micSelect");
        this.loadOption("sharedWindowSelect");
        this.loadOption("loopBackAudioSelect");
        this.loadOption("blazePoseModelType");

        document.getElementById("startButton").disabled = false;
        document.getElementById("startButton").addEventListener("click", (e) => {this.startProcess();});
    }

    async createDeviceSelector() {
        this.cameraDeviceLists = (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === 'videoinput')
            .map((device) => {
                return {
                    name: device.label,
                    deviceId: device.deviceId,
                    groupId: device.groupId
                };
            });

        for (var idx = 0; idx < this.cameraDeviceLists.length; idx++) {
            var optionElem = document.createElement("option");
            optionElem.text = this.cameraDeviceLists[idx].name;
            optionElem.value = this.cameraDeviceLists[idx].name;
            document.getElementById("cameraSelect").appendChild(optionElem);
            document.getElementById("sharedWindowSelect").appendChild(optionElem.cloneNode(true));
        }

        this.micDeviceLists = (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === 'audioinput')
            .map((device) => {
                return {
                    name: device.label,
                    deviceId: device.deviceId,
                    groupId: device.groupId
                };
            });

        for (var idx = 0; idx < this.micDeviceLists.length; idx++) {
            var optionElem = document.createElement("option");
            optionElem.text = this.micDeviceLists[idx].name;
            optionElem.value = this.micDeviceLists[idx].name;
            document.getElementById("micSelect").appendChild(optionElem);
            document.getElementById("loopBackAudioSelect").appendChild(optionElem.cloneNode(true));
        }
    }

    getSelectedDeviceId() {
        const cameraSelectIndex = document.getElementById("cameraSelect").selectedIndex;
        const micSelectIndex = document.getElementById("micSelect").selectedIndex;

        this.noCamera = false;
        if (cameraSelectIndex <= 1) {
            this.selectedCameraDeviceId = null;
            this.noCamera = (cameraSelectIndex === 1);
        }
        else {
            this.selectedCameraDeviceId = this.cameraDeviceLists[cameraSelectIndex - 2].deviceId;
        }

        if (micSelectIndex <= 0) {
            this.selectedMicDeviceId = null;
        }
        else {
            this.selectedMicDeviceId = this.micDeviceLists[micSelectIndex - 1].deviceId;
        }
    }

    async prepareStreamNoSharedWindow(loopBackAudioSelectIndex) {
        this.hasShareWindow = false;
        var videoStream = null;
        var audioStream = null;
        if (loopBackAudioSelectIndex >= 2) {
            const loopBackAudioDeviceId = this.micDeviceLists[loopBackAudioSelectIndex - 2].deviceId
            const tempStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: loopBackAudioDeviceId ? {exact: loopBackAudioDeviceId}: undefined,
                    noiseSuppression: false,
                    echoCancellation: false,
                    autoGainControl: false
                }
            });

            audioStream = new MediaStream(tempStream.getAudioTracks());
        }

        return [videoStream, audioStream];
    }

    async prepareStreamShareWindow(loopBackAudioSelectIndex,
        idealSharedWindowWidth, idealSharedWindowHeight) {

        var videoStream = null;
        var audioStream = null;
        var tempStream = await navigator.mediaDevices.getDisplayMedia({
            audio: (loopBackAudioSelectIndex === 1) ? true: false,
            video: {
                cursor: "never",
                width: {max: idealSharedWindowWidth},
                height: {max: idealSharedWindowHeight}
            }
        });

        videoStream = new MediaStream(tempStream.getVideoTracks());
        if (loopBackAudioSelectIndex === 1) {
            audioStream = new MediaStream(tempStream.getAudioTracks());
        }
        else if (loopBackAudioSelectIndex >= 2) {
            var loopBackAudioDeviceId = this.micDeviceLists[loopBackAudioSelectIndex - 2].deviceId
            tempStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: loopBackAudioDeviceId ? {exact: loopBackAudioDeviceId}: undefined,
                    noiseSuppression: false,
                    echoCancellation: false,
                    autoGainControl: false
                }
            });
            audioStream = new MediaStream(tempStream.getAudioTracks());
        }

        return [videoStream, audioStream];
    }

    async prepareStreamShareVideo(sharedWindowSelectIndex, loopBackAudioSelectIndex,
        idealSharedWindowWidth, idealSharedWindowHeight) {

        var videoStream = null;
        var audioStream = null;

        const sharedWindowDeviceId = this.cameraDeviceLists[sharedWindowSelectIndex - 2].deviceId;
        var audioOptions = false;
        if (loopBackAudioSelectIndex === 1) {
            const deviceGroupId = this.cameraDeviceLists[sharedWindowSelectIndex - 2].groupId;
            if (deviceGroupId) {
                audioOptions = {
                    groupId: {exact: deviceGroupId},
                    noiseSuppression: false,
                    echoCancellation: false,
                    autoGainControl: false
                };
            }
        }
        else if (loopBackAudioSelectIndex >= 2) {
            const loopBackAudioDeviceId = this.micDeviceLists[loopBackAudioSelectIndex - 2].deviceId;
            if (loopBackAudioDeviceId) {
                audioOptions = {
                    deviceId: {exact: loopBackAudioDeviceId},
                    noiseSuppression: false,
                    echoCancellation: false,
                    autoGainControl: false
                };
            }
        }

        const tempStream = await navigator.mediaDevices.getUserMedia({
            audio: audioOptions,
            video: {
                deviceId: sharedWindowDeviceId ? {exact: sharedWindowDeviceId}: undefined,
                width: {ideal: idealSharedWindowWidth, max: idealSharedWindowWidth},
                height: {ideal: idealSharedWindowHeight, max: idealSharedWindowHeight},
                frameRate: {ideal: 60, min: 30}
            }
        });

        videoStream = new MediaStream(tempStream.getVideoTracks());
        if (audioOptions) {
            audioStream = new MediaStream(tempStream.getAudioTracks());
        }

        return [videoStream, audioStream];
    }

    async prepareSharedWindowStream() {
        const sharedWindowSelectIndex = document.getElementById("sharedWindowSelect").selectedIndex;
        const loopBackAudioSelectIndex = document.getElementById("loopBackAudioSelect").selectedIndex;
        const underBackgroundElem = document.getElementById("underBackground");
        const virtualShareWindowVideoElem = document.getElementById("virtualShareWindowVideo");
        const loopBackAudioElem = document.getElementById("loopBackAudio");
        var videoStream = null;
        var audioStream = null;

        const idealSharedWindowWidth = 1920;
        const idealSharedWindowHeight = 1080;

        try {
            if (sharedWindowSelectIndex <= 0) {
                //画面共有なし
                [videoStream, audioStream] = await this.prepareStreamNoSharedWindow(loopBackAudioSelectIndex);
            }
            else if (sharedWindowSelectIndex == 1) {
                //ウィンドウから画面共有
                [videoStream, audioStream] = await this.prepareStreamShareWindow(loopBackAudioSelectIndex,
                    idealSharedWindowWidth, idealSharedWindowHeight);
            }
            else {
                //ビデオから画面共有
                [videoStream, audioStream] = await this.prepareStreamShareVideo(
                    sharedWindowSelectIndex, loopBackAudioSelectIndex,
                    idealSharedWindowWidth, idealSharedWindowHeight);
            }

            if (videoStream != null) {
                underBackgroundElem.autoplay = true;
                underBackgroundElem.srcObject = videoStream;
                virtualShareWindowVideoElem.autoplay = true;
                virtualShareWindowVideoElem.srcObject = videoStream;
                this.hasShareWindow = true;
            }

            if (audioStream != null) {
                loopBackAudioElem.autoplay = true;
                loopBackAudioElem.srcObject = audioStream; 
            }
        }
        catch(err) {
            this.hasShareWindow = false;
        }
    }

    async prepareMicDisplayStream() {
        //Webカメラとvideoタグとの関連づけ
        //https://qiita.com/chelcat3/items/02c77b55d080d770530a

        var videoStream = null;
        var audioStream = null;
        const idealVirtualBackWidth = 1920;
        const idealVirtualBackHeight = 1080;

        if (this.noCamera) {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this.selectedMicDeviceId ? {exact: this.selectedMicDeviceId}: undefined
                }
            });
            audioStream = new MediaStream(mediaStream.getAudioTracks());
        }
        else {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this.selectedMicDeviceId ? {exact: this.selectedMicDeviceId}: undefined
                },
                video: {
                    //virtualBackCanvasSizeはglobalVariables.jsからの変数
                    deviceId: this.selectedCameraDeviceId ? {exact: this.selectedCameraDeviceId}: undefined,
                    width: {ideal: idealVirtualBackWidth},
                    height: {ideal: idealVirtualBackHeight}
                }
            });
            //オーディオとビデオの分離
            videoStream = new MediaStream(mediaStream.getVideoTracks());
            audioStream = new MediaStream(mediaStream.getAudioTracks());
        }

        return [videoStream, audioStream];
    }

    toggleMirror() {
        this.virtualBackImageProc.toggleMirror();
        //右クリックによるメニューを抑制
        return false;
    }

    async startProcess() {
        document.oncontextmenu = () => { return this.toggleMirror(); };
        document.getElementById("easyInst").style.display = "none";
        this.saveOption("cameraSelect");
        this.saveOption("micSelect");
        this.saveOption("sharedWindowSelect");
        this.saveOption("loopBackAudioSelect");
        this.saveOption("blazePoseModelType");

        var micDisplayVideoStream = null;
        var micDisplayAudioStream = null;

        try {
            this.getSelectedDeviceId();
            [micDisplayVideoStream, micDisplayAudioStream] = await this.prepareMicDisplayStream();
        }
        catch (err) {
            //ユーザに拒否されたなど、カメラ、マイクを取得できなかった場合
            document.getElementById("errorPermission").style.display = "";
            return;
        }

        const blazePoseNodelTypeForm = document.getElementById("blazePoseModelType");
        const blazePoseModelTypeIdx = blazePoseNodelTypeForm.selectedIndex;
        const blazePoseModelType = blazePoseNodelTypeForm.options[blazePoseModelTypeIdx].value;

        const c = document.getElementById('NM_MicDisplayOutput');
        if (!c || !(c.getContext)) {
            return;
        }
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
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

        PlaneBuffer.init(gl);

        this.virtualBackImageProc = new VirtualBackImageProcessor(gl,
            micDisplayVideoStream, blazePoseModelType);
        await this.virtualBackImageProc.startBlazePose();
        await this.prepareSharedWindowStream();

        if (this.hasShareWindow) {
            this.sharedWindowMng = new SharedWindowManager()
        }

        this.micDisplay = new NM_MicDisplay(gl, micDisplayAudioStream,
            this.sharedWindowMng, this.virtualBackImageProc);
        await this.micDisplay.waitForTextureLoading();
        requestAnimationFrame(() => { this.main(); });
    }

    saveOption(selectElementId) {
        const selectElem = document.getElementById(selectElementId);
        const saveValue = selectElem.options[selectElem.selectedIndex].value;
        localStorage.setItem(selectElementId, saveValue);
    }

    loadOption(selectElementId) {
        const selectElem = document.getElementById(selectElementId);
        const loadValue = localStorage.getItem(selectElementId);
        if (loadValue == null) {
            return;
        }

        for (var idx = 0; idx < selectElem.options.length; idx++) {
            if (selectElem.options[idx].value === loadValue) {
                selectElem.selectedIndex = idx;
                break;
            }
        }
    }

    async main() {
        const start = performance.now();
        const oneFrameTime = 1000.0 / 30.0;
        this.virtualBackImageProc.preprocess();
        await this.virtualBackImageProc.drawTextureCanvas();
        if (this.sharedWindowMng != null) {
            this.sharedWindowMng.draw();
        }
        this.micDisplay.main();
        await this.virtualBackImageProc.postprocess();
        const elapsed = performance.now() - start;

        if (elapsed < oneFrameTime) {
            setTimeout(() => {requestAnimationFrame(() => { this.main(); });}, oneFrameTime - elapsed);
        }
        else {
            requestAnimationFrame(() => { this.main(); });
        }
    }
}
