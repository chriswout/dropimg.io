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
    lede: "Email, plan, and sessions for this sign-in.",
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
    lede: "Correo, plan y sesiones de este acceso.",
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
    lede: "E-mail, plano e sessões deste login.",
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
    lede: "E-Mail, Plan und Sitzungen für diese Anmeldung.",
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

  const extraBody = `<script>
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
