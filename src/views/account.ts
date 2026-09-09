import { CHROME_WEB_STORE_URL } from "../../marketing/extension";
import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { renderAppShellPage } from "./app-shell";
import { siteHtmlResponse } from "./site-page";

type Copy = {
  title: string;
  titleIntegrations: string;
  titleBilling: string;
  heading: string;
  lede: string;
  sectionAccount: string;
  email: string;
  emailHint: string;
  signInMethods: string;
  signInMethodsHint: string;
  methodGithub: string;
  methodGoogle: string;
  methodConnected: string;
  methodNotConnected: string;
  connect: string;
  disconnect: string;
  socialTaken: string;
  socialAlreadyLinked: string;
  socialNoEmail: string;
  socialFailed: string;
  accountGone: string;
  plan: string;
  manageHint: string;
  freePlanHint: string;
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
  extensionPairHint: string;
  connectExtension: string;
  kindExtension: string;
  kindSharex: string;
  kindApi: string;
  kindOther: string;
  connectedOn: string;
  chromeStore: string;
  sharexTitle: string;
  sharexBody: string;
  sharexHelp: string;
  createSharex: string;
  apiTitle: string;
  apiBody: string;
  createApi: string;
  apiDocs: string;
  apiScopeWrite: string;
  apiScopeRead: string;
  apiScopeDelete: string;
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
    titleIntegrations: "Integrations — dropimg.io",
    titleBilling: "Billing — dropimg.io",
    heading: "Account",
    lede: "Email, plan, and tools for this sign-in.",
    sectionAccount: "Account",
    email: "Email",
    emailHint: "Sign in with Google, GitHub, or a one-time email link. There is no password.",
    signInMethods: "Sign-in methods",
    signInMethodsHint: "You can always use a one-time link at this email.",
    methodGithub: "GitHub",
    methodGoogle: "Google",
    methodConnected: "Connected",
    methodNotConnected: "Not connected",
    connect: "Connect",
    disconnect: "Disconnect",
    socialTaken: "That Google or GitHub account is already connected to a different DropIMG user.",
    socialAlreadyLinked:
      "This account already has that sign-in method. Disconnect it first to use a different one.",
    socialNoEmail:
      "That account has no verified email we can use. Try a different account or keep the email link.",
    socialFailed: "Could not connect that account. Try again.",
    accountGone: "This account is no longer available.",
    plan: "Plan",
    manageHint: "Cancel or change payment in your PayPal wallet.",
    freePlanHint: "10 MB uploads, 24-hour links, last 10 drops.",
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
    extensionPairHint: "Connect from the DropIMG extension — no token to copy.",
    connectExtension: "Create a token manually",
    kindExtension: "Browser Extension",
    kindSharex: "ShareX",
    kindApi: "API key",
    kindOther: "Integration",
    connectedOn: "Connected",
    chromeStore: "Available on the Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Send ShareX screenshots directly to your DropIMG account.",
    sharexHelp: "Anonymous config (no account)",
    createSharex: "Create ShareX config",
    apiTitle: "API key",
    apiBody: "Upload, list, and delete images from scripts and agents.",
    createApi: "Create API key",
    apiDocs: "Docs",
    apiScopeWrite: "Upload",
    apiScopeRead: "Read and list",
    apiScopeDelete: "Delete",
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
    titleIntegrations: "Integraciones — dropimg.io",
    titleBilling: "Facturación — dropimg.io",
    heading: "Cuenta",
    lede: "Correo, plan y herramientas de este acceso.",
    sectionAccount: "Cuenta",
    email: "Correo",
    emailHint: "Entras con Google, GitHub o un enlace por correo. No hay contraseña.",
    signInMethods: "Métodos de acceso",
    signInMethodsHint: "Siempre puedes usar un enlace de un solo uso en este correo.",
    methodGithub: "GitHub",
    methodGoogle: "Google",
    methodConnected: "Conectado",
    methodNotConnected: "Sin conectar",
    connect: "Conectar",
    disconnect: "Desconectar",
    socialTaken: "Esa cuenta de Google o GitHub ya está conectada a otro usuario de DropIMG.",
    socialAlreadyLinked:
      "Esta cuenta ya tiene ese método de acceso. Desconéctalo primero para usar otro.",
    socialNoEmail:
      "Esa cuenta no tiene un correo verificado que podamos usar. Prueba otra o sigue con el enlace.",
    socialFailed: "No se pudo conectar esa cuenta. Inténtalo de nuevo.",
    accountGone: "Esta cuenta ya no está disponible.",
    plan: "Plan",
    manageHint: "Cancela o cambia el pago en tu cuenta de PayPal.",
    freePlanHint: "Subidas de 10 MB, enlaces de 24 h, últimos 10 envíos.",
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
    extensionPairHint: "Conéctala desde la extensión DropIMG — sin copiar tokens.",
    connectExtension: "Crear un token a mano",
    kindExtension: "Extensión del navegador",
    kindSharex: "ShareX",
    kindApi: "Clave API",
    kindOther: "Integración",
    connectedOn: "Conectada",
    chromeStore: "Disponible en Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Envía capturas de ShareX directo a tu cuenta DropIMG.",
    sharexHelp: "Config anónima (sin cuenta)",
    createSharex: "Crear config de ShareX",
    apiTitle: "Clave API",
    apiBody: "Sube, lista y borra imágenes desde scripts y agentes.",
    createApi: "Crear clave API",
    apiDocs: "Docs",
    apiScopeWrite: "Subir",
    apiScopeRead: "Leer y listar",
    apiScopeDelete: "Borrar",
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
    titleIntegrations: "Integrações — dropimg.io",
    titleBilling: "Cobrança — dropimg.io",
    heading: "Conta",
    lede: "E-mail, plano e ferramentas deste login.",
    sectionAccount: "Conta",
    email: "E-mail",
    emailHint: "Você entra com Google, GitHub ou um link por e-mail. Não tem senha.",
    signInMethods: "Formas de entrar",
    signInMethodsHint: "Você sempre pode usar um link de uso único neste e-mail.",
    methodGithub: "GitHub",
    methodGoogle: "Google",
    methodConnected: "Conectado",
    methodNotConnected: "Não conectado",
    connect: "Conectar",
    disconnect: "Desconectar",
    socialTaken: "Essa conta do Google ou GitHub já está ligada a outro usuário do DropIMG.",
    socialAlreadyLinked:
      "Esta conta já tem esse jeito de entrar. Desconecte primeiro para usar outro.",
    socialNoEmail:
      "Essa conta não tem um e-mail verificado que possamos usar. Tente outra ou continue com o link.",
    socialFailed: "Não deu pra conectar essa conta. Tente de novo.",
    accountGone: "Esta conta não está mais disponível.",
    plan: "Plano",
    manageHint: "Cancele ou altere o pagamento na sua conta PayPal.",
    freePlanHint: "Envios de 10 MB, links de 24 h, últimos 10 envios.",
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
    extensionPairHint: "Conecte pela extensão DropIMG — sem copiar token.",
    connectExtension: "Criar um token na mão",
    kindExtension: "Extensão do navegador",
    kindSharex: "ShareX",
    kindApi: "Chave de API",
    kindOther: "Integração",
    connectedOn: "Conectada",
    chromeStore: "Disponível na Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Envie capturas do ShareX direto para sua conta DropIMG.",
    sharexHelp: "Config anônima (sem conta)",
    createSharex: "Criar config do ShareX",
    apiTitle: "Chave de API",
    apiBody: "Envie, liste e apague imagens a partir de scripts e agentes.",
    createApi: "Criar chave de API",
    apiDocs: "Docs",
    apiScopeWrite: "Enviar",
    apiScopeRead: "Ler e listar",
    apiScopeDelete: "Apagar",
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
    titleIntegrations: "Integrationen — dropimg.io",
    titleBilling: "Abrechnung — dropimg.io",
    heading: "Konto",
    lede: "E-Mail, Plan und Tools für diese Anmeldung.",
    sectionAccount: "Konto",
    email: "E-Mail",
    emailHint: "Anmeldung mit Google, GitHub oder Einmal-Link. Kein Passwort.",
    signInMethods: "Anmeldungen",
    signInMethodsHint: "Du kannst immer einen Einmal-Link an diese E-Mail nutzen.",
    methodGithub: "GitHub",
    methodGoogle: "Google",
    methodConnected: "Verbunden",
    methodNotConnected: "Nicht verbunden",
    connect: "Verbinden",
    disconnect: "Trennen",
    socialTaken: "Dieses Google- oder GitHub-Konto ist schon mit einem anderen DropIMG-Nutzer verbunden.",
    socialAlreadyLinked:
      "Dieses Konto hat diese Anmeldung schon. Erst trennen, um eine andere zu verbinden.",
    socialNoEmail:
      "Dieses Konto hat keine bestätigte E-Mail, die wir nutzen können. Anderes Konto oder E-Mail-Link.",
    socialFailed: "Konto konnte nicht verbunden werden. Bitte nochmal versuchen.",
    accountGone: "Dieses Konto ist nicht mehr verfügbar.",
    plan: "Plan",
    manageHint: "Zahlung in deinem PayPal-Konto ändern oder kündigen.",
    freePlanHint: "10 MB pro Upload, 24-Stunden-Links, letzte 10 Drops.",
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
    extensionPairHint: "Verbinden in der DropIMG-Erweiterung — kein Token zum Kopieren.",
    connectExtension: "Token manuell erstellen",
    kindExtension: "Browser-Erweiterung",
    kindSharex: "ShareX",
    kindApi: "API-Schlüssel",
    kindOther: "Integration",
    connectedOn: "Verbunden",
    chromeStore: "Im Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "ShareX-Aufnahmen direkt in dein DropIMG-Konto senden.",
    sharexHelp: "Anonyme Config (kein Konto)",
    createSharex: "ShareX-Config erstellen",
    apiTitle: "API-Schlüssel",
    apiBody: "Bilder aus Skripten und Agenten hochladen, listen und löschen.",
    createApi: "API-Schlüssel erstellen",
    apiDocs: "Docs",
    apiScopeWrite: "Hochladen",
    apiScopeRead: "Lesen und listen",
    apiScopeDelete: "Löschen",
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

type SettingsProps = {
  locale: Locale;
  env: { ENVIRONMENT?: string };
  email: string;
  plan: "free" | "pro";
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  identities?: Array<"google" | "github">;
  socialEnabled?: { google?: boolean; github?: boolean };
  linkError?: string;
};

export function accountLinkError(
  locale: Locale,
  reason: string | null | undefined,
): string | undefined {
  if (!reason) return undefined;
  const t = ACCOUNT_COPY[locale];
  if (reason === "taken") return t.socialTaken;
  if (reason === "already") return t.socialAlreadyLinked;
  if (reason === "no_email") return t.socialNoEmail;
  if (reason === "gone") return t.accountGone;
  return t.socialFailed;
}

/** Plan state and the PayPal wallet hand-off. */
export function renderBillingPage(opts: SettingsProps): string {
  const t = ACCOUNT_COPY[opts.locale];
  const period =
    opts.periodEnd && opts.plan === "pro"
      ? opts.cancelAtPeriodEnd
        ? t.ends(formatDay(opts.periodEnd, opts.locale))
        : t.renews(formatDay(opts.periodEnd, opts.locale))
      : "";

  const main = `<section class="settings-card">
      <p class="settings-eyebrow">${esc(t.plan)}</p>
      <p class="settings-value settings-value-lg">${esc(opts.plan === "pro" ? t.planPro : t.planFree)}</p>
      ${period ? `<p class="account-muted">${esc(period)}</p>` : ""}
      <p class="account-muted">${esc(opts.plan === "pro" ? t.manageHint : t.freePlanHint)}</p>
      <div class="settings-actions">
        ${
          opts.plan === "pro"
            ? `<button type="button" class="btn secondary" id="account-portal">${esc(t.manage)}</button>`
            : `<a class="btn primary" href="/pro">${esc(t.viewPlans)}</a>`
        }
      </div>
    </section>`;

  return renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "billing",
    title: t.titleBilling,
    plan: opts.plan,
    main,
    extraBody: `<script>${PORTAL_SCRIPT}</script>`,
  });
}

/** Extension and ShareX tokens. `/account` also lands here, see routes. */
export function renderIntegrationsPage(opts: SettingsProps): string {
  const t = ACCOUNT_COPY[opts.locale];

  const main = `<section class="settings-card">
      <div class="integ-tools">
        <article class="integ-tool">
          <h2>${esc(t.extensionTitle)}</h2>
          <p>${esc(t.extensionBody)}</p>
          <p class="account-muted">${esc(t.extensionPairHint)}</p>
          <div class="settings-actions">
            <a class="btn primary" href="${esc(CHROME_WEB_STORE_URL)}" rel="noopener" target="_blank">${esc(t.chromeStore)}</a>
            <button type="button" class="btn secondary" id="integ-extension">${esc(t.connectExtension)}</button>
          </div>
        </article>
        <article class="integ-tool">
          <h2>${esc(t.sharexTitle)}</h2>
          <p>${esc(t.sharexBody)}</p>
          <button type="button" class="btn primary" id="integ-sharex">${esc(t.createSharex)}</button>
          <p class="account-muted"><a href="/sharex">${esc(t.sharexHelp)}</a></p>
        </article>
        <article class="integ-tool">
          <h2>${esc(t.apiTitle)}</h2>
          <p>${esc(t.apiBody)}</p>
          <fieldset class="integ-scopes">
            <legend class="sr-only">${esc(t.apiTitle)}</legend>
            <label><input type="checkbox" id="scope-write" checked /> ${esc(t.apiScopeWrite)}</label>
            <label><input type="checkbox" id="scope-read" checked /> ${esc(t.apiScopeRead)}</label>
            <label><input type="checkbox" id="scope-delete" checked /> ${esc(t.apiScopeDelete)}</label>
          </fieldset>
          <button type="button" class="btn primary" id="integ-api">${esc(t.createApi)}</button>
          <p class="account-muted"><a href="/developers">${esc(t.apiDocs)}</a></p>
        </article>
      </div>
    </section>
    <section class="settings-card">
      <h2>${esc(t.connectedDevices)}</h2>
      <div id="integ-list" class="integ-list"></div>
      <p class="account-muted">${esc(t.lostConfig)}</p>
    </section>`;

  return renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "integrations",
    title: t.titleIntegrations,
    plan: opts.plan,
    main,
    extraBody: integrationsExtraBody(t, opts.locale),
  });
}

function integrationsExtraBody(t: Copy, locale: Locale): string {
  return `<div id="token-modal" class="modal" hidden>
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
  <script>${integrationsScript(t, locale)}</script>`;
}

function dangerExtraBody(t: Copy): string {
  return `<div id="delete-modal" class="modal" hidden>
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
  <script>${PORTAL_SCRIPT}</script>
  <script>
    (() => {
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
    })();
  </script>`;
}

function integrationsScript(t: Copy, locale: Locale): string {
  return `
    (() => {
      const labels = {
        created: ${JSON.stringify(t.created)},
        lastUsed: ${JSON.stringify(t.lastUsed)},
        connectedOn: ${JSON.stringify(t.connectedOn)},
        kindExtension: ${JSON.stringify(t.kindExtension)},
        kindSharex: ${JSON.stringify(t.kindSharex)},
        kindApi: ${JSON.stringify(t.kindApi)},
        kindOther: ${JSON.stringify(t.kindOther)},
        neverUsed: ${JSON.stringify(t.neverUsed)},
        revoke: ${JSON.stringify(t.revoke)},
        noDevices: ${JSON.stringify(t.noDevices)},
        copyToken: ${JSON.stringify(t.copyToken)},
        tokenCopied: ${JSON.stringify(t.tokenCopied)},
        justNow: ${JSON.stringify(t.justNow)},
        minutesAgo: ${JSON.stringify(["1 minute ago", "{n} minutes ago"])},
        hoursAgo: ${JSON.stringify(["1 hour ago", "{n} hours ago"])},
        locale: ${JSON.stringify(LOCALE_CONFIG[locale].htmlLang)},
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
          title.textContent = row.kind === "extension"
            ? labels.kindExtension
            : row.kind === "sharex"
              ? labels.kindSharex
              : row.kind === "api"
                ? labels.kindApi
                : labels.kindOther;
          const sub = document.createElement("p");
          sub.className = "account-muted";
          sub.textContent = row.label;
          const created = document.createElement("p");
          created.className = "account-muted";
          created.textContent = labels.connectedOn + " " + formatWhen(row.createdAt, labels.neverUsed);
          const used = document.createElement("p");
          used.className = "account-muted";
          used.textContent = row.lastUsedAt
            ? labels.lastUsed + " " + formatWhen(row.lastUsedAt, labels.neverUsed)
            : labels.neverUsed;
          meta.append(title, sub, created, used);
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

      async function createToken(label, kind, scopes) {
        const res = await fetch("/api/account/integrations", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, kind, scopes }),
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
      document.getElementById("integ-api")?.addEventListener("click", () => {
        const scopes = [];
        if (document.getElementById("scope-write")?.checked) scopes.push("images:write");
        if (document.getElementById("scope-read")?.checked) scopes.push("images:read");
        if (document.getElementById("scope-delete")?.checked) scopes.push("images:delete");
        if (!scopes.length) return;
        void createToken("API key", "api", scopes);
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
  `;
}

function socialMethodsMarkup(t: Copy, opts: SettingsProps): string {
  const googleOn = Boolean(opts.socialEnabled?.google);
  const githubOn = Boolean(opts.socialEnabled?.github);
  if (!googleOn && !githubOn) return "";
  const linked = new Set(opts.identities ?? []);
  const linkErr = opts.linkError
    ? `<p class="form-error" role="alert">${esc(opts.linkError)}</p>`
    : "";

  const row = (provider: "google" | "github", label: string) => {
    const enabled = provider === "google" ? googleOn : githubOn;
    if (!enabled) return "";
    const isOn = linked.has(provider);
    const action = isOn ? "disconnect" : "connect";
    const btn = isOn ? t.disconnect : t.connect;
    return `<div class="signin-method">
        <div>
          <p class="settings-value">${esc(label)}</p>
          <p class="account-muted">${esc(isOn ? t.methodConnected : t.methodNotConnected)}</p>
        </div>
        <form method="post" action="/api/account/identities/${provider}/${action}" class="signin-method-form">
          <button type="submit" class="btn secondary">${esc(btn)}</button>
        </form>
      </div>`;
  };

  return `<section class="settings-card">
      <h2>${esc(t.signInMethods)}</h2>
      <p class="account-muted">${esc(t.signInMethodsHint)}</p>
      ${linkErr}
      ${row("github", t.methodGithub)}
      ${row("google", t.methodGoogle)}
    </section>`;
}

/** Sign-in identity, session control, and account deletion. */
export function renderAccountPage(opts: SettingsProps): string {
  const t = ACCOUNT_COPY[opts.locale];

  const methods = socialMethodsMarkup(t, opts);
  const main = `<section class="settings-card">
      <p class="settings-eyebrow">${esc(t.email)}</p>
      <p class="settings-value settings-value-lg">${esc(opts.email)}</p>
      <p class="account-muted">${esc(t.emailHint)}</p>
    </section>
    ${methods}
    <section class="settings-card">
      <h2>${esc(t.sectionSecurity)}</h2>
      <p class="account-muted">${esc(t.sessionsHint)}</p>
      <div class="settings-actions">
        <button type="button" class="btn secondary" id="account-logout-all">${esc(t.signOutAll)}</button>
      </div>
    </section>
    <section class="settings-card settings-danger">
      <h2>${esc(t.sectionDanger)}</h2>
      <p class="account-muted">${esc(t.deleteHint)}</p>
      <p id="account-delete-error" class="form-error" hidden role="alert"></p>
      <div class="settings-actions">
        <button type="button" class="btn danger" id="account-delete">${esc(t.deleteAction)}</button>
      </div>
    </section>`;

  return renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "account",
    title: t.title,
    plan: opts.plan,
    main,
    extraBody: dangerExtraBody(t),
  });
}

/** Opens the PayPal wallet. Shared by Billing and the delete fallback. */
const PORTAL_SCRIPT = `
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
    })();
  `;

export function accountHtmlResponse(opts: SettingsProps, status = 200): Response {
  return siteHtmlResponse(renderAccountPage(opts), status);
}

export function integrationsHtmlResponse(
  opts: SettingsProps,
  status = 200,
): Response {
  return siteHtmlResponse(renderIntegrationsPage(opts), status);
}

export function billingHtmlResponse(opts: SettingsProps, status = 200): Response {
  return siteHtmlResponse(renderBillingPage(opts), status);
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
