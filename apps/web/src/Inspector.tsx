import { useEditor } from './store';
import type { Camera } from '@animatemap/project-schema';
import { cameraSchema } from '@animatemap/project-schema';
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        aria-label={label}
        type="number"
        value={Number(value.toFixed(4))}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (e.target.value !== '') onChange(Number(e.target.value));
        }}
      />
    </label>
  );
}
export function Inspector({ country }: { country: string }) {
  const s = useEditor();
  const layer = s.project.scenes
    .flatMap((v) => v.layers)
    .find((l) => l.id === s.selected);
  const patch = s.patchLayer;
  return (
    <>
      <div className="panel-heading">INSPECTOR</div>
      <h2>{layer?.name ?? 'Camera'}</h2>
      <span className="type-label">{layer?.type ?? 'Camera keyframes'}</span>
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
          <label className="field">
            Color
            <div className="color-field">
              <input
                aria-label="Layer color"
                type="color"
                value={layer.style.color}
                onChange={(e) =>
                  patch((l) => {
                    l.style.color = e.target.value;
                  })
                }
              />
              <span>{layer.style.color.toUpperCase()}</span>
            </div>
          </label>
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
          {layer.type === 'route' && (
            <>
              <p className="hint">
                Geographic connection, not road directions.
              </p>
              <NumberField
                label="Route width"
                value={layer.style.width}
                onChange={(v) =>
                  patch((l) => {
                    if (l.type === 'route') l.style.width = v;
                  })
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={layer.style.dash}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'route') l.style.dash = e.target.checked;
                    })
                  }
                />
                Dashed route
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={layer.style.arrow}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'route') l.style.arrow = e.target.checked;
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
                        if (l.type === 'route') l.coordinates[i]![0] = v;
                      })
                    }
                  />
                  <NumberField
                    label={`Point ${i + 1} latitude`}
                    value={point[1]}
                    onChange={(v) =>
                      patch((l) => {
                        if (l.type === 'route') l.coordinates[i]![1] = v;
                      })
                    }
                  />
                  <button
                    disabled={layer.coordinates.length <= 2}
                    aria-label={`Delete point ${i + 1}`}
                    onClick={() =>
                      patch((l) => {
                        if (l.type === 'route') l.coordinates.splice(i, 1);
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  patch((l) => {
                    if (l.type === 'route')
                      l.coordinates.push([s.camera.lng, s.camera.lat]);
                  })
                }
              >
                Add point at camera
              </button>
            </>
          )}
          {(layer.type === 'marker' || layer.type === 'text') && (
            <>
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
              <label className="field">
                Anchor
                <select
                  aria-label="Anchor"
                  value={layer.anchor.type}
                  onChange={(e) =>
                    patch((l) => {
                      if (l.type === 'text' || l.type === 'marker')
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
                            (l.type === 'marker' || l.type === 'text') &&
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
                            (l.type === 'marker' || l.type === 'text') &&
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
        </fieldset>
      )}
      <label className="field">
        Selected country
        <input aria-label="Selected country" readOnly value={country} />
      </label>
      <button
        onClick={() => s.addLayer('countryHighlight', undefined, country)}
      >
        Highlight {country}
      </button>
      <div className="panel-heading section-heading">CAMERA</div>
      <div className="camera-grid">
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
      </div>
      <button onClick={s.addCameraKey}>Add camera keyframe · K</button>
      <p className="hint">
        Capture camera changes as a keyframe. Seeking restores the timeline
        camera.
      </p>
    </>
  );
}
