'use client';

/* eslint-disable @next/next/no-img-element -- band photos come from arbitrary
   third-party hosts (S3, YouTube, Last.fm, FB CDN); next/image would need every
   host allow-listed and can't fall back on a dead URL. */

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { fountain } from '@/lib/shows';

type Props = {
  name: string;
  image: string | null;
  /** Tried when `image` won't load (e.g. the band photo behind a dead cover). */
  fallback?: string | null;
  palette: number;
  className?: string;
  /** Eager-load above-the-fold art. */
  priority?: boolean;
};

/** Short connecting words ride along with the next word, like on the posters. */
function posterLines(name: string): string[] {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if ((w.length <= 2 || w === 'THE' || w === 'AND') && i + 1 < words.length) {
      words[i + 1] = `${w} ${words[i + 1]}`;
      continue;
    }
    lines.push(w);
  }
  return lines.slice(0, 4);
}

/**
 * Band art: the photo run through the copier onto fluorescent split-fountain
 * stock, or, when there's no usable photo, a generated Globe-style name card.
 */
export function BandArt({ name, image, fallback, palette, className, priority }: Props) {
  // Cover first, then the fallback photo, then the name card.
  const sources = [image, fallback].filter((s, i, a): s is string => Boolean(s) && a.indexOf(s) === i);
  const [attempt, setAttempt] = useState(0);
  const src = sources[attempt] ?? null;
  const failed = !src;
  const fail = () => setAttempt((n) => n + 1);
  const imgRef = useRef<HTMLImageElement>(null);
  // A server-rendered <img> can fail before hydration attaches onError.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth < 40) fail();
  }, [src]);
  // A new track or band: start over at its cover.
  useEffect(() => setAttempt(0), [image, fallback]);
  const showPhoto = !failed;
  // YouTube "hqdefault" thumbs are letterboxed 4:3; zoom past the bars.
  const letterboxed = src ? /ytimg\.com|img\.youtube\.com/.test(src) : false;

  return (
    <div
      className={clsx('relative aspect-square overflow-hidden [container-type:inline-size]', className)}
      style={{ backgroundImage: fountain(palette) }}
    >
      {showPhoto ? (
        <img
          key={src}
          ref={imgRef}
          src={src!}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={fail}
          onLoad={(e) => {
            // Some dead links resolve to a 1x1 or tiny placeholder.
            if (e.currentTarget.naturalWidth < 40) fail();
          }}
          className={clsx('xerox absolute inset-0 h-full w-full object-cover', letterboxed && 'scale-[1.36]')}
        />
      ) : (
        <NameCard name={name} />
      )}
    </div>
  );
}

function NameCard({ name }: { name: string }) {
  const lines = posterLines(name);
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center gap-[3cqi] px-[7cqi] text-ink"
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className="poster block whitespace-nowrap"
          style={{
            // Each line is sized to fill the width, the way wood type was set.
            fontSize: `min(${Math.round(150 / Math.max(line.length, 1.6))}cqi, ${lines.length > 2 ? 30 : 46}cqi)`,
          }}
        >
          {line}
        </span>
      ))}
      <span className="mt-[2cqi] block h-[2.2cqi] w-[38cqi] bg-ink" />
    </div>
  );
}
