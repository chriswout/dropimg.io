export function renderLockedSharePage(opts: {
  slug: string;
  origin: string;
  error?: string;
}): string {
  const pageUrl = `${opts.origin}/${opts.slug}`;
  const og = `${opts.origin}/og.png`;
  const err = opts.error
    ? `<p class="err">${esc(opts.error)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected image — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:title" content="Protected image on dropimg.io" />
  <meta property="og:image" content="${esc(og)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:image" content="${esc(og)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root {
      --bg: #07101c;
      --surface: #0f1b2e;
      --text: #e8eef7;
      --muted: #8b9bb4;
      --border: rgba(255,255,255,.12);
      --blue: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      color: var(--text);
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
    .report:hover { color: #fff; }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      padding-left: max(1.5rem, env(safe-area-inset-left));
      padding-right: max(1.5rem, env(safe-area-inset-right));
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.6rem; }
    p { color: var(--muted); }
    form { display: flex; flex-direction: column; gap: 0.55rem; width: min(22rem, 100%); }
    input {
      min-height: 44px;
      border-radius: 11px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: inherit;
      padding: 0.65rem 0.85rem;
      font: inherit;
    }
    button {
      min-height: 44px;
      border: 0;
      border-radius: 11px;
      background: var(--blue);
      color: #fff;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }
    .err { color: #f87171; }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/" aria-label="dropimg.io home">
      <img
        class="brand-logo"
        src="/brand/logo-dark-32.png"
        srcset="/brand/logo-dark-32.png 1x, /brand/logo-dark-64.png 2x"
        width="134"
        height="32"
        alt="dropimg.io"
        decoding="async"
      />
    </a>
    <a class="report" href="/abuse?slug=${esc(opts.slug)}">Report</a>
  </header>
  <main>
    <h1>Protected image</h1>
    <p>Enter the password to view this image.</p>
    ${err}
    <form method="post" action="/api/i/${esc(opts.slug)}/unlock" autocomplete="current-password">
      <input type="password" name="password" required minlength="8" autofocus />
      <button type="submit">Unlock</button>
    </form>
  </main>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
