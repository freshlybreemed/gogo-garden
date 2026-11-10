import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/FeedbackForm';

export const metadata: Metadata = { title: 'Feedback', description: 'Ideas, bugs, and what you know about the tapes.' };

type Props = { searchParams: Promise<{ from?: string | string[] }> };

export default async function FeedbackPage({ searchParams }: Props) {
  const raw = (await searchParams).from;
  const from = Array.isArray(raw) ? raw[0] : (raw ?? null);
  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Feedback</h1>
      <p className="mt-4 max-w-[56ch] text-[16px] text-dust">
        This garden grows with the people who were there. Ideas, something broken, a tape with the wrong date, who played on what — drop it here.
      </p>
      <FeedbackForm from={from} />
    </div>
  );
}
