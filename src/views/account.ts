import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  heading: string;
  lede: string;
  sectionAccount: string;
  email: string;
  emailHint: string;
  plan: string;
  planFree: string;
  planPro: string;
  renews: (date: string) => string;
  ends: (date: string) => string;
  viewPlans: string;
  manage: string;
  sectionSecurity: string;
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
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
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
  sectionDanger: string;
  delete: string;
  deleteHint: string;
  deleteWill: string;
  deleteCancelPro: string;
  deleteImages: string;
  deleteIntegrations: string;
  deleteSignOut: string;
  deleteUndo: string;
  deleteAction: string;
  deleteFailed: string;
  billingFail: string;
  billingFailHint: string;
  skip: string;
};

export const ACCOUNT_COPY: Record<Locale, Copy> = {
  en: {
    title: "Account — dropimg.io",
    heading: "Account",
    lede: "Email, plan, and tools for this sign-in.",
    sectionAccount: "Account",
    email: "Email",
    emailHint: "Sign-in uses a one-time link. There is no password.",
    plan: "Plan",
    planFree: "Free",
    planPro: "Pro",
    renews: (date) => `Renews ${date}`,
    ends: (date) => `Ends ${date}`,
    viewPlans: "View plans",
    manage: "Manage billing",
    sectionSecurity: "Security",
    sessionsHint: "Sign out everywhere this account is open.",
    signOutAll: "Sign out of all devices",
    integrations: "Integrations",
    integrationsHint: "Connect DropIMG to tools you already use.",
    extensionTitle: "Browser extension",
    extensionBody: "Capture screenshots and save them directly to My drops.",
    connectExtension: "Connect extension",
    sharexTitle: "ShareX",
    sharexBody: "Send ShareX screenshots directly to your DropIMG account.",
    createSharex: "Create ShareX config",
    connectedDevices: "Connected integrations",
    neverUsed: "Never used",
    created: "Created",
    lastUsed: "Last used",
    justNow: "just now",
    minutesAgo: (n) => (n === 1 ? "1 minute ago" : `${n} minutes ago`),
    hoursAgo: (n) => (n === 1 ? "1 hour ago" : `${n} hours ago`),
    revoke: "Revoke",
    noDevices: "No connected tools yet.",
    lostConfig: "Already lost the config? Revoke the old token and create a new one.",
    tokenTitle: "Integration connected",
    tokenBody: "Copy this token now. DropIMG will not show it again.",
    copyToken: "Copy token",
    tokenCopied: "Copied",
    downloadSharex: "Download ShareX config",
    tokenWarn: "This configuration contains a private upload token. Keep it private.",
    done: "Done",
    revokeTitle: "Revoke this integration?",
    revokeBody:
      "Uploads from this device or app will stop immediately. Existing DropIMG links will not be affected.",
    cancel: "Cancel",
    sectionDanger: "Danger zone",
    delete: "Delete account",
    deleteHint: "This permanently closes the account.",
    deleteWill: "Deleting your account will:",
    deleteCancelPro: "cancel Pro if active",
    deleteImages: "delete your active DropIMG images",
    deleteIntegrations: "revoke connected integrations",
    deleteSignOut: "sign you out everywhere",
    deleteUndo: "This cannot be undone.",
    deleteAction: "Delete account",
    deleteFailed: "Could not delete this account.",
    billingFail: "We couldn't cancel your Pro subscription, so your DropIMG account was not deleted.",
    billingFailHint: "Manage billing or try again.",
    skip: "Skip to account",
  },
  es: {
    title: "Cuenta — dropimg.io",
    heading: "Cuenta",
    lede: "Correo, plan y herramientas de este acceso.",
    sectionAccount: "Cuenta",
    email: "Correo",
    emailHint: "Entras con un enlace de un solo uso. No hay contraseña.",
    plan: "Plan",
    planFree: "Gratis",
    planPro: "Pro",
    renews: (date) => `Se renueva el ${date}`,
    ends: (date) => `Termina el ${date}`,
    viewPlans: "Ver planes",
    manage: "Gestionar facturación",
    sectionSecurity: "Seguridad",
    sessionsHint: "Cierra sesión en todos los dispositivos.",
    signOutAll: "Salir de todos los dispositivos",
    integrations: "Integraciones",
    integrationsHint: "Conecta DropIMG a las herramientas que ya usas.",
    extensionTitle: "Extensión del navegador",
    extensionBody: "Captura pantallas y guárdalas directo en Mis envíos.",
    connectExtension: "Conectar extensión",
    sharexTitle: "ShareX",
    sharexBody: "Envía capturas de ShareX directo a tu cuenta DropIMG.",
    createSharex: "Crear config de ShareX",
    connectedDevices: "Integraciones conectadas",
    neverUsed: "Sin uso",
    created: "Creado",
    lastUsed: "Último uso",
    justNow: "ahora mismo",
    minutesAgo: (n) => (n === 1 ? "hace 1 minuto" : `hace ${n} minutos`),
    hoursAgo: (n) => (n === 1 ? "hace 1 hora" : `hace ${n} horas`),
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
    sectionDanger: "Zona de peligro",
    delete: "Borrar cuenta",
    deleteHint: "Esto cierra la cuenta de forma permanente.",
    deleteWill: "Al borrar tu cuenta:",
    deleteCancelPro: "se cancela Pro si está activo",
    deleteImages: "se borran tus imágenes activas de DropIMG",
    deleteIntegrations: "se revocan las integraciones conectadas",
    deleteSignOut: "se cierra la sesión en todos lados",
    deleteUndo: "Esto no se puede deshacer.",
    deleteAction: "Borrar cuenta",
    deleteFailed: "No se pudo borrar la cuenta.",
    billingFail: "No pudimos cancelar tu suscripción Pro, así que la cuenta no se borró.",
    billingFailHint: "Gestiona la facturación o inténtalo de nuevo.",
    skip: "Ir a la cuenta",
  },
  "pt-BR": {
    title: "Conta — dropimg.io",
    heading: "Conta",
    lede: "E-mail, plano e ferramentas deste login.",
    sectionAccount: "Conta",
    email: "E-mail",
    emailHint: "Você entra com um link de uso único. Não tem senha.",
    plan: "Plano",
    planFree: "Grátis",
    planPro: "Pro",
    renews: (date) => `Renova em ${date}`,
    ends: (date) => `Termina em ${date}`,
    viewPlans: "Ver planos",
    manage: "Gerenciar cobrança",
    sectionSecurity: "Segurança",
    sessionsHint: "Sair de todos os dispositivos desta conta.",
    signOutAll: "Sair de todos os dispositivos",
    integrations: "Integrações",
    integrationsHint: "Conecte o DropIMG às ferramentas que você já usa.",
    extensionTitle: "Extensão do navegador",
    extensionBody: "Capture prints e salve direto em Meus envios.",
    connectExtension: "Conectar extensão",
    sharexTitle: "ShareX",
    sharexBody: "Envie capturas do ShareX direto para sua conta DropIMG.",
    createSharex: "Criar config do ShareX",
    connectedDevices: "Integrações conectadas",
    neverUsed: "Nunca usado",
    created: "Criado",
    lastUsed: "Último uso",
    justNow: "agora",
    minutesAgo: (n) => (n === 1 ? "há 1 minuto" : `há ${n} minutos`),
    hoursAgo: (n) => (n === 1 ? "há 1 hora" : `há ${n} horas`),
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
    sectionDanger: "Zona de perigo",
    delete: "Excluir conta",
    deleteHint: "Isso encerra a conta de forma permanente.",
    deleteWill: "Excluir sua conta vai:",
    deleteCancelPro: "cancelar o Pro se estiver ativo",
    deleteImages: "apagar suas imagens ativas do DropIMG",
    deleteIntegrations: "revogar integrações conectadas",
    deleteSignOut: "sair da conta em todos os lugares",
    deleteUndo: "Isso não tem como desfazer.",
    deleteAction: "Excluir conta",
    deleteFailed: "Não foi possível excluir a conta.",
    billingFail: "Não foi possível cancelar sua assinatura Pro, então a conta não foi excluída.",
    billingFailHint: "Gerencie a cobrança ou tente de novo.",
    skip: "Ir para a conta",
  },
  de: {
    title: "Konto — dropimg.io",
    heading: "Konto",
    lede: "E-Mail, Plan und Tools für diese Anmeldung.",
    sectionAccount: "Konto",
    email: "E-Mail",
    emailHint: "Anmeldung per Einmal-Link. Kein Passwort.",
    plan: "Plan",
    planFree: "Kostenlos",
    planPro: "Pro",
    renews: (date) => `Verlängert sich am ${date}`,
    ends: (date) => `Endet am ${date}`,
    viewPlans: "Pläne ansehen",
    manage: "Abrechnung verwalten",
    sectionSecurity: "Sicherheit",
    sessionsHint: "Überall abmelden, wo dieses Konto offen ist.",
    signOutAll: "Auf allen Geräten abmelden",
    integrations: "Integrationen",
    integrationsHint: "Verbinde DropIMG mit Tools, die du schon nutzt.",
    extensionTitle: "Browser-Erweiterung",
    extensionBody: "Screenshots aufnehmen und direkt in Meine Drops speichern.",
    connectExtension: "Erweiterung verbinden",
    sharexTitle: "ShareX",
    sharexBody: "ShareX-Aufnahmen direkt in dein DropIMG-Konto senden.",
    createSharex: "ShareX-Config erstellen",
    connectedDevices: "Verbundene Integrationen",
    neverUsed: "Noch nicht genutzt",
    created: "Erstellt",
    lastUsed: "Zuletzt genutzt",
    justNow: "gerade eben",
    minutesAgo: (n) => (n === 1 ? "vor 1 Minute" : `vor ${n} Minuten`),
    hoursAgo: (n) => (n === 1 ? "vor 1 Stunde" : `vor ${n} Stunden`),
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
    sectionDanger: "Gefahrenzone",
    delete: "Konto löschen",
    deleteHint: "Das schließt das Konto dauerhaft.",
    deleteWill: "Wenn du dein Konto löschst:",
    deleteCancelPro: "Pro wird gekündigt, falls aktiv",
    deleteImages: "deine aktiven DropIMG-Bilder werden gelöscht",
    deleteIntegrations: "verbundene Integrationen werden widerrufen",
    deleteSignOut: "du wirst überall abgemeldet",
    deleteUndo: "Das lässt sich nicht rückgängig machen.",
    deleteAction: "Konto löschen",
    deleteFailed: "Konto konnte nicht gelöscht werden.",
    billingFail:
      "Wir konnten dein Pro-Abo nicht kündigen, daher wurde das DropIMG-Konto nicht gelöscht.",
    billingFailHint: "Abrechnung verwalten oder erneut versuchen.",
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
  const t = ACCOUNT_COPY[opts.locale];
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
  <div id="delete-modal" class="modal" hidden>
    <div class="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h2 id="delete-title">${esc(t.delete)}</h2>
      <p>${esc(t.deleteWill)}</p>
      <ul class="delete-list">
        <li>${esc(t.deleteCancelPro)}</li>
        <li>${esc(t.deleteImages)}</li>
        <li>${esc(t.deleteIntegrations)}</li>
        <li>${esc(t.deleteSignOut)}</li>
      </ul>
      <p>${esc(t.deleteUndo)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="delete-cancel">${esc(t.cancel)}</button>
        <button type="button" class="btn danger" id="delete-ok">${esc(t.deleteAction)}</button>
      </div>
    </div>
  </div>
  <div id="delete-fail-modal" class="modal" hidden>
    <div class="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="delete-fail-title">
      <h2 id="delete-fail-title">${esc(t.delete)}</h2>
      <p>${esc(t.billingFail)}</p>
      <p>${esc(t.billingFailHint)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="delete-fail-close">${esc(t.cancel)}</button>
        <button type="button" class="btn primary" id="delete-fail-billing">${esc(t.manage)}</button>
      </div>
    </div>
  </div>
  <script>
    (() => {
      async function openPortal() {
        const res = await fetch("/api/billing/portal", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (body.url) location.href = body.url;
      }
      document.getElementById("account-portal")?.addEventListener("click", () => { void openPortal(); });
      document.getElementById("delete-fail-billing")?.addEventListener("click", () => { void openPortal(); });
      document.getElementById("account-logout-all")?.addEventListener("click", async () => {
        await fetch("/api/auth/logout-all", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        location.href = "/";
      });
      const deleteModal = document.getElementById("delete-modal");
      const deleteFail = document.getElementById("delete-fail-modal");
      document.getElementById("account-delete")?.addEventListener("click", () => {
        if (deleteModal) deleteModal.hidden = false;
      });
      document.getElementById("delete-cancel")?.addEventListener("click", () => {
        if (deleteModal) deleteModal.hidden = true;
      });
      document.getElementById("delete-fail-close")?.addEventListener("click", () => {
        if (deleteFail) deleteFail.hidden = true;
      });
      deleteModal?.addEventListener("click", (e) => { if (e.target === deleteModal) deleteModal.hidden = true; });
      deleteFail?.addEventListener("click", (e) => { if (e.target === deleteFail) deleteFail.hidden = true; });
      document.getElementById("delete-ok")?.addEventListener("click", async () => {
        const ok = document.getElementById("delete-ok");
        if (ok) ok.disabled = true;
        const res = await fetch("/api/account/delete", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          location.href = "/";
          return;
        }
        if (deleteModal) deleteModal.hidden = true;
        if (ok) ok.disabled = false;
        if (res.status === 409 || res.status === 502) {
          if (deleteFail) deleteFail.hidden = false;
          return;
        }
        const banner = document.getElementById("account-delete-error");
        if (banner) {
          banner.hidden = false;
          banner.textContent = ${JSON.stringify(t.deleteFailed)};
        }
      });

      const labels = {
        created: ${JSON.stringify(t.created)},
        lastUsed: ${JSON.stringify(t.lastUsed)},
        neverUsed: ${JSON.stringify(t.neverUsed)},
        revoke: ${JSON.stringify(t.revoke)},
        noDevices: ${JSON.stringify(t.noDevices)},
        copyToken: ${JSON.stringify(t.copyToken)},
        tokenCopied: ${JSON.stringify(t.tokenCopied)},
        justNow: ${JSON.stringify(t.justNow)},
        minutesAgo: ${JSON.stringify(["1 minute ago", "{n} minutes ago"])},
        hoursAgo: ${JSON.stringify(["1 hour ago", "{n} hours ago"])},
        locale: ${JSON.stringify(LOCALE_CONFIG[opts.locale].htmlLang)},
      };
      const minAgo = ${JSON.stringify({ one: t.minutesAgo(1), many: t.minutesAgo(9) })};
      const hrAgo = ${JSON.stringify({ one: t.hoursAgo(1), many: t.hoursAgo(9) })};
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
        if (mins < 1) return labels.justNow;
        if (mins < 60) return mins === 1 ? minAgo.one : minAgo.many.replace("9", String(mins));
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours === 1 ? hrAgo.one : hrAgo.many.replace("9", String(hours));
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
          sub.textContent = row.lastUsedAt
            ? labels.lastUsed + " " + formatWhen(row.lastUsedAt, labels.neverUsed)
            : labels.neverUsed;
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
      <h2>${esc(t.sectionAccount)}</h2>
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
      <h2>${esc(t.sectionSecurity)}</h2>
      <p class="account-muted">${esc(t.sessionsHint)}</p>
      <button type="button" class="btn secondary" id="account-logout-all">${esc(t.signOutAll)}</button>
    </section>
    <section class="settings-card settings-danger">
      <h2>${esc(t.sectionDanger)}</h2>
      <p class="account-muted">${esc(t.deleteHint)}</p>
      <p id="account-delete-error" class="form-error" hidden role="alert"></p>
      <button type="button" class="btn danger" id="account-delete">${esc(t.deleteAction)}</button>
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
    month: "long",
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
