'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { usePlaylistsStore } from '@/stores/PlaylistsStore';
import { IconPlaylistAdd } from './icons';

/** "+" button with a small menu: add the track to one of your playlists, or start a new one. */
export function AddToPlaylist({ url, title, className, up }: { url: string; title: string; className?: string; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { playlists, loaded, load, create, addTrack } = usePlaylistsStore();

  useEffect(() => {
    if (!open) return;
    if (!loaded) void load();
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open, loaded, load]);

  async function add(id: string, label: string) {
    setNote((await addTrack(id, url)) ? `Added to ${label}` : 'Couldn’t add that one');
    setTimeout(() => setOpen(false), 700);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Add ${title} to a playlist`}
        onClick={(e) => {
          e.stopPropagation();
          setNote('');
          setOpen((o) => !o);
        }}
        className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center text-dust hover:text-paper', className)}
      >
        <IconPlaylistAdd className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className={clsx(
            'absolute right-0 z-50 w-64 border border-rule bg-tape-2 p-2 text-left text-[14px] text-paper shadow-xl',
            up ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-2 pt-1 pb-2 text-[12px] font-semibold text-dust">{note || 'Add to playlist'}</p>
          <ul className="max-h-56 overflow-y-auto">
            {playlists.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => add(p.id, p.name)}
                  className="flex w-full items-center justify-between px-2 py-2 hover:bg-tape"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[12px] text-dust tnum">{p.count}</span>
                </button>
              </li>
            ))}
            {loaded && !playlists.length ? <li className="px-2 py-1 text-[13px] text-dust">No playlists yet.</li> : null}
          </ul>
          <form
            className="mt-2 flex gap-2 border-t border-rule pt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const id = await create(name);
              if (id) {
                setName('');
                await add(id, name.trim());
              }
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="New playlist"
              aria-label="New playlist name"
              maxLength={120}
              className="h-9 min-w-0 flex-1 border-b border-rule bg-transparent px-1 outline-none focus:border-crank"
            />
            <button type="submit" className="h-9 bg-crank px-3 text-[13px] font-bold text-ink">
              Make
            </button>
          </form>
          <Link href="/playlists" className="mt-2 block px-2 py-1 text-[12px] font-semibold text-dust hover:text-paper">
            All playlists
          </Link>
        </div>
      ) : null}
    </div>
  );
}
