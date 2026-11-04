'use client';

// Native range input (stand-in for @reach/slider, which lacks React 19 support).
type SliderProps = {
  min?: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Fires when the user releases the thumb (pointer or keyboard). */
  onCommit?: () => void;
  onSeekStart?: () => void;
  className?: string;
  'aria-label': string;
  'aria-valuetext'?: string;
};

export function Slider({
  min = 0,
  max,
  value,
  onChange,
  onCommit,
  onSeekStart,
  className,
  'aria-label': ariaLabel,
  'aria-valuetext': valueText,
}: SliderProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const pct = max > min ? ((safe - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      data-slider=""
      aria-label={ariaLabel}
      aria-valuetext={valueText}
      min={min}
      max={max || 0}
      step="any"
      value={safe}
      className={className}
      style={{ '--pct': `${Math.min(100, Math.max(0, pct))}%` } as React.CSSProperties}
      onPointerDown={onSeekStart}
      onPointerUp={onCommit}
      onKeyUp={onCommit}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
    />
  );
}
