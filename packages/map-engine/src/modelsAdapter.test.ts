import { test, expect } from 'vitest';
import { modelBuffer, modelPlacement, ModelsAdapter } from './modelsAdapter';
import { modelFixture } from '../../project-schema/src/models.fixture';
import { layerSchema } from '@animatemap/project-schema';
import type { Map as MapLibreMap, CustomLayerInterface } from 'maplibre-gl';
test('actual mesh buffer contains finite normalized flat normals; Mercator pose uses declared units, ground altitude and nearest world copy', () => {
  const asset = modelFixture(),
    buffer = modelBuffer(asset);
  expect(buffer).toHaveLength(72);
  expect([...buffer].every(Number.isFinite)).toBe(true);
  for (let i = 0; i < buffer.length; i += 6)
    expect(Math.hypot(...buffer.subarray(i + 3, i + 6))).toBeCloseTo(1, 6);
  const pose = {
      coordinates: [-179.9, 20] as [number, number],
      altitude: 100,
      heading: 90,
      pitch: 0,
      roll: 0,
      scale: 2,
    },
    placed = modelPlacement(pose, 'feet', 179.9, 2000);
  expect(placed.longitude).toBeCloseTo(180.1);
  expect(placed.altitudeMetres).toBe(2100);
  expect(placed.matrix.every(Number.isFinite)).toBe(true);
  const metres = modelPlacement(pose, 'metres', 179.9, 2000);
  expect(
    Math.hypot(...placed.matrix.slice(0, 3)) /
      Math.hypot(...metres.matrix.slice(0, 3)),
  ).toBeCloseTo(0.3048);
});
test('failed GPU upload restores caller bindings and rolls back MapLibre insert-before-onAdd registration; retry and disposal own each handle once', () => {
  const callerVAO = {} as WebGLVertexArrayObject,
    callerBuffer = {} as WebGLBuffer;
  let boundVAO: WebGLVertexArrayObject | null = callerVAO,
    boundBuffer: WebGLBuffer | null = callerBuffer,
    failUpload = true;
  const deletedBuffers: WebGLBuffer[] = [],
    deletedVAOs: WebGLVertexArrayObject[] = [],
    deletedPrograms: WebGLProgram[] = [],
    deletedShaders: WebGLShader[] = [];
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    VERTEX_ARRAY_BINDING: 5,
    ARRAY_BUFFER_BINDING: 6,
    ARRAY_BUFFER: 7,
    STATIC_DRAW: 8,
    FLOAT: 9,
    NO_ERROR: 0,
    createShader: () => ({}) as WebGLShader,
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    deleteShader: (shader: WebGLShader) => deletedShaders.push(shader),
    createProgram: () => ({}) as WebGLProgram,
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getUniformLocation: () => ({}) as WebGLUniformLocation,
    deleteProgram: (program: WebGLProgram) => deletedPrograms.push(program),
    createBuffer: () => ({}) as WebGLBuffer,
    createVertexArray: () => ({}) as WebGLVertexArrayObject,
    getParameter: (parameter: number) =>
      parameter === 5 ? boundVAO : boundBuffer,
    bindVertexArray: (vao: WebGLVertexArrayObject | null) => {
      boundVAO = vao;
    },
    bindBuffer: (_target: number, buffer: WebGLBuffer | null) => {
      boundBuffer = buffer;
    },
    bufferData: () => {},
    getError: () => {
      const error = failUpload ? 1285 : 0;
      failUpload = false;
      return error;
    },
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    deleteBuffer: (buffer: WebGLBuffer) => {
      deletedBuffers.push(buffer);
      if (boundBuffer === buffer) boundBuffer = null;
    },
    deleteVertexArray: (vao: WebGLVertexArrayObject) => {
      deletedVAOs.push(vao);
      if (boundVAO === vao) boundVAO = null;
    },
  } as unknown as WebGL2RenderingContext;
  const registered = new Map<string, CustomLayerInterface>();
  const map = {
    addLayer: (layer: CustomLayerInterface) => {
      if (registered.has(layer.id)) throw new Error('Duplicate layer');
      // Match MapLibre 6: the style owns the layer before invoking onAdd.
      registered.set(layer.id, layer);
      layer.onAdd?.(map as unknown as MapLibreMap, gl);
    },
    getLayer: (id: string) => registered.get(id),
    removeLayer: (id: string) => {
      registered.get(id)?.onRemove?.(map as unknown as MapLibreMap, gl);
      registered.delete(id);
    },
  };
  const adapter = new ModelsAdapter(map as unknown as MapLibreMap),
    asset = modelFixture(),
    layer = layerSchema.parse({
      id: 'mesh',
      name: 'Mesh',
      type: 'model',
      modelAssetId: asset.id,
      timeRange: { start: 0, end: 12 },
      motion: { type: 'stationary', coordinates: [10, 20] },
      style: { color: '#ffffff' },
    });
  expect(() => adapter.use([layer], [asset])).toThrow('upload failed');
  expect(registered.size).toBe(0);
  expect(boundVAO).toBe(callerVAO);
  expect(boundBuffer).toBe(callerBuffer);
  expect(deletedBuffers).toHaveLength(1);
  expect(deletedVAOs).toHaveLength(1);
  expect(deletedPrograms).toHaveLength(1);
  expect(deletedShaders).toHaveLength(2);
  expect(() => adapter.use([layer], [asset])).not.toThrow();
  expect(registered.size).toBe(1);
  expect(boundVAO).toBe(callerVAO);
  expect(boundBuffer).toBe(callerBuffer);
  adapter.dispose();
  adapter.dispose();
  expect(registered.size).toBe(0);
  expect(deletedBuffers).toHaveLength(2);
  expect(deletedVAOs).toHaveLength(2);
  expect(deletedPrograms).toHaveLength(2);
  expect(deletedShaders).toHaveLength(4);
  expect(new Set(deletedBuffers).size).toBe(2);
  expect(new Set(deletedVAOs).size).toBe(2);
  expect(new Set(deletedPrograms).size).toBe(2);
});
