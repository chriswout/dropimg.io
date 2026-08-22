import { Hono } from "hono";
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
  <style>
    body{margin:0;font-family:Segoe UI,ui-sans-serif,system-ui,sans-serif;background:#F8FAFC;color:#0F172A;line-height:1.55;padding:2rem 1.25rem}
    main{max-width:32rem;margin:0 auto}
    a{color:#2563EB}
    label{display:block;font-weight:650;margin:1rem 0 .35rem}
    input,textarea,select{width:100%;padding:.65rem .75rem;border:1px solid #DCE6F0;border-radius:10px;font:inherit;box-sizing:border-box}
    button{margin-top:1rem;padding:.7rem 1.1rem;border:0;border-radius:10px;background:#2563EB;color:#fff;font:inherit;font-weight:650;cursor:pointer}
    .msg{margin-top:1rem;color:#059669;font-weight:650}
    .err{color:#DC2626}
  </style>
</head>
<body>
  <main>
    <p><a href="/">← dropimg.io</a></p>
    <h1>Report abuse</h1>
    <p>Report illegal or abusive content hosted on dropimg.io. You can also email <a href="mailto:abuse@dropimg.io">abuse@dropimg.io</a>.</p>
    <form id="f">
      <label for="slug">Image slug or URL</label>
      <input id="slug" name="slug" required placeholder="a8Fk2Qr9 or https://dropimg.io/…" />
      <label for="reason">Reason</label>
      <select id="reason" name="reason" required>
        <option value="illegal">Illegal content</option>
        <option value="csam">CSAM / exploitation of minors</option>
        <option value="malware">Malware / phishing</option>
        <option value="copyright">Copyright / DMCA</option>
        <option value="other">Other</option>
      </select>
      <label for="detail">Details (optional)</label>
      <textarea id="detail" name="detail" rows="4" maxlength="2000"></textarea>
      <button type="submit">Submit report</button>
      <p id="out" class="msg" hidden></p>
    </form>
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
