import { Hono } from "hono";
import { securityHeaders } from "../lib/headers";
import { isValidSlug } from "../lib/slug";

type Env = {
  Bindings: Cloudflare.Env;
};

export const deletePageRoutes = new Hono<Env>();

/** Recovery delete page — token stays in URL fragment (never sent to server). */
deletePageRoutes.get("/d/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!isValidSlug(slug)) {
    return c.text("Not found", 404);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Delete image — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root{--bg:#F8FAFC;--text:#0F172A;--muted:#64748B;--blue:#2563EB;--danger:#DC2626;--border:#DCE6F0}
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Segoe UI,ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--text);padding:1.5rem;text-align:center}
    .card{max-width:26rem;width:100%;background:#fff;border:1px solid var(--border);border-radius:18px;padding:1.75rem 1.35rem;box-shadow:0 10px 40px rgba(15,23,42,.05)}
    h1{font-size:1.35rem;margin:0 0 .5rem;letter-spacing:-.02em}
    p{color:var(--muted);margin:0 0 1.25rem;line-height:1.5}
    button{appearance:none;border:0;border-radius:11px;padding:.75rem 1.1rem;min-height:44px;font:inherit;font-weight:650;cursor:pointer}
    .danger{background:var(--danger);color:#fff}
    .ghost{background:#fff;border:1px solid var(--border);color:var(--text);margin-top:.5rem}
    a{color:var(--blue)}
    #status{margin-top:1rem;font-weight:650}
  </style>
</head>
<body>
  <div class="card">
    <h1>Delete this image?</h1>
    <p>Slug <strong id="slug-label"></strong>. This cannot be undone. The delete token must be present in the link fragment.</p>
    <button type="button" class="danger" id="btn-del">Delete now</button>
    <div><a class="ghost" href="/" style="display:inline-block;padding:.75rem 1.1rem;text-decoration:none;border-radius:11px;border:1px solid var(--border);margin-top:.5rem">Back to dropimg.io</a></div>
    <p id="status" hidden></p>
  </div>
  <script>
    const slug = ${JSON.stringify(slug)};
    document.getElementById('slug-label').textContent = slug;
    const token = location.hash.replace(/^#/, '');
    const status = document.getElementById('status');
    const btn = document.getElementById('btn-del');
    if (!token) {
      status.hidden = false;
      status.textContent = 'Missing delete token in the link. Open the full delete URL from your upload success screen.';
      btn.disabled = true;
    }
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await fetch('/api/i/' + encodeURIComponent(slug), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      status.hidden = false;
      if (res.ok) {
        status.textContent = 'Image deleted.';
        history.replaceState(null, '', location.pathname);
      } else {
        status.textContent = 'Could not delete. Token may be invalid or the image is already gone.';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: securityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    }),
  });
});
