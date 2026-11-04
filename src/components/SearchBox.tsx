'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { IconClose, IconSearch } from './icons';

/** Search input bound to `?q=`; the server renders results for the URL. */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function push(next: string) {
    const q = next.trim();
    startTransition(() => {
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
    });
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        push(value);
      }}
      className="relative"
    >
      <label htmlFor="q" className="sr-only">
        Search bands, songs, shows and venues
      </label>
      <IconSearch className="pointer-events-none absolute top-1/2 left-4 h-6 w-6 -translate-y-1/2 text-ink" />
      <input
        ref={inputRef}
        id="q"
        name="q"
        type="search"
        autoComplete="off"
        autoFocus={!initial}
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          setValue(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => push(v), 220);
        }}
        placeholder="Band, song, venue or date"
        className={clsx(
          'paper h-16 w-full pr-14 pl-14 font-display text-[26px] font-extrabold text-ink uppercase placeholder:text-ink/45',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue('');
            push('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink"
        >
          <IconClose className="h-5 w-5" />
        </button>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {pending ? 'Searching' : ''}
      </span>
      <span
        aria-hidden="true"
        className={clsx('absolute inset-x-0 -bottom-[3px] h-[3px] bg-crank transition-opacity', pending ? 'opacity-100' : 'opacity-0')}
      />
    </form>
  );
}
