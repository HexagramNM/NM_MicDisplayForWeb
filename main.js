var backgroundColor = {r: 50, g: 0, b: 0};
var backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
    + backgroundColor.g.toString(16).padStart(2, "0") + backgroundColor.b.toString(16).padStart(2, "0");

async function VirtualBB_startProcess() {
    removeEventListener("click", VirtualBB_startProcess);
    addEventListener("click", VirtualBB_toggleMirror);
    var easyInst = document.getElementById("easyInst");
    easyInst.style.display = "none";
    var mediaStream;
    var videoStream;
    var audioStream;
    try {
        //Webカメラとvideoタグとの関連づけ
        //https://qiita.com/chelcat3/items/02c77b55d080d770530a
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                //virtualBackCanvasSizeはvirtualBack.jsからの変数
                width: {ideal: virtualBackCanvasSize[0]},
                height: {ideal: virtualBackCanvasSize[1]}
            }
        });
        //オーディオとビデオの分離
        videoStream = new MediaStream(mediaStream.getVideoTracks());
        audioStream = new MediaStream(mediaStream.getAudioTracks());
    }
    catch (err) {
        //ユーザに拒否されたなど、カメラ、マイクを取得できなかった場合
        return;
    }

    await VirtualBack_init(videoStream);
    await NM_MicDisplay_init(audioStream);
    VirtualBack_main();
    NM_MicDisplay_main();
}

function VirtualBB_main() {
    document.bgColor=backgroundColorCode;
    addEventListener("click", VirtualBB_startProcess);
}
