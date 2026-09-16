import { renderAppShellPage } from "./app-shell";
import { siteHtmlResponse } from "./site-page";

export function mediaHtmlResponse(opts: {
  locale: "en" | "es" | "pt-BR" | "de";
  env: { ENVIRONMENT?: string; MEDIA_ENABLED?: string };
  plan: "free" | "pro";
  origin: string;
}): Response {
  const main = `<section class="settings-card">
      <p class="settings-eyebrow">Web Assets</p>
      <p>My Drops are temporary screenshots and links that expire. Media is permanent Web Assets for a website or app — logos, heroes, favicons, illustrations, and web fonts — at a URL that stays the same when you replace the file.</p>
      <p class="account-muted">Stable URL: <code>${esc(opts.origin)}/m/{org}/{project}/…</code>. Anyone with the URL can fetch the file.</p>
    </section>
    <section class="settings-card" id="media-org-card">
      <h2>Organization</h2>
      <p id="media-org" class="account-muted">Loading…</p>
    </section>
    <section class="settings-card">
      <h2>Projects</h2>
      <p class="account-muted">One project per website, landing page, client, or storefront.</p>
      <form id="media-create-project" class="media-create">
        <label>
          Name
          <input name="name" maxlength="80" placeholder="Website" required />
        </label>
        <label>
          Slug
          <input name="slug" maxlength="48" placeholder="website" required pattern="[a-z0-9][a-z0-9-]*" />
        </label>
        <button type="submit" class="btn primary">Create project</button>
      </form>
      <p id="media-project-error" class="account-muted" hidden></p>
      <ul id="media-projects" class="integ-list"></ul>
    </section>
    <section class="settings-card" id="media-project-panel" hidden>
      <h2 id="media-project-title">Project</h2>
      <p id="media-project-url" class="account-muted"></p>
      <div class="media-tabs" role="tablist">
        <button type="button" class="btn secondary btn-sm" data-tab="assets">Assets</button>
        <button type="button" class="btn secondary btn-sm" data-tab="keys">API keys</button>
        <button type="button" class="btn secondary btn-sm" data-tab="connect">Connect AI</button>
        <button type="button" class="btn secondary btn-sm" data-tab="docs">Documentation</button>
      </div>
      <div id="media-tab-assets" class="media-tab">
        <ul id="media-assets" class="integ-list"></ul>
        <p id="media-assets-empty" class="account-muted">No assets yet. Use REST or MCP to upload.</p>
      </div>
      <div id="media-tab-keys" class="media-tab" hidden>
        <form id="media-create-key" class="media-create">
          <label>
            Label
            <input name="label" maxlength="40" placeholder="Cursor" required />
          </label>
          <button type="submit" class="btn primary">Create key</button>
        </form>
        <ul id="media-keys" class="integ-list"></ul>
      </div>
      <div id="media-tab-connect" class="media-tab" hidden>
        <div id="media-connect"></div>
      </div>
      <div id="media-tab-docs" class="media-tab" hidden>
        <h3>REST</h3>
        <p>Create a project, mint a <code>dropimg_pk_*</code> key, then:</p>
        <pre id="media-rest-snippet" class="media-snippet"></pre>
        <p>Replacement keeps the same <code>/m/…</code> URL. Delete the asset before you can close the account if this is your last live file.</p>
      </div>
    </section>
    <div id="media-token-modal" class="modal" hidden>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Copy this key now</h2>
        <p>It will not be shown again.</p>
        <pre id="media-token-value" class="media-snippet"></pre>
        <button type="button" class="btn primary" id="media-token-done">Done</button>
      </div>
    </div>
    <script>${mediaScript(opts.origin)}</script>`;

  const html = renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "media",
    title: "Media — dropimg.io",
    plan: opts.plan,
    main,
  });
  return siteHtmlResponse(html);
}

function mediaScript(origin: string): string {
  return `(() => {
      const origin = ${JSON.stringify(origin)};
      const jsonHeaders = { "Content-Type": "application/json" };
      let org = null;
      let selected = null;

      const el = (id) => document.getElementById(id);
      const showError = (id, msg) => {
        const node = el(id);
        if (!node) return;
        node.hidden = !msg;
        node.textContent = msg || "";
      };

      async function api(path, opts) {
        const res = await fetch(path, { credentials: "same-origin", ...opts });
        const body = await res.json().catch(() => ({}));
        return { res, body };
      }

      async function bootstrap() {
        let orgRes = await api("/api/v1/media/orgs");
        if (orgRes.res.status === 401) {
          location.href = "/login";
          return;
        }
        if (!orgRes.body.orgs || !orgRes.body.orgs.length) {
          orgRes = await api("/api/v1/media/orgs", { method: "POST", headers: jsonHeaders, body: "{}" });
        }
        org = (orgRes.body.org || (orgRes.body.orgs && orgRes.body.orgs[0])) || null;
        if (!org) {
          el("media-org").textContent = "Could not load organization.";
          return;
        }
        el("media-org").textContent = org.name + " · " + org.slug;
        await loadProjects();
      }

      async function loadProjects() {
        const { body } = await api("/api/v1/media/orgs/" + org.id + "/projects");
        const list = el("media-projects");
        list.innerHTML = "";
        (body.projects || []).forEach((project) => {
          const item = document.createElement("li");
          item.className = "integ-row";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn secondary";
          btn.textContent = project.name + " · " + project.slug;
          btn.addEventListener("click", () => selectProject(project));
          item.appendChild(btn);
          list.appendChild(item);
        });
      }

      async function selectProject(project) {
        selected = project;
        el("media-project-panel").hidden = false;
        el("media-project-title").textContent = project.name;
        el("media-project-url").textContent = project.url;
        showTab("assets");
        await Promise.all([loadAssets(), loadKeys(), renderConnect()]);
      }

      function showTab(name) {
        ["assets", "keys", "connect", "docs"].forEach((tab) => {
          const node = el("media-tab-" + tab);
          if (node) node.hidden = tab !== name;
        });
      }

      async function loadAssets() {
        const { body } = await api("/api/v1/media/projects/" + selected.id + "/assets");
        const list = el("media-assets");
        list.innerHTML = "";
        const assets = body.assets || [];
        el("media-assets-empty").hidden = assets.length > 0;
        assets.forEach((asset) => {
          const item = document.createElement("li");
          item.className = "integ-row";
          item.innerHTML = "<div><strong>" + escapeHtml(asset.path) + "</strong><br><code>" + escapeHtml(asset.url) + "</code></div>";
          const del = document.createElement("button");
          del.type = "button";
          del.className = "btn danger btn-sm";
          del.textContent = "Delete";
          del.addEventListener("click", async () => {
            if (!confirm("Delete this asset? The public URL will stop serving.")) return;
            await api("/api/v1/media/assets/" + asset.id, { method: "DELETE" });
            await loadAssets();
          });
          item.appendChild(del);
          list.appendChild(item);
        });
      }

      async function loadKeys() {
        const { body } = await api("/api/v1/media/projects/" + selected.id + "/keys");
        const list = el("media-keys");
        list.innerHTML = "";
        (body.keys || []).forEach((key) => {
          const item = document.createElement("li");
          item.className = "integ-row";
          const meta = document.createElement("div");
          meta.innerHTML = "<strong>" + escapeHtml(key.label) + "</strong> · " + escapeHtml(key.prefix) + " · " + escapeHtml(key.status);
          item.appendChild(meta);
          if (key.status === "active") {
            const revoke = document.createElement("button");
            revoke.type = "button";
            revoke.className = "btn danger btn-sm";
            revoke.textContent = "Revoke";
            revoke.addEventListener("click", async () => {
              await api("/api/v1/media/projects/" + selected.id + "/keys/" + key.id + "/revoke", {
                method: "POST",
                headers: jsonHeaders,
                body: "{}",
              });
              await loadKeys();
            });
            item.appendChild(revoke);
          }
          list.appendChild(item);
        });
      }

      function renderConnect() {
        const snippet = [
          "curl -X POST " + origin + "/api/v1/media/projects/" + selected.id + "/assets \\\\",
          "  -H \\"Authorization: Bearer dropimg_pk_…\\" \\\\",
          "  -F path=logo \\\\",
          "  -F file=@logo.png",
        ].join("\\n");
        el("media-rest-snippet").textContent = snippet;
        el("media-connect").innerHTML = [
          "<h3>REST</h3><p>Bearer <code>dropimg_pk_*</code> on <code>/api/v1/media</code>. See the Documentation tab.</p>",
          "<h3>Cursor</h3><pre class=\\"media-snippet\\">" + escapeHtml(JSON.stringify({
            mcpServers: {
              dropimg: {
                url: origin + "/mcp",
                headers: { Authorization: "Bearer dropimg_pk_YOUR_KEY" },
              },
            },
          }, null, 2)) + "</pre>",
          "<h3>Claude Code</h3><pre class=\\"media-snippet\\">claude mcp add --transport http dropimg " + origin + "/mcp --header \\"Authorization: Bearer dropimg_pk_YOUR_KEY\\"</pre>",
          "<h3>Codex</h3><pre class=\\"media-snippet\\">codex mcp add dropimg --url " + origin + "/mcp --header \\"Authorization: Bearer dropimg_pk_YOUR_KEY\\"</pre>",
          "<h3>MCP tools</h3><p><code>list_media_projects</code>, <code>create_media_project</code>, <code>list_media_assets</code>, <code>get_media_asset</code>, <code>upload_media_asset</code>, <code>replace_media_asset</code> (confirm: true). Upload bytes over HTTP using the returned intent. Drop tools stay <code>upload_image</code> / <code>get_image</code> / <code>list_images</code> / <code>delete_image</code>.</p>",
        ].join("");
      }

      function escapeHtml(value) {
        return String(value).replace(/[&<>\\"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      }

      el("media-create-project").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const { res, body } = await api("/api/v1/media/orgs/" + org.id + "/projects", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ name: data.get("name"), slug: data.get("slug") }),
        });
        if (!res.ok) {
          showError("media-project-error", body.error || "Could not create project");
          return;
        }
        showError("media-project-error", "");
        e.currentTarget.reset();
        await loadProjects();
        await selectProject(body.project);
      });

      el("media-create-key").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const { res, body } = await api("/api/v1/media/projects/" + selected.id + "/keys", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ label: data.get("label") }),
        });
        if (!res.ok) return;
        e.currentTarget.reset();
        el("media-token-value").textContent = body.token;
        el("media-token-modal").hidden = false;
        await loadKeys();
        renderConnect();
      });

      el("media-token-done").addEventListener("click", () => {
        el("media-token-modal").hidden = true;
      });

      document.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
      });

      bootstrap();
    })();`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
