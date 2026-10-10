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
        onChange={(event) => {
          if (event.target.value !== '') onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}
