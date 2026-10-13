import {
  MercatorCoordinate,
  type Map as MapLibreMap,
  type CustomLayerInterface,
  type CustomRenderMethodInput,
} from 'maplibre-gl';
import {
  buildingHeightMetres,
  type ModelAsset,
} from '@animatemap/project-schema';
import {
  wrap,
  type RenderLayer,
  type ModelPose,
} from '@animatemap/animation-core';
type ModelLayer = Extract<RenderLayer, { type: 'model' }>;
type Matrix = number[];
const identity = (): Matrix => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const signatures = new WeakMap<ModelAsset, string>();
function signature(asset: ModelAsset) {
  let saved = signatures.get(asset);
  if (!saved) {
    saved = JSON.stringify(asset);
    signatures.set(asset, saved);
  }
  return saved;
}
export function multiplyModelMatrices(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): Matrix {
  const output = Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        output[col * 4 + row]! += a[k * 4 + row]! * b[col * 4 + k]!;
  return output;
}
function rotation(pose: ModelPose) {
  const angles = [pose.pitch, pose.roll, -pose.heading].map(
      (a) => (a * Math.PI) / 180,
    ),
    [cx, cy, cz] = angles.map(Math.cos),
    [sx, sy, sz] = angles.map(Math.sin);
  return multiplyModelMatrices(
    [cz!, sz!, 0, 0, -sz!, cz!, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    multiplyModelMatrices(
      [1, 0, 0, 0, 0, cx!, sx!, 0, 0, -sx!, cx!, 0, 0, 0, 0, 1],
      [cy!, 0, -sy!, 0, 0, 1, 0, 0, sy!, 0, cy!, 0, 0, 0, 0, 1],
    ),
  );
}
export function modelPlacement(
  pose: ModelPose,
  unit: ModelAsset['unit'],
  centerLongitude: number,
  groundMetres: number,
) {
  const longitude =
    centerLongitude + wrap(pose.coordinates[0] - centerLongitude);
  const coordinate = MercatorCoordinate.fromLngLat(
    [longitude, pose.coordinates[1]],
    groundMetres + pose.altitude,
  );
  const metres =
    coordinate.meterInMercatorCoordinateUnits() *
    buildingHeightMetres(1, unit) *
    pose.scale;
  const rotated = rotation(pose),
    scale = identity();
  scale[0] = metres;
  scale[5] = -metres;
  scale[10] = metres;
  const translation = identity();
  translation[12] = coordinate.x;
  translation[13] = coordinate.y;
  translation[14] = coordinate.z;
  const reflection = identity();
  reflection[5] = -1;
  return {
    matrix: multiplyModelMatrices(
      translation,
      multiplyModelMatrices(scale, rotated),
    ),
    normalMatrix: multiplyModelMatrices(reflection, rotated),
    longitude,
    groundMetres,
    altitudeMetres: groundMetres + pose.altitude,
  };
}
export function modelBuffer(asset: ModelAsset) {
  const data = new Float32Array(asset.triangles.length * 18);
  let offset = 0;
  for (const t of asset.triangles) {
    const a = asset.vertices[t[0]]!,
      b = asset.vertices[t[1]]!,
      c = asset.vertices[t[2]]!,
      u = b.map((v, i) => v - a[i]!),
      v = c.map((n, i) => n - a[i]!);
    const normal = [
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ],
      length = Math.hypot(...normal);
    for (const point of [a, b, c]) {
      data.set(point, offset);
      data.set(
        normal.map((n) => n / length),
        offset + 3,
      );
      offset += 6;
    }
  }
  return data;
}
function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Model shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Model shader unavailable: ${error ?? 'compile failed'}`);
  }
  return shader;
}
class ModelMesh implements CustomLayerInterface {
  type = 'custom' as const;
  renderingMode = '3d' as const;
  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private vao?: WebGLVertexArrayObject;
  private uniforms?: {
    matrix: WebGLUniformLocation;
    normal: WebGLUniformLocation;
    color: WebGLUniformLocation;
  };
  private projection?: Matrix;
  constructor(
    readonly id: string,
    private map: MapLibreMap,
    readonly asset: ModelAsset,
    public layer: ModelLayer,
  ) {}
  onAdd(_map: MapLibreMap, gl: WebGL2RenderingContext) {
    const vertex = shader(
      gl,
      gl.VERTEX_SHADER,
      '#version 300 es\nin vec3 a_position;in vec3 a_normal;uniform mat4 u_matrix;uniform mat4 u_normal;out float light;void main(){vec3 normal=normalize((u_normal*vec4(a_normal,0.0)).xyz);light=.35+.65*max(dot(normal,normalize(vec3(-.3,-.5,.8))),0.0);gl_Position=u_matrix*vec4(a_position,1.0);}',
    );
    let fragment: WebGLShader | undefined;
    try {
      fragment = shader(
        gl,
        gl.FRAGMENT_SHADER,
        '#version 300 es\nprecision highp float;in float light;uniform vec4 u_color;out vec4 fragColor;void main(){fragColor=vec4(u_color.rgb*light*u_color.a,u_color.a);}',
      );
      this.program = gl.createProgram() ?? undefined;
      if (!this.program) throw new Error('Model program allocation failed');
      gl.attachShader(this.program, vertex);
      gl.attachShader(this.program, fragment);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw new Error(
          `Model program link failed: ${gl.getProgramInfoLog(this.program) ?? 'unknown'}`,
        );
      const matrix = gl.getUniformLocation(this.program, 'u_matrix'),
        normal = gl.getUniformLocation(this.program, 'u_normal'),
        color = gl.getUniformLocation(this.program, 'u_color');
      if (!matrix || !normal || !color)
        throw new Error('Model shader uniforms unavailable');
      this.uniforms = { matrix, normal, color };
      this.buffer = gl.createBuffer() ?? undefined;
      this.vao = gl.createVertexArray() ?? undefined;
      if (!this.buffer || !this.vao)
        throw new Error('Model geometry allocation failed');
      const previousVAO = gl.getParameter(
          gl.VERTEX_ARRAY_BINDING,
        ) as WebGLVertexArrayObject | null,
        previousBuffer = gl.getParameter(
          gl.ARRAY_BUFFER_BINDING,
        ) as WebGLBuffer | null;
      try {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, modelBuffer(this.asset), gl.STATIC_DRAW);
        const error = gl.getError();
        if (error !== gl.NO_ERROR)
          throw new Error(`Model geometry upload failed (WebGL ${error})`);
        for (const [name, offset] of [
          ['a_position', 0],
          ['a_normal', 12],
        ] as const) {
          const location = gl.getAttribLocation(this.program, name);
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
        }
      } finally {
        gl.bindVertexArray(previousVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
      }
    } catch (error) {
      this.onRemove(_map, gl);
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }
  placement() {
    const pose = this.layer.modelPose;
    if (!pose) throw new Error('Model pose must be evaluated before rendering');
    const ground = this.map.getTerrain()
      ? this.map.queryTerrainElevation(pose.coordinates)
      : 0;
    if (ground === null || !Number.isFinite(ground)) return undefined;
    return modelPlacement(
      pose,
      this.asset.unit,
      this.map.getCenter().lng,
      ground,
    );
  }
  render(gl: WebGL2RenderingContext, input: CustomRenderMethodInput) {
    if (
      !this.layer.visible ||
      this.layer.opacity <= 0 ||
      !this.program ||
      !this.vao ||
      !this.uniforms
    )
      return;
    const placed = this.placement();
    if (!placed) return;
    this.projection = multiplyModelMatrices(
      input.defaultProjectionData.mainMatrix,
      placed.matrix,
    );
    const oldVAO = gl.getParameter(
        gl.VERTEX_ARRAY_BINDING,
      ) as WebGLVertexArrayObject | null,
      oldProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null,
      cull = gl.isEnabled(gl.CULL_FACE);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.uniforms.matrix, false, this.projection);
    gl.uniformMatrix4fv(this.uniforms.normal, false, placed.normalMatrix);
    const rgb = [1, 3, 5].map(
      (start) =>
        parseInt(this.layer.style.color.slice(start, start + 2), 16) / 255,
    );
    gl.uniform4f(
      this.uniforms.color,
      rgb[0]!,
      rgb[1]!,
      rgb[2]!,
      this.layer.opacity,
    );
    gl.drawArrays(gl.TRIANGLES, 0, this.asset.triangles.length * 3);
    gl.bindVertexArray(oldVAO);
    gl.useProgram(oldProgram);
    if (cull) gl.enable(gl.CULL_FACE);
  }
  hit(x: number, y: number) {
    if (!this.layer.visible || this.layer.opacity <= 0 || !this.projection)
      return null;
    const matrix = this.projection,
      width = this.map.getCanvas().width,
      height = this.map.getCanvas().height;
    const projected = this.asset.vertices.map((p) => {
      const v = [...p, 1],
        clip = [0, 1, 2, 3].map((row) =>
          v.reduce((n, c, col) => n + c * matrix[col * 4 + row]!, 0),
        );
      return clip[3]! > 0
        ? [
            ((clip[0]! / clip[3]! + 1) * width) / 2,
            ((1 - clip[1]! / clip[3]!) * height) / 2,
            clip[2]! / clip[3]!,
          ]
        : null;
    });
    let depth = Infinity;
    const cross = (a: number[], b: number[], px: number, py: number) =>
      (b[0]! - a[0]!) * (py - a[1]!) - (b[1]! - a[1]!) * (px - a[0]!);
    for (const triangle of this.asset.triangles) {
      const [a, b, c] = triangle.map((i) => projected[i]);
      if (!a || !b || !c) continue;
      const sides = [cross(a, b, x, y), cross(b, c, x, y), cross(c, a, x, y)];
      if (sides.every((v) => v >= 0) || sides.every((v) => v <= 0))
        depth = Math.min(depth, (a[2]! + b[2]! + c[2]!) / 3);
    }
    return Number.isFinite(depth) ? depth : null;
  }
  onRemove(_map: MapLibreMap, gl: WebGL2RenderingContext) {
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.vao = undefined;
    this.buffer = undefined;
    this.program = undefined;
    this.projection = undefined;
  }
}
export class ModelsAdapter {
  private meshes = new Map<string, ModelMesh>();
  constructor(private map: MapLibreMap) {}
  use(layers: RenderLayer[], assets: ModelAsset[]) {
    const modelLayers = layers.filter(
      (l): l is ModelLayer => l.type === 'model',
    );
    for (const [id, mesh] of this.meshes) {
      const layer = modelLayers.find((l) => l.id === id),
        asset = assets.find((a) => a.id === layer?.modelAssetId);
      if (!layer || !asset || signature(mesh.asset) !== signature(asset)) {
        if (this.map.getLayer(mesh.id)) this.map.removeLayer(mesh.id);
        this.meshes.delete(id);
      }
    }
    for (const layer of modelLayers) {
      const asset = assets.find((a) => a.id === layer.modelAssetId);
      if (!asset) throw new Error(`Missing model asset ${layer.modelAssetId}`);
      let mesh = this.meshes.get(layer.id);
      if (!mesh) {
        mesh = new ModelMesh(`ams-${layer.id}-model`, this.map, asset, layer);
        try {
          this.map.addLayer(mesh);
        } catch (error) {
          // MapLibre registers the layer before onAdd; failed initialization
          // must roll back that registration as well as the owned GPU handles.
          if (this.map.getLayer(mesh.id)) this.map.removeLayer(mesh.id);
          throw error;
        }
        this.meshes.set(layer.id, mesh);
      }
      mesh.layer = layer;
    }
  }
  pick(x: number, y: number) {
    let best: string | undefined,
      depth = Infinity;
    const ratio =
      this.map.getCanvas().width / this.map.getContainer().clientWidth;
    for (const [id, mesh] of this.meshes) {
      const hit = mesh.hit(x * ratio, y * ratio);
      if (hit !== null && hit < depth) {
        best = id;
        depth = hit;
      }
    }
    return best;
  }
  placement(id: string) {
    return this.meshes.get(id)?.placement();
  }
  assertReady() {
    for (const mesh of this.meshes.values())
      if (mesh.layer.visible && mesh.layer.opacity > 0 && !mesh.placement())
        throw new Error(
          'Terrain elevation unavailable at model position; move model/camera inside loaded coverage',
        );
  }
  dispose() {
    for (const mesh of this.meshes.values())
      if (this.map.getLayer(mesh.id)) this.map.removeLayer(mesh.id);
    this.meshes.clear();
  }
}
