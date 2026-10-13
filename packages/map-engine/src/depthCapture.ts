import type { Map as MapLibreMap } from 'maplibre-gl';

export type DepthFrameMetadata = {
  encoding: 'rgb24-window-depth';
  width: number;
  height: number;
  depthBits: number;
  stencilBits: number;
};
type DepthFrame = { canvas: HTMLCanvasElement; metadata: DepthFrameMetadata };
/** Copies the real GPU depth; never substitutes layer IDs or invented distances. */
export class DepthCapture {
  readonly canvas = document.createElement('canvas');
  private program?: WebGLProgram;
  private vao?: WebGLVertexArrayObject;
  private depthTexture?: WebGLTexture;
  private colorTexture?: WebGLTexture;
  private depthFramebuffer?: WebGLFramebuffer;
  private colorFramebuffer?: WebGLFramebuffer;
  private dimensions = '';
  private pending?: {
    resolve: (frame: DepthFrame) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  private disposed = false;
  private lost = () =>
    this.fail(new Error('GPU depth unavailable: WebGL context lost'));
  private rendered = () => {
    if (!this.pending) return;
    const gl = this.map.getCanvas().getContext('webgl2');
    if (!gl) this.fail(new Error('GPU depth requires WebGL2'));
    else this.render(gl);
  };
  constructor(private map: MapLibreMap) {
    this.map.getCanvas().addEventListener('webglcontextlost', this.lost);
    // Capture immediately after the final map paint, without adding a layer:
    // an extra style layer changes MapLibre's depth ranges and terrain batches.
    this.map.on('render', this.rendered);
  }
  async capture(timeoutMs = 15000): Promise<DepthFrame> {
    if (this.disposed) throw new Error('GPU depth capture disposed');
    if (this.pending) throw new Error('GPU depth capture already active');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(new Error('GPU depth capture timed out')),
        timeoutMs,
      );
      this.pending = { resolve, reject, timer };
      this.map.triggerRepaint();
    });
  }
  private fail(error: Error) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.reject(error);
  }
  private shader(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('GPU depth shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const details = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`GPU depth shader failed: ${details ?? 'compile error'}`);
    }
    return shader;
  }
  private initialize(gl: WebGL2RenderingContext) {
    if (this.program) return;
    const vertex = this.shader(
      gl,
      gl.VERTEX_SHADER,
      '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}',
    );
    let fragment: WebGLShader | undefined;
    try {
      fragment = this.shader(
        gl,
        gl.FRAGMENT_SHADER,
        '#version 300 es\nprecision highp float;uniform highp sampler2D u_depth;out vec4 encoded;void main(){float d=texelFetch(u_depth,ivec2(gl_FragCoord.xy),0).r;float n=floor(clamp(d,0.0,1.0)*16777215.0+0.5);vec3 b=vec3(floor(n/65536.0),floor(mod(n,65536.0)/256.0),mod(n,256.0));encoded=vec4(b/255.0,1.0);}',
      );
      this.program = gl.createProgram() ?? undefined;
      this.vao = gl.createVertexArray() ?? undefined;
      if (!this.program || !this.vao)
        throw new Error('GPU depth program/VAO allocation failed');
      gl.attachShader(this.program, vertex);
      gl.attachShader(this.program, fragment);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw new Error(
          `GPU depth link failed: ${gl.getProgramInfoLog(this.program) ?? 'unknown error'}`,
        );
    } catch (error) {
      this.release(gl);
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }
  private releaseTargets(gl: WebGL2RenderingContext) {
    if (this.depthTexture) gl.deleteTexture(this.depthTexture);
    if (this.colorTexture) gl.deleteTexture(this.colorTexture);
    if (this.depthFramebuffer) gl.deleteFramebuffer(this.depthFramebuffer);
    if (this.colorFramebuffer) gl.deleteFramebuffer(this.colorFramebuffer);
    this.depthTexture = undefined;
    this.colorTexture = undefined;
    this.depthFramebuffer = undefined;
    this.colorFramebuffer = undefined;
    this.dimensions = '';
  }
  private release(gl: WebGL2RenderingContext) {
    this.releaseTargets(gl);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.program = undefined;
    this.vao = undefined;
  }
  private targets(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    depthBits: number,
    stencilBits: number,
  ) {
    const key = [width, height, depthBits, stencilBits].join('/');
    if (this.dimensions === key) return;
    this.releaseTargets(gl);
    const format =
      stencilBits === 8
        ? depthBits === 24
          ? gl.DEPTH24_STENCIL8
          : depthBits === 32
            ? gl.DEPTH32F_STENCIL8
            : undefined
        : stencilBits === 0
          ? depthBits === 16
            ? gl.DEPTH_COMPONENT16
            : depthBits === 24
              ? gl.DEPTH_COMPONENT24
              : depthBits === 32
                ? gl.DEPTH_COMPONENT32F
                : undefined
          : undefined;
    if (format === undefined)
      throw new Error(
        `GPU depth buffer format unsupported (${depthBits} depth / ${stencilBits} stencil bits)`,
      );
    this.depthTexture = gl.createTexture() ?? undefined;
    this.colorTexture = gl.createTexture() ?? undefined;
    this.depthFramebuffer = gl.createFramebuffer() ?? undefined;
    this.colorFramebuffer = gl.createFramebuffer() ?? undefined;
    if (
      !this.depthTexture ||
      !this.colorTexture ||
      !this.depthFramebuffer ||
      !this.colorFramebuffer
    )
      throw new Error('GPU depth targets allocation failed');
    for (const [texture, internalFormat] of [
      [this.depthTexture, format],
      [this.colorTexture, gl.RGBA8],
    ] as const) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      stencilBits ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.depthTexture,
      0,
    );
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error('GPU depth framebuffer incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.colorTexture,
      0,
    );
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error('GPU depth color framebuffer incomplete');
    const error = gl.getError();
    if (error !== gl.NO_ERROR)
      throw new Error(`GPU depth targets unavailable (WebGL ${error})`);
    this.dimensions = key;
  }
  private render(gl: WebGL2RenderingContext) {
    if (!this.pending) return;
    if (gl.isContextLost()) {
      this.fail(new Error('GPU depth unavailable: WebGL context lost'));
      return;
    }
    const saved = {
      read: gl.getParameter(
        gl.READ_FRAMEBUFFER_BINDING,
      ) as WebGLFramebuffer | null,
      draw: gl.getParameter(
        gl.DRAW_FRAMEBUFFER_BINDING,
      ) as WebGLFramebuffer | null,
      viewport: gl.getParameter(gl.VIEWPORT) as Int32Array,
      program: gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null,
      vao: gl.getParameter(
        gl.VERTEX_ARRAY_BINDING,
      ) as WebGLVertexArrayObject | null,
      active: gl.getParameter(gl.ACTIVE_TEXTURE) as number,
      mask: gl.getParameter(gl.COLOR_WRITEMASK) as boolean[],
      pack: gl.getParameter(gl.PACK_ALIGNMENT) as number,
      packRow: gl.getParameter(gl.PACK_ROW_LENGTH) as number,
      packSkipRows: gl.getParameter(gl.PACK_SKIP_ROWS) as number,
      packSkipPixels: gl.getParameter(gl.PACK_SKIP_PIXELS) as number,
      packBuffer: gl.getParameter(
        gl.PIXEL_PACK_BUFFER_BINDING,
      ) as WebGLBuffer | null,
      capabilities: [
        gl.BLEND,
        gl.DEPTH_TEST,
        gl.STENCIL_TEST,
        gl.SCISSOR_TEST,
        gl.CULL_FACE,
        gl.DITHER,
      ].map((cap) => [cap, gl.isEnabled(cap)] as const),
    };
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.getParameter(
      gl.TEXTURE_BINDING_2D,
    ) as WebGLTexture | null;
    const sampler = gl.getParameter(gl.SAMPLER_BINDING) as WebGLSampler | null;
    let frame: DepthFrame | undefined, error: Error | undefined;
    try {
      if (gl.isContextLost())
        throw new Error('GPU depth unavailable: WebGL context lost');
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const width = this.map.getCanvas().width,
        height = this.map.getCanvas().height,
        depthBits = gl.getParameter(gl.DEPTH_BITS) as number,
        stencilBits = gl.getParameter(gl.STENCIL_BITS) as number;
      if (width * height > 8294400 || !width || !height)
        throw new Error('GPU depth capture exceeds 4K pixel budget');
      this.initialize(gl);
      this.targets(gl, width, height, depthBits, stencilBits);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.depthFramebuffer!);
      gl.disable(gl.SCISSOR_TEST);
      gl.blitFramebuffer(
        0,
        0,
        width,
        height,
        0,
        0,
        width,
        height,
        gl.DEPTH_BUFFER_BIT,
        gl.NEAREST,
      );
      const copyError = gl.getError();
      if (copyError !== gl.NO_ERROR)
        throw new Error(`GPU depth copy unavailable (WebGL ${copyError})`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorFramebuffer!);
      gl.viewport(0, 0, width, height);
      for (const [cap] of saved.capabilities) gl.disable(cap);
      gl.colorMask(true, true, true, true);
      gl.useProgram(this.program!);
      gl.bindVertexArray(this.vao!);
      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture!);
      gl.bindSampler(0, null);
      const uniform = gl.getUniformLocation(this.program!, 'u_depth');
      if (!uniform) throw new Error('GPU depth sampler unavailable');
      gl.uniform1i(uniform, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
      gl.pixelStorei(gl.PACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.PACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const readError = gl.getError();
      if (readError !== gl.NO_ERROR)
        throw new Error(`GPU depth readback failed (WebGL ${readError})`);
      const flipped = new Uint8ClampedArray(pixels.length);
      for (let y = 0; y < height; y++)
        flipped.set(
          pixels.subarray(
            (height - y - 1) * width * 4,
            (height - y) * width * 4,
          ),
          y * width * 4,
        );
      this.canvas.width = width;
      this.canvas.height = height;
      const ctx = this.canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('GPU depth image canvas unavailable');
      ctx.putImageData(new ImageData(flipped, width, height), 0, 0);
      frame = {
        canvas: this.canvas,
        metadata: {
          encoding: 'rgb24-window-depth',
          width,
          height,
          depthBits,
          stencilBits,
        },
      };
    } catch (e) {
      error = e instanceof Error ? e : new Error('GPU depth capture failed');
      this.releaseTargets(gl);
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, saved.read);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, saved.draw);
      gl.viewport(
        saved.viewport[0]!,
        saved.viewport[1]!,
        saved.viewport[2]!,
        saved.viewport[3]!,
      );
      gl.useProgram(saved.program);
      gl.bindVertexArray(saved.vao);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.bindSampler(0, sampler);
      gl.activeTexture(saved.active);
      gl.colorMask(
        saved.mask[0]!,
        saved.mask[1]!,
        saved.mask[2]!,
        saved.mask[3]!,
      );
      gl.pixelStorei(gl.PACK_ALIGNMENT, saved.pack);
      gl.pixelStorei(gl.PACK_ROW_LENGTH, saved.packRow);
      gl.pixelStorei(gl.PACK_SKIP_ROWS, saved.packSkipRows);
      gl.pixelStorei(gl.PACK_SKIP_PIXELS, saved.packSkipPixels);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, saved.packBuffer);
      for (const [cap, enabled] of saved.capabilities)
        if (enabled) gl.enable(cap);
        else gl.disable(cap);
    }
    if (error) this.fail(error);
    else if (frame && this.pending) {
      const pending = this.pending;
      this.pending = undefined;
      clearTimeout(pending.timer);
      pending.resolve(frame);
    }
  }
  dispose() {
    this.disposed = true;
    this.fail(new Error('GPU depth capture disposed'));
    this.map.getCanvas().removeEventListener('webglcontextlost', this.lost);
    this.map.off('render', this.rendered);
    const gl = this.map.getCanvas().getContext('webgl2');
    if (gl) this.release(gl);
    this.canvas.remove();
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
