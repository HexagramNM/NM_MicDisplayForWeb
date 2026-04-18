
import { workerVersion } from "./workerVersion.js";

const matIV = (await import(`./minMatrix.js?v=${workerVersion}`)).matIV;
const createWebGLObj = await import(`./createWebGLObj.js?v=${workerVersion}`);
const BitmapTexture = createWebGLObj.BitmapTexture;
const createVbo = createWebGLObj.createVbo;
const createIbo = createWebGLObj.createIbo;

export class SharedWindow {
	constructor(gl, virtualSharedWindowShaderInfo) {
		this.gl = gl;
		this.virtualSharedWindowShaderInfo = virtualSharedWindowShaderInfo;

		this.positionData = null;
		this.positionVbo = null;
		this.colorVbo = null;
		this.textureVbo = null;
		this.ibo = null;
		this.textureObj = new BitmapTexture(this.gl);
		this.trimmedSize = {width: 1920, height: 1080};
	
		this.mMatrix = SharedWindow.mat.identity(SharedWindow.mat.create());
        this.mvpMatrix = SharedWindow.mat.identity(SharedWindow.mat.create());
		
		this.createVirtualShareWindowBuffer();
	}

	createVirtualShareWindowBuffer() {
		this.positionData = new Float32Array((SharedWindow.planeNum + 1) * 2 * 3);
		var colorData = new Float32Array((SharedWindow.planeNum + 1) * 2 * 4);
		var textureData = new Float32Array((SharedWindow.planeNum + 1) * 2 * 2);
		var indexData = new Int32Array(SharedWindow.planeNum * 6);

		for (var idx = 0; idx < SharedWindow.planeNum + 1; idx++) {
			for (var cIdx = 0; cIdx < 8; cIdx++) {
				colorData[idx * 8 + cIdx] = 1.0;
			}

			textureData[idx * 4] = idx / SharedWindow.planeNum;
			textureData[idx * 4 + 1] = 0.0;
			textureData[idx * 4 + 2] = idx / SharedWindow.planeNum;
			textureData[idx * 4 + 3] = 1.0;
		}

		for (var idx = 0; idx < SharedWindow.planeNum; idx++) {
			indexData[idx * 6] = idx * 2;
			indexData[idx * 6 + 1] = idx * 2 + 1;
			indexData[idx * 6 + 2] = idx * 2 + 2;
			indexData[idx * 6 + 3] = idx * 2 + 2;
			indexData[idx * 6 + 4] = idx * 2 + 1;
			indexData[idx * 6 + 5] = idx * 2 + 3;
		}

		this.positionVbo = createVbo(this.gl, this.positionData, true);
		this.colorVbo = createVbo(this.gl, colorData);
		this.textureVbo = createVbo(this.gl, textureData);
		this.ibo = createIbo(this.gl, indexData);
	}

	update(bitmap, width, height) {
		this.textureObj.redraw(bitmap);
		this.trimmedSize.width = width;
		this.trimmedSize.height = height;

		// 頂点位置更新
		var virtualShareWindowWidth = 0.0;
		if (this.trimmedSize.height > 0) {
			virtualShareWindowWidth = SharedWindow.height * this.trimmedSize.width / this.trimmedSize.height;
		}
	
		const upperRadius = SharedWindow.radius + SharedWindow.height * 0.5 * SharedWindow.tiltCos;
		const lowerRadius = SharedWindow.radius - SharedWindow.height * 0.5 * SharedWindow.tiltCos;
		const upperCircleLength = 2.0 * Math.PI * upperRadius;
		var currentAngle = Math.PI + Math.PI * virtualShareWindowWidth / upperCircleLength;
		const stepAngle = 2.0 * Math.PI * virtualShareWindowWidth / (upperCircleLength * SharedWindow.planeNum);
		for (var idx = 0; idx < SharedWindow.planeNum + 1; idx++) {
			this.positionData[idx * 6] = upperRadius * Math.sin(currentAngle);
			this.positionData[idx * 6 + 1] = SharedWindow.yPos + SharedWindow.height * 0.5 * SharedWindow.tiltSin;
			this.positionData[idx * 6 + 2] = upperRadius * Math.cos(currentAngle);
			this.positionData[idx * 6 + 3] = lowerRadius * Math.sin(currentAngle);
			this.positionData[idx * 6 + 4] = SharedWindow.yPos - SharedWindow.height * 0.5 * SharedWindow.tiltSin;
			this.positionData[idx * 6 + 5] = lowerRadius * Math.cos(currentAngle);
			currentAngle -= stepAngle;
		}
	}

	async draw(vpMatrix) {
		this.gl.useProgram(this.virtualSharedWindowShaderInfo.program);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionVbo);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.positionData);
		this.virtualSharedWindowShaderInfo.enableAttribute(0);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorVbo);
		this.virtualSharedWindowShaderInfo.enableAttribute(1);
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureVbo);
		this.virtualSharedWindowShaderInfo.enableAttribute(2);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo);

		SharedWindow.mat.identity(this.mMatrix);
		SharedWindow.mat.multiply(vpMatrix, this.mMatrix, this.mvpMatrix);
		this.gl.uniformMatrix4fv(this.virtualSharedWindowShaderInfo.uniLocation[0], false, this.mvpMatrix);
		this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureObj.texId);
		this.gl.uniform1i(this.virtualSharedWindowShaderInfo.uniLocation[1], 0);
		
		this.gl.drawElements(this.gl.TRIANGLES, SharedWindow.planeNum * 6, this.gl.UNSIGNED_SHORT, 0);
	
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}
}

SharedWindow.mat = new matIV();
SharedWindow.planeNum = 21;
SharedWindow.height = 5.0;
SharedWindow.radius = 12.0;
SharedWindow.yPos = 4.0;
SharedWindow.tiltAngle = Math.PI * 80.0 / 180.0;
SharedWindow.tiltSin = Math.sin(SharedWindow.tiltAngle);
SharedWindow.tiltCos = Math.cos(SharedWindow.tiltAngle);
