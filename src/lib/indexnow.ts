/**
 * IndexNow notifier for marketing-page publishes.
 * Call when landing pages change — never for user image URLs.
 *
 * Set INDEXNOW_KEY via wrangler secret / .dev.vars once registered at indexnow.org.
 */

export async function notifyIndexNow(
  urls: string[],
  opts: { key: string; host?: string },
): Promise<void> {
  if (!opts.key || urls.length === 0) return;
  const host = opts.host ?? "dropimg.io";
  const body = {
    host,
    key: opts.key,
    keyLocation: `https://${host}/${opts.key}.txt`,
    urlList: urls,
  };
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch {
    // Best-effort; never fail a deploy/request on IndexNow
  }
}
