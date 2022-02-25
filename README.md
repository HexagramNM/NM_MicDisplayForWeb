# NM_MicDisplayForWeb
マイクからの音声波形や周波数レベルをバーチャル背景のように表示するサイト（WebGLとBodyPix使用）

[こんな感じ](https://hexagramnm.coresv.com/NM_MicDisplay_Web/index.html)に動きます。

BodyPixで背景を消した映像を非表示キャンバスに送り、そのキャンバスからWebGLのテクスチャを作成することで、
WebGL上にも表示しています。

音声処理はAudioNodeインタフェースを使用しております。また、WebGLでの行列計算に[minMatrix.js](https://wgld.org/d/library/l001.html)を使用しております。
