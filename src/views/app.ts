import type { Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

export type AppDrop = {
  slug: string;
  mime: string;
  size: number;
  created_at: number;
  expires_at: number;
  locked?: number;
};

type Copy = {
  title: string;
  heading: string;
  empty: string;
  expires: string;
  delete: string;
  copy: string;
  copied: string;
  confirmTitle: string;
  confirmBody: string;
  cancel: string;
  capNote: string;
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
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "My drops — dropimg.io",
    heading: "My drops",
    empty: "No images in this account yet. Upload from the homepage — signed-in drops show up here.",
    expires: "Expires",
    delete: "Delete",
    copy: "Copy",
    copied: "Copied",
    confirmTitle: "Delete this image?",
    confirmBody: "The link will stop working. This cannot be undone.",
    cancel: "Cancel",
    capNote: "Showing your 10 most recent drops.",
    more: "Older drops",
    skip: "Skip to my drops",
    shareUrlLabel: "Share URL",
    count: (n) => (n === 1 ? "1 drop" : `${n} drops`),
    grid: "Grid",
    list: "List",
    viewAria: "Layout",
    extend: "Extend",
    password: "Password",
    removePassword: "Remove",
    passwordHint: "At least 8 characters.",
    save: "Save",
  },
  es: {
    title: "Mis envíos — dropimg.io",
    heading: "Mis envíos",
    empty: "Aún no hay imágenes en esta cuenta. Súbelas desde la portada; las que envíes con sesión aparecen aquí.",
    expires: "Caduca",
    delete: "Borrar",
    copy: "Copiar",
    copied: "Copiado",
    confirmTitle: "¿Borrar esta imagen?",
    confirmBody: "El enlace dejará de funcionar. No se puede deshacer.",
    cancel: "Cancelar",
    capNote: "Mostramos tus 10 envíos más recientes.",
    more: "Anteriores",
    skip: "Ir a mis envíos",
    shareUrlLabel: "Enlace para compartir",
    count: (n) => (n === 1 ? "1 envío" : `${n} envíos`),
    grid: "Cuadrícula",
    list: "Lista",
    viewAria: "Diseño",
    extend: "Ampliar",
    password: "Contraseña",
    removePassword: "Quitar",
    passwordHint: "Mínimo 8 caracteres.",
    save: "Guardar",
  },
  "pt-BR": {
    title: "Meus envios — dropimg.io",
    heading: "Meus envios",
    empty: "Ainda não tem imagem nesta conta. Envie pela home — o que você mandar logado aparece aqui.",
    expires: "Expira",
    delete: "Excluir",
    copy: "Copiar",
    copied: "Copiado",
    confirmTitle: "Excluir esta imagem?",
    confirmBody: "O link para de funcionar. Não tem como desfazer.",
    cancel: "Cancelar",
    capNote: "Mostrando seus 10 envios mais recentes.",
    more: "Mais antigos",
    skip: "Ir para meus envios",
    shareUrlLabel: "Link pra compartilhar",
    count: (n) => (n === 1 ? "1 envio" : `${n} envios`),
    grid: "Grade",
    list: "Lista",
    viewAria: "Layout",
    extend: "Estender",
    password: "Senha",
    removePassword: "Remover",
    passwordHint: "Pelo menos 8 caracteres.",
    save: "Salvar",
  },
  de: {
    title: "Meine Drops — dropimg.io",
    heading: "Meine Drops",
    empty: "Noch keine Bilder in diesem Konto. Vom Start hochladen — angemeldete Drops erscheinen hier.",
    expires: "Läuft ab",
    delete: "Löschen",
    copy: "Kopieren",
    copied: "Kopiert",
    confirmTitle: "Dieses Bild löschen?",
    confirmBody: "Der Link funktioniert danach nicht mehr. Das lässt sich nicht rückgängig machen.",
    cancel: "Abbrechen",
    capNote: "Die 10 neuesten Drops.",
    more: "Ältere",
    skip: "Zu meinen Drops",
    shareUrlLabel: "Link zum Teilen",
    count: (n) => (n === 1 ? "1 Drop" : `${n} Drops`),
    grid: "Raster",
    list: "Liste",
    viewAria: "Ansicht",
    extend: "Verlängern",
    password: "Passwort",
    removePassword: "Entfernen",
    passwordHint: "Mindestens 8 Zeichen.",
    save: "Speichern",
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
  const t = COPY[opts.locale];
  const rows =
    opts.drops.length === 0
      ? `<p class="drops-empty">${esc(t.empty)}</p>`
      : `<ul class="drop-list">${opts.drops
          .map((d) => {
            const sharePath = `/${d.slug}`;
            const shareUrl = `${opts.origin.replace(/\/$/, "")}${sharePath}`;
            return `<li data-slug="${esc(d.slug)}">
        <a class="drop-thumb" href="${esc(sharePath)}" rel="noopener">
          <img src="/i/${esc(d.slug)}" alt="" width="320" height="320" loading="lazy" decoding="async" fetchpriority="low" />
        </a>
        <div class="drop-main">
          <div class="drop-url-row">
            <input class="drop-url-input" readonly value="${esc(sharePath)}" data-url="${esc(shareUrl)}" title="${esc(shareUrl)}" aria-label="${esc(t.shareUrlLabel)}" />
            <button type="button" class="drop-btn drop-copy" data-copied="${esc(t.copied)}">${esc(t.copy)}</button>
          </div>
          <div class="drop-foot">
            <span class="drop-meta">${esc(formatSize(d.size))} · ${esc(formatWhen(d.expires_at))}${d.locked ? " · 🔒" : ""}</span>
            <div class="drop-manage">
              ${opts.canExtend ? `<button type="button" class="drop-btn drop-extend" data-slug="${esc(d.slug)}">${esc(t.extend)}</button>` : ""}
              ${opts.canPassword ? `<button type="button" class="drop-btn drop-pw" data-slug="${esc(d.slug)}" data-locked="${d.locked ? "1" : "0"}">${esc(t.password)}</button>` : ""}
              <button type="button" class="drop-btn drop-del" data-slug="${esc(d.slug)}">${esc(t.delete)}</button>
            </div>
          </div>
        </div>
      </li>`;
          })
          .join("")}</ul>`;

  const notes = [
    t.count(opts.drops.length),
    opts.historyCapped && opts.drops.length >= 10 ? t.capNote : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const more =
    opts.nextCursor != null
      ? `<p class="drops-more"><a href="/app?cursor=${opts.nextCursor}">${esc(t.more)}</a></p>`
      : "";

  const toggle =
    opts.drops.length === 0
      ? ""
      : `<div class="drops-view" role="group" aria-label="${esc(t.viewAria)}">
        <button type="button" class="drops-view-btn" data-view="grid" aria-pressed="true">${esc(t.grid)}</button>
        <button type="button" class="drops-view-btn" data-view="list" aria-pressed="false">${esc(t.list)}</button>
      </div>`;

  const main = `<section class="drops-page" data-view="grid">
    <header class="drops-head">
      <div class="drops-head-text">
        <h1 class="drops-title">${esc(t.heading)} <span class="plan-pill">${esc(opts.plan)}</span></h1>
        <p class="drops-sub">${esc(notes)}</p>
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
      const page = document.querySelector(".drops-page");
      const list = document.querySelector(".drop-list");
      const VIEW_KEY = "dropimg:drops-view";
      function applyView(view) {
        const next = view === "list" ? "list" : "grid";
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
        else showPwError("Could not remove password.");
      });
      pwForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!slug) return;
        const password = document.getElementById("pw-input").value;
        if (password.length < 8) {
          showPwError("Password must be at least 8 characters.");
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
          const body = await res.json().catch(function () { return null; });
          showPwError((body && body.error) || "Could not save password.");
        } catch (err) {
          showPwError("Could not save password.");
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(ts: number): string {
  const ms = ts * 1000 - Date.now();
  if (ms <= 0) return "soon";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 20) return "24h";
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
