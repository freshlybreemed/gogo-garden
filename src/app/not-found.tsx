import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="px-4 pt-10 md:px-8 md:pt-16">
      <h1 className="poster text-[clamp(64px,12vw,140px)] leading-[0.8]">Not in the crate</h1>
      <p className="mt-4 max-w-[52ch] text-[16px] text-dust">
        That band, show or venue isn&rsquo;t in the library. The link may be from before the last import.
      </p>
      <p className="mt-6 flex gap-5 text-[15px] font-semibold">
        <Link href="/" className="underline underline-offset-4 hover:text-crank">Home</Link>
        <Link href="/search" className="underline underline-offset-4 hover:text-crank">Search</Link>
      </p>
    </div>
  );
}
