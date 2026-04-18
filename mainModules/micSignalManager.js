// マイクからの音声信号を管理するクラス
// ここではWebGLは扱わず、音声信号の取得と解析のみを行う
export class MicSignalManager {
    constructor(micStream) {
        const audioCtx = new AudioContext();
        const input = audioCtx.createMediaStreamSource(micStream);
        this.micAnalyser = audioCtx.createAnalyser();
        input.connect(this.micAnalyser);
        this.micAnalyser.fftSize = 4096;

        this.previousWaveLevel = 0.0;
        this.currentWaveLevel = 0.0;
        this.soundDisplayLength = this.micAnalyser.frequencyBinCount;
        this.waveData = new Uint8Array(this.soundDisplayLength);
        this.waveDataFloat = new Float32Array(this.soundDisplayLength);

        this.dftElementNum = 19;
        this.dftBarMaxLevel = 12;
        this.frequencyData = new Uint8Array(this.micAnalyser.fftSize);
        this.currentDftWaveLevel = new Array(this.dftElementNum);
	    this.previousDftWaveLevel = new Array(this.dftElementNum);
	    this.dftBarCount = new Array(this.dftElementNum);

        for (var dftElemIdx = 0; dftElemIdx < this.dftElementNum; dftElemIdx++) {
            this.currentDftWaveLevel[dftElemIdx] = 0.0;
            this.previousDftWaveLevel[dftElemIdx] = 0.0;
            this.dftBarCount[dftElemIdx] = 0;
        }

        this.pulseEmit = false;
        this.previousEmitStatus = false;

        this.update();
    }

    update() {
        // 波形データ、音量レベルの取得
        this.micAnalyser.getByteTimeDomainData(this.waveData);
        this.previousWaveLevel = this.currentWaveLevel;
        this.currentWaveLevel = 0.0;
        for (var idx = 0; idx < this.soundDisplayLength; idx++) {
            var value = (this.waveData[idx] - 128.0) / 128.0;
            this.waveDataFloat[idx] = value;
            this.currentWaveLevel += Math.abs(value);
        }

        if (!this.previousEmitStatus && this.currentWaveLevel > 50 
            && this.currentWaveLevel >= 1.2 * this.previousWaveLevel) {

            this.pulseEmit = true;
            this.previousEmitStatus = true;
        }
        else {
            this.pulseEmit = false;
        }
        
        if (this.currentWaveLevel < this.previousWaveLevel) {
            this.previousEmitStatus = false;
        }

        // FFTによる周波数解析
        this.micAnalyser.getByteFrequencyData(this.frequencyData);
        const dftLevelMaxRate = 0.75;
        const frequencyRange = 30;
        for (var dftElemIdx = 0; dftElemIdx < this.dftElementNum; dftElemIdx++) {
            var avg = 0;
            for (var freqIdx = 0; freqIdx < frequencyRange; freqIdx++) {
                avg += this.frequencyData[dftElemIdx * frequencyRange + freqIdx] / 255.0;
            }
            avg /= frequencyRange;
            this.currentDftWaveLevel[dftElemIdx] = parseInt(this.dftBarMaxLevel * (avg > dftLevelMaxRate ? 1.0: avg / dftLevelMaxRate));
            if (this.currentDftWaveLevel[dftElemIdx] >= this.previousDftWaveLevel[dftElemIdx]) {
                this.previousDftWaveLevel[dftElemIdx] = this.currentDftWaveLevel[dftElemIdx]
                this.dftBarCount[dftElemIdx] = 0;
            }
            this.dftBarCount[dftElemIdx]++;
            if (this.dftBarCount[dftElemIdx] > 10) {
                if (this.previousDftWaveLevel[dftElemIdx] > 0) {
                    this.previousDftWaveLevel[dftElemIdx]--;
                }
                this.dftBarCount[dftElemIdx] = 0;
            }
        }
    }

    getSignalData() {
        return {
            currentWaveLevel: this.currentWaveLevel,
            soundDisplayLength: this.soundDisplayLength,
            waveDataFloat: this.waveDataFloat,
            dftElementNum: this.dftElementNum,
            dftBarMaxLevel: this.dftBarMaxLevel,
            currentDftWaveLevel: this.currentDftWaveLevel,
            previousDftWaveLevel: this.previousDftWaveLevel,
            pulseEmit: this.pulseEmit
        };
    }
}
