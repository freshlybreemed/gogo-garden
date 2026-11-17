import { SectionHead } from '@/components/cards';
import { AboutEditor } from '@/components/edit/AboutEditor';
import type { BandModel } from '@/lib/types';

/** "@handle" -> Instagram; a URL stays a URL. Label is the handle or the site name. */
function socialLink(social: string) {
  if (social.startsWith('@')) return { href: `https://instagram.com/${social.slice(1)}`, label: social };
  try {
    const u = new URL(social);
    const host = u.hostname.replace(/^www\./, '');
    const handle = u.pathname.split('/').filter(Boolean)[0];
    return { href: u.toString(), label: handle && /instagram|tiktok|x\.com|twitter|threads/.test(host) ? `@${handle.replace(/^@/, '')}` : host };
  } catch {
    return null;
  }
}

/** Bio, known members and sources for a band, plus the community editor. */
export function BandAbout({ band, signedIn }: { band: BandModel; signedIn: boolean }) {
  const empty = !band.bio && !band.members.length;
  return (
    <section aria-labelledby="about" className="mt-12">
      <SectionHead id="about" title={`About ${band.name}`} />
      {empty ? (
        <p className="text-[15px] text-dust">No write-up yet. Help fill in who played in {band.name} and when.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)]">
          <div>
            {band.bio ? <p className="text-[17px] leading-relaxed whitespace-pre-line text-paper">{band.bio}</p> : null}
            {band.founded ? <p className="mt-3 text-[14px] text-dust">Started {band.founded}</p> : null}
          </div>
          {band.members.length ? (
            <div>
              <h3 className="font-display text-[18px] font-extrabold uppercase">Known members</h3>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {band.members.map((m) => {
                  const link = m.social ? socialLink(m.social) : null;
                  return (
                    <li key={`${m.name}|${m.role}`} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
                      <span className="text-[15px] font-semibold text-paper">
                        {m.name}
                        {link ? (
                          <a href={link.href} target="_blank" rel="noreferrer" className="ml-2 text-[13px] font-normal text-leaf-light underline-offset-2 hover:underline">
                            {link.label}
                          </a>
                        ) : null}
                      </span>
                      <span className="text-[13.5px] text-dust">{[m.role, m.years].filter(Boolean).join(', ')}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12.5px] text-dust">Lineups changed a lot over the years.</p>
            </div>
          ) : null}
        </div>
      )}
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
      <AboutEditor
        bandId={band.id}
        bandName={band.name}
        bio={band.bio}
        founded={band.founded}
        members={band.members}
        image={band.image}
        photos={band.photos}
        signedIn={signedIn}
      />
    </section>
  );
}
