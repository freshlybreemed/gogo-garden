import { Fragment, type ReactNode } from 'react';

/**
 * Tiny markdown renderer for venue write-ups: paragraphs, ## headings, - lists,
 * > quotes, **bold**, *italic*, [links](https://...). Builds React nodes (no
 * raw HTML), so content from the database can't inject markup.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] && m[2]) {
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-crank underline-offset-4 hover:text-crank">
          {m[1]}
        </a>,
      );
    } else if (m[3]) out.push(<strong key={key}>{m[3]}</strong>);
    else out.push(<em key={key}>{m[4] ?? m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const key = `b${bi}`;
        const heading = block.match(/^(#{1,4})\s+(.*)$/);
        if (heading && lines.length === 1) {
          return (
            <h3 key={key} className="poster mt-8 mb-2 text-[28px] first:mt-0">
              {inline(heading[2], key)}
            </h3>
          );
        }
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={key} className="my-4 list-[square] space-y-1 pl-5 marker:text-crank">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-*]\s+/, ''), `${key}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => l.startsWith('>'))) {
          return (
            <blockquote key={key} className="my-5 border-l-[3px] border-crank pl-4 italic">
              {inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '), key)}
            </blockquote>
          );
        }
        return (
          <p key={key} className="my-4 first:mt-0">
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li ? ' ' : null}
                {inline(l, `${key}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
