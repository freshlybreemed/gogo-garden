'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { firebaseConfigured, login, signup } from '@/lib/firebase';
import { AUTH_COOKIE, setCookie } from '@/lib/helpers';
import { recordLogin, recordSignup } from '@/app/actions';
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
  if (/not configured/i.test(msg)) return 'Accounts are switched off on this server (no Firebase key). You can still listen.';
  if (/invalid-credential|wrong-password|user-not-found/.test(msg)) return 'That email and password don’t match an account.';
  if (/email-already-in-use/.test(msg)) return 'There’s already an account with that email. Log in instead.';
  if (/weak-password/.test(msg)) return 'Use a password with at least 6 characters.';
  return msg || 'Something went wrong. Try again.';
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const setLoggedIn = useAppStore((s) => s.setLoggedIn);
  const f = useLoginStore(useShallow((s) => s));
  const isSignup = mode === 'signup';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!(f.email && f.password)) {
      f.setError('Enter your email and password.');
      return;
    }
    f.setLoading(true);
    f.setError('');
    try {
      if (isSignup) {
        const result = await signup({ email: f.email, password: f.password });
        const { uid } = result.user;
        await recordSignup({
          _id: uid,
          email: result.user.email ?? f.email,
          firstName: f.firstName,
          lastName: f.lastName,
          phoneNumber: f.phoneNumber,
        });
        setCookie(AUTH_COOKIE, uid);
      } else {
        const result = await login({ email: f.email, password: f.password });
        setCookie(AUTH_COOKIE, result.user.uid);
        if (result.user.email) void recordLogin(result.user.email);
      }
      setLoggedIn(true);
      f.setPassword('');
      router.push('/');
      router.refresh();
    } catch (err) {
      f.setError(friendly(err));
    } finally {
      f.setLoading(false);
    }
  }

  const clear = () => f.error && f.setError('');

  return (
    <div className="mx-auto max-w-[30rem] px-4 pt-8 md:pt-16">
      <h1 className="poster text-[clamp(64px,12vw,112px)] leading-[0.8]">{isSignup ? 'Sign up' : 'Log in'}</h1>
      <p className="mt-3 text-[15px] text-dust">
        {isSignup ? 'Already have an account? ' : 'New here? '}
        <Link href={isSignup ? '/login' : '/signup'} className="font-semibold text-paper underline underline-offset-4 hover:text-crank">
          {isSignup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
      {!firebaseConfigured ? (
        <p className="mt-6 border-l-[3px] border-rule pl-3 text-[14px] text-paper/85">
          Accounts are switched off on this server. Listening works without one.
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
