import 'server-only';

/**
 * Tell the owner something happened. Sends to whichever is configured:
 * - ALERT_WEBHOOK_URL: a Discord or Slack incoming webhook
 * - MAILGUN_API_KEY + MAILGUN_DOMAIN + ALERT_EMAIL: an email
 * Failures are logged, never thrown: an alert must not break an upload.
 */
export async function alertOwner(subject: string, lines: string[]) {
  const text = [subject, ...lines].join('\n');
  const jobs: Promise<unknown>[] = [];

  const hook = process.env.ALERT_WEBHOOK_URL;
  if (hook) {
    jobs.push(
      fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Discord reads `content`, Slack reads `text`.
        body: JSON.stringify({ content: text.slice(0, 1900), text }),
      }),
    );
  }

  const { MAILGUN_API_KEY: key, MAILGUN_DOMAIN: domain, ALERT_EMAIL: to } = process.env;
  if (key && domain && to) {
    const form = new URLSearchParams({ from: `GoGo Garden <alerts@${domain}>`, to, subject, text });
    jobs.push(
      fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
        body: form,
      }),
    );
  }

  if (!jobs.length) console.warn('[alert] no ALERT_WEBHOOK_URL or Mailgun configured:', subject);
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === 'rejected') console.error('[alert]', r.reason);
}
