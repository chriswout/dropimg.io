import { IMAGE_SCOPES, type ImageScope } from "../lib/integration-token";
import { siteHtmlResponse } from "./site-page";
import { renderAppShellPage } from "./app-shell";

const SCOPE_LABELS: Record<ImageScope, string> = {
  "images:write": "Upload images",
  "images:read": "Read and list images",
  "images:delete": "Delete images",
};

export function oauthAuthorizeHtmlResponse(opts: {
  env: { ENVIRONMENT?: string };
  email: string;
  clientName: string;
  requested: ImageScope[];
  returnTo: string;
}): Response {
  const requested = opts.requested.length ? opts.requested : [...IMAGE_SCOPES];
  const checks = requested
    .map(
      (scope) =>
        `<label class="integ-scopes"><input type="checkbox" name="scope" value="${scope}" checked /> ${SCOPE_LABELS[scope]}</label>`,
    )
    .join("");

  const main = `<section class="settings-card">
      <p class="settings-eyebrow">Connect DropIMG</p>
      <h1 class="settings-value settings-value-lg">${esc(opts.clientName)}</h1>
      <p class="account-muted">Signed in as ${esc(opts.email)}. This client can use the scopes you keep checked.</p>
      <form method="post" action="/oauth/authorize">
        <input type="hidden" name="return_to" value="${esc(opts.returnTo)}" />
        <fieldset class="integ-scopes">${checks}</fieldset>
        <div class="settings-actions">
          <button type="submit" name="decision" value="allow" class="btn primary">Connect</button>
          <button type="submit" name="decision" value="deny" class="btn secondary">Cancel</button>
        </div>
      </form>
    </section>`;

  return siteHtmlResponse(
    renderAppShellPage({
      locale: "en",
      env: opts.env,
      section: "integrations",
      title: "Connect DropIMG — dropimg.io",
      plan: "free",
      main,
    }),
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
