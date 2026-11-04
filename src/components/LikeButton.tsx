'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useLikesStore } from '@/stores/LikesStore';
import { IconHeart } from './icons';

export function LikeButton({ url, title, className }: { url: string; title: string; className?: string }) {
  const router = useRouter();
  const liked = useLikesStore((s) => s.liked.has(url));
  const loaded = useLikesStore((s) => s.loaded);
  const load = useLikesStore((s) => s.load);
  const toggle = useLikesStore((s) => s.toggle);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${title}` : `Like ${title}`}
      onClick={async (e) => {
        e.stopPropagation();
        if ((await toggle(url)) === 'login') router.push('/login');
      }}
      className={clsx(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center hover:text-paper',
        liked ? 'text-crank' : 'text-dust',
        className,
      )}
    >
      <IconHeart filled={liked} className="h-[18px] w-[18px]" />
    </button>
  );
}
