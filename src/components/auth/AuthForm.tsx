'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useShallow } from 'zustand/react/shallow';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/nextPath';
import { useAppStore } from '@/stores/AppStore';
import { useLoginStore } from '@/stores/LoginStore';

function Field({
  id,
  label,
  ...input
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-dust">
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...input}
        className="mt-1 h-12 w-full border-b-2 border-rule bg-transparent text-[17px] text-paper outline-none focus:border-crank focus-visible:outline-none"
      />
    </div>
  );
}

function friendly(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.';
  if (/already registered|already been registered/i.test(msg)) return 'There’s already an account with that email. Log in instead.';
  if (/password should be|weak/i.test(msg)) return 'Use a password with at least 6 characters.';
  if (/email not confirmed/i.test(msg)) return 'Confirm your email first: check your inbox for the link.';
  if (/rate limit/i.test(msg)) return 'Too many tries. Wait a minute and try again.';
  return msg || 'Something went wrong. Try again.';
}

export function AuthForm({
  mode,
  next: nextParam,
  reason,
  error: errorParam,
}: {
  mode: 'login' | 'signup';
  next?: string;
  reason?: string;
  error?: string;
}) {
  const next = safeNext(nextParam);
  const nextQuery = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;
  const setLoggedIn = useAppStore((s) => s.setLoggedIn);
  const f = useLoginStore(useShallow((s) => s));
  const isSignup = mode === 'signup';
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!(f.email && f.password)) {
      f.setError('Enter your email and password.');
      return;
    }
    f.setLoading(true);
    f.setError('');
    try {
      const supabase = supabaseBrowser();
      if (isSignup) {
        const fullName = [f.firstName, f.lastName].map((s) => s.trim()).filter(Boolean).join(' ');
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            data: { full_name: fullName || undefined, phone: f.phoneNumber || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation is on: no session until they click the link.
          f.setPassword('');
          f.setError('');
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
      }
      setLoggedIn(true);
      f.setPassword('');
      // Full page load, not router.push: the client router cache can still hold prefetches made while
      // logged out (which the old gate answered with a redirect to /signup), and a fresh request makes
      // sure the new session cookie reaches middleware and the server-rendered layout.
      window.location.assign(next);
      return; // keep the button in its loading state while the page changes
    } catch (err) {
      f.setError(friendly(err));
    }
    f.setLoading(false);
  }

  const clear = () => f.error && f.setError('');

  return (
    <div className="mx-auto max-w-[30rem] px-4 pt-8 md:pt-16">
      <h1 className="poster text-[clamp(64px,12vw,112px)] leading-[0.8]">{isSignup ? 'Sign up' : 'Log in'}</h1>
      {isSignup && reason === 'plays' ? (
        <p role="status" className="mt-4 border-l-[3px] border-crank pl-3 text-[15px] font-semibold text-paper">
          Make a free account to keep listening.
        </p>
      ) : null}
      {!isSignup && errorParam === 'link' ? (
        <p role="alert" className="mt-4 border-l-[3px] border-crank pl-3 text-[15px] text-paper">
          That link expired or was already used. Log in below, or sign up again for a new link.
        </p>
      ) : null}
      <p className="mt-3 text-[15px] text-dust">
        {isSignup ? 'It’s free. Already have an account? ' : 'New here? '}
        <Link href={`${isSignup ? '/login' : '/signup'}${nextQuery}`} className="font-semibold text-paper underline underline-offset-4 hover:text-crank">
          {isSignup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
      {sent ? (
        <p role="status" className="mt-6 border-l-[3px] border-crank pl-3 text-[15px] text-paper">
          Check {f.email || 'your email'} for a confirmation link. Click it and you’re in.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        {isSignup ? (
          <div className="grid grid-cols-2 gap-4">
            <Field id="firstName" label="First name" autoComplete="given-name" value={f.firstName} onChange={(e) => { f.setFirstName(e.currentTarget.value); clear(); }} />
            <Field id="lastName" label="Last name" autoComplete="family-name" value={f.lastName} onChange={(e) => { f.setLastName(e.currentTarget.value); clear(); }} />
          </div>
        ) : null}
        <Field id="email" label="Email" type="email" autoComplete="email" required value={f.email} onChange={(e) => { f.setEmail(e.currentTarget.value); clear(); }} />
        {isSignup ? (
          <Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" value={f.phoneNumber} onChange={(e) => { f.setPhoneNumber(e.currentTarget.value); clear(); }} />
        ) : null}
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          value={f.password}
          onChange={(e) => { f.setPassword(e.currentTarget.value); clear(); }}
        />
        <p role="alert" className="min-h-[1.5em] text-[14px] font-semibold text-crank">
          {f.error}
        </p>
        <button
          type="submit"
          disabled={f.loading}
          className="h-12 w-full bg-crank text-[16px] font-bold text-ink hover:bg-crank-hot disabled:opacity-60"
        >
          {f.loading ? (isSignup ? 'Creating account…' : 'Logging in…') : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
