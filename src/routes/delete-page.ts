import { Hono } from "hono";
import { themeBootScript } from "../../marketing/chrome";
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
  <link rel="stylesheet" href="/site.css" />
  <meta name="theme-color" content="#F7F7FB" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0B0E17" media="(prefers-color-scheme: dark)" />
  ${themeBootScript()}
</head>
<body class="page-utility">
  <main class="utility-card">
    <h1>Delete this image?</h1>
    <p>Slug <strong id="slug-label"></strong>. This cannot be undone. The delete token must be present in the link fragment.</p>
    <div class="utility-actions">
      <button type="button" class="btn danger" id="btn-del">Delete now</button>
      <a class="btn secondary" href="/">Back to dropimg.io</a>
    </div>
    <p id="status" class="utility-status" role="status" hidden></p>
  </main>
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
