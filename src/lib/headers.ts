export function securityHeaders(extra: HeadersInit = {}): Headers {
  const h = new Headers(extra);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("X-Frame-Options", "DENY");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return h;
}

export function sharePageCsp(): string {
  return [
    "default-src 'none'",
    "img-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function imageResponseHeaders(opts: {
  mime: string;
  slug: string;
  ext: string;
  etag?: string | null;
}): Headers {
  const h = securityHeaders({
    "Content-Type": opts.mime,
    "Content-Disposition": `inline; filename="${opts.slug}.${opts.ext}"`,
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "X-Robots-Tag": "noindex, noimageindex",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Access-Control-Allow-Origin": "*",
  });
  if (opts.etag) h.set("ETag", opts.etag);
  return h;
}
