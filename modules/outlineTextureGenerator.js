
import {create_shader, create_program} from "./createWebGLObj.js";

import imageVshaderSrc from "./../shaders/imageVshader.vert.js";
import binarizationFshaderSrc from "./../shaders/binarizationFshader.frag.js";
import sdfFshaderSrc from "./../shaders/sdfFshader.frag.js";
import outlineFshaderSrc from "./../shaders/outlineFshader.frag.js";

var binarizationShaderInfo = {
  program: null,
  attLocation: new Array(),
  attStride: new Array(),
  uniLocation: new Array()
}

var sdfShaderInfo = {
  program: null,
  attLocation: new Array(),
  attStride: new Array(),
  uniLocation: new Array()
}

var outlineShaderInfo = {
  program: null,
  attLocation: new Array(),
  attStride: new Array(),
  uniLocation: new Array()
}

var isInitialized = false;

function createShader() {
  var img_shader = create_shader(imageVshaderSrc, "x-shader/x-vertex");
	var bin_shader = create_shader(binarizationFshaderSrc, "x-shader/x-fragment");
	var sdf_shader = create_shader(sdfFshaderSrc, "x-shader/x-fragment");
  var outline_shader = create_shader(outlineFshaderSrc, "x-shader/x-fragment");

  function setupImageShaderProgram(shaderInfo) {
    shaderInfo.attLocation[0]=g_gl.getAttribLocation(shaderInfo.program, 'position');
    shaderInfo.attLocation[1]=g_gl.getAttribLocation(shaderInfo.program, 'textureCoord');
    shaderInfo.attStride[0]=3;
    shaderInfo.attStride[1]=2;
  }

  binarizationShaderInfo.program = create_program(img_shader, bin_shader);
  setupImageShaderProgram(binarizationShaderInfo);
  binarizationShaderInfo.uniLocation[0] = g_gl.getUniformLocation(binarizationShaderInfo.program, 'texture');
  binarizationShaderInfo.uniLocation[1] = g_gl.getUniformLocation(binarizationShaderInfo.program, 'alphaThreshold');

  sdfShaderInfo.program = create_program(img_shader, sdf_shader);
  setupImageShaderProgram(sdfShaderInfo);
  sdfShaderInfo.uniLocation[0] = g_gl.getUniformLocation(sdfShaderInfo.program, 'texture');
  sdfShaderInfo.uniLocation[1] = g_gl.getUniformLocation(sdfShaderInfo.program, 'thickness');
  sdfShaderInfo.uniLocation[2] = g_gl.getUniformLocation(sdfShaderInfo.program, 'textureSize');

  outlineShaderInfo.program = create_program(img_shader, outline_shader);
  setupImageShaderProgram(outlineShaderInfo);
  outlineShaderInfo.uniLocation[0] = g_gl.getUniformLocation(outlineShaderInfo.program, 'textureMain');
  outlineShaderInfo.uniLocation[1] = g_gl.getUniformLocation(outlineShaderInfo.program, 'textureSdf');
  outlineShaderInfo.uniLocation[2] = g_gl.getUniformLocation(outlineShaderInfo.program, 'lineColorIn');
  outlineShaderInfo.uniLocation[3] = g_gl.getUniformLocation(outlineShaderInfo.program, 'lineColorOut');
	outlineShaderInfo.uniLocation[4] = g_gl.getUniformLocation(outlineShaderInfo.program, 'outlineAlpha');
}

export class OutlineTextureGenerator {
    constructor(textureSize, tmpTextureShrinkRate, tempInTexUnitId, tempOutTexUnitId) {

      this.textureSize = textureSize;
      this.tmpTextureShrinkRate = tmpTextureShrinkRate;
      this.tempInTexUnitId = tempInTexUnitId;
      this.tempInTexUnit = g_gl["TEXTURE" + tempInTexUnitId.toString()];
      this.tempOutTexUnit = g_gl["TEXTURE" + tempOutTexUnitId.toString()];

      if (!isInitialized) {
				createShader();
        isInitialized = true;
      }

      this.framebufferNum = 3;
      this.texture = new Array(this.framebufferNum);
      this.framebuffer = new Array(this.framebufferNum);

      var previousActiveTexture = g_gl.getParameter(g_gl.ACTIVE_TEXTURE);
      g_gl.activeTexture(this.tempOutTexUnit);
    	for (var i = 0; i < this.framebufferNum; i++) {
        var textureSize = this.textureSize
          / (i == this.framebufferNum - 1 ? 1 : this.tmpTextureShrinkRate);
    		this.framebuffer[i] = g_gl.createFramebuffer();
    		g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[i]);

    		var depthRenderbuffer = g_gl.createRenderbuffer();
    		g_gl.bindRenderbuffer(g_gl.RENDERBUFFER, depthRenderbuffer);
    		g_gl.renderbufferStorage(g_gl.RENDERBUFFER, g_gl.DEPTH_COMPONENT16, textureSize, textureSize);
    		g_gl.framebufferRenderbuffer(g_gl.FRAMEBUFFER, g_gl.DEPTH_ATTACHMENT, g_gl.RENDERBUFFER, depthRenderbuffer);

    		this.texture[i] = g_gl.createTexture();
    		g_gl.bindTexture(g_gl.TEXTURE_2D, this.texture[i]);
    		g_gl.texImage2D(g_gl.TEXTURE_2D, 0, g_gl.RGBA, textureSize, textureSize, 0,
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
      g_gl.activeTexture(previousActiveTexture);
    }

		#setTexture(inTex, outTex) {
			g_gl.activeTexture(this.tempInTexUnit);
			g_gl.bindTexture(g_gl.TEXTURE_2D, inTex);
			g_gl.activeTexture(this.tempOutTexUnit);
			g_gl.bindTexture(g_gl.TEXTURE_2D, outTex);
		}

    generateOutline(thickness, alphaThreshold, lineColorIn, lineColorOut, outlineAlpha, inTexUnitId) {
      if (lineColorIn.length != 3 || lineColorOut.length != 3) {
        return;
      }

      var previousViewport = g_gl.getParameter(g_gl.VIEWPORT);
      var previousActiveTexture = g_gl.getParameter(g_gl.ACTIVE_TEXTURE);
      g_gl.viewport(0, 0, this.textureSize / this.tmpTextureShrinkRate, this.textureSize / this.tmpTextureShrinkRate);
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

			g_gl.useProgram(binarizationShaderInfo.program);
			settingVbo(binarizationShaderInfo);
    	g_gl.uniform1i(binarizationShaderInfo.uniLocation[0], inTexUnitId);
      g_gl.uniform1f(binarizationShaderInfo.uniLocation[1], alphaThreshold);

			this.#setTexture(null, this.texture[0]);
    	g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[0]);
    	g_gl.clear(g_gl.COLOR_BUFFER_BIT | g_gl.DEPTH_BUFFER_BIT);
    	g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
			g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, null);

      g_gl.useProgram(sdfShaderInfo.program);
			settingVbo(sdfShaderInfo);
      g_gl.uniform1i(sdfShaderInfo.uniLocation[0], this.tempInTexUnitId);
      g_gl.uniform1f(sdfShaderInfo.uniLocation[1], thickness / this.tmpTextureShrinkRate);
      g_gl.uniform1f(sdfShaderInfo.uniLocation[2], this.textureSize / this.tmpTextureShrinkRate);

			var previousFramebufferId = 0;
			var useFramebufferNum = 2;
    	for (var i = 0; i < thickness / this.tmpTextureShrinkRate; i++) {
        var currentFramebufferId = (previousFramebufferId + 1) % useFramebufferNum;
    		this.#setTexture(this.texture[previousFramebufferId], this.texture[currentFramebufferId]);
    		g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[currentFramebufferId]);
    		g_gl.clear(g_gl.COLOR_BUFFER_BIT | g_gl.DEPTH_BUFFER_BIT);
    		g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
    		g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, null);
        previousFramebufferId = currentFramebufferId;
      }

      g_gl.useProgram(outlineShaderInfo.program);
			settingVbo(outlineShaderInfo);
      g_gl.uniform1i(outlineShaderInfo.uniLocation[0], inTexUnitId);
      g_gl.uniform1i(outlineShaderInfo.uniLocation[1], this.tempInTexUnitId);
      g_gl.uniform3fv(outlineShaderInfo.uniLocation[2], lineColorIn);
      g_gl.uniform3fv(outlineShaderInfo.uniLocation[3], lineColorOut);
			g_gl.uniform1f(outlineShaderInfo.uniLocation[4], outlineAlpha);

			this.#setTexture(this.texture[previousFramebufferId], this.texture[this.framebufferNum - 1]);
      g_gl.viewport(0, 0, this.textureSize, this.textureSize);
      g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
			g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, this.framebuffer[this.framebufferNum - 1]);
			g_gl.clear(g_gl.COLOR_BUFFER_BIT | g_gl.DEPTH_BUFFER_BIT);
			g_gl.drawElements(g_gl.TRIANGLES, g_plane_index.length, g_gl.UNSIGNED_SHORT, 0);
			g_gl.bindFramebuffer(g_gl.FRAMEBUFFER, null);

			this.#setTexture(null, null);
      g_gl.activeTexture(previousActiveTexture);
      g_gl.viewport(previousViewport[0], previousViewport[1],
        previousViewport[2], previousViewport[3]);
      g_gl.blendFuncSeparate(g_gl.SRC_ALPHA, g_gl.ONE_MINUS_SRC_ALPHA, g_gl.ONE, g_gl.ONE);
    }

    getOutputTexture() {
      return this.texture[this.framebufferNum - 1];
    }
}
