export default function Loading() {
  return (
    <div className="px-4 pt-6 md:px-8 md:pt-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-[clamp(64px,12vw,140px)] w-2/3 animate-pulse bg-tape" />
      <div className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[156px] animate-pulse bg-tape" />
        ))}
      </div>
    </div>
  );
}
