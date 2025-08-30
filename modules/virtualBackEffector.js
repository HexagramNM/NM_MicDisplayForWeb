
import {create_shader, create_program} from "./createWebGLObj.js";

import imageVshaderSrc from "./../shaders/imageVshader.vert.js";
import backMaskFshaderSrc from "./../shaders/backMaskFshader.frag.js";

var backMaskShaderInfo = {
  program: null,
  attLocation: new Array(),
  attStride: new Array(),
  uniLocation: new Array()
}

var isInitialized = false;
const HISTOGRAM_LEVEL = 256;

function createShader() {
  var img_shader = create_shader(imageVshaderSrc, "x-shader/x-vertex");
	var bm_shader = create_shader(backMaskFshaderSrc, "x-shader/x-fragment");

  function setupImageShaderProgram(shaderInfo) {
    shaderInfo.attLocation[0]=g_gl.getAttribLocation(shaderInfo.program, 'position');
    shaderInfo.attLocation[1]=g_gl.getAttribLocation(shaderInfo.program, 'textureCoord');
    shaderInfo.attStride[0]=3;
    shaderInfo.attStride[1]=2;
  }

  backMaskShaderInfo.program = create_program(img_shader, bm_shader);
  setupImageShaderProgram(backMaskShaderInfo);
  backMaskShaderInfo.uniLocation[0] = g_gl.getUniformLocation(backMaskShaderInfo.program, 'texture');
  backMaskShaderInfo.uniLocation[1] = g_gl.getUniformLocation(backMaskShaderInfo.program, 'time');
  backMaskShaderInfo.uniLocation[2] = g_gl.getUniformLocation(backMaskShaderInfo.program, 'cdf');
}

export class VirtualBackEffector {
    constructor(textureSize, tempOutTexUnitId, cdfTextureUnitId) {

      this.textureSize = textureSize;
      this.tempOutTexUnit = g_gl["TEXTURE" + tempOutTexUnitId.toString()];
      this.cdfTextureUnit = g_gl["TEXTURE" + cdfTextureUnitId.toString()];
      this.cdfTextureUnitId = cdfTextureUnitId;

      if (!isInitialized) {
				createShader();
        isInitialized = true;
      }

      this.framebufferNum = 1;
      this.texture = new Array(this.framebufferNum);
      this.framebuffer = new Array(this.framebufferNum);

      var previousActiveTexture = g_gl.getParameter(g_gl.ACTIVE_TEXTURE);
      g_gl.activeTexture(this.tempOutTexUnit);
    	for (var i = 0; i < this.framebufferNum; i++) {
    		this.framebuffer[i] = g_gl.createFramebuffer();
    		g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[i]);

    		var depthRenderbuffer = g_gl.createRenderbuffer();
    		g_gl.bindRenderbuffer(g_gl.RENDERBUFFER, depthRenderbuffer);
    		g_gl.renderbufferStorage(g_gl.RENDERBUFFER, g_gl.DEPTH_COMPONENT16, this.textureSize, this.textureSize);
    		g_gl.framebufferRenderbuffer(g_gl.FRAMEBUFFER, g_gl.DEPTH_ATTACHMENT, g_gl.RENDERBUFFER, depthRenderbuffer);

    		this.texture[i] = g_gl.createTexture();
    		g_gl.bindTexture(g_gl.TEXTURE_2D, this.texture[i]);
    		g_gl.texImage2D(g_gl.TEXTURE_2D, 0, g_gl.RGBA, this.textureSize, this.textureSize, 0,
          g_gl.RGBA, g_gl.UNSIGNED_BYTE, null);
    		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MIN_FILTER, g_gl.LINEAR);
    		g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MAG_FILTER, g_gl.LINEAR);
        g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_WRAP_S, g_gl.CLAMP_TO_EDGE);
      	g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_WRAP_T, g_gl.CLAMP_TO_EDGE);

    		g_gl.framebufferTexture2D(g_gl.FRAMEBUFFER, g_gl.COLOR_ATTACHMENT0, g_gl.TEXTURE_2D, this.texture[i], 0);
    		g_gl.bindTexture(g_gl.TEXTURE_2D, null);
    		g_gl.bindRenderbuffer(g_gl.RENDERBUFFER, null);
    		g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, null);
    	}

      this.virtualBackHistogram = new Uint32Array(HISTOGRAM_LEVEL);
      this.virtualBackCdf = new Uint8ClampedArray(HISTOGRAM_LEVEL);
      this.cdfTexture = g_gl.createTexture();

      g_gl.activeTexture(previousActiveTexture);
    }

    updateCdf() {
      var virtualBackPreviousBlazePoseData 
            = g_virtualBackPreviousBlazePoseCanvasCtx.getImageData(0, 0, 
            g_virtualBackPreviousBlazePoseCanvas.width, g_virtualBackPreviousBlazePoseCanvas.height);
        
      const sourceImagePixelNum = g_virtualBackPreviousBlazePoseCanvas.width * g_virtualBackPreviousBlazePoseCanvas.height;
      for (var idx = 0; idx < HISTOGRAM_LEVEL; idx++) {
          this.virtualBackHistogram[idx] = 0;
      }
    
      var mul = HISTOGRAM_LEVEL / 256.0;
      for (var pidx = 0; pidx < sourceImagePixelNum; pidx++) {
          const imageHeadPos = pidx * 4;
          const r = virtualBackPreviousBlazePoseData.data[imageHeadPos];
          const g = virtualBackPreviousBlazePoseData.data[imageHeadPos + 1];
          const b = virtualBackPreviousBlazePoseData.data[imageHeadPos + 2];
          const y = 0.299 * r + 0.587 * g + 0.114 * b;
          this.virtualBackHistogram[(y * mul | 0)]++;
      }
  
      for (var idx = 1; idx < HISTOGRAM_LEVEL; idx++) {
          this.virtualBackHistogram[idx] = this.virtualBackHistogram[idx - 1] + this.virtualBackHistogram[idx];
      }
  
      mul = 255.0 / sourceImagePixelNum;
      for (var idx = 0; idx < HISTOGRAM_LEVEL; idx++) {
          this.virtualBackCdf[idx] = (this.virtualBackHistogram[idx] * mul | 0);
      }

      var previousActiveTexture = g_gl.getParameter(g_gl.ACTIVE_TEXTURE);
      g_gl.activeTexture(this.cdfTextureUnit);
      g_gl.bindTexture(g_gl.TEXTURE_2D, this.cdfTexture);
      g_gl.texImage2D(g_gl.TEXTURE_2D, 0, g_gl.LUMINANCE, HISTOGRAM_LEVEL, 1, 0,
        g_gl.LUMINANCE, g_gl.UNSIGNED_BYTE, this.virtualBackCdf);
      g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MIN_FILTER, g_gl.LINEAR);
      g_gl.texParameteri(g_gl.TEXTURE_2D, g_gl.TEXTURE_MAG_FILTER, g_gl.LINEAR);
      g_gl.activeTexture(previousActiveTexture);
    }

    applyEffect(time, inTexUnitId) {
      var previousViewport = g_gl.getParameter(g_gl.VIEWPORT);
      var previousActiveTexture = g_gl.getParameter(g_gl.ACTIVE_TEXTURE);
      g_gl.viewport(0, 0, this.textureSize, this.textureSize);
      g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
      g_gl.clearColor(0.0, 0.0, 0.0, 0.0);
      g_gl.clearDepth(1.0);

			function settingVbo(shaderInfo) {
				g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_plane_position_vbo);
				g_gl.enableVertexAttribArray(shaderInfo.attLocation[0]);
				g_gl.vertexAttribPointer(shaderInfo.attLocation[0], shaderInfo.attStride[0], g_gl.FLOAT, false, 0, 0);
				g_gl.bindBuffer(g_gl.ARRAY_BUFFER, g_image_texture_vbo);
				g_gl.enableVertexAttribArray(shaderInfo.attLocation[1]);
				g_gl.vertexAttribPointer(shaderInfo.attLocation[1], shaderInfo.attStride[1], g_gl.FLOAT, false, 0, 0);
			}

			g_gl.bindBuffer(g_gl.ELEMENT_ARRAY_BUFFER, g_plane_index_ibo);

			g_gl.useProgram(backMaskShaderInfo.program);
			settingVbo(backMaskShaderInfo);
    	g_gl.uniform1i(backMaskShaderInfo.uniLocation[0], inTexUnitId);
      g_gl.uniform1f(backMaskShaderInfo.uniLocation[1], time);
      g_gl.uniform1i(backMaskShaderInfo.uniLocation[2], this.cdfTextureUnitId);

      g_gl.activeTexture(this.tempOutTexUnit);
			g_gl.bindTexture(g_gl.TEXTURE_2D, this.texture[0]);
    	g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[0]);
    	g_gl.clear(g_gl.COLOR_BUFFER_BIT | g_gl.DEPTH_BUFFER_BIT);
    	g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
			g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, null);

      g_gl.activeTexture(this.tempOutTexUnit);
			g_gl.bindTexture(g_gl.TEXTURE_2D, null);
      g_gl.activeTexture(previousActiveTexture);
      g_gl.viewport(previousViewport[0], previousViewport[1],
        previousViewport[2], previousViewport[3]);
      g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
    }

    getOutputTexture() {
      return this.texture[this.framebufferNum - 1];
    }
}
