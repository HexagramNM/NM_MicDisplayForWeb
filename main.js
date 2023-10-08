
import {NM_MicDisplay_init,
    NM_MicDisplay_main} from "./modules/NM_MicDisplay.js";
import {SharedWindow_init,
     SharedWindow_main} from "./modules/sharedWindow.js";
import {VirtualBack_init,
    VirtualBack_toggleMirror,
    VirtualBack_drawTextureCanvas,
    VirtualBack_preprocess,
    VirtualBack_postprocess} from "./modules/virtualBack.js";

var VirtualBB_cameraDeviceLists;
var VirtualBB_selectedCameraDeviceId;
var VirtualBB_micDeviceLists;
var VirtualBB_selectedMicDeviceId;
var VirtualBB_mainTimer = null;

function VirtualBB_getSelectedDeviceId() {
    var cameraSelectIndex = document.getElementById("cameraSelect").selectedIndex;
    var micSelectIndex = document.getElementById("micSelect").selectedIndex;

    if (cameraSelectIndex <= 0) {
        VirtualBB_selectedCameraDeviceId = null;
    }
    else {
        VirtualBB_selectedCameraDeviceId = VirtualBB_cameraDeviceLists[cameraSelectIndex - 1].deviceId;
    }

    if (micSelectIndex <= 0) {
        VirtualBB_selectedMicDeviceId = null;
    }
    else {
        VirtualBB_selectedMicDeviceId = VirtualBB_micDeviceLists[micSelectIndex - 1].deviceId;
    }
}

async function VirtualBB_prepareSharedWindowStream() {
    var cameraSelectIndex = document.getElementById("cameraSelect").selectedIndex;
    var sharedWindowSelectIndex = document.getElementById("sharedWindowSelect").selectedIndex;
    var underBackgroundElem = document.getElementById("underBackground");
    var virtualShareWindowVideoElem = document.getElementById("virtualShareWindowVideo");
    var screenStream = null;

    try {
        if (sharedWindowSelectIndex <= 0) {
            //画面共有なし
            hasShareWindow = false;
            windowShareMode = false;
        }
        else if (sharedWindowSelectIndex == 1) {
            //ウィンドウから画面共有
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: {
                    cursor: "never",
                    width: {max: 1920},
                    height: {max: 1080}
                }
            });
        }
        else {
            var sharedWindowDeviceId = VirtualBB_cameraDeviceLists[sharedWindowSelectIndex - 2].deviceId;
            screenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    deviceId: sharedWindowDeviceId ? {exact: sharedWindowDeviceId}: undefined,
                    width: {ideal: g_virtualShareWindowTrimmedSize.width, max: 1920},
                    height: {ideal: g_virtualShareWindowTrimmedSize.height, max: 1080},
                    frameRate: {ideal: 60, min: 30}
                }
            });
        }

        if (screenStream != null) {
            underBackgroundElem.autoplay = true;
            underBackgroundElem.srcObject = screenStream;
            virtualShareWindowVideoElem.autoplay = true;
            virtualShareWindowVideoElem.srcObject = screenStream;
            g_hasShareWindow = true;
            g_windowShareMode = true;
        }
    }
    catch(err) {
        g_hasShareWindow = false;
        g_windowShareMode = false;
    }
}

function VirtualBB_toggleMirror() {
    VirtualBack_toggleMirror();
    //右クリックによるメニューを抑制
    return false;
}

async function VirtualBB_startProcess() {
    document.oncontextmenu = VirtualBB_toggleMirror;
    document.getElementById("easyInst").style.display = "none";

    var mediaStream = null;
    var videoStream = null;
    var audioStream = null;
    try {
        //Webカメラとvideoタグとの関連づけ
        //https://qiita.com/chelcat3/items/02c77b55d080d770530a
        VirtualBB_getSelectedDeviceId();
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: VirtualBB_selectedMicDeviceId ? {exact: VirtualBB_selectedMicDeviceId}: undefined
            },
            video: {
                //virtualBackCanvasSizeはglobalVariables.jsからの変数
                deviceId: VirtualBB_selectedCameraDeviceId ? {exact: VirtualBB_selectedCameraDeviceId}: undefined,
                width: {ideal: g_virtualBackOriginalSize.width},
                height: {ideal: g_virtualBackOriginalSize.height}
            }
        });
        //オーディオとビデオの分離
        videoStream = new MediaStream(mediaStream.getVideoTracks());
        audioStream = new MediaStream(mediaStream.getAudioTracks());
    }
    catch (err) {
        //ユーザに拒否されたなど、カメラ、マイクを取得できなかった場合
        document.getElementById("errorPermission").style.display = "";
        return;
    }

    var blazePoseNodelTypeForm = document.getElementById("blazePoseModelType");
    var blazePoseModelTypeIdx = blazePoseNodelTypeForm.selectedIndex;
    g_blazePoseModelType = blazePoseNodelTypeForm.options[blazePoseModelTypeIdx].value;

    await VirtualBack_init(videoStream);
    await VirtualBB_prepareSharedWindowStream();
    SharedWindow_init();
    await NM_MicDisplay_init(audioStream);
    VirtualBB_mainTimer = setInterval(VirtualBB_main, 1000 / 30);
}

async function VirtualBB_createDeviceSelector() {
    VirtualBB_cameraDeviceLists = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'videoinput')
        .map((device) => {
            return {
                name: device.label,
                deviceId: device.deviceId
            };
        });

    for (var idx = 0; idx < VirtualBB_cameraDeviceLists.length; idx++) {
        var optionElem = document.createElement("option");
        optionElem.text = VirtualBB_cameraDeviceLists[idx].name;
        optionElem.value = VirtualBB_cameraDeviceLists[idx].name;
        document.getElementById("cameraSelect").appendChild(optionElem);
        document.getElementById("sharedWindowSelect").appendChild(optionElem.cloneNode(true));
    }

    VirtualBB_micDeviceLists = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput')
        .map((device) => {
            return {
                name: device.label,
                deviceId: device.deviceId
            };
        });
    for (var idx = 0; idx < VirtualBB_micDeviceLists.length; idx++) {
        var optionElem = document.createElement("option");
        optionElem.text = VirtualBB_micDeviceLists[idx].name;
        optionElem.value = VirtualBB_micDeviceLists[idx].name;
        document.getElementById("micSelect").appendChild(optionElem);
    }
}

async function VirtualBB_onload() {
    document.bgColor=g_backgroundColorCode;

    //許可ダイアログの発生（確認後、各トラックは停止させる）
    try {
        var mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        mediaStream.getTracks().forEach(track => track.stop());
    }
    catch(err) {
        //拒否された場合
        document.getElementById("easyInst").style.display = "none";
        document.getElementById("errorPermission").style.display = "";
        return;
    }

    VirtualBB_createDeviceSelector();

    document.getElementById("startButton").disabled = false;
    document.getElementById("startButton").addEventListener("click", VirtualBB_startProcess);
}

window.addEventListener("load", VirtualBB_onload);

async function VirtualBB_main() {
    await VirtualBack_preprocess();
    await VirtualBack_drawTextureCanvas();
    SharedWindow_main();
    NM_MicDisplay_main();
    await VirtualBack_postprocess();
    SharedWindow_main();
    NM_MicDisplay_main();
}
