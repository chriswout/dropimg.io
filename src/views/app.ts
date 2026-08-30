import type { Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

export type AppDrop = {
  slug: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  created_at: number;
  expires_at: number;
  locked?: number;
};

type Copy = {
  title: string;
  heading: string;
  empty: string;
  emptyHint: string;
  uploadCta: string;
  upgrade: string;
  freeNote: string;
  proNote: string;
  expires: string;
  left: (d: number, h: number) => string;
  leftHours: (h: number) => string;
  leftMins: (m: number) => string;
  soon: string;
  locked: string;
  delete: string;
  copy: string;
  copied: string;
  open: string;
  moreActions: string;
  confirmTitle: string;
  confirmBody: string;
  cancel: string;
  more: string;
  skip: string;
  shareUrlLabel: string;
  count: (n: number) => string;
  grid: string;
  list: string;
  viewAria: string;
  extend: string;
  password: string;
  removePassword: string;
  passwordHint: string;
  save: string;
  passwordRemoveFail: string;
  passwordSaveFail: string;
  passwordShort: string;
};

export const APP_COPY: Record<Locale, Copy> = {
  en: {
    title: "My drops — dropimg.io",
    heading: "My drops",
    empty: "Your drops will show up here.",
    emptyHint:
      "Upload an image from DropIMG, the browser extension, or ShareX and it will appear here.",
    uploadCta: "Upload image",
    upgrade: "Upgrade",
    freeNote: "Free · Last 10 active uploads",
    proNote: "PRO · Full active history",
    expires: "Expires",
    left: (d, h) => `${d}d ${h}h left`,
    leftHours: (h) => `${h}h left`,
    leftMins: (m) => `${m}m left`,
    soon: "soon",
    locked: "Locked",
    delete: "Delete",
    copy: "Copy",
    copied: "Copied",
    open: "Open",
    moreActions: "More",
    confirmTitle: "Delete this image?",
    confirmBody: "The link will stop working. This cannot be undone.",
    cancel: "Cancel",
    more: "Older drops",
    skip: "Skip to my drops",
    shareUrlLabel: "Share URL",
    count: (n) => (n === 1 ? "1 drop" : `${n} drops`),
    grid: "Cards",
    list: "List",
    viewAria: "Layout",
    extend: "Extend",
    password: "Password",
    removePassword: "Remove",
    passwordHint: "At least 8 characters.",
    save: "Save",
    passwordRemoveFail: "Could not remove the password.",
    passwordSaveFail: "Could not save the password.",
    passwordShort: "Password must be at least 8 characters.",
  },
  es: {
    title: "Mis envíos — dropimg.io",
    heading: "Mis envíos",
    empty: "Tus envíos aparecerán aquí.",
    emptyHint:
      "Sube una imagen desde DropIMG, la extensión del navegador o ShareX y se verá aquí.",
    uploadCta: "Subir imagen",
    upgrade: "Mejorar",
    freeNote: "Gratis · Últimos 10 envíos activos",
    proNote: "PRO · Historial activo completo",
    expires: "Caduca",
    left: (d, h) => `${d}d ${h}h restantes`,
    leftHours: (h) => `${h}h restantes`,
    leftMins: (m) => `${m}m restantes`,
    soon: "enseguida",
    locked: "Protegido",
    delete: "Borrar",
    copy: "Copiar",
    copied: "Copiado",
    open: "Abrir",
    moreActions: "Más",
    confirmTitle: "¿Borrar esta imagen?",
    confirmBody: "El enlace dejará de funcionar. No se puede deshacer.",
    cancel: "Cancelar",
    more: "Anteriores",
    skip: "Ir a mis envíos",
    shareUrlLabel: "Enlace para compartir",
    count: (n) => (n === 1 ? "1 envío" : `${n} envíos`),
    grid: "Tarjetas",
    list: "Lista",
    viewAria: "Diseño",
    extend: "Ampliar",
    password: "Contraseña",
    removePassword: "Quitar",
    passwordHint: "Mínimo 8 caracteres.",
    save: "Guardar",
    passwordRemoveFail: "No se pudo quitar la contraseña.",
    passwordSaveFail: "No se pudo guardar la contraseña.",
    passwordShort: "La contraseña debe tener al menos 8 caracteres.",
  },
  "pt-BR": {
    title: "Meus envios — dropimg.io",
    heading: "Meus envios",
    empty: "Seus envios aparecem aqui.",
    emptyHint:
      "Envie uma imagem pelo DropIMG, pela extensão ou pelo ShareX e ela entra nesta lista.",
    uploadCta: "Enviar imagem",
    upgrade: "Assinar",
    freeNote: "Grátis · Últimos 10 envios ativos",
    proNote: "PRO · Histórico ativo completo",
    expires: "Expira",
    left: (d, h) => `${d}d ${h}h restantes`,
    leftHours: (h) => `${h}h restantes`,
    leftMins: (m) => `${m}m restantes`,
    soon: "já já",
    locked: "Protegido",
    delete: "Excluir",
    copy: "Copiar",
    copied: "Copiado",
    open: "Abrir",
    moreActions: "Mais",
    confirmTitle: "Excluir esta imagem?",
    confirmBody: "O link para de funcionar. Não tem como desfazer.",
    cancel: "Cancelar",
    more: "Mais antigos",
    skip: "Ir para meus envios",
    shareUrlLabel: "Link pra compartilhar",
    count: (n) => (n === 1 ? "1 envio" : `${n} envios`),
    grid: "Cards",
    list: "Lista",
    viewAria: "Layout",
    extend: "Estender",
    password: "Senha",
    removePassword: "Remover",
    passwordHint: "Pelo menos 8 caracteres.",
    save: "Salvar",
    passwordRemoveFail: "Não deu pra remover a senha.",
    passwordSaveFail: "Não deu pra salvar a senha.",
    passwordShort: "A senha precisa ter pelo menos 8 caracteres.",
  },
  de: {
    title: "Meine Drops — dropimg.io",
    heading: "Meine Drops",
    empty: "Deine Drops erscheinen hier.",
    emptyHint:
      "Lade ein Bild über DropIMG, die Browser-Erweiterung oder ShareX hoch — dann steht es hier.",
    uploadCta: "Bild hochladen",
    upgrade: "Upgrade",
    freeNote: "Kostenlos · Die 10 neuesten aktiven Uploads",
    proNote: "PRO · Volle aktive Historie",
    expires: "Läuft ab",
    left: (d, h) => `noch ${d}d ${h}h`,
    leftHours: (h) => `noch ${h}h`,
    leftMins: (m) => `noch ${m}m`,
    soon: "gleich",
    locked: "Gesperrt",
    delete: "Löschen",
    copy: "Kopieren",
    copied: "Kopiert",
    open: "Öffnen",
    moreActions: "Mehr",
    confirmTitle: "Dieses Bild löschen?",
    confirmBody: "Der Link funktioniert danach nicht mehr. Das lässt sich nicht rückgängig machen.",
    cancel: "Abbrechen",
    more: "Ältere",
    skip: "Zu meinen Drops",
    shareUrlLabel: "Link zum Teilen",
    count: (n) => (n === 1 ? "1 Drop" : `${n} Drops`),
    grid: "Karten",
    list: "Liste",
    viewAria: "Ansicht",
    extend: "Verlängern",
    password: "Passwort",
    removePassword: "Entfernen",
    passwordHint: "Mindestens 8 Zeichen.",
    save: "Speichern",
    passwordRemoveFail: "Passwort ließ sich nicht entfernen.",
    passwordSaveFail: "Passwort ließ sich nicht speichern.",
    passwordShort: "Passwort muss mindestens 8 Zeichen haben.",
  },
};

export function renderAppPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  email: string;
  plan: string;
  drops: AppDrop[];
  historyCapped: boolean;
  nextCursor: number | null;
  origin: string;
  canExtend?: boolean;
  canPassword?: boolean;
}): string {
  const t = APP_COPY[opts.locale];
  const isPro = opts.plan === "pro";
  const rows =
    opts.drops.length === 0
      ? `<div class="drops-empty">
          <p>${esc(t.empty)}</p>
          <p>${esc(t.emptyHint)}</p>
          <a class="btn primary" href="/">${esc(t.uploadCta)}</a>
        </div>`
      : `<ul class="drop-list">${opts.drops
          .map((d) => {
            const sharePath = `/${d.slug}`;
            const shareUrl = `${opts.origin.replace(/\/$/, "")}${sharePath}`;
            const hostPath = `dropimg.io${sharePath}`;
            return `<li data-slug="${esc(d.slug)}">
        <div class="drop-type" aria-hidden="true">${esc(mimeLabel(d.mime))}</div>
        <div class="drop-main">
          <div class="drop-url-row">
            <input class="drop-url-input" readonly value="${esc(hostPath)}" data-url="${esc(shareUrl)}" title="${esc(shareUrl)}" aria-label="${esc(t.shareUrlLabel)}" />
            <button type="button" class="drop-btn drop-copy" data-copied="${esc(t.copied)}">${esc(t.copy)}</button>
            <a class="drop-btn drop-open" href="${esc(sharePath)}" target="_blank" rel="noopener">${esc(t.open)}</a>
            <details class="drop-more">
              <summary class="drop-btn" aria-label="${esc(t.moreActions)}">•••</summary>
              <div class="drop-more-panel">
                ${opts.canExtend ? `<button type="button" class="drop-btn drop-extend" data-slug="${esc(d.slug)}">${esc(t.extend)}</button>` : ""}
                ${opts.canPassword ? `<button type="button" class="drop-btn drop-pw" data-slug="${esc(d.slug)}" data-locked="${d.locked ? "1" : "0"}">${esc(t.password)}</button>` : ""}
                <button type="button" class="drop-btn drop-del" data-slug="${esc(d.slug)}">${esc(t.delete)}</button>
              </div>
            </details>
          </div>
          <div class="drop-foot">
            <span class="drop-meta">${esc(formatMeta(d))}</span>
            <span class="drop-meta">${esc(formatLeft(d.expires_at, t))}${d.locked ? ` · ${esc(t.locked)}` : ""}</span>
          </div>
        </div>
      </li>`;
          })
          .join("")}</ul>`;

  const notes = [
    isPro ? t.proNote : t.freeNote,
    opts.drops.length ? t.count(opts.drops.length) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const more =
    opts.nextCursor != null
      ? `<p class="drops-more"><a class="btn secondary" href="/app?cursor=${opts.nextCursor}">${esc(t.more)}</a></p>`
      : "";

  const toggle =
    opts.drops.length === 0
      ? ""
      : `<div class="drops-view" role="group" aria-label="${esc(t.viewAria)}">
        <button type="button" class="drops-view-btn" data-view="grid" aria-pressed="false">${esc(t.grid)}</button>
        <button type="button" class="drops-view-btn" data-view="list" aria-pressed="true">${esc(t.list)}</button>
      </div>`;

  const upgrade =
    !isPro
      ? `<p class="drops-upgrade"><a href="/pro">${esc(t.upgrade)}</a></p>`
      : "";

  const main = `<section class="drops-page" data-view="list">
    <header class="drops-head">
      <div class="drops-head-text">
        <h1 class="drops-title">${esc(t.heading)} <span class="plan-pill">${esc(isPro ? "PRO" : "Free")}</span></h1>
        <p class="drops-sub">${esc(notes)}</p>
        ${upgrade}
      </div>
      ${toggle}
    </header>
    ${rows}
    ${more}
  </section>`;

  const extraBody = `<div id="pw-modal" class="modal" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <h2 id="pw-title">${esc(t.password)}</h2>
      <p>${esc(t.passwordHint)}</p>
      <form id="pw-form" class="account-form">
        <label class="sr-only" for="pw-input">${esc(t.password)}</label>
        <input id="pw-input" type="password" minlength="8" required autocomplete="new-password" />
        <p id="pw-error" class="form-error" hidden></p>
        <div class="dialog-actions">
          <button type="button" class="btn secondary" id="pw-cancel">${esc(t.cancel)}</button>
          <button type="button" class="btn secondary" id="pw-remove">${esc(t.removePassword)}</button>
          <button type="submit" class="btn primary" id="pw-save">${esc(t.save)}</button>
        </div>
      </form>
    </div>
  </div>
  <div id="confirm" class="modal" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title">${esc(t.confirmTitle)}</h2>
      <p>${esc(t.confirmBody)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="confirm-cancel">${esc(t.cancel)}</button>
        <button type="button" class="btn danger" id="confirm-ok">${esc(t.delete)}</button>
      </div>
    </div>
  </div>
  <script>
    (function () {
      function track(event) {
        try {
          const body = JSON.stringify({ event: event, client: "web" });
          if (navigator.sendBeacon) navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
        } catch (err) {}
      }
      track("dashboard_open");
      const page = document.querySelector(".drops-page");
      const list = document.querySelector(".drop-list");
      const VIEW_KEY = "dropimg:drops-view";
      function applyView(view) {
        const next = view === "grid" ? "grid" : "list";
        if (page) page.setAttribute("data-view", next);
        document.querySelectorAll(".drops-view-btn").forEach(function (btn) {
          btn.setAttribute("aria-pressed", btn.getAttribute("data-view") === next ? "true" : "false");
        });
        try { localStorage.setItem(VIEW_KEY, next); } catch (err) {}
      }
      document.querySelectorAll(".drops-view-btn").forEach(function (btn) {
        btn.addEventListener("click", function () { applyView(btn.getAttribute("data-view")); });
      });
      try {
        const stored = localStorage.getItem(VIEW_KEY);
        if (stored === "list" || stored === "grid") applyView(stored);
      } catch (err) {}
      const modal = document.getElementById("confirm");
      const cancel = document.getElementById("confirm-cancel");
      const ok = document.getElementById("confirm-ok");
      let slug = "";
      if (list) {
        list.addEventListener("focusin", function (e) {
          if (e.target.classList && e.target.classList.contains("drop-url-input")) e.target.select();
        });
        list.addEventListener("click", async function (e) {
          const copy = e.target.closest(".drop-copy");
          if (copy) {
            const row = copy.closest("li");
            const input = row && row.querySelector(".drop-url-input");
            const url = input ? (input.getAttribute("data-url") || input.value) : "";
            if (!url) return;
            const label = copy.getAttribute("data-label") || copy.textContent;
            copy.setAttribute("data-label", label);
            try {
              await navigator.clipboard.writeText(url);
              copy.textContent = copy.getAttribute("data-copied") || "Copied";
              track("dashboard_copy");
              window.setTimeout(function () { copy.textContent = label; }, 1600);
            } catch (err) {}
            return;
          }
          const extend = e.target.closest(".drop-extend");
          if (extend) {
            const s = extend.getAttribute("data-slug") || "";
            extend.disabled = true;
            try {
              const res = await fetch("/api/account/images/" + encodeURIComponent(s) + "/extend", { method: "POST" });
              if (res.ok) location.reload();
            } catch (err) {}
            extend.disabled = false;
            return;
          }
          const pw = e.target.closest(".drop-pw");
          if (pw) {
            slug = pw.getAttribute("data-slug") || "";
            document.getElementById("pw-modal").hidden = false;
            document.getElementById("pw-input").value = "";
            document.getElementById("pw-input").focus();
            return;
          }
          const del = e.target.closest(".drop-del");
          if (del) {
            slug = del.getAttribute("data-slug") || "";
            modal.hidden = false;
          }
        });
      }
      const pwModal = document.getElementById("pw-modal");
      const pwForm = document.getElementById("pw-form");
      const pwError = document.getElementById("pw-error");
      const pwSave = document.getElementById("pw-save");
      function showPwError(msg) {
        pwError.hidden = !msg;
        pwError.textContent = msg || "";
      }
      document.getElementById("pw-cancel").addEventListener("click", function () { pwModal.hidden = true; showPwError(""); });
      document.getElementById("pw-remove").addEventListener("click", async function () {
        if (!slug) return;
        showPwError("");
        const res = await fetch("/api/account/images/" + encodeURIComponent(slug) + "/password", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: null }),
        });
        if (res.ok) location.reload();
        else showPwError(${JSON.stringify(t.passwordRemoveFail)});
      });
      pwForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!slug) return;
        const password = document.getElementById("pw-input").value;
        if (password.length < 8) {
          showPwError(${JSON.stringify(t.passwordShort)});
          return;
        }
        showPwError("");
        pwSave.disabled = true;
        try {
          const res = await fetch("/api/account/images/" + encodeURIComponent(slug) + "/password", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password }),
          });
          if (res.ok) {
            location.reload();
            return;
          }
          showPwError(${JSON.stringify(t.passwordSaveFail)});
        } catch (err) {
          showPwError(${JSON.stringify(t.passwordSaveFail)});
        }
        pwSave.disabled = false;
      });
      cancel.addEventListener("click", function () { modal.hidden = true; slug = ""; });
      modal.addEventListener("click", function (e) { if (e.target === modal) { modal.hidden = true; slug = ""; } });
      ok.addEventListener("click", async function () {
        if (!slug) return;
        ok.disabled = true;
        try {
          const res = await fetch("/api/account/images/" + encodeURIComponent(slug) + "/delete", { method: "POST" });
          if (!res.ok) throw new Error("fail");
          track("dashboard_delete");
          const row = document.querySelector('li[data-slug="' + slug + '"]');
          if (row) row.remove();
        } catch (err) {}
        ok.disabled = false;
        modal.hidden = true;
        slug = "";
      });
    })();
  </script>`;

  return renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    skipLabel: t.skip,
    stayPath: "/app",
    main,
    extraBody,
  });
}

export function appHtmlResponse(
  opts: Parameters<typeof renderAppPage>[0],
  status = 200,
): Response {
  return siteHtmlResponse(renderAppPage(opts), status);
}

function mimeLabel(mime: string): string {
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WebP";
  if (mime === "image/gif") return "GIF";
  return "IMG";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMeta(d: AppDrop): string {
  const parts = [mimeLabel(d.mime), formatSize(d.size)];
  if (d.width && d.height) parts.push(`${d.width}×${d.height}`);
  return parts.join(" · ");
}

function formatLeft(ts: number, t: Copy): string {
  const ms = ts * 1000 - Date.now();
  if (ms <= 0) return t.soon;
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return t.left(days, hours % 24);
  }
  if (hours >= 1) return t.leftHours(hours);
  return t.leftMins(mins);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
