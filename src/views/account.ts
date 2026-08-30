import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  heading: string;
  lede: string;
  email: string;
  emailHint: string;
  plan: string;
  planFree: string;
  planPro: string;
  renews: (date: string) => string;
  ends: (date: string) => string;
  viewPlans: string;
  manage: string;
  sessions: string;
  sessionsHint: string;
  signOutAll: string;
  integrations: string;
  integrationsHint: string;
  extensionTitle: string;
  extensionBody: string;
  connectExtension: string;
  sharexTitle: string;
  sharexBody: string;
  createSharex: string;
  connectedDevices: string;
  neverUsed: string;
  created: string;
  lastUsed: string;
  revoke: string;
  noDevices: string;
  lostConfig: string;
  tokenTitle: string;
  tokenBody: string;
  copyToken: string;
  tokenCopied: string;
  downloadSharex: string;
  tokenWarn: string;
  done: string;
  revokeTitle: string;
  revokeBody: string;
  cancel: string;
  delete: string;
  deleteHint: string;
  deleteAction: string;
  deleteConfirm: string;
  deleteFailed: string;
  skip: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Account — dropimg.io",
    heading: "Account",
    lede: "Email, plan, and tools for this sign-in.",
    email: "Email",
    emailHint: "Sign-in uses a one-time link. There is no password.",
    plan: "Plan",
    planFree: "Free",
    planPro: "Pro",
    renews: (date) => `Renews ${date}.`,
    ends: (date) => `Ends ${date}.`,
    viewPlans: "View plans",
    manage: "Manage billing",
    sessions: "Sessions",
    sessionsHint: "Sign out everywhere this account is open.",
    signOutAll: "Sign out of all devices",
    integrations: "Integrations",
    integrationsHint: "Connect DropIMG to tools you already use.",
    extensionTitle: "Browser extension",
    extensionBody: "Capture and upload screenshots directly to your DropIMG account.",
    connectExtension: "Connect extension",
    sharexTitle: "ShareX",
    sharexBody: "Send ShareX captures directly to your DropIMG account.",
    createSharex: "Create ShareX config",
    connectedDevices: "Connected devices",
    neverUsed: "Never used",
    created: "Created",
    lastUsed: "Last used",
    revoke: "Revoke",
    noDevices: "No connected tools yet.",
    lostConfig:
      "Already lost the config? Revoke the old token and create a new one.",
    tokenTitle: "Integration connected",
    tokenBody: "Copy this token now. DropIMG will not show it again.",
    copyToken: "Copy token",
    tokenCopied: "Copied",
    downloadSharex: "Download ShareX config",
    tokenWarn: "This configuration contains a private upload token. Keep it private.",
    done: "Done",
    revokeTitle: "Revoke this integration?",
    revokeBody:
      "Uploads from this device/app will stop immediately. Existing DropIMG links will not be affected.",
    cancel: "Cancel",
    delete: "Delete account",
    deleteHint:
      "Deletes your drops and signs you out. An active Pro subscription is canceled immediately first.",
    deleteAction: "Delete account",
    deleteConfirm:
      "Delete this account? Active Pro billing is canceled immediately and your images are removed.",
    deleteFailed: "Could not delete this account.",
    skip: "Skip to account",
  },
  es: {
    title: "Cuenta — dropimg.io",
    heading: "Cuenta",
    lede: "Correo, plan y herramientas de este acceso.",
    email: "Correo",
    emailHint: "Entras con un enlace de un solo uso. No hay contraseña.",
    plan: "Plan",
    planFree: "Gratis",
    planPro: "Pro",
    renews: (date) => `Se renueva el ${date}.`,
    ends: (date) => `Termina el ${date}.`,
    viewPlans: "Ver planes",
    manage: "Gestionar facturación",
    sessions: "Sesiones",
    sessionsHint: "Cierra sesión en todos los dispositivos.",
    signOutAll: "Salir de todos los dispositivos",
    integrations: "Integraciones",
    integrationsHint: "Conecta DropIMG a las herramientas que ya usas.",
    extensionTitle: "Extensión del navegador",
    extensionBody: "Captura y sube capturas de pantalla directo a tu cuenta DropIMG.",
    connectExtension: "Conectar extensión",
    sharexTitle: "ShareX",
    sharexBody: "Envía capturas de ShareX directo a tu cuenta DropIMG.",
    createSharex: "Crear config de ShareX",
    connectedDevices: "Dispositivos conectados",
    neverUsed: "Sin uso",
    created: "Creado",
    lastUsed: "Último uso",
    revoke: "Revocar",
    noDevices: "Aún no hay herramientas conectadas.",
    lostConfig: "¿Perdiste la config? Revoca el token viejo y crea uno nuevo.",
    tokenTitle: "Integración conectada",
    tokenBody: "Copia este token ahora. DropIMG no lo volverá a mostrar.",
    copyToken: "Copiar token",
    tokenCopied: "Copiado",
    downloadSharex: "Descargar config de ShareX",
    tokenWarn: "Esta configuración incluye un token privado de subida. Guárdalo.",
    done: "Listo",
    revokeTitle: "¿Revocar esta integración?",
    revokeBody:
      "Las subidas de este dispositivo o app se detienen al momento. Los enlaces existentes no cambian.",
    cancel: "Cancelar",
    delete: "Borrar cuenta",
    deleteHint:
      "Borra tus imágenes y cierra la sesión. Si hay Pro activo, se cancela al momento.",
    deleteAction: "Borrar cuenta",
    deleteConfirm:
      "¿Borrar esta cuenta? La facturación Pro se cancela al momento y se eliminan tus imágenes.",
    deleteFailed: "No se pudo borrar la cuenta.",
    skip: "Ir a la cuenta",
  },
  "pt-BR": {
    title: "Conta — dropimg.io",
    heading: "Conta",
    lede: "E-mail, plano e ferramentas deste login.",
    email: "E-mail",
    emailHint: "Você entra com um link de uso único. Não tem senha.",
    plan: "Plano",
    planFree: "Grátis",
    planPro: "Pro",
    renews: (date) => `Renova em ${date}.`,
    ends: (date) => `Termina em ${date}.`,
    viewPlans: "Ver planos",
    manage: "Gerenciar cobrança",
    sessions: "Sessões",
    sessionsHint: "Sair de todos os dispositivos desta conta.",
    signOutAll: "Sair de todos os dispositivos",
    integrations: "Integrações",
    integrationsHint: "Conecte o DropIMG às ferramentas que você já usa.",
    extensionTitle: "Extensão do navegador",
    extensionBody: "Capture e envie prints direto para sua conta DropIMG.",
    connectExtension: "Conectar extensão",
    sharexTitle: "ShareX",
    sharexBody: "Envie capturas do ShareX direto para sua conta DropIMG.",
    createSharex: "Criar config do ShareX",
    connectedDevices: "Dispositivos conectados",
    neverUsed: "Nunca usado",
    created: "Criado",
    lastUsed: "Último uso",
    revoke: "Revogar",
    noDevices: "Nenhuma ferramenta conectada ainda.",
    lostConfig: "Perdeu a config? Revogue o token antigo e crie outro.",
    tokenTitle: "Integração conectada",
    tokenBody: "Copie este token agora. O DropIMG não mostra de novo.",
    copyToken: "Copiar token",
    tokenCopied: "Copiado",
    downloadSharex: "Baixar config do ShareX",
    tokenWarn: "Esta configuração tem um token privado de envio. Mantenha em segredo.",
    done: "Pronto",
    revokeTitle: "Revogar esta integração?",
    revokeBody:
      "Envios deste dispositivo ou app param na hora. Links existentes do DropIMG não mudam.",
    cancel: "Cancelar",
    delete: "Excluir conta",
    deleteHint:
      "Apaga seus envios e encerra a sessão. Uma assinatura Pro ativa é cancelada na hora.",
    deleteAction: "Excluir conta",
    deleteConfirm:
      "Excluir esta conta? A cobrança Pro é cancelada na hora e suas imagens são removidas.",
    deleteFailed: "Não foi possível excluir a conta.",
    skip: "Ir para a conta",
  },
  de: {
    title: "Konto — dropimg.io",
    heading: "Konto",
    lede: "E-Mail, Plan und Tools für diese Anmeldung.",
    email: "E-Mail",
    emailHint: "Anmeldung per Einmal-Link. Kein Passwort.",
    plan: "Plan",
    planFree: "Kostenlos",
    planPro: "Pro",
    renews: (date) => `Verlängert sich am ${date}.`,
    ends: (date) => `Endet am ${date}.`,
    viewPlans: "Pläne ansehen",
    manage: "Abrechnung verwalten",
    sessions: "Sitzungen",
    sessionsHint: "Überall abmelden, wo dieses Konto offen ist.",
    signOutAll: "Auf allen Geräten abmelden",
    integrations: "Integrationen",
    integrationsHint: "Verbinde DropIMG mit Tools, die du schon nutzt.",
    extensionTitle: "Browser-Erweiterung",
    extensionBody: "Screenshots direkt in dein DropIMG-Konto hochladen.",
    connectExtension: "Erweiterung verbinden",
    sharexTitle: "ShareX",
    sharexBody: "ShareX-Aufnahmen direkt in dein DropIMG-Konto senden.",
    createSharex: "ShareX-Config erstellen",
    connectedDevices: "Verbundene Geräte",
    neverUsed: "Noch nicht genutzt",
    created: "Erstellt",
    lastUsed: "Zuletzt genutzt",
    revoke: "Widerrufen",
    noDevices: "Noch keine verbundenen Tools.",
    lostConfig: "Config weg? Alten Token widerrufen und einen neuen erstellen.",
    tokenTitle: "Integration verbunden",
    tokenBody: "Token jetzt kopieren. DropIMG zeigt ihn nicht noch einmal.",
    copyToken: "Token kopieren",
    tokenCopied: "Kopiert",
    downloadSharex: "ShareX-Config herunterladen",
    tokenWarn: "Diese Datei enthält einen privaten Upload-Token. Geheim halten.",
    done: "Fertig",
    revokeTitle: "Diese Integration widerrufen?",
    revokeBody:
      "Uploads von diesem Gerät oder dieser App stoppen sofort. Bestehende DropIMG-Links bleiben.",
    cancel: "Abbrechen",
    delete: "Konto löschen",
    deleteHint:
      "Löscht deine Drops und meldet dich ab. Ein aktives Pro-Abo wird zuerst sofort gekündigt.",
    deleteAction: "Konto löschen",
    deleteConfirm:
      "Dieses Konto löschen? Aktives Pro wird sofort gekündigt und deine Bilder werden entfernt.",
    deleteFailed: "Konto konnte nicht gelöscht werden.",
    skip: "Zum Konto",
  },
};

export function renderAccountPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  email: string;
  plan: "free" | "pro";
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}): string {
  const t = COPY[opts.locale];
  const period =
    opts.periodEnd && opts.plan === "pro"
      ? opts.cancelAtPeriodEnd
        ? t.ends(formatDay(opts.periodEnd, opts.locale))
        : t.renews(formatDay(opts.periodEnd, opts.locale))
      : "";
  const planActions =
    opts.plan === "pro"
      ? `<div class="settings-actions">
          <button type="button" class="btn secondary" id="account-portal">${esc(t.manage)}</button>
          <a class="btn secondary" href="/pro">${esc(t.viewPlans)}</a>
        </div>`
      : `<div class="settings-actions">
          <a class="btn primary" href="/pro">${esc(t.viewPlans)}</a>
        </div>`;

  const extraBody = `<div id="token-modal" class="modal" hidden>
    <div class="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="token-title">
      <h2 id="token-title">${esc(t.tokenTitle)}</h2>
      <p>${esc(t.tokenBody)}</p>
      <label class="sr-only" for="token-value">${esc(t.copyToken)}</label>
      <input id="token-value" class="token-box" type="text" readonly autocomplete="off" spellcheck="false" />
      <div class="settings-actions">
        <button type="button" class="btn primary" id="token-copy">${esc(t.copyToken)}</button>
        <button type="button" class="btn secondary" id="token-download" hidden>${esc(t.downloadSharex)}</button>
      </div>
      <p class="account-muted" id="token-warn">${esc(t.tokenWarn)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="token-done">${esc(t.done)}</button>
      </div>
    </div>
  </div>
  <div id="revoke-modal" class="modal" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="revoke-title">
      <h2 id="revoke-title">${esc(t.revokeTitle)}</h2>
      <p>${esc(t.revokeBody)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="revoke-cancel">${esc(t.cancel)}</button>
        <button type="button" class="btn danger" id="revoke-ok">${esc(t.revoke)}</button>
      </div>
    </div>
  </div>
  <script>
    (() => {
      const portal = document.getElementById("account-portal");
      portal?.addEventListener("click", async () => {
        const res = await fetch("/api/billing/portal", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (body.url) location.href = body.url;
      });
      document.getElementById("account-logout-all")?.addEventListener("click", async () => {
        await fetch("/api/auth/logout-all", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        location.href = "/";
      });
      document.getElementById("account-delete")?.addEventListener("click", async (event) => {
        const btn = event.currentTarget;
        const msg = btn?.getAttribute("data-confirm") || "";
        if (msg && !confirm(msg)) return;
        const res = await fetch("/api/account/delete", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          location.href = "/";
          return;
        }
        let err = btn?.getAttribute("data-error") || "";
        try {
          const body = await res.json();
          if (body.error) err = body.error;
        } catch {}
        if (err) alert(err);
      });

      const labels = {
        created: ${JSON.stringify(t.created)},
        lastUsed: ${JSON.stringify(t.lastUsed)},
        neverUsed: ${JSON.stringify(t.neverUsed)},
        revoke: ${JSON.stringify(t.revoke)},
        noDevices: ${JSON.stringify(t.noDevices)},
        copyToken: ${JSON.stringify(t.copyToken)},
        tokenCopied: ${JSON.stringify(t.tokenCopied)},
        locale: ${JSON.stringify(LOCALE_CONFIG[opts.locale].htmlLang)},
      };
      const list = document.getElementById("integ-list");
      const tokenModal = document.getElementById("token-modal");
      const tokenInput = document.getElementById("token-value");
      const tokenCopy = document.getElementById("token-copy");
      const tokenDownload = document.getElementById("token-download");
      const tokenDone = document.getElementById("token-done");
      const revokeModal = document.getElementById("revoke-modal");
      const revokeCancel = document.getElementById("revoke-cancel");
      const revokeOk = document.getElementById("revoke-ok");
      let pendingRevoke = "";
      let lastSharex = null;

      function formatWhen(unix, neverLabel) {
        if (!unix) return neverLabel;
        const date = new Date(unix * 1000);
        const delta = Date.now() - date.getTime();
        const mins = Math.floor(delta / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return mins + " min ago";
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + "h ago";
        return date.toLocaleDateString(labels.locale, { month: "short", day: "numeric" });
      }

      async function loadTokens() {
        const res = await fetch("/api/account/integrations", { credentials: "same-origin" });
        if (!res.ok || !list) return;
        const body = await res.json();
        const tokens = body.tokens || [];
        list.innerHTML = "";
        if (!tokens.length) {
          const empty = document.createElement("p");
          empty.className = "account-muted";
          empty.textContent = labels.noDevices;
          list.append(empty);
          return;
        }
        for (const row of tokens) {
          const item = document.createElement("div");
          item.className = "integ-row";
          const meta = document.createElement("div");
          const title = document.createElement("p");
          title.className = "settings-value";
          title.textContent = row.label;
          const sub = document.createElement("p");
          sub.className = "account-muted";
          sub.textContent = labels.created + " " + formatWhen(row.createdAt, "") + " · " +
            (row.lastUsedAt ? labels.lastUsed + " " + formatWhen(row.lastUsedAt, labels.neverUsed) : labels.neverUsed);
          meta.append(title, sub);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn secondary";
          btn.textContent = labels.revoke;
          btn.setAttribute("data-id", row.id);
          btn.addEventListener("click", () => {
            pendingRevoke = row.id;
            if (revokeModal) {
              revokeModal.hidden = false;
              revokeOk?.focus();
            }
          });
          item.append(meta, btn);
          list.append(item);
        }
      }

      async function createToken(label, kind) {
        const res = await fetch("/api/account/integrations", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, kind }),
        });
        if (!res.ok) return;
        const body = await res.json();
        if (!tokenModal || !tokenInput) return;
        tokenInput.value = body.token || "";
        lastSharex = kind === "sharex" ? body.sharexConfig : null;
        if (tokenDownload) tokenDownload.hidden = kind !== "sharex";
        tokenModal.hidden = false;
        tokenInput.focus();
        tokenInput.select();
        await loadTokens();
      }

      function closeToken() {
        if (tokenInput) tokenInput.value = "";
        lastSharex = null;
        if (tokenModal) tokenModal.hidden = true;
      }

      document.getElementById("integ-extension")?.addEventListener("click", () => {
        void createToken("Chrome extension", "extension");
      });
      document.getElementById("integ-sharex")?.addEventListener("click", () => {
        void createToken("ShareX", "sharex");
      });
      tokenCopy?.addEventListener("click", async () => {
        const value = tokenInput?.value || "";
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          tokenCopy.textContent = labels.tokenCopied;
          setTimeout(() => { tokenCopy.textContent = labels.copyToken; }, 1600);
        } catch {}
      });
      tokenDownload?.addEventListener("click", () => {
        if (!lastSharex) return;
        const blob = new Blob([JSON.stringify(lastSharex, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dropimg-sharex.sxcu";
        a.click();
        URL.revokeObjectURL(url);
      });
      tokenDone?.addEventListener("click", closeToken);
      tokenModal?.addEventListener("click", (e) => { if (e.target === tokenModal) closeToken(); });
      revokeCancel?.addEventListener("click", () => {
        pendingRevoke = "";
        if (revokeModal) revokeModal.hidden = true;
      });
      revokeModal?.addEventListener("click", (e) => {
        if (e.target === revokeModal) {
          pendingRevoke = "";
          revokeModal.hidden = true;
        }
      });
      revokeOk?.addEventListener("click", async () => {
        const id = pendingRevoke;
        pendingRevoke = "";
        if (revokeModal) revokeModal.hidden = true;
        if (!id) return;
        await fetch("/api/account/integrations/" + encodeURIComponent(id) + "/revoke", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        await loadTokens();
      });
      void loadTokens();
    })();
  </script>`;

  const main = `<section class="settings-page">
    <h1>${esc(t.heading)}</h1>
    <p class="settings-lead">${esc(t.lede)}</p>
    <section class="settings-card">
      <h2>${esc(t.email)}</h2>
      <p class="settings-value">${esc(opts.email)}</p>
      <p class="account-muted">${esc(t.emailHint)}</p>
    </section>
    <section class="settings-card">
      <h2>${esc(t.plan)}</h2>
      <p class="settings-value">${esc(opts.plan === "pro" ? t.planPro : t.planFree)}</p>
      ${period ? `<p class="account-muted">${esc(period)}</p>` : ""}
      ${planActions}
    </section>
    <section class="settings-card">
      <h2>${esc(t.integrations)}</h2>
      <p class="account-muted">${esc(t.integrationsHint)}</p>
      <div class="integ-tools">
        <article class="integ-tool">
          <h3>${esc(t.extensionTitle)}</h3>
          <p>${esc(t.extensionBody)}</p>
          <button type="button" class="btn primary" id="integ-extension">${esc(t.connectExtension)}</button>
        </article>
        <article class="integ-tool">
          <h3>${esc(t.sharexTitle)}</h3>
          <p>${esc(t.sharexBody)}</p>
          <button type="button" class="btn primary" id="integ-sharex">${esc(t.createSharex)}</button>
        </article>
      </div>
      <h3 class="integ-subhead">${esc(t.connectedDevices)}</h3>
      <div id="integ-list" class="integ-list"></div>
      <p class="account-muted">${esc(t.lostConfig)}</p>
    </section>
    <section class="settings-card">
      <h2>${esc(t.sessions)}</h2>
      <p class="account-muted">${esc(t.sessionsHint)}</p>
      <button type="button" class="btn secondary" id="account-logout-all">${esc(t.signOutAll)}</button>
    </section>
    <section class="settings-card settings-danger">
      <h2>${esc(t.delete)}</h2>
      <p class="account-muted">${esc(t.deleteHint)}</p>
      <button type="button" class="btn" id="account-delete" data-confirm="${esc(t.deleteConfirm)}" data-error="${esc(t.deleteFailed)}">${esc(t.deleteAction)}</button>
    </section>
  </section>`;

  return renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    skipLabel: t.skip,
    stayPath: "/account",
    main,
    extraBody,
  });
}

export function accountHtmlResponse(
  opts: Parameters<typeof renderAccountPage>[0],
  status = 200,
): Response {
  return siteHtmlResponse(renderAccountPage(opts), status);
}

function formatDay(unix: number, locale: Locale): string {
  return new Date(unix * 1000).toLocaleDateString(LOCALE_CONFIG[locale].htmlLang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
