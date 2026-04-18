
export class NM_MicDisplayEvent {
    constructor(virtualBackImageProc, sharedWindowMng, micDisplayWorker) {
        this.virtualBackImageProc = virtualBackImageProc;
        this.sharedWindowMng = sharedWindowMng;
        this.micDisplayWorker = micDisplayWorker;

        this.previousMousePos = [null, null];
		this.canvasPositionInWindowShareMode = [0, 0];
        this.adjustCanvasSize(true);

        document.oncontextmenu = () => { return this.toggleMirror(); };

        const c = document.getElementById('NM_MicDisplayOutput');
        c.addEventListener("mousedown", (e) => { this.mouseDownEvent(e); });
        c.addEventListener("mouseup", (e) => { this.mouseUpEvent(e); });
        c.addEventListener("mouseleave", (e) => { this.mouseUpEvent(e); });
        c.addEventListener("mousemove", (e) => { this.mouseMoveEvent(e); });
    }

    toggleMirror() {
        this.virtualBackImageProc.toggleMirror();
        //右クリックによるメニューを抑制
        return false;
    }

    mouseDownEvent(event) {
        this.previousMousePos[0] = event.pageX;
        this.previousMousePos[1] = event.pageY;
    }

    mouseUpEvent(event) {
        this.previousMousePos[0] = null;
        this.previousMousePos[1] = null;
    }

    mouseMoveEvent(event) {
        if (this.previousMousePos[0] != null && this.previousMousePos[1] != null 
            && this.sharedWindowMng != null && this.sharedWindowMng.windowShareMode) {
        
            this.canvasPositionInWindowShareMode[0] += event.pageX - this.previousMousePos[0];
            this.canvasPositionInWindowShareMode[1] += event.pageY - this.previousMousePos[1];
            this.previousMousePos[0] = event.pageX;
            this.previousMousePos[1] = event.pageY;
        }
    }

    adjustCanvasSize(initFlag) {
        var c = document.getElementById('NM_MicDisplayOutput');
        var currentWidth = document.documentElement.clientWidth;
        var currentHeight = document.documentElement.clientHeight;
        var widthMargin = 0;
        var heightMargin = 0;

        if (currentWidth * NM_MicDisplayEvent.canvasSize.height / NM_MicDisplayEvent.canvasSize.width > currentHeight) {
            currentWidth = currentHeight * NM_MicDisplayEvent.canvasSize.width / NM_MicDisplayEvent.canvasSize.height;
            widthMargin = (document.documentElement.clientWidth - currentWidth) * 0.5;
        }
        else {
            currentHeight = currentWidth * NM_MicDisplayEvent.canvasSize.height / NM_MicDisplayEvent.canvasSize.width;
            heightMargin = (document.documentElement.clientHeight - currentHeight) * 0.5;
        }
        if (this.sharedWindowMng != null &&this.sharedWindowMng.windowShareMode) {
            currentWidth *= NM_MicDisplayEvent.canvasScaleInWindowShareMode;
            currentHeight *= NM_MicDisplayEvent.canvasScaleInWindowShareMode;
            if (initFlag) {
                this.canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
                this.canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
            }
            if (this.canvasPositionInWindowShareMode[0] < 0) {
                this.canvasPositionInWindowShareMode[0] = 0;
            }
            if (this.canvasPositionInWindowShareMode[0] > (document.documentElement.clientWidth - currentWidth)) {
                this.canvasPositionInWindowShareMode[0] = (document.documentElement.clientWidth - currentWidth);
            }
            if (this.canvasPositionInWindowShareMode[1] < 0) {
                this.canvasPositionInWindowShareMode[1] = 0;
            }
            if (this.canvasPositionInWindowShareMode[1] > (document.documentElement.clientHeight - currentHeight)) {
                this.canvasPositionInWindowShareMode[1] = (document.documentElement.clientHeight - currentHeight);
            }
            widthMargin = this.canvasPositionInWindowShareMode[0];
            heightMargin = this.canvasPositionInWindowShareMode[1];
        }

        if (this.micDisplayWorker != null) {
            this.micDisplayWorker.postMessage({
                type: "resizedCanvas",
                width: currentWidth,
                height: currentHeight
            });
        }
        c.style.margin = heightMargin.toString() + "px " + widthMargin.toString() + "px";
    }  
}

NM_MicDisplayEvent.canvasSize = {width: 1280, height: 720}
NM_MicDisplayEvent.canvasScaleInWindowShareMode = 0.4;
