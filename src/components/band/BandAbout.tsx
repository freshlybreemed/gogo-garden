import { SectionHead } from '@/components/cards';
import type { BandModel } from '@/lib/types';

/** Bio, known members and sources for a band, when the write-up exists. */
export function BandAbout({ band }: { band: BandModel }) {
  if (!band.bio && !band.members.length) return null;
  return (
    <section aria-labelledby="about" className="mt-12">
      <SectionHead id="about" title={`About ${band.name}`} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)]">
        <div>
          {band.bio ? <p className="text-[17px] leading-relaxed text-paper">{band.bio}</p> : null}
          {band.founded ? <p className="mt-3 text-[14px] text-dust">Started {band.founded}</p> : null}
        </div>
        {band.members.length ? (
          <div>
            <h3 className="font-display text-[18px] font-extrabold uppercase">Known members</h3>
            <ul className="mt-2 divide-y divide-rule border-y border-rule">
              {band.members.map((m) => (
                <li key={`${m.name}|${m.role}`} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
                  <span className="text-[15px] font-semibold text-paper">{m.name}</span>
                  <span className="text-[13.5px] text-dust">{[m.role, m.years].filter(Boolean).join(', ')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12.5px] text-dust">Lineups changed a lot over the years. Know someone missing? Let us know.</p>
          </div>
        ) : null}
      </div>
      {band.sources.length ? (
        <p className="mt-4 text-[12.5px] text-dust">
          Sources:{' '}
          {band.sources.map((s, i) => (
            <span key={s.url}>
              {i ? ', ' : ''}
              <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-paper">
                {s.title || new URL(s.url).hostname.replace(/^www\./, '')}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
