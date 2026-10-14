import { useEditor } from './store';
import type { Camera, Admin1Properties } from '@animatemap/project-schema';
import { cameraSchema } from '@animatemap/project-schema';
import { CameraPresets } from './CameraPresets';
import { AnimationStyles } from './AnimationStyles';
import { ChoroplethInspector } from './ChoroplethInspector';
import { NumberField } from './NumberField';
import { Admin1Inspector } from './Admin1Inspector';
import { BuildingInspector } from './BuildingInspector';
import { ModelInspector } from './ModelInspector';
import { HistoricalInspector } from './HistoricalInspector';
import { CameraFollowPanel } from './CameraFollowPanel';
import { evaluateProjectAt } from '@animatemap/animation-core';
export function Inspector({
  country,
  region,
  onRegions,
}: {
  country: string;
  region?: Admin1Properties | null;
  onRegions?: () => void;
}) {
  const s = useEditor();
  const layer = s.project.scenes
    .flatMap((v) => v.layers)
    .find((l) => l.id === s.selected);
  const patch = s.patchLayer;
  const following = !!s.project.scenes.find(
    (scene) => scene.id === evaluateProjectAt(s.project, s.time).sceneId,
  )?.camera.follow;
  return (
    <>
      <div className="panel-heading">INSPECTOR</div>
      <h2>{layer?.name ?? 'Camera'}</h2>
      <span className="type-label">{layer?.type ?? 'Camera keyframes'}</span>
      {layer &&
        (layer.type === 'route' || layer.type === 'marker') &&
        layer.geographySource && (
          <details className="source-review">
            <summary>Geographic source</summary>
            <p>{layer.geographySource.credit}</p>
            <p>
              {layer.geographySource.license} ·{' '}
              {layer.geographySource.datasetVersion}
            </p>
            <p>{layer.geographySource.sourceId}</p>
            <p>
              Imported source reference; geometry may have been edited in this
              project.
            </p>
          </details>
        )}
      {layer && (
        <fieldset disabled={layer.locked} className="inspector-fields">
          <label className="field">
            Layer name
            <input
              aria-label="Layer name"
              value={layer.name}
              onChange={(e) =>
                patch((l) => {
                  l.name = e.target.value;
                })
              }
            />
          </label>
          {layer.type !== 'image' && (
            <label className="field">
              Color
              <div className="color-field">
                <input
                  aria-label="Layer color"
                  type="color"
                  value={layer.style.color}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type !== 'image') l.style.color = e.target.value;
                    })
                  }
                />
                <span>{layer.style.color.toUpperCase()}</span>
              </div>
            </label>
          )}
          <NumberField
            label="Opacity"
            value={layer.opacity}
            min={0}
            max={1}
            onChange={(v) =>
              patch((l) => {
                l.opacity = v;
              })
            }
          />
          <div className="camera-grid">
            <NumberField
              label="Layer start"
              value={layer.timeRange.start}
              onChange={(v) =>
                patch((l) => {
                  l.timeRange.start = v;
                })
              }
            />
            <NumberField
              label="Layer end"
              value={layer.timeRange.end}
              onChange={(v) =>
                patch((l) => {
                  l.timeRange.end = v;
                })
              }
            />
          </div>
          {layer.type === 'countryHighlight' && (
            <>
              <label className="field">
                Country texture
                <select
                  aria-label="Country texture"
                  value={layer.textureAssetId ?? ''}
                  onChange={(event) =>
                    patch((target) => {
                      if (target.type === 'countryHighlight')
                        target.textureAssetId = event.target.value || undefined;
                    })
                  }
                >
                  <option value="">Solid color</option>
                  {s.project.assets
                    .filter(
                      (asset) => asset.width <= 512 && asset.height <= 512,
                    )
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Country codes
                <input
                  aria-label="Country codes"
                  value={layer.countryCodes.join(',')}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'countryHighlight')
                        l.countryCodes = e.target.value
                          .toUpperCase()
                          .split(',')
                          .map((v) => v.trim());
                    })
                  }
                />
              </label>
              <label className="field">
                Stroke
                <input
                  type="color"
                  aria-label="Country stroke"
                  value={layer.style.stroke}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'countryHighlight')
                        l.style.stroke = e.target.value;
                    })
                  }
                />
              </label>
              <NumberField
                label="Stroke width"
                value={layer.style.width}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'countryHighlight') l.style.width = v;
                  })
                }
              />
              <NumberField
                label="Dim outside"
                value={layer.style.dimOutside}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'countryHighlight') l.style.dimOutside = v;
                  })
                }
              />
            </>
          )}
          {layer.type === 'choropleth' && <ChoroplethInspector layer={layer} />}
          {layer.type === 'buildings' && <BuildingInspector layer={layer} />}
          {layer.type === 'model' && <ModelInspector layer={layer} />}
          {layer.type === 'historical' && <HistoricalInspector layer={layer} />}
          {layer.type === 'admin1Highlight' && (
            <Admin1Inspector layer={layer} />
          )}
          {(layer.type === 'route' || layer.type === 'shape') && (
            <>
              <p className="hint">
                {layer.type === 'shape'
                  ? 'Illustrative geographic graphic. Bezier points are start, two controls, then end.'
                  : 'Geographic connection, not road directions.'}
              </p>
              {layer.type === 'shape' && (
                <>
                  <label className="field">
                    Shape kind
                    <select
                      aria-label="Shape kind"
                      value={layer.kind}
                      onChange={(event) =>
                        patch((target) => {
                          if (target.type === 'shape') {
                            target.kind = event.target
                              .value as typeof target.kind;
                            target.style.arrow = target.kind === 'arrow';
                          }
                        })
                      }
                    >
                      <option value="line">Line</option>
                      <option value="arrow">Arrow</option>
                      <option
                        value="bezier"
                        disabled={layer.coordinates.length !== 4}
                      >
                        Bezier
                      </option>
                    </select>
                  </label>
                  <label className="check">
                    <input
                      aria-label="Show shape controls"
                      type="checkbox"
                      checked={s.showShapeControls}
                      onChange={(event) =>
                        useEditor.setState({
                          showShapeControls: event.target.checked,
                        })
                      }
                    />
                    Show edit controls
                  </label>
                </>
              )}
              <NumberField
                label={layer.type === 'shape' ? 'Shape width' : 'Route width'}
                value={layer.style.width}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'route' || l.type === 'shape')
                      l.style.width = v;
                  })
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={layer.style.dash}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'route' || l.type === 'shape')
                        l.style.dash = e.target.checked;
                    })
                  }
                />
                {layer.type === 'shape' ? 'Dashed shape' : 'Dashed route'}
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={layer.type === 'shape' && layer.kind === 'arrow'}
                  checked={
                    layer.style.arrow ||
                    (layer.type === 'shape' && layer.kind === 'arrow')
                  }
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'route' || l.type === 'shape')
                        l.style.arrow = e.target.checked;
                    })
                  }
                />
                Arrow head
              </label>
              {layer.coordinates.map((point, i) => (
                <div className="point-row" key={i}>
                  <NumberField
                    label={`Point ${i + 1} longitude`}
                    value={point[0]}
                    onChange={(v) =>
                      patch((l) => {
                        if (l.type === 'route' || l.type === 'shape')
                          l.coordinates[i]![0] = v;
                      })
                    }
                  />
                  <NumberField
                    label={`Point ${i + 1} latitude`}
                    value={point[1]}
                    onChange={(v) =>
                      patch((l) => {
                        if (l.type === 'route' || l.type === 'shape')
                          l.coordinates[i]![1] = v;
                      })
                    }
                  />
                  <button
                    disabled={
                      layer.coordinates.length <= 2 ||
                      (layer.type === 'shape' && layer.kind === 'bezier')
                    }
                    aria-label={`Delete point ${i + 1}`}
                    onClick={() =>
                      patch((l) => {
                        if (l.type === 'route' || l.type === 'shape')
                          l.coordinates.splice(i, 1);
                      })
                    }
                  >
                    ×
                  </button>
                  {layer.type === 'shape' && (
                    <button
                      aria-label={`Move shape point ${i + 1} on map`}
                      title="Click this button, then click the map"
                      onClick={() =>
                        useEditor.setState({
                          tool: 'shapePoint',
                          pointEdit: { id: layer.id, index: i },
                        })
                      }
                    >
                      ↗
                    </button>
                  )}
                </div>
              ))}
              <button
                disabled={layer.type === 'shape' && layer.kind === 'bezier'}
                onClick={() =>
                  patch((l) => {
                    if (l.type === 'route' || l.type === 'shape')
                      l.coordinates.push([s.camera.lng, s.camera.lat]);
                  })
                }
              >
                Add point at camera
              </button>
            </>
          )}
          {(layer.type === 'marker' ||
            layer.type === 'text' ||
            layer.type === 'image') && (
            <>
              {layer.type !== 'image' && (
                <>
                  <label className="field">
                    Label collision
                    <select
                      aria-label="Label collision"
                      value={layer.collision.mode}
                      onChange={(event) =>
                        patch((target) => {
                          if (
                            target.type === 'text' ||
                            target.type === 'marker'
                          )
                            target.collision.mode = event.target.value as
                              | 'allow'
                              | 'hide';
                        })
                      }
                    >
                      <option value="allow">Always show</option>
                      <option value="hide">Hide when overlapping</option>
                    </select>
                  </label>
                  <NumberField
                    label="Label priority"
                    min={0}
                    max={100}
                    step={1}
                    value={layer.collision.priority}
                    onChange={(value) =>
                      patch((target) => {
                        if (target.type === 'text' || target.type === 'marker')
                          target.collision.priority = value;
                      })
                    }
                  />
                  <p className="hint">
                    Higher priority wins; equal priority favors frontmost
                    layers. Always-show labels reserve space. Marker pins remain
                    visible.
                  </p>
                </>
              )}
              {layer.type !== 'image' && (
                <label className="field">
                  {layer.type === 'text' ? 'Text' : 'Marker label'}
                  <textarea
                    aria-label={layer.type === 'text' ? 'Text' : 'Marker label'}
                    value={layer.type === 'text' ? layer.text : layer.label}
                    onChange={(e) =>
                      patch((l) => {
                        if (l.type === 'text') l.text = e.target.value;
                        if (l.type === 'marker') l.label = e.target.value;
                      })
                    }
                  />
                </label>
              )}
              <label className="field">
                Anchor
                <select
                  aria-label="Anchor"
                  value={layer.anchor.type}
                  onChange={(e) =>
                    patch((l) => {
                      if (
                        l.type === 'text' ||
                        l.type === 'marker' ||
                        l.type === 'image'
                      )
                        l.anchor =
                          e.target.value === 'screen'
                            ? { type: 'screen', x: 0.5, y: 0.5 }
                            : {
                                type: 'map',
                                coordinates: [s.camera.lng, s.camera.lat],
                              };
                    })
                  }
                >
                  <option value="map">Map coordinates</option>
                  <option value="screen">Screen position</option>
                </select>
              </label>
              {layer.anchor.type === 'map' ? (
                <div className="camera-grid">
                  {[0, 1].map((i) => (
                    <NumberField
                      key={i}
                      label={i ? 'Anchor latitude' : 'Anchor longitude'}
                      value={
                        layer.anchor.type === 'map'
                          ? layer.anchor.coordinates[i]!
                          : 0
                      }
                      onChange={(v) =>
                        patch((l) => {
                          if (
                            (l.type === 'marker' ||
                              l.type === 'text' ||
                              l.type === 'image') &&
                            l.anchor.type === 'map'
                          )
                            l.anchor.coordinates[i] = v;
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="camera-grid">
                  {(['x', 'y'] as const).map((key) => (
                    <NumberField
                      key={key}
                      label={`Screen ${key}`}
                      value={
                        layer.anchor.type === 'screen' ? layer.anchor[key] : 0
                      }
                      min={0}
                      max={1}
                      onChange={(v) =>
                        patch((l) => {
                          if (
                            (l.type === 'marker' ||
                              l.type === 'text' ||
                              l.type === 'image') &&
                            l.anchor.type === 'screen'
                          )
                            l.anchor[key] = v;
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {layer.type === 'image' && (
            <>
              <label className="field">
                Image asset
                <select
                  aria-label="Image asset"
                  value={layer.assetId}
                  onChange={(event) =>
                    patch((target) => {
                      if (target.type === 'image')
                        target.assetId = event.target.value;
                    })
                  }
                >
                  {s.project.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Image width"
                min={1}
                max={3840}
                value={layer.style.width}
                onChange={(value) =>
                  patch((target) => {
                    if (target.type === 'image') target.style.width = value;
                  })
                }
              />
              <NumberField
                label="Image height"
                min={1}
                max={3840}
                value={layer.style.height}
                onChange={(value) =>
                  patch((target) => {
                    if (target.type === 'image') target.style.height = value;
                  })
                }
              />
              <label className="field">
                Image fit
                <select
                  aria-label="Image fit"
                  value={layer.style.fit}
                  onChange={(event) =>
                    patch((target) => {
                      if (target.type === 'image')
                        target.style.fit = event.target.value as
                          | 'contain'
                          | 'cover';
                    })
                  }
                >
                  <option value="contain">
                    Contain · preserve complete image
                  </option>
                  <option value="cover">Cover · crop to frame</option>
                </select>
              </label>
              <p className="hint">
                Top-left anchor. Width/height are project pixels.{' '}
                {
                  s.project.assets.find((asset) => asset.id === layer.assetId)
                    ?.provenance.credit
                }
              </p>
            </>
          )}
          {layer.type === 'text' && (
            <>
              <NumberField
                label="Font size"
                value={layer.style.fontSize}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'text') l.style.fontSize = v;
                  })
                }
              />
              <label className="field">
                Weight
                <select
                  value={layer.style.fontWeight}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'text')
                        l.style.fontWeight = e.target.value as
                          | 'normal'
                          | 'bold';
                    })
                  }
                >
                  <option>normal</option>
                  <option>bold</option>
                </select>
              </label>
              <label className="field">
                Alignment
                <select
                  value={layer.style.align}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'text')
                        l.style.align = e.target.value as
                          | 'left'
                          | 'center'
                          | 'right';
                    })
                  }
                >
                  {['left', 'center', 'right'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {layer.type === 'marker' && (
            <>
              <NumberField
                label="Marker size"
                value={layer.style.size}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'marker') l.style.size = v;
                  })
                }
              />
              <label className="field">
                Icon
                <select
                  value={layer.style.icon}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'marker')
                        l.style.icon = e.target.value as
                          | 'pin'
                          | 'circle'
                          | 'plane';
                    })
                  }
                >
                  {['pin', 'circle', 'plane'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(layer.type === 'marker' ||
            layer.type === 'text' ||
            layer.type === 'image') && (
            <div className="camera-grid">
              <NumberField
                label="Scale"
                value={layer.transform.scale}
                onChange={(v) =>
                  patch((l) => {
                    l.transform.scale = v;
                  })
                }
              />
              <NumberField
                label="Rotation"
                value={layer.transform.rotation}
                onChange={(v) =>
                  patch((l) => {
                    l.transform.rotation = v;
                  })
                }
              />
              <NumberField
                label="Offset X"
                value={layer.transform.offsetX}
                onChange={(v) =>
                  patch((l) => {
                    l.transform.offsetX = v;
                  })
                }
              />
              <NumberField
                label="Offset Y"
                value={layer.transform.offsetY}
                onChange={(v) =>
                  patch((l) => {
                    l.transform.offsetY = v;
                  })
                }
              />
            </div>
          )}
          <AnimationStyles layer={layer} />
        </fieldset>
      )}
      <label className="field">
        Selected country
        <input aria-label="Selected country" readOnly value={country} />
      </label>
      {region && (
        <section aria-label="Selected Admin 1 region">
          <h3>{region.name}</h3>
          <p>{region.localName}</p>
          <p>
            {region.type} · {region.sourceCode} · {region.isoCode}
          </p>
          <p className="hint">
            Natural Earth reference release 5.1.2 · {region.code}
          </p>
          <button onClick={onRegions}>Review selected region</button>
        </section>
      )}
      <button
        onClick={() => s.addLayer('countryHighlight', undefined, country)}
      >
        Highlight {country}
      </button>
      <div className="panel-heading section-heading">CAMERA</div>
      <CameraFollowPanel />
      <fieldset className="camera-grid camera-controls" disabled={following}>
        {(['lng', 'lat', 'zoom', 'bearing', 'pitch'] as const).map((key) => (
          <NumberField
            key={key}
            label={`Camera ${key}`}
            value={s.camera[key]}
            onChange={(value) => {
              const result = cameraSchema.safeParse({
                ...s.camera,
                [key]: value,
              } as Camera);
              if (result.success) useEditor.setState({ camera: result.data });
            }}
          />
        ))}
      </fieldset>
      <button disabled={following} onClick={s.addCameraKey}>
        Add camera keyframe · K
      </button>
      <p className="hint">
        Capture camera changes as a keyframe. Disable follow to capture manual
        camera keys. Seeking restores the timeline camera.
      </p>
      <fieldset className="camera-controls" disabled={following}>
        <CameraPresets />
      </fieldset>
    </>
  );
}
