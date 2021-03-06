
var VirtualBB_cameraDeviceLists;
var VirtualBB_selectedCameraDeviceId;
var VirtualBB_micDeviceLists;
var VirtualBB_selectedMicDeviceId;

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
                width: {ideal: virtualBackCanvasSize.width},
                height: {ideal: virtualBackCanvasSize.height}
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

    await VirtualBack_init(videoStream);

    //共有画面選択
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {
                cursor: "never"
            }
        });
        document.getElementById("underBackground").autoplay = true;
        document.getElementById("underBackground").srcObject = screenStream;

        windowShareMode = true;
    }
    catch (err) {
        windowShareMode = false;
    }
    await NM_MicDisplay_init(audioStream);
    SharedWindow_init();
    process_dynamic_texture();

    VirtualBack_main();
    NM_MicDisplay_main();
    SharedWindow_main();
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

async function VirtualBB_main() {
    document.bgColor=backgroundColorCode;

    //許可ダイアログの発生（確認後、各トラックは停止させる）
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
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
