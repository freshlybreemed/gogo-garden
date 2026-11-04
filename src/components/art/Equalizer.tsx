import clsx from 'clsx';

/** Now-playing meter. Bars hold still when paused. */
export function Equalizer({ active, className }: { active: boolean; className?: string }) {
  return (
    <span
      className={clsx('inline-flex h-3.5 items-end gap-[2px]', className)}
      role="img"
      aria-label={active ? 'Playing' : 'Paused'}
    >
      {[0, -0.45, -0.2, -0.65].map((delay, i) => (
        <span
          key={i}
          className={clsx('block h-full w-[3px] origin-bottom bg-current', active ? 'animate-eq' : '')}
          style={{
            animationDelay: `${delay}s`,
            transform: active ? undefined : `scaleY(${[0.5, 0.8, 0.35, 0.6][i]})`,
          }}
        />
      ))}
    </span>
  );
}
