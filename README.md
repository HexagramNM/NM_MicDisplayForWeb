# NM_MicDisplayForWeb
マイクからの音声波形や周波数レベルをバーチャル背景のように表示するサイト（WebGLとBlazePose使用）

[こんな感じ](https://hexagramnm.coresv.com/NM_MicDisplay_Web/index.html)に動きます。

BlazePoseで背景を消した映像を非表示キャンバスに送り、そのキャンバスからWebGLのテクスチャを作成することで、
WebGL上にも表示しています。以下の記事で解説をしております。

- [BodyPixとWebGLを組み合わせて3次元的な次世代バーチャル背景を作る](https://qiita.com/HexagramNM/items/b967dfd3733ecee1a084) ← BodyPixを使用した最初のバージョンの記事
- [BlazePoseでBodyPixによる人物抽出処理を置き換えよう](https://qiita.com/HexagramNM/items/004056bfdb6360884545) ← BodyPixがdeprecatedとなったために、BlazePoseで代替するための記事

## 使用ライブラリ

- [minMatrix.js](https://wgld.org/d/library/l001.html)... WebGLでの行列計算
- [@mediapipe/pose](https://www.jsdelivr.com/package/npm/@mediapipe/pose)... BlazePoseによる人物抽出処理
- [fft-js](https://github.com/vail-systems/node-fft/)... FFTの計算処理
- [esm.sh](https://github.com/esm-dev/esm.sh)... fft-jsをAudioWorkletでインポートするのに利用
