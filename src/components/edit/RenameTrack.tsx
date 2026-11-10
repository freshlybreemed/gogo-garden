'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { renameTrack } from '@/app/edit/actions';
import { IconPencil } from '../icons';

/** Pencil on an untitled cut ("Part 3"): name it in place. Logged out -> login, then back here. */
export function RenamePencil({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title="Know this song? Name it"
      className="inline-flex h-10 w-8 shrink-0 items-center justify-center text-dust hover:text-leaf-light"
    >
      <IconPencil className="h-[16px] w-[16px]" />
    </button>
  );
}

export function RenameRow({
  showHref,
  trackId,
  placeholder,
  onDone,
}: {
  showHref: string;
  trackId: string;
  placeholder: string;
  onDone: (title: string | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const save = () => {
    const title = value.trim();
    if (!title) return setError('Type the song name.');
    setError('');
    start(async () => {
      const res = await renameTrack(showHref, trackId, title);
      if (res.ok) {
        onDone(title);
        router.refresh();
      } else if (/log in/i.test(res.error)) {
        router.push(`/login?next=${encodeURIComponent(pathname || showHref)}`);
      } else setError(res.error);
    });
  };

  return (
    <form
      className="col-span-2 flex flex-wrap items-center gap-2 py-2 pr-1 pl-11"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={value}
        maxLength={160}
        placeholder={`Song name for ${placeholder}`}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Escape' && onDone(null)}
        aria-label={`Song name for ${placeholder}`}
        className="h-10 min-w-0 flex-1 border border-rule bg-transparent px-2.5 text-[15px] text-paper focus:border-paper focus:outline-none"
      />
      <button type="submit" disabled={pending} className="h-10 bg-paper px-3 text-[14px] font-semibold text-ink disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={() => onDone(null)} className="h-10 px-2 text-[13px] text-dust hover:text-paper">
        Cancel
      </button>
      {error ? <p className="w-full text-[13px] text-[#f08a7a]">{error}</p> : null}
    </form>
  );
}
