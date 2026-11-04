'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 pt-10 md:px-8 md:pt-16">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Tape jammed</h1>
      <p className="mt-4 max-w-[60ch] text-[16px] text-dust">
        The library couldn&rsquo;t be loaded from the database. {error.message ? `(${error.message})` : ''}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 bg-crank px-5 text-[15px] font-bold text-ink hover:bg-crank-hot"
      >
        Try again
      </button>
    </div>
  );
}
