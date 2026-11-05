'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayerStore } from '@/stores/PlayerStore';
import { FREE_PLAYS } from '@/lib/freePlays';

/** Shown instead of playing once a logged-out listener has used their free plays. */
export function SignupGate() {
  const open = usePlayerStore((s) => s.signupGate);
  const close = usePlayerStore((s) => s.closeSignupGate);
  const pathname = usePathname();
  const primary = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;
  const next = encodeURIComponent(pathname || '/');

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 p-4 md:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-gate-title"
        className="w-full max-w-[26rem] border border-rule bg-tape-2 p-6 text-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="signup-gate-title" className="poster text-[44px] leading-[0.85]">
          Keep it cranking
        </h2>
        <p className="mt-3 text-[15px] text-dust">
          You’ve had your {FREE_PLAYS} free plays. Make a free account to keep listening.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            ref={primary}
            href={`/signup?reason=plays&next=${next}`}
            onClick={close}
            className="flex h-12 items-center justify-center bg-crank text-[16px] font-bold text-ink hover:bg-crank-hot"
          >
            Make a free account
          </Link>
          <Link
            href={`/login?next=${next}`}
            onClick={close}
            className="flex h-11 items-center justify-center text-[15px] font-semibold text-paper underline underline-offset-4 hover:text-crank"
          >
            I already have one: log in
          </Link>
          <button type="button" onClick={close} className="h-10 text-[14px] text-dust hover:text-paper">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
