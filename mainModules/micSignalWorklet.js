
import {fft} from "https://esm.sh/fft-js@0.0.12";
class MicSignalWorklet extends AudioWorkletProcessor {
    constructor(sharedBuffer) {
        super();

        this.previousWaveLevel = 0.0;
        this.currentWaveLevel = 0.0;
        this.fftSize = 4096;
        this.invFftSize = 1.0 / this.fftSize;
        this.frequencyBinCount = this.fftSize / 2;
        this.waveDataFloat = new Float32Array(this.fftSize).fill(0.0);
        this.blackmanWindow = new Float32Array(this.fftSize).fill(0.0);
        this.fftResult = new Float32Array(this.fftSize).fill(0.0);
        this.previousFftResult = new Float32Array(this.fftSize).fill(0.0);
        this.calcBlackmanWindow();

        this.dftElementNum = 19;
        this.dftBarMaxLevel = 12;
        this.currentDftWaveLevel = new Array(this.dftElementNum).fill(0.0);
	    this.previousDftWaveLevel = new Array(this.dftElementNum).fill(0.0);
	    this.dftBarCount = new Array(this.dftElementNum).fill(0);

        this.pulseEmit = false;
        this.previousEmitStatus = false;

        this.previousUpdateTime = 0.0;
        this.updateInterval = 1.0 / 60.0;
    }

    calcBlackmanWindow() {
        // https://webaudio.github.io/web-audio-api/#blackman-window
        const blackmanAlpha = 0.16;
        const a0 = (1.0 - blackmanAlpha) * 0.5;
        const a1 = 0.5;
        const a2 = blackmanAlpha * 0.5;
        for (var idx = 0; idx < this.fftSize; idx++) {
            const baseFreq = 2.0 * Math.PI * idx / this.fftSize;
            this.blackmanWindow[idx] = a0 - a1 * Math.cos(baseFreq) + a2 * Math.cos(2.0 * baseFreq);
        }
    }

    addInput(input) {
        if (input.length < this.fftSize) {
            const diffLen = this.fftSize - input.length;
            for (var idx = 0; idx < diffLen; idx++) {
                this.waveDataFloat[idx] = this.waveDataFloat[input.length + idx];
            }
            for (var idx = 0; idx < input.length; idx++) {
                this.waveDataFloat[diffLen + idx] = input[idx];
            }
        }
        else {
            const diffLen = input.length - this.fftSize;
            for (var idx = 0; idx < this.fftSize; idx++) {
                this.waveDataFloat[idx] = input[diffLen + idx];
            }
        }
    }

    updateFft() {
        for (var idx = 0; idx < this.fftSize; idx++) {
            this.fftResult[idx] = this.blackmanWindow[idx] * this.waveDataFloat[idx];
        }

        const frequencyData = fft(this.fftResult);
        const tau = 0.8;
        const minDB = -100.0;
        const maxDB = -30.0;
        const invDBRange = 1.0 / (maxDB - minDB);
        for (var idx = 0; idx < this.frequencyBinCount; idx++) {
            const re = frequencyData[idx][0] * this.invFftSize;
            const im = frequencyData[idx][1] * this.invFftSize;

            // https://webaudio.github.io/web-audio-api/#smoothing-over-time
            var fftVal = tau * this.previousFftResult[idx]
                + (1.0 - tau) * Math.sqrt(re * re + im * im);
            if (!isFinite(fftVal)) {
                fftVal = 0.0;
            }

            this.previousFftResult[idx] = fftVal;
            this.fftResult[idx] = Math.min(Math.max((20.0 * Math.log10(fftVal) - minDB) * invDBRange, 0.0), 1.0);
        }
    }

    getSignalData() {
        return {
            currentWaveLevel: this.currentWaveLevel,
            soundDisplayLength: this.fftSize,
            waveDataFloat: this.waveDataFloat,
            dftElementNum: this.dftElementNum,
            dftBarMaxLevel: this.dftBarMaxLevel,
            currentDftWaveLevel: this.currentDftWaveLevel,
            previousDftWaveLevel: this.previousDftWaveLevel,
            pulseEmit: this.pulseEmit
        };
    }

    process(inputs) {
        const input = inputs[0][0]; // Float32Array
        this.addInput(input);

        if (currentTime - this.previousUpdateTime < this.updateInterval) {
            return true;
        }

        this.previousUpdateTime = currentTime;
        
        // 波形データ、音量レベルの取得
        this.previousWaveLevel = this.currentWaveLevel;
        this.currentWaveLevel = 0.0;
        for (var idx = 0; idx < this.fftSize; idx++) {
            this.currentWaveLevel += Math.abs(this.waveDataFloat[idx]);
        }

        if (!this.previousEmitStatus && this.currentWaveLevel > 100 
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
        this.updateFft();
        const dftLevelMaxRate = 0.75;
        const frequencyRange = 30;
        for (var dftElemIdx = 0; dftElemIdx < this.dftElementNum; dftElemIdx++) {
            var avg = 0;
            for (var freqIdx = 0; freqIdx < frequencyRange; freqIdx++) {
                avg += this.fftResult[dftElemIdx * frequencyRange + freqIdx];
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

        this.port.postMessage(this.getSignalData());
        return true;
    }
}

registerProcessor("MicSignalWorklet", MicSignalWorklet);
