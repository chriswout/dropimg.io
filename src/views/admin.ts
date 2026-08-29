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
  <style>
    body{margin:0;font-family:Segoe UI,ui-sans-serif,system-ui,sans-serif;background:#F8FAFC;color:#0F172A;padding:2rem 1.25rem}
    main{max-width:22rem;margin:0 auto}
    label{display:block;font-weight:650;margin:1rem 0 .35rem}
    input{width:100%;padding:.65rem .75rem;border:1px solid #DCE6F0;border-radius:10px;font:inherit;box-sizing:border-box}
    button{margin-top:1rem;padding:.7rem 1.1rem;border:0;border-radius:10px;background:#2563EB;color:#fff;font:inherit;font-weight:650;cursor:pointer}
    .err{color:#DC2626;font-weight:650}
  </style>
</head>
<body>
  <main>
    <h1>Admin</h1>
    <p>Enter the admin token. It is never shown in the URL.</p>
    ${err}
    <form method="post" action="/admin/login" autocomplete="off">
      <label for="token">Admin token</label>
      <input id="token" name="token" type="password" required autofocus />
      <button type="submit">Sign in</button>
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
      <button type="submit"${r.image_live ? "" : " disabled"}>Remove</button>
    </form>
    <form method="post" action="/admin/reports/${r.id}/dismiss" style="display:inline">
      <button type="submit" class="secondary">Dismiss</button>
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
  <style>
    body{margin:0;font-family:Segoe UI,ui-sans-serif,system-ui,sans-serif;background:#F8FAFC;color:#0F172A;padding:1.5rem}
    header{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}
    table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #DCE6F0;border-radius:12px;overflow:hidden;font-size:.9rem}
    th,td{padding:.65rem .75rem;border-bottom:1px solid #E8EEF5;text-align:left;vertical-align:top}
    th{background:#F1F5F9;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
    button{padding:.4rem .7rem;border:0;border-radius:8px;background:#2563EB;color:#fff;font:inherit;font-weight:650;cursor:pointer}
    button:disabled{opacity:.45;cursor:not-allowed}
    button.secondary{background:#64748B}
    a{color:#2563EB}
    .ok{color:#059669;font-weight:650}
    .muted{color:#64748B;font-size:.8rem}
    .actions{white-space:nowrap}
    .actions form{margin-left:.35rem}
  </style>
</head>
<body>
  <header>
    <h1>Open reports</h1>
    <form method="post" action="/admin/logout"><button type="submit" class="secondary">Sign out</button></form>
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
