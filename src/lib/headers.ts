import { mediaMimeToExt, type MediaMime } from "./web-assets";

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
  protected?: boolean;
}): Headers {
  const h = securityHeaders({
    "Content-Type": opts.mime,
    "Content-Disposition": `inline; filename="${opts.slug}.${opts.ext}"`,
    "Cache-Control": opts.protected
      ? "private, no-store"
      : "public, max-age=300, s-maxage=300",
    "X-Robots-Tag": "noindex, noimageindex",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": opts.protected ? "same-origin" : "cross-origin",
  });
  if (!opts.protected) {
    h.set("Access-Control-Allow-Origin", "*");
  }
  if (opts.etag) h.set("ETag", opts.etag);
  return h;
}

/**
 * Public Media aliases. CORS is open so sites and @font-face can load /m/... URLs.
 *
 * SVG CSP: when the alias is opened as a document, script/network are denied.
 * `style-src 'unsafe-inline'` keeps sanitized presentation attributes/CSS.
 * `img-src data:` allows only the raster data URLs the sanitizer already permits.
 * `sandbox` without tokens unique-origins the document. `<img src>` / CSS `url()`
 * still render the SVG as an image; those contexts do not execute script.
 * A dedicated asset hostname remains a future production hardening option.
 */
export function mediaAssetResponseHeaders(opts: {
  mime: MediaMime;
  filename: string;
  etag?: string | null;
}): Headers {
  const ext = mediaMimeToExt(opts.mime);
  const safeName = opts.filename.replace(/[^\w.-]+/g, "_").slice(0, 80) || "asset";
  const csp =
    opts.mime === "image/svg+xml"
      ? "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"
      : "default-src 'none'; sandbox";
  const h = securityHeaders({
    "Content-Type": opts.mime === "image/svg+xml" ? "image/svg+xml; charset=utf-8" : opts.mime,
    "Content-Disposition": `inline; filename="${safeName}.${ext}"`,
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "X-Robots-Tag": "noindex, noimageindex",
    "Content-Security-Policy": csp,
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Access-Control-Allow-Origin": "*",
  });
  if (opts.etag) h.set("ETag", opts.etag);
  return h;
}

export function lockedShareCsp(): string {
  return [
    "default-src 'none'",
    "img-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'none'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
