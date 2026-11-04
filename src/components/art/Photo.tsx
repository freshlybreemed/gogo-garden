'use client';

/* eslint-disable @next/next/no-img-element -- archival photos come from
   arbitrary hosts; a dead link must collapse instead of showing a broken icon. */

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/** A sourced photo that removes itself if it fails to load. */
export function Photo({
  src,
  alt,
  className,
  imgClassName,
  priority,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const [dead, setDead] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // A server-rendered <img> can fail before hydration attaches onError.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setDead(true);
  }, []);
  if (dead) return null;
  return (
    <figure className={clsx(className ?? 'relative')}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setDead(true)}
        className={clsx('block h-full w-full object-cover', imgClassName)}
      />
      {children}
    </figure>
  );
}
