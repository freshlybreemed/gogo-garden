import type { Metadata } from 'next';
import { PalaceBrowser } from '@/components/palace/PalaceBrowser';
import { palace } from '@/lib/palace';

export const metadata: Metadata = { title: 'PA Palace' };

/** Search-and-play front-end over PA Palace Music's public catalog; files stream from the source. */
export default function PalacePage() {
  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="mb-4 border-b-[3px] border-paper pb-3">
        <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">PA Palace</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] text-dust">
          Live go-go tapes from{' '}
          <a href={palace.base} target="_blank" rel="noreferrer" className="font-semibold text-paper underline underline-offset-4 hover:text-leaf-light">
            PA Palace Music
          </a>
          . Search and play; each tape links back to the source.
        </p>
      </header>
      <PalaceBrowser tapes={palace.tapes} />
    </div>
  );
}
