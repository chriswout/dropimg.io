const ALLOWED_HOSTS = new Set([
  "dropimg.io",
  "www.dropimg.io",
  "dropimg-staging.christenwout.workers.dev",
  "127.0.0.1",
  "localhost",
]);

/** Same-origin check for cookie-authenticated state changes (SameSite=Lax). */
export function csrfOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) return hostAllowed(origin);
  const referer = req.headers.get("referer");
  if (referer) return hostAllowed(referer);
  return false;
}

function hostAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    if (u.hostname.endsWith(".workers.dev") && u.hostname.includes("dropimg")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
