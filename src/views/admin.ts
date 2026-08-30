import { themeBootScript } from "../../marketing/chrome";
import { securityHeaders } from "../lib/headers";

export function renderAdminLogin(opts: { error?: string }): string {
  const err = opts.error
    ? `<p class="err">${esc(opts.error)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin login — dropimg.io</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="stylesheet" href="/site.css" />
  ${themeBootScript()}
</head>
<body class="page-admin">
  <main class="admin-narrow">
    <h1>Admin</h1>
    <p class="muted">Enter the admin token. It is never shown in the URL.</p>
    ${err}
    <form method="post" action="/admin/login" autocomplete="off">
      <label class="field-label" for="token">Admin token</label>
      <input class="field" id="token" name="token" type="password" required autofocus />
      <button class="btn primary" type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}

export type AdminReportRow = {
  id: number;
  slug: string;
  reason: string;
  detail: string | null;
  created_at: number;
  handled_at: number | null;
  resolution: string | null;
  admin_note: string | null;
  image_live: boolean;
};

export function renderAdminReports(opts: {
  reports: AdminReportRow[];
  message?: string;
}): string {
  const msg = opts.message
    ? `<p class="ok">${esc(opts.message)}</p>`
    : "";
  const rows =
    opts.reports.length === 0
      ? `<tr><td colspan="6">No open reports.</td></tr>`
      : opts.reports
          .map((r) => {
            const when = new Date(r.created_at * 1000).toISOString();
            const status = r.image_live ? "live" : "gone";
            return `<tr>
  <td>${r.id}</td>
  <td><code>${esc(r.slug)}</code></td>
  <td>${esc(r.reason)}</td>
  <td>${esc(r.detail || "—")}</td>
  <td><time datetime="${when}">${when}</time><br/><span class="muted">${status}</span></td>
  <td class="actions">
    <a href="/${esc(r.slug)}" target="_blank" rel="noopener">View image</a>
    <form method="post" action="/admin/reports/${r.id}/remove" style="display:inline">
      <button class="btn primary btn-sm" type="submit"${r.image_live ? "" : " disabled"}>Remove</button>
    </form>
    <form method="post" action="/admin/reports/${r.id}/dismiss" style="display:inline">
      <button class="btn secondary btn-sm" type="submit">Dismiss</button>
    </form>
  </td>
</tr>`;
          })
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reports — dropimg.io admin</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="stylesheet" href="/site.css" />
  ${themeBootScript()}
</head>
<body class="page-admin">
  <header>
    <h1>Open reports</h1>
    <form method="post" action="/admin/logout"><button class="btn secondary btn-sm" type="submit">Sign out</button></form>
  </header>
  ${msg}
  <table>
    <thead>
      <tr><th>ID</th><th>Slug</th><th>Reason</th><th>Detail</th><th>When</th><th>Actions</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="muted">Images are not auto-embedded. Use “View image” deliberately.</p>
</body>
</html>`;
}

export function adminHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: securityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    }),
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
