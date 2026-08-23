type ShareProps = {
  slug: string;
  origin: string;
  mime: string;
  width: number | null;
  height: number | null;
  size: number;
  expiresAt: number;
};

export function renderSharePage(p: ShareProps): string {
  const imageUrl = `${p.origin}/i/${p.slug}`;
  const pageUrl = `${p.origin}/${p.slug}`;
  const expiresIso = new Date(p.expiresAt * 1000).toISOString();
  const expiresFriendly = formatFriendlyExpiry(p.expiresAt);
  const wh =
    p.width && p.height
      ? ` width="${p.width}" height="${p.height}"`
      : "";
  const reportUrl = `${p.origin}/abuse?slug=${encodeURIComponent(p.slug)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Shared image — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#F8FAFC" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:title" content="Shared image on dropimg.io" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <style>
    :root {
      --bg: #F8FAFC;
      --fg: #0F172A;
      --muted: #64748B;
      --blue: #2563EB;
      --cyan: #22D3EE;
      --border: #DCE6F0;
      --surface: #FFFFFF;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: "Segoe UI", "Avenir Next", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif;
      background:
        radial-gradient(circle at 50% 0%, rgba(34,211,238,.08), transparent 35%),
        radial-gradient(circle at 80% 20%, rgba(37,99,235,.05), transparent 40%),
        var(--bg);
      color: var(--fg);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      -webkit-font-smoothing: antialiased;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1.25rem;
      padding-top: max(0.9rem, env(safe-area-inset-top));
      padding-left: max(1.25rem, env(safe-area-inset-left));
      padding-right: max(1.25rem, env(safe-area-inset-right));
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,.72);
      backdrop-filter: blur(8px);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      line-height: 0;
      text-decoration: none;
      border-radius: 8px;
    }
    .brand:focus-visible {
      outline: 2px solid var(--blue);
      outline-offset: 3px;
    }
    .brand-logo {
      display: block;
      height: 28px;
      width: auto;
      max-width: min(148px, 55vw);
    }
    .report {
      color: var(--muted);
      font-size: 0.85rem;
      text-decoration: none;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      padding: 0 0.25rem;
    }
    .report:hover { color: var(--blue); }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem 1rem 2rem;
      padding-left: max(1rem, env(safe-area-inset-left));
      padding-right: max(1rem, env(safe-area-inset-right));
      padding-bottom: max(2rem, env(safe-area-inset-bottom));
      gap: 1.1rem;
    }
    .frame {
      max-width: min(1100px, 100%);
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .frame img {
      display: block;
      max-width: 100%;
      max-height: min(78vh, 78dvh);
      height: auto;
      width: auto;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: 0 14px 44px rgba(15,23,42,.08);
    }
    .meta {
      color: var(--muted);
      font-size: 0.9rem;
      text-align: center;
      line-height: 1.45;
      margin: 0;
      padding: 0 0.5rem;
    }
    .cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      margin-top: 0.15rem;
      padding: 0.7rem 1.2rem;
      border-radius: 11px;
      background: var(--blue);
      color: #fff;
      font-weight: 650;
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(37,99,235,.25);
      width: min(100%, 20rem);
      text-align: center;
    }
    .cta:hover { background: #1D4ED8; }
    .ad-slot {
      width: min(728px, 100%);
      min-height: 90px;
      border: 1px dashed var(--border);
      border-radius: 10px;
      color: var(--muted);
      font-size: 0.75rem;
      display: grid;
      place-items: center;
      margin-top: 0.35rem;
      background: rgba(255,255,255,.5);
    }
    footer {
      padding: 1rem;
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
      text-align: center;
      color: var(--muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      line-height: 1.5;
    }
    footer a { color: var(--muted); text-decoration: none; }
    footer a:hover { color: var(--blue); }
    @media (max-width: 640px) {
      header { padding-inline: max(1rem, env(safe-area-inset-left)); }
      .frame img { border-radius: 10px; max-height: min(70vh, 70dvh); }
      .cta { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/" aria-label="dropimg.io home">
      <img
        class="brand-logo"
        src="/brand/logo-32.png"
        srcset="/brand/logo-32.png 1x, /brand/logo-64.png 2x"
        width="134"
        height="32"
        alt="dropimg.io"
        decoding="async"
      />
    </a>
    <a class="report" href="${esc(reportUrl)}">Report</a>
  </header>
  <main>
    <div class="frame">
      <img src="${esc(imageUrl)}" alt="Shared image"${wh} loading="eager" decoding="async" />
    </div>
    <p class="meta">Expires <time datetime="${expiresIso}">${esc(expiresFriendly)}</time> · temporary link</p>
    <a class="cta" href="/">Share your own image</a>
    <div class="ad-slot" aria-hidden="true"><!-- ad slot reserved --></div>
  </main>
  <footer>
    <a href="/">dropimg.io</a> · links expire in 24 hours · <a href="/privacy.html">Privacy</a>
  </footer>
</body>
</html>`;
}

export function renderGonePage(opts: {
  reason: "missing" | "expired" | "deleted";
}): string {
  const title =
    opts.reason === "deleted"
      ? "This image was deleted"
      : opts.reason === "expired"
        ? "This image has expired"
        : "Image not found";
  const copy =
    opts.reason === "missing"
      ? "No image exists at this link."
      : "Temporary images on dropimg.io are automatically removed after 24 hours.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)} — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#F8FAFC" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root { --bg:#F8FAFC; --fg:#0F172A; --muted:#64748B; --blue:#2563EB; --border:#DCE6F0; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center;
      font-family: "Segoe UI", "Avenir Next", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif;
      background:
        radial-gradient(circle at 50% 0%, rgba(34,211,238,.08), transparent 35%),
        var(--bg);
      color: var(--fg); text-align: center;
      padding: 1.5rem;
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
      -webkit-font-smoothing: antialiased;
    }
    .card {
      max-width: 26rem; width: 100%;
      background: #fff; border: 1px solid var(--border); border-radius: 18px;
      padding: 1.75rem 1.35rem; box-shadow: 0 10px 40px rgba(15,23,42,.05);
    }
    h1 { font-size: 1.4rem; margin: 0 0 0.65rem; letter-spacing: -0.03em; line-height: 1.2; }
    p { color: var(--muted); margin: 0 0 1.35rem; line-height: 1.5; }
    a {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 44px; width: 100%; padding: 0.7rem 1.1rem; border-radius: 11px;
      background: var(--blue); color: #fff; font-weight: 650; text-decoration: none;
      box-shadow: 0 1px 2px rgba(37,99,235,.25);
    }
    a:hover { background: #1D4ED8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${esc(title)}</h1>
    <p>${esc(copy)}</p>
    <a href="/">Share a new image</a>
  </div>
</body>
</html>`;
}

function formatFriendlyExpiry(expiresAt: number): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return "soon";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 23) return "in about 24 hours";
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
