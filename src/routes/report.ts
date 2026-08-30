import { Hono } from "hono";
import { themeBootScript } from "../../marketing/chrome";
import { securityHeaders } from "../lib/headers";
import { isValidSlug } from "../lib/slug";

type Env = {
  Bindings: Cloudflare.Env;
};

export const reportRoutes = new Hono<Env>();

reportRoutes.post("/api/report", async (c) => {
  let body: { slug?: string; reason?: string; detail?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const slug = (body.slug || "").trim();
  const reason = (body.reason || "").trim().slice(0, 80);
  const detail = (body.detail || "").trim().slice(0, 2000);

  if (!isValidSlug(slug)) {
    return c.json({ error: "Invalid slug" }, 400);
  }
  if (!reason) {
    return c.json({ error: "Reason required" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO reports (slug, reason, detail, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(slug, reason, detail || null, now)
    .run();

  return c.json({ ok: true });
});

/** Minimal HTML form for abuse reports (indexable marketing-adjacent). */
reportRoutes.get("/abuse", async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Report abuse — dropimg.io</title>
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://dropimg.io/abuse" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/site.css" />
  <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
  ${themeBootScript()}
</head>
<body class="page-legal">
  <main class="wrap">
    <a class="brand" href="/" aria-label="dropimg.io home">
      <img class="brand-logo brand-logo-light" src="/brand/logo-32.png" srcset="/brand/logo-32.png 1x, /brand/logo-64.png 2x" width="134" height="32" alt="dropimg.io" decoding="async" />
      <img class="brand-logo brand-logo-dark" src="/brand/logo-dark-32.png" srcset="/brand/logo-dark-32.png 1x, /brand/logo-dark-64.png 2x" width="134" height="32" alt="" decoding="async" aria-hidden="true" />
    </a>
    <h1>Report abuse</h1>
    <p>Report illegal or abusive content hosted on dropimg.io. You can also email <a href="mailto:abuse@dropimg.io">abuse@dropimg.io</a>.</p>
    <form id="f" class="utility-form">
      <label class="field-label" for="slug">Image slug or URL</label>
      <input class="field" id="slug" name="slug" required placeholder="a8Fk2Qr9 or https://dropimg.io/…" />
      <label class="field-label" for="reason">Reason</label>
      <select class="field" id="reason" name="reason" required>
        <option value="illegal">Illegal content</option>
        <option value="csam">CSAM / exploitation of minors</option>
        <option value="malware">Malware / phishing</option>
        <option value="copyright">Copyright / DMCA</option>
        <option value="other">Other</option>
      </select>
      <label class="field-label" for="detail">Details (optional)</label>
      <textarea class="field" id="detail" name="detail" rows="4" maxlength="2000"></textarea>
      <button class="btn primary" type="submit">Submit report</button>
      <p id="out" class="msg" role="status" hidden></p>
    </form>
    <nav class="foot-nav" aria-label="Legal">
      <a href="/">Home</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Use</a>
      <a href="/contact">Contact</a>
    </nav>
  </main>
  <script>
    const f = document.getElementById('f');
    const out = document.getElementById('out');
    const slugInput = document.getElementById('slug');
    const q = new URLSearchParams(location.search).get('slug');
    if (q) slugInput.value = q;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      out.hidden = true;
      let slug = document.getElementById('slug').value.trim();
      const m = slug.match(/\\/([A-Za-z0-9]{8})\\/?$/);
      if (m) slug = m[1];
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          reason: document.getElementById('reason').value,
          detail: document.getElementById('detail').value
        })
      });
      out.hidden = false;
      if (res.ok) {
        out.className = 'msg';
        out.textContent = 'Report received. Thank you.';
        f.reset();
      } else {
        const j = await res.json().catch(() => ({}));
        out.className = 'msg err';
        out.textContent = j.error || 'Could not submit report.';
      }
    });
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: securityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    }),
  });
});
