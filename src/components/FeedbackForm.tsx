'use client';

import { useState, useTransition } from 'react';
import clsx from 'clsx';
import { sendFeedback } from '@/app/feedback/actions';

const KINDS = [
  { v: 'idea', label: 'Idea' },
  { v: 'bug', label: 'Something’s broken' },
  { v: 'music', label: 'Music info' },
  { v: 'other', label: 'Other' },
];
const field = 'w-full border border-rule bg-transparent px-3 py-2.5 text-[16px] text-paper focus:border-paper focus:outline-none';

export function FeedbackForm({ from }: { from: string | null }) {
  const [kind, setKind] = useState('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (state?.ok) {
    return (
      <div className="mt-8 max-w-[40rem] border-[3px] border-leaf/70 p-6">
        <p className="poster text-[34px]">Got it. Thank you.</p>
        <p className="mt-2 text-[15px] text-dust">Every note gets read. If you left a way to reach you, we may follow up.</p>
        <button type="button" onClick={() => { setState(null); setMessage(''); }} className="mt-4 text-[14px] font-semibold text-paper underline underline-offset-4">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-8 grid max-w-[40rem] gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setState(null);
        start(async () => {
          const res = await sendFeedback({ kind, message, contact, page: from ?? '', website });
          setState(res.ok ? { ok: true, text: '' } : { ok: false, text: res.error });
        });
      }}
    >
      <fieldset>
        <legend className="text-[13px] font-semibold text-dust">What’s it about?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k.v} className={clsx('cursor-pointer border px-3 py-2 text-[14px] font-semibold', kind === k.v ? 'border-crank text-paper' : 'border-rule text-dust')}>
              <input type="radio" name="kind" value={k.v} checked={kind === k.v} onChange={() => setKind(k.v)} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-[13px] font-semibold text-dust">
        Your note
        <textarea
          required
          rows={6}
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder={kind === 'music' ? 'That tape is mislabeled, here’s who was on keys, I have the rest of this show…' : 'Tell us what you think, what’s missing, or what broke.'}
          className={`${field} mt-1`}
        />
      </label>
      <label className="block text-[13px] font-semibold text-dust">
        How to reach you (optional)
        <input value={contact} maxLength={200} onChange={(e) => setContact(e.currentTarget.value)} placeholder="Email or @handle" className={`${field} mt-1`} />
      </label>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.currentTarget.value)} className="hidden" name="website" />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="h-12 bg-crank px-6 text-[16px] font-bold text-ink hover:bg-crank-hot disabled:opacity-60">
          {pending ? 'Sending…' : 'Send it'}
        </button>
        {state && !state.ok ? <p role="alert" className="text-[14px] font-semibold text-crank">{state.text}</p> : null}
      </div>
    </form>
  );
}
