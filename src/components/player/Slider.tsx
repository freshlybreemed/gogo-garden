'use client';

// Minimal stand-in for @reach/slider (no React 19 support) on a native range.
type SliderProps = {
  min?: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Fires when the user releases the thumb (pointer or keyboard). */
  onCommit?: () => void;
  onSeekStart?: () => void;
  style?: React.CSSProperties;
  'aria-label'?: string;
};

export function Slider({
  min = 0,
  max,
  value,
  onChange,
  onCommit,
  onSeekStart,
  style,
  'aria-label': ariaLabel,
}: SliderProps) {
  return (
    <input
      type="range"
      data-slider=""
      aria-label={ariaLabel}
      min={min}
      max={max || 0}
      step="any"
      value={Number.isFinite(value) ? value : 0}
      style={style}
      onPointerDown={onSeekStart}
      onPointerUp={onCommit}
      onKeyUp={onCommit}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
    />
  );
}
