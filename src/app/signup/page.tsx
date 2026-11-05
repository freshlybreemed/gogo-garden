import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign up' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SignupPage({ searchParams }: Props) {
  const q = await searchParams;
  return <AuthForm mode="signup" next={one(q.next)} reason={one(q.reason)} error={one(q.error)} />;
}
