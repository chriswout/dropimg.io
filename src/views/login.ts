import type { Locale } from "../../marketing/locales";
import { renderSitePage, siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  heading: string;
  /** Reassures visitors that uploading never required an account. */
  lede: string;
  hint: string;
  emailLabel: string;
  submit: string;
  noPassword: string;
  continueGithub: string;
  continueGoogle: string;
  orEmail: string;
  socialFailed: string;
  socialNoEmail: string;
  socialTaken: string;
  socialAlreadyLinked: string;
  socialUnavailable: string;
  /** What an account adds. Kept short and free-tier first. */
  perks: [string, string, string];
  checkInbox: string;
  sentTo: (masked: string) => string;
  expires: string;
  resend: string;
  differentEmail: string;
  tryAgain: string;
  invalidEmail: string;
  sendFailed: string;
  invalidLink: string;
  expiredLink: string;
  accountGone: string;
  skip: string;
};

export const LOGIN_COPY: Record<Locale, Copy> = {
  en: {
    title: "Sign in — dropimg.io",
    heading: "Sign in to DropIMG",
    lede: "You never need an account to upload. Sign in to keep your links together on every device.",
    hint: "We’ll email you a one-time link.",
    emailLabel: "Email",
    submit: "Email me a sign-in link",
    noPassword: "No password required.",
    continueGithub: "Continue with GitHub",
    continueGoogle: "Continue with Google",
    orEmail: "Or email me a sign-in link",
    socialFailed: "Could not sign in with that account. Try again or use an email link.",
    socialNoEmail:
      "That account has no verified email we can use. Sign in with an email link instead.",
    socialTaken: "That Google or GitHub account is already connected to a different DropIMG user.",
    socialAlreadyLinked:
      "This account already has that sign-in method. Disconnect it first to use a different one.",
    socialUnavailable: "That sign-in method is not available right now.",
    perks: [
      "Your active links in one place",
      "Same account on every device",
      "Browser extension and ShareX uploads",
    ],
    checkInbox: "Check your inbox",
    sentTo: (m) => `We sent a sign-in link to ${m}.`,
    expires: "Link expires in 15 minutes.",
    resend: "Resend",
    differentEmail: "Use a different email",
    tryAgain: "Too many sign-in attempts. Try again shortly.",
    invalidEmail: "Enter a valid email.",
    sendFailed: "Could not send the sign-in email. Try again shortly.",
    invalidLink: "This sign-in link is invalid.",
    expiredLink: "This sign-in link has expired. Request a new one.",
    accountGone: "This account is no longer available.",
    skip: "Skip to sign in",
  },
  es: {
    title: "Entrar — dropimg.io",
    heading: "Entra en DropIMG",
    lede: "Nunca hace falta una cuenta para subir. Entra si quieres tener tus enlaces juntos en todos tus dispositivos.",
    hint: "Te enviamos un enlace de un solo uso.",
    emailLabel: "Correo",
    submit: "Enviarme el enlace",
    noPassword: "Sin contraseña.",
    continueGithub: "Continuar con GitHub",
    continueGoogle: "Continuar con Google",
    orEmail: "O envíame un enlace de acceso",
    socialFailed: "No se pudo entrar con esa cuenta. Prueba otra vez o usa el enlace por correo.",
    socialNoEmail:
      "Esa cuenta no tiene un correo verificado que podamos usar. Entra con un enlace por correo.",
    socialTaken: "Esa cuenta de Google o GitHub ya está conectada a otro usuario de DropIMG.",
    socialAlreadyLinked:
      "Esta cuenta ya tiene ese método de acceso. Desconéctalo primero para usar otro.",
    socialUnavailable: "Ese método de acceso no está disponible ahora.",
    perks: [
      "Tus enlaces activos en un solo lugar",
      "La misma cuenta en todos tus dispositivos",
      "Subidas desde la extensión y ShareX",
    ],
    checkInbox: "Revisa tu correo",
    sentTo: (m) => `Enviamos un enlace a ${m}.`,
    expires: "El enlace caduca en 15 minutos.",
    resend: "Reenviar",
    differentEmail: "Usar otro correo",
    tryAgain: "Demasiados intentos. Prueba en un momento.",
    invalidEmail: "Escribe un correo válido.",
    sendFailed: "No se pudo enviar el correo. Prueba en un momento.",
    invalidLink: "Este enlace de acceso no es válido.",
    expiredLink: "Este enlace caducó. Pide uno nuevo.",
    accountGone: "Esta cuenta ya no está disponible.",
    skip: "Ir al inicio de sesión",
  },
  "pt-BR": {
    title: "Entrar — dropimg.io",
    heading: "Entre no DropIMG",
    lede: "Você nunca precisa de conta pra enviar. Entre se quiser manter seus links juntos em todos os aparelhos.",
    hint: "Enviaremos um link de uso único.",
    emailLabel: "E-mail",
    submit: "Enviar link de entrada",
    noPassword: "Sem senha.",
    continueGithub: "Continuar com o GitHub",
    continueGoogle: "Continuar com o Google",
    orEmail: "Ou envie um link de entrada",
    socialFailed: "Não deu pra entrar com essa conta. Tente de novo ou use o link por e-mail.",
    socialNoEmail:
      "Essa conta não tem um e-mail verificado que possamos usar. Entre com um link por e-mail.",
    socialTaken: "Essa conta do Google ou GitHub já está ligada a outro usuário do DropIMG.",
    socialAlreadyLinked:
      "Esta conta já tem esse jeito de entrar. Desconecte primeiro para usar outro.",
    socialUnavailable: "Esse jeito de entrar não está disponível agora.",
    perks: [
      "Seus links ativos em um lugar só",
      "A mesma conta em todos os aparelhos",
      "Envios pela extensão e pelo ShareX",
    ],
    checkInbox: "Confira sua caixa de entrada",
    sentTo: (m) => `Enviamos um link para ${m}.`,
    expires: "O link expira em 15 minutos.",
    resend: "Reenviar",
    differentEmail: "Usar outro e-mail",
    tryAgain: "Muitas tentativas. Tente de novo em instantes.",
    invalidEmail: "Digite um e-mail válido.",
    sendFailed: "Não deu pra enviar o e-mail. Tente de novo em instantes.",
    invalidLink: "Este link de entrada é inválido.",
    expiredLink: "Este link expirou. Peça outro.",
    accountGone: "Esta conta não está mais disponível.",
    skip: "Ir para o login",
  },
  de: {
    title: "Anmelden — dropimg.io",
    heading: "Bei DropIMG anmelden",
    lede: "Zum Hochladen brauchst du nie ein Konto. Melde dich an, wenn du deine Links auf allen Geräten zusammen haben willst.",
    hint: "Wir senden einen einmaligen Link.",
    emailLabel: "E-Mail",
    submit: "Anmeldelink senden",
    noPassword: "Kein Passwort nötig.",
    continueGithub: "Weiter mit GitHub",
    continueGoogle: "Weiter mit Google",
    orEmail: "Oder Anmeldelink per E-Mail",
    socialFailed:
      "Anmeldung mit diesem Konto hat nicht geklappt. Nochmal versuchen oder den E-Mail-Link nutzen.",
    socialNoEmail:
      "Dieses Konto hat keine bestätigte E-Mail, die wir nutzen können. Bitte per E-Mail-Link anmelden.",
    socialTaken: "Dieses Google- oder GitHub-Konto ist schon mit einem anderen DropIMG-Nutzer verbunden.",
    socialAlreadyLinked:
      "Dieses Konto hat diese Anmeldung schon. Erst trennen, um eine andere zu verbinden.",
    socialUnavailable: "Diese Anmeldung ist gerade nicht verfügbar.",
    perks: [
      "Aktive Links an einem Ort",
      "Dasselbe Konto auf allen Geräten",
      "Uploads per Erweiterung und ShareX",
    ],
    checkInbox: "Posteingang prüfen",
    sentTo: (m) => `Wir haben einen Link an ${m} gesendet.`,
    expires: "Der Link läuft in 15 Minuten ab.",
    resend: "Erneut senden",
    differentEmail: "Andere E-Mail nutzen",
    tryAgain: "Zu viele Versuche. Bitte gleich noch einmal.",
    invalidEmail: "Bitte eine gültige E-Mail eingeben.",
    sendFailed: "E-Mail ließ sich nicht senden. Bitte gleich nochmal.",
    invalidLink: "Dieser Anmeldelink ist ungültig.",
    expiredLink: "Dieser Anmeldelink ist abgelaufen. Bitte einen neuen anfordern.",
    accountGone: "Dieses Konto ist nicht mehr verfügbar.",
    skip: "Zur Anmeldung",
  },
};

export function renderLoginPage(opts: {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  state: "form" | "sent" | "rate_limited" | "invalid" | "expired";
  email?: string;
  maskedEmail?: string;
  error?: string;
  devMagicUrl?: string;
  social?: { google?: boolean; github?: boolean };
}): string {
  const t = LOGIN_COPY[opts.locale];
  const err = opts.error ? `<p class="form-error" role="alert">${esc(opts.error)}</p>` : "";
  const dev =
    opts.devMagicUrl && opts.state === "sent"
      ? `<p class="auth-dev"><a href="${esc(opts.devMagicUrl)}">Dev sign-in link</a></p>`
      : "";
  const github = opts.social?.github
    ? `<a class="btn secondary auth-social-btn" href="/auth/github">${esc(t.continueGithub)}</a>`
    : "";
  const google = opts.social?.google
    ? `<a class="auth-google-btn" href="/auth/google" aria-label="${esc(t.continueGoogle)}">
        <img class="auth-google-btn-light" src="/signin-with-google-light-2x.png" width="180" height="40" alt="" aria-hidden="true" />
        <img class="auth-google-btn-dark" src="/signin-with-google-dark-2x.png" width="180" height="40" alt="" aria-hidden="true" />
      </a>`
    : "";
  const social =
    github || google
      ? `<div class="auth-social">${github}${google}</div>
      <p class="auth-or">${esc(t.orEmail)}</p>`
      : "";

  /*
   * The email form markup is unchanged from V1 on purpose: same method, action
   * and field name. Social buttons are extra entry points to the same session.
   */
  const form = (hint: string) =>
    `<h1 class="auth-title">${esc(t.heading)}</h1>
      <p class="auth-lede">${esc(hint)}</p>
      ${err}
      ${social}
      <form method="post" action="/login" class="account-form auth-form">
        <label for="email">${esc(t.emailLabel)}</label>
        <input id="email" name="email" type="email" required autofocus
          autocomplete="email" inputmode="email" placeholder="you@example.com" />
        <button type="submit" class="btn primary btn-lg">${esc(t.submit)}</button>
      </form>
      <p class="auth-fineprint">${esc(t.noPassword)} ${esc(t.hint)}</p>`;

  const sent = `<span class="auth-mark" aria-hidden="true">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 7.5 12 13l9-5.5"/><rect x="3" y="5" width="18" height="14" rx="2.5"/></svg>
      </span>
      <h1 class="auth-title">${esc(t.checkInbox)}</h1>
      <p class="auth-lede">${esc(t.sentTo(opts.maskedEmail || "***"))}</p>
      <p class="auth-fineprint">${esc(t.expires)}</p>
      ${dev}
      <form method="post" action="/login" class="account-form auth-form">
        <input type="hidden" name="email" value="${esc(opts.email || "")}" />
        <button type="submit" class="btn secondary">${esc(t.resend)}</button>
      </form>
      <p class="auth-alt"><a href="/login">${esc(t.differentEmail)}</a></p>`;

  const limited = `<h1 class="auth-title">${esc(t.heading)}</h1>
      <p class="auth-lede" role="alert">${esc(t.tryAgain)}</p>
      <p class="auth-actions"><a class="btn secondary" href="/login">${esc(t.resend)}</a></p>`;

  const card =
    opts.state === "sent"
      ? sent
      : opts.state === "rate_limited"
        ? limited
        : opts.state === "invalid"
          ? form(t.invalidLink)
          : opts.state === "expired"
            ? form(t.expiredLink)
            : form(t.lede);

  const check =
    '<svg class="auth-check icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>';
  const perks = `<ul class="auth-perks">${t.perks
    .map((p) => `<li>${check}<span>${esc(p)}</span></li>`)
    .join("")}</ul>`;

  return renderSitePage({
    locale: opts.locale,
    title: t.title,
    env: opts.env,
    skipLabel: t.skip,
    stayPath: "/login",
    mainClass: "auth-main",
    main: `<section class="auth">
      <div class="auth-card">${card}</div>
      ${perks}
    </section>`,
  });
}

export function loginSocialError(
  locale: Locale,
  reason: string,
): string {
  const t = LOGIN_COPY[locale];
  if (reason === "no_email") return t.socialNoEmail;
  if (reason === "account_gone") return t.accountGone;
  if (reason === "identity_taken") return t.socialTaken;
  if (reason === "already_linked") return t.socialAlreadyLinked;
  if (reason === "unavailable") return t.socialUnavailable;
  return t.socialFailed;
}

export function loginHtmlResponse(
  opts: Parameters<typeof renderLoginPage>[0],
  status = 200,
): Response {
  return siteHtmlResponse(renderLoginPage(opts), status);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
