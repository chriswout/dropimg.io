import { CHROME_WEB_STORE_URL } from "../../marketing/extension";
import { LOCALE_CONFIG, type Locale } from "../../marketing/locales";
import { mediaEnabled } from "../lib/media-config";
import type { BillingPortalModel, PortalProductCard } from "../lib/billing/portal";
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
  managePaypal: string;
  dropsProMonthly: string;
  dropsProAnnual: string;
  waFreeLabel: string;
  waDeveloperMonthly: string;
  waDeveloperAnnual: string;
  waProMonthly: string;
  waProAnnual: string;
  intervalMonthly: string;
  intervalAnnual: string;
  waSeparate: string;
  waPlanChangeHint: string;
  waViewPlans: string;
  suspendedHint: string;
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
  apiScopesToggle: string;
  apiWebAssetsHint: string;
  recommended: string;
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
    manageHint:
      "Payment methods stay in PayPal. Receipts for charges appear below as payment history.",
    freePlanHint: "25 MB uploads, 1 hour to 30 days, last 10 drops.",
    planFree: "Drops Free",
    planPro: "Drops Pro",
    renews: (date) => `Renews ${date}`,
    ends: (date) => `Ends ${date}`,
    viewPlans: "View plans",
    manage: "Manage billing",
    managePaypal: "Manage in PayPal",
    dropsProMonthly: "Drops Pro — €2.99/month",
    dropsProAnnual: "Drops Pro — €24.99/year",
    waFreeLabel: "Web Assets Free — $0",
    waDeveloperMonthly: "Web Assets Developer — $9/month",
    waDeveloperAnnual: "Web Assets Developer — $90/year",
    waProMonthly: "Web Assets Pro — $29/month",
    waProAnnual: "Web Assets Pro — $290/year",
    intervalMonthly: "Monthly",
    intervalAnnual: "Annual",
    waSeparate:
      "Projects, storage, and deliveries for permanent /m/… URLs. Separate from Drops Pro.",
    waPlanChangeHint:
      "Plan changes use the same PayPal subscription and take effect at the next renewal. There is no prorated charge today and no second subscription.",
    waViewPlans: "View Web Assets plans",
    suspendedHint:
      "PayPal marked this subscription as suspended after payment failed. Update the payment method in PayPal. DropIMG may email you about payment issues; delivery is not guaranteed.",
    sectionSecurity: "Security",
    sessionsHint: "Sign out everywhere this account is open.",
    signOutAll: "Sign out of all devices",
    integrations: "Integrations",
    integrationsHint: "Connect DropIMG to tools you already use.",
    extensionTitle: "Browser extension",
    extensionBody: "Capture a tab, region, or full page. Uploads land in My Drops.",
    extensionPairHint: "Already installed? Connect from the extension popup — no token to copy.",
    connectExtension: "Create a token manually",
    kindExtension: "Browser Extension",
    kindSharex: "ShareX",
    kindApi: "API key",
    kindOther: "Integration",
    connectedOn: "Connected",
    chromeStore: "Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Send screenshots from ShareX into this DropIMG account.",
    sharexHelp: "Anonymous config (no account)",
    createSharex: "Create ShareX config",
    apiTitle: "Drops API key",
    apiBody: "Upload, list, and delete Drops from scripts and agents.",
    createApi: "Create API key",
    apiDocs: "API docs",
    apiScopesToggle: "Customize permissions",
    apiWebAssetsHint: "Web Assets keys",
    recommended: "Recommended",
    apiScopeWrite: "Upload",
    apiScopeRead: "Read and list",
    apiScopeDelete: "Delete",
    connectedDevices: "Active credentials",
    neverUsed: "Never used",
    created: "Created",
    lastUsed: "Last used",
    justNow: "just now",
    minutesAgo: (n) => (n === 1 ? "1 minute ago" : `${n} minutes ago`),
    hoursAgo: (n) => (n === 1 ? "1 hour ago" : `${n} hours ago`),
    revoke: "Revoke",
    noDevices: "No connected tools yet.",
    lostConfig: "Lost the secret? Revoke it here and create a new one.",
    tokenTitle: "Save this token",
    tokenBody: "Copy it now. DropIMG will not show it again.",
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
    deleteCancelPro: "cancel Drops Pro if active",
    deleteImages: "delete your active DropIMG images",
    deleteIntegrations: "revoke connected integrations",
    deleteSignOut: "sign you out everywhere",
    deleteUndo: "This cannot be undone.",
    deleteAction: "Delete account",
    deleteFailed: "Could not delete this account.",
    billingFail: "We couldn't cancel your Drops Pro subscription, so your DropIMG account was not deleted.",
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
    manageHint:
      "Los métodos de pago siguen en PayPal. Los recibos de los cargos aparecen abajo como historial de pagos.",
    freePlanHint: "Subidas de 25 MB, enlaces de 1 h a 30 días, últimos 10 envíos.",
    planFree: "Drops gratis",
    planPro: "Drops Pro",
    renews: (date) => `Se renueva el ${date}`,
    ends: (date) => `Termina el ${date}`,
    viewPlans: "Ver planes",
    manage: "Gestionar facturación",
    managePaypal: "Gestionar en PayPal",
    dropsProMonthly: "Drops Pro — €2.99/month",
    dropsProAnnual: "Drops Pro — €24.99/year",
    waFreeLabel: "Web Assets Free — $0",
    waDeveloperMonthly: "Web Assets Developer — $9/month",
    waDeveloperAnnual: "Web Assets Developer — $90/year",
    waProMonthly: "Web Assets Pro — $29/month",
    waProAnnual: "Web Assets Pro — $290/year",
    intervalMonthly: "Mensual",
    intervalAnnual: "Anual",
    waSeparate:
      "Proyectos, almacenamiento y entregas para URLs permanentes /m/…. Independiente de Drops Pro.",
    waPlanChangeHint:
      "Los cambios de plan usan la misma suscripción de PayPal y se aplican en la siguiente renovación. No hay cargo prorrateado hoy ni una segunda suscripción.",
    waViewPlans: "Ver planes de Web Assets",
    suspendedHint:
      "PayPal marcó esta suscripción como suspendida tras un pago fallido. Actualiza el método de pago en PayPal. DropIMG puede enviarte un correo sobre el problema; la entrega no está garantizada.",
    sectionSecurity: "Seguridad",
    sessionsHint: "Cierra sesión en todos los dispositivos.",
    signOutAll: "Salir de todos los dispositivos",
    integrations: "Integraciones",
    integrationsHint: "Conecta DropIMG a las herramientas que ya usas.",
    extensionTitle: "Extensión del navegador",
    extensionBody: "Captura una pestaña, una región o la página. Los envíos van a Mis envíos.",
    extensionPairHint: "¿Ya la instalaste? Conéctala desde el popup — sin copiar tokens.",
    connectExtension: "Crear un token a mano",
    kindExtension: "Extensión del navegador",
    kindSharex: "ShareX",
    kindApi: "Clave API",
    kindOther: "Integración",
    connectedOn: "Conectada",
    chromeStore: "Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Envía capturas de ShareX a esta cuenta DropIMG.",
    sharexHelp: "Config anónima (sin cuenta)",
    createSharex: "Crear config de ShareX",
    apiTitle: "Clave API de Drops",
    apiBody: "Sube, lista y borra Drops desde scripts y agentes.",
    createApi: "Crear clave API",
    apiDocs: "Docs de la API",
    apiScopesToggle: "Personalizar permisos",
    apiWebAssetsHint: "Claves de Web Assets",
    recommended: "Recomendado",
    apiScopeWrite: "Subir",
    apiScopeRead: "Leer y listar",
    apiScopeDelete: "Borrar",
    connectedDevices: "Credenciales activas",
    neverUsed: "Sin uso",
    created: "Creado",
    lastUsed: "Último uso",
    justNow: "ahora mismo",
    minutesAgo: (n) => (n === 1 ? "hace 1 minuto" : `hace ${n} minutos`),
    hoursAgo: (n) => (n === 1 ? "hace 1 hora" : `hace ${n} horas`),
    revoke: "Revocar",
    noDevices: "Aún no hay herramientas conectadas.",
    lostConfig: "¿Perdiste el secreto? Revócalo aquí y crea uno nuevo.",
    tokenTitle: "Guarda este token",
    tokenBody: "Cópialo ahora. DropIMG no lo volverá a mostrar.",
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
    deleteCancelPro: "se cancela Drops Pro si está activo",
    deleteImages: "se borran tus imágenes activas de DropIMG",
    deleteIntegrations: "se revocan las integraciones conectadas",
    deleteSignOut: "se cierra la sesión en todos lados",
    deleteUndo: "Esto no se puede deshacer.",
    deleteAction: "Borrar cuenta",
    deleteFailed: "No se pudo borrar la cuenta.",
    billingFail: "No pudimos cancelar tu suscripción Drops Pro, así que la cuenta no se borró.",
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
    manageHint:
      "Os métodos de pagamento ficam no PayPal. Os recibos dos cobranças aparecem abaixo no histórico de pagamentos.",
    freePlanHint: "Envios de 25 MB, links de 1 h a 30 dias, últimos 10 envios.",
    planFree: "Drops grátis",
    planPro: "Drops Pro",
    renews: (date) => `Renova em ${date}`,
    ends: (date) => `Termina em ${date}`,
    viewPlans: "Ver planos",
    manage: "Gerenciar cobrança",
    managePaypal: "Gerenciar no PayPal",
    dropsProMonthly: "Drops Pro — €2.99/month",
    dropsProAnnual: "Drops Pro — €24.99/year",
    waFreeLabel: "Web Assets Free — $0",
    waDeveloperMonthly: "Web Assets Developer — $9/month",
    waDeveloperAnnual: "Web Assets Developer — $90/year",
    waProMonthly: "Web Assets Pro — $29/month",
    waProAnnual: "Web Assets Pro — $290/year",
    intervalMonthly: "Mensal",
    intervalAnnual: "Anual",
    waSeparate:
      "Projetos, armazenamento e entregas para URLs permanentes /m/…. Separado do Drops Pro.",
    waPlanChangeHint:
      "Mudanças de plano usam a mesma assinatura PayPal e valem na próxima renovação. Não há cobrança proporcional hoje nem uma segunda assinatura.",
    waViewPlans: "Ver planos de Web Assets",
    suspendedHint:
      "O PayPal marcou esta assinatura como suspensa depois de um pagamento recusado. Atualize o pagamento no PayPal. O DropIMG pode enviar um e-mail sobre o problema; a entrega não é garantida.",
    sectionSecurity: "Segurança",
    sessionsHint: "Sair de todos os dispositivos desta conta.",
    signOutAll: "Sair de todos os dispositivos",
    integrations: "Integrações",
    integrationsHint: "Conecte o DropIMG às ferramentas que você já usa.",
    extensionTitle: "Extensão do navegador",
    extensionBody: "Capture uma aba, uma região ou a página. Os envios vão para Meus envios.",
    extensionPairHint: "Já instalou? Conecte pelo popup da extensão — sem copiar token.",
    connectExtension: "Criar um token na mão",
    kindExtension: "Extensão do navegador",
    kindSharex: "ShareX",
    kindApi: "Chave de API",
    kindOther: "Integração",
    connectedOn: "Conectada",
    chromeStore: "Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "Envie capturas do ShareX para esta conta DropIMG.",
    sharexHelp: "Config anônima (sem conta)",
    createSharex: "Criar config do ShareX",
    apiTitle: "Chave de API de Drops",
    apiBody: "Envie, liste e apague Drops a partir de scripts e agentes.",
    createApi: "Criar chave de API",
    apiDocs: "Docs da API",
    apiScopesToggle: "Personalizar permissões",
    apiWebAssetsHint: "Chaves de Web Assets",
    recommended: "Recomendado",
    apiScopeWrite: "Enviar",
    apiScopeRead: "Ler e listar",
    apiScopeDelete: "Apagar",
    connectedDevices: "Credenciais ativas",
    neverUsed: "Nunca usado",
    created: "Criado",
    lastUsed: "Último uso",
    justNow: "agora",
    minutesAgo: (n) => (n === 1 ? "há 1 minuto" : `há ${n} minutos`),
    hoursAgo: (n) => (n === 1 ? "há 1 hora" : `há ${n} horas`),
    revoke: "Revogar",
    noDevices: "Nenhuma ferramenta conectada ainda.",
    lostConfig: "Perdeu o segredo? Revogue aqui e crie outro.",
    tokenTitle: "Salve este token",
    tokenBody: "Copie agora. O DropIMG não mostra de novo.",
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
    deleteCancelPro: "cancelar o Drops Pro se estiver ativo",
    deleteImages: "apagar suas imagens ativas do DropIMG",
    deleteIntegrations: "revogar integrações conectadas",
    deleteSignOut: "sair da conta em todos os lugares",
    deleteUndo: "Isso não tem como desfazer.",
    deleteAction: "Excluir conta",
    deleteFailed: "Não foi possível excluir a conta.",
    billingFail: "Não foi possível cancelar sua assinatura Drops Pro, então a conta não foi excluída.",
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
    manageHint:
      "Zahlungsmittel bleiben bei PayPal. Belege zu Abbuchungen stehen unten unter Zahlungshistorie.",
    freePlanHint: "25 MB pro Upload, 1 Stunde bis 30 Tage, letzte 10 Drops.",
    planFree: "Drops kostenlos",
    planPro: "Drops Pro",
    renews: (date) => `Verlängert sich am ${date}`,
    ends: (date) => `Endet am ${date}`,
    viewPlans: "Pläne ansehen",
    manage: "Abrechnung verwalten",
    managePaypal: "In PayPal verwalten",
    dropsProMonthly: "Drops Pro — €2.99/month",
    dropsProAnnual: "Drops Pro — €24.99/year",
    waFreeLabel: "Web Assets Free — $0",
    waDeveloperMonthly: "Web Assets Developer — $9/month",
    waDeveloperAnnual: "Web Assets Developer — $90/year",
    waProMonthly: "Web Assets Pro — $29/month",
    waProAnnual: "Web Assets Pro — $290/year",
    intervalMonthly: "Monatlich",
    intervalAnnual: "Jährlich",
    waSeparate:
      "Projekte, Speicher und Auslieferungen für permanente /m/…-URLs. Getrennt von Drops Pro.",
    waPlanChangeHint:
      "Planwechsel nutzen dasselbe PayPal-Abo und gelten ab der nächsten Verlängerung. Heute gibt es keine anteilige Abbuchung und kein zweites Abo.",
    waViewPlans: "Web-Assets-Pläne ansehen",
    suspendedHint:
      "PayPal hat dieses Abo nach einem fehlgeschlagenen Zahlung als gesperrt markiert. Zahlungsmittel in PayPal aktualisieren. DropIMG kann eine E-Mail zum Zahlungsproblem senden; Zustellung ist nicht garantiert.",
    sectionSecurity: "Sicherheit",
    sessionsHint: "Überall abmelden, wo dieses Konto offen ist.",
    signOutAll: "Auf allen Geräten abmelden",
    integrations: "Integrationen",
    integrationsHint: "Verbinde DropIMG mit Tools, die du schon nutzt.",
    extensionTitle: "Browser-Erweiterung",
    extensionBody: "Tab, Bereich oder ganze Seite aufnehmen. Uploads landen in Meine Drops.",
    extensionPairHint: "Schon installiert? Im Popup verbinden — kein Token zum Kopieren.",
    connectExtension: "Token manuell erstellen",
    kindExtension: "Browser-Erweiterung",
    kindSharex: "ShareX",
    kindApi: "API-Schlüssel",
    kindOther: "Integration",
    connectedOn: "Verbunden",
    chromeStore: "Chrome Web Store",
    sharexTitle: "ShareX",
    sharexBody: "ShareX-Aufnahmen in dieses DropIMG-Konto senden.",
    sharexHelp: "Anonyme Config (kein Konto)",
    createSharex: "ShareX-Config erstellen",
    apiTitle: "Drops-API-Schlüssel",
    apiBody: "Drops aus Skripten und Agenten hochladen, listen und löschen.",
    createApi: "API-Schlüssel erstellen",
    apiDocs: "API-Docs",
    apiScopesToggle: "Berechtigungen anpassen",
    apiWebAssetsHint: "Web-Assets-Schlüssel",
    recommended: "Empfohlen",
    apiScopeWrite: "Hochladen",
    apiScopeRead: "Lesen und listen",
    apiScopeDelete: "Löschen",
    connectedDevices: "Aktive Zugangsdaten",
    neverUsed: "Noch nicht genutzt",
    created: "Erstellt",
    lastUsed: "Zuletzt genutzt",
    justNow: "gerade eben",
    minutesAgo: (n) => (n === 1 ? "vor 1 Minute" : `vor ${n} Minuten`),
    hoursAgo: (n) => (n === 1 ? "vor 1 Stunde" : `vor ${n} Stunden`),
    revoke: "Widerrufen",
    noDevices: "Noch keine verbundenen Tools.",
    lostConfig: "Geheimnis weg? Hier widerrufen und einen neuen erstellen.",
    tokenTitle: "Token jetzt sichern",
    tokenBody: "Jetzt kopieren. DropIMG zeigt ihn nicht noch einmal.",
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
    deleteCancelPro: "Drops Pro wird gekündigt, falls aktiv",
    deleteImages: "deine aktiven DropIMG-Bilder werden gelöscht",
    deleteIntegrations: "verbundene Integrationen werden widerrufen",
    deleteSignOut: "du wirst überall abgemeldet",
    deleteUndo: "Das lässt sich nicht rückgängig machen.",
    deleteAction: "Konto löschen",
    deleteFailed: "Konto konnte nicht gelöscht werden.",
    billingFail:
      "Wir konnten dein Drops-Pro-Abo nicht kündigen, daher wurde das DropIMG-Konto nicht gelöscht.",
    billingFailHint: "Abrechnung verwalten oder erneut versuchen.",
    skip: "Zum Konto",
  },
};

type SettingsProps = {
  locale: Locale;
  env: { ENVIRONMENT?: string; MEDIA_ENABLED?: string };
  email: string;
  plan: "free" | "pro";
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  dropsInterval?: "monthly" | "annual" | null;
  dropsStatus?: string | null;
  webAssets?: {
    plan: "free" | "developer" | "pro";
    interval: "monthly" | "annual" | null;
    periodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    status?: string | null;
  };
  identities?: Array<"google" | "github">;
  socialEnabled?: { google?: boolean; github?: boolean };
  linkError?: string;
  portal?: BillingPortalModel;
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

/** Plan state, payment history, and PayPal-backed management. */
export function renderBillingPage(opts: SettingsProps): string {
  const t = ACCOUNT_COPY[opts.locale];
  const portal = opts.portal ?? fallbackPortal(opts);
  const drops = portal.drops;
  const wa = portal.webAssets;
  const payments = portal.payments;

  const main = `${productCardHtml({
    locale: opts.locale,
    t,
    title: "Web Assets",
    card: wa,
    fallbackLabel: waLabelFromProps(opts, t),
    fallbackHint: t.waSeparate,
    viewPlansHref: "/pricing",
    viewPlansLabel: t.waViewPlans,
    portalId: "account-portal-wa",
    changeId: "billing-change-wa",
    cancelId: "billing-cancel-wa",
    product: "web_assets",
  })}
    ${productCardHtml({
      locale: opts.locale,
      t,
      title: "Drops Pro",
      card: drops,
      fallbackLabel:
        opts.plan === "pro"
          ? opts.dropsInterval === "annual"
            ? t.dropsProAnnual
            : opts.dropsInterval === "monthly"
              ? t.dropsProMonthly
              : t.planPro
          : t.planFree,
      fallbackHint: opts.dropsStatus?.trim().toLowerCase() === "suspended" ? t.suspendedHint : opts.plan === "pro" ? t.manageHint : t.freePlanHint,
      viewPlansHref: "/pro",
      viewPlansLabel: t.viewPlans,
      portalId: "account-portal",
      changeId: "billing-change-drops",
      cancelId: "billing-cancel-drops",
      product: "drops_pro",
    })}
    <section class="settings-card billing-history">
      <h2>Payment history</h2>
      ${
        payments.length === 0
          ? `<p class="account-muted">No payments yet.</p>`
          : `<div class="billing-pay-list">${payments
              .map((row) => paymentRowHtml(row, opts.locale))
              .join("")}</div>`
      }
    </section>
    <p id="wa-billing-status" class="account-muted" hidden></p>
    ${billingDialogsHtml(t)}`;

  return renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "billing",
    title: t.titleBilling,
    plan: opts.plan,
    webAssetsPlan: opts.webAssets?.plan,
    main,
    extraBody: `<script type="application/json" id="billing-portal-data">${escJson({
      drops,
      webAssets: wa,
    })}</script><script>${PORTAL_SCRIPT}</script>`,
  });
}

function fallbackPortal(opts: SettingsProps): BillingPortalModel {
  const dropsEntitled = opts.plan === "pro";
  const waPlan = opts.webAssets?.plan ?? "free";
  const waEntitled = waPlan !== "free";
  const dropsSuspended = opts.dropsStatus?.trim().toLowerCase() === "suspended";
  const waSuspended = opts.webAssets?.status?.trim().toLowerCase() === "suspended";
  return {
    drops: {
      product: "drops_pro",
      entitled: dropsEntitled,
      planLabel:
        opts.plan === "pro"
          ? opts.dropsInterval === "annual"
            ? ACCOUNT_COPY[opts.locale].dropsProAnnual
            : opts.dropsInterval === "monthly"
              ? ACCOUNT_COPY[opts.locale].dropsProMonthly
              : ACCOUNT_COPY[opts.locale].planPro
          : ACCOUNT_COPY[opts.locale].planFree,
      priceLabel: "",
      status: dropsSuspended ? "suspended" : dropsEntitled ? "active" : "expired",
      statusLabel: dropsSuspended ? "Suspended" : dropsEntitled ? "Active" : "Free",
      periodEnd: opts.periodEnd,
      cancelAtPeriodEnd: opts.cancelAtPeriodEnd,
      pendingLabel: null,
      pendingEffectiveAt: null,
      canChangePlan: dropsEntitled && !opts.cancelAtPeriodEnd && !dropsSuspended,
      canCancel: dropsEntitled && !opts.cancelAtPeriodEnd && !dropsSuspended,
      options: dropsEntitled
        ? [
            {
              plan: "pro",
              interval: opts.dropsInterval === "annual" ? "monthly" : "annual",
              label:
                opts.dropsInterval === "annual"
                  ? ACCOUNT_COPY[opts.locale].dropsProMonthly
                  : ACCOUNT_COPY[opts.locale].dropsProAnnual,
            },
          ]
        : [],
    },
    webAssets: {
      product: "web_assets",
      entitled: waEntitled,
      planLabel: waLabelFromProps(opts, ACCOUNT_COPY[opts.locale]),
      priceLabel: "",
      status: waSuspended ? "suspended" : waEntitled ? "active" : "expired",
      statusLabel: waSuspended ? "Suspended" : waEntitled ? "Active" : "Free",
      periodEnd: opts.webAssets?.periodEnd ?? null,
      cancelAtPeriodEnd: Boolean(opts.webAssets?.cancelAtPeriodEnd),
      pendingLabel: null,
      pendingEffectiveAt: null,
      canChangePlan: waEntitled && !opts.webAssets?.cancelAtPeriodEnd && !waSuspended,
      canCancel: waEntitled && !opts.webAssets?.cancelAtPeriodEnd && !waSuspended,
      options: [],
    },
    payments: [],
    paypalWalletUrl: null,
  };
}

function waLabelFromProps(opts: SettingsProps, t: Copy): string {
  const wa = opts.webAssets;
  if (wa?.plan === "developer") {
    return wa.interval === "annual" ? t.waDeveloperAnnual : t.waDeveloperMonthly;
  }
  if (wa?.plan === "pro") {
    return wa.interval === "annual" ? t.waProAnnual : t.waProMonthly;
  }
  return t.waFreeLabel;
}

function productCardHtml(opts: {
  locale: Locale;
  t: Copy;
  title: string;
  card?: PortalProductCard;
  fallbackLabel: string;
  fallbackHint: string;
  viewPlansHref: string;
  viewPlansLabel: string;
  portalId: string;
  changeId: string;
  cancelId: string;
  product: "drops_pro" | "web_assets";
}): string {
  const card = opts.card;
  const label = card?.planLabel || opts.fallbackLabel;
  const status = card?.statusLabel;
  const periodEnd = card?.periodEnd;
  const period =
    periodEnd && (card?.entitled || card?.cancelAtPeriodEnd)
      ? card.cancelAtPeriodEnd || card.status === "canceled_paid_through"
        ? opts.t.ends(formatDay(periodEnd, opts.locale))
        : opts.t.renews(formatDay(periodEnd, opts.locale))
      : "";
  const suspended = card?.status === "suspended";
  const hint = suspended
    ? opts.t.suspendedHint
    : card?.entitled
      ? opts.product === "web_assets"
        ? `${opts.t.waSeparate} ${opts.t.waPlanChangeHint}`
        : opts.t.manageHint
      : opts.fallbackHint;
  const pending =
    card?.pendingLabel && card.pendingEffectiveAt
      ? `<p class="account-muted">Scheduled: ${esc(card.pendingLabel)} from ${esc(formatDay(card.pendingEffectiveAt, opts.locale))}. No prorated charge today.</p>`
      : "";

  let actions = "";
  if (card?.canChangePlan) {
    actions += `<button type="button" class="btn secondary" id="${opts.changeId}" data-product="${opts.product}">Change plan</button>`;
  }
  if (card?.entitled || suspended || card?.status === "canceled_paid_through") {
    actions += `<button type="button" class="btn secondary" id="${opts.portalId}">${esc(opts.t.managePaypal)}</button>`;
  }
  if (card?.canCancel) {
    actions += `<button type="button" class="btn ghost" id="${opts.cancelId}" data-product="${opts.product}" data-period-end="${periodEnd ?? ""}">Cancel renewal</button>`;
  }
  if (!actions) {
    actions = `<a class="btn primary" href="${esc(opts.viewPlansHref)}">${esc(opts.viewPlansLabel)}</a>`;
  }

  return `<section class="settings-card billing-product" data-product="${opts.product}">
      <p class="settings-eyebrow">${esc(opts.title)}</p>
      <p class="settings-value settings-value-lg">${esc(label)}</p>
      ${card?.priceLabel && card.entitled ? `<p class="account-muted">${esc(card.priceLabel)}</p>` : ""}
      ${status ? `<p class="account-muted">Status: ${esc(status)}</p>` : ""}
      ${period ? `<p class="account-muted">${esc(period)}</p>` : ""}
      ${pending}
      <p class="account-muted">${esc(hint)}</p>
      <div class="settings-actions">${actions}</div>
    </section>`;
}

function paymentRowHtml(
  row: BillingPortalModel["payments"][number],
  locale: Locale,
): string {
  const date = row.paidAt ? formatDay(row.paidAt, locale) : "";
  const status =
    row.status === "refunded" ? "Refunded" : row.status === "failed" ? "Failed" : "Paid";
  const receipt = row.receiptUrl
    ? `<a class="billing-receipt" href="${esc(row.receiptUrl)}" rel="noopener" target="_blank">View in PayPal</a>`
    : "";
  return `<article class="billing-pay-row">
      <div>
        <p class="billing-pay-date">${esc(date)}</p>
        <p class="billing-pay-product">${esc(row.productLabel)}</p>
      </div>
      <p class="billing-pay-amount">${esc(row.amountLabel)}</p>
      <p class="billing-pay-status">${esc(status)}</p>
      ${receipt}
    </article>`;
}

function billingDialogsHtml(t: Copy): string {
  return `<div id="billing-change-modal" class="modal" hidden>
    <div class="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="billing-change-title">
      <h2 id="billing-change-title">Change plan</h2>
      <p id="billing-change-preview"></p>
      <label class="sr-only" for="billing-change-select">New plan</label>
      <select id="billing-change-select"></select>
      <p class="account-muted">No prorated charge today. The new price is billed at the next renewal.</p>
      <p id="billing-change-error" class="form-error" hidden role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="billing-change-close">${esc(t.cancel)}</button>
        <button type="button" class="btn primary" id="billing-change-ok">Confirm change</button>
      </div>
    </div>
  </div>
  <div id="billing-cancel-modal" class="modal" hidden>
    <div class="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="billing-cancel-title">
      <h2 id="billing-cancel-title">Cancel renewal?</h2>
      <p id="billing-cancel-body"></p>
      <p id="billing-cancel-error" class="form-error" hidden role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn secondary" id="billing-cancel-keep">Keep subscription</button>
        <button type="button" class="btn danger" id="billing-cancel-ok">Cancel renewal</button>
      </div>
    </div>
  </div>`;
}

function escJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Extension and ShareX tokens. `/account` also lands here, see routes. */
export function renderIntegrationsPage(opts: SettingsProps): string {
  const t = ACCOUNT_COPY[opts.locale];
  const waKeys = mediaEnabled(opts.env)
    ? `<a href="/app/media">${esc(t.apiWebAssetsHint)}</a>
            <span aria-hidden="true">·</span>
            `
    : "";

  const main = `<section class="settings-card integ-catalog">
      <article class="integ-item">
        <div class="integ-item-copy">
          <p class="integ-kicker">${esc(t.recommended)}</p>
          <h2 class="integ-item-title">${esc(t.extensionTitle)}</h2>
          <p>${esc(t.extensionBody)}</p>
          <p class="account-muted">${esc(t.extensionPairHint)}</p>
        </div>
        <div class="integ-item-actions">
          <a class="btn primary" href="${esc(CHROME_WEB_STORE_URL)}" rel="noopener" target="_blank">${esc(t.chromeStore)}</a>
          <button type="button" class="btn ghost" id="integ-extension">${esc(t.connectExtension)}</button>
        </div>
      </article>
      <article class="integ-item">
        <div class="integ-item-copy">
          <h2 class="integ-item-title">${esc(t.sharexTitle)}</h2>
          <p>${esc(t.sharexBody)}</p>
          <p class="account-muted"><a href="/sharex">${esc(t.sharexHelp)}</a></p>
        </div>
        <div class="integ-item-actions">
          <button type="button" class="btn secondary" id="integ-sharex">${esc(t.createSharex)}</button>
        </div>
      </article>
      <article class="integ-item">
        <div class="integ-item-copy">
          <h2 class="integ-item-title">${esc(t.apiTitle)}</h2>
          <p>${esc(t.apiBody)}</p>
          <p class="integ-item-links account-muted">
            ${waKeys}<a href="/developers">${esc(t.apiDocs)}</a>
          </p>
          <details class="integ-scopes-wrap">
            <summary>${esc(t.apiScopesToggle)}</summary>
            <fieldset class="integ-scopes">
              <legend class="sr-only">${esc(t.apiTitle)}</legend>
              <label><input type="checkbox" id="scope-write" checked /> ${esc(t.apiScopeWrite)}</label>
              <label><input type="checkbox" id="scope-read" checked /> ${esc(t.apiScopeRead)}</label>
              <label><input type="checkbox" id="scope-delete" checked /> ${esc(t.apiScopeDelete)}</label>
            </fieldset>
          </details>
        </div>
        <div class="integ-item-actions">
          <button type="button" class="btn secondary" id="integ-api">${esc(t.createApi)}</button>
        </div>
      </article>
    </section>
    <section class="settings-card">
      <h2>${esc(t.connectedDevices)}</h2>
      <div id="integ-list" class="integ-list"></div>
      <p id="integ-lost" class="account-muted" hidden>${esc(t.lostConfig)}</p>
    </section>`;

  return renderAppShellPage({
    locale: opts.locale,
    env: opts.env,
    section: "integrations",
    title: t.titleIntegrations,
    plan: opts.plan,
    webAssetsPlan: opts.webAssets?.plan,
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
      <p class="account-muted" id="token-warn">${esc(t.tokenWarn)}</p>
      <div class="dialog-actions">
        <button type="button" class="btn ghost" id="token-done">${esc(t.done)}</button>
        <button type="button" class="btn secondary" id="token-download" hidden>${esc(t.downloadSharex)}</button>
        <button type="button" class="btn primary" id="token-copy">${esc(t.copyToken)}</button>
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
      const lostHint = document.getElementById("integ-lost");
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
        if (lostHint) lostHint.hidden = tokens.length === 0;
        if (!tokens.length) {
          const empty = document.createElement("p");
          empty.className = "account-muted integ-empty";
          empty.textContent = labels.noDevices;
          list.append(empty);
          return;
        }
        for (const row of tokens) {
          const item = document.createElement("div");
          item.className = "integ-row";
          const meta = document.createElement("div");
          meta.className = "integ-row-main";
          const title = document.createElement("p");
          title.className = "integ-row-title";
          title.textContent = row.kind === "extension"
            ? labels.kindExtension
            : row.kind === "sharex"
              ? labels.kindSharex
              : row.kind === "api"
                ? labels.kindApi
                : labels.kindOther;
          const sub = document.createElement("p");
          sub.className = "integ-row-meta";
          const when = row.lastUsedAt
            ? labels.lastUsed + " " + formatWhen(row.lastUsedAt, labels.neverUsed)
            : labels.neverUsed;
          sub.textContent = (row.label || "") + " · " + when;
          meta.append(title, sub);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn secondary btn-sm";
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
        if (kind === "sharex") downloadSharex();
        await loadTokens();
      }

      function downloadSharex() {
        if (!lastSharex) return;
        const blob = new Blob([JSON.stringify(lastSharex, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dropimg-sharex.sxcu";
        a.click();
        URL.revokeObjectURL(url);
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
      tokenDownload?.addEventListener("click", downloadSharex);
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
    webAssetsPlan: opts.webAssets?.plan,
    main,
    extraBody: dangerExtraBody(t),
  });
}

/** Opens the PayPal wallet and runs plan-change / cancel dialogs. */
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
      document.getElementById("account-portal-wa")?.addEventListener("click", () => { void openPortal(); });
      document.getElementById("delete-fail-billing")?.addEventListener("click", () => { void openPortal(); });

      const dataEl = document.getElementById("billing-portal-data");
      const portal = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};
      let changeProduct = "web_assets";
      let cancelProduct = "web_assets";
      let cancelPeriodEnd = "";
      const changeModal = document.getElementById("billing-change-modal");
      const cancelModal = document.getElementById("billing-cancel-modal");
      const select = document.getElementById("billing-change-select");
      const preview = document.getElementById("billing-change-preview");
      const changeErr = document.getElementById("billing-change-error");
      const cancelBody = document.getElementById("billing-cancel-body");
      const cancelErr = document.getElementById("billing-cancel-error");

      function card(product) {
        return product === "drops_pro" ? portal.drops : portal.webAssets;
      }
      function fmt(unix) {
        if (!unix) return "";
        try {
          return new Date(Number(unix) * 1000).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric"
          });
        } catch { return ""; }
      }
      function openChange(product) {
        const c = card(product);
        if (!c || !select) return;
        changeProduct = product;
        select.innerHTML = (c.options || []).map((o) =>
          "<option value=\\"" + o.plan + ":" + o.interval + "\\">" + o.label + "</option>"
        ).join("");
        if (preview) {
          const first = (c.options || [])[0];
          preview.textContent = first
            ? ("Current: " + c.planLabel + ". Change to " + first.label + ". Effective " + fmt(c.periodEnd) + ". Next charge billed at renewal. No prorated charge today.")
            : "";
        }
        if (changeErr) changeErr.hidden = true;
        if (changeModal) changeModal.hidden = false;
      }
      function openCancel(product, periodEnd) {
        cancelProduct = product;
        cancelPeriodEnd = periodEnd || "";
        const c = card(product);
        const when = fmt(periodEnd || (c && c.periodEnd));
        if (cancelBody) {
          cancelBody.textContent = when
            ? ("Cancel " + ((c && c.planLabel) || "this subscription") + "? You will keep paid access until " + when + ". After that, the account returns to Free limits. Existing public /m/… URLs continue serving according to the established downgrade policy.")
            : "Cancel renewal? Paid access continues until the end of the period already paid for.";
        }
        if (cancelErr) cancelErr.hidden = true;
        if (cancelModal) cancelModal.hidden = false;
      }
      document.getElementById("billing-change-wa")?.addEventListener("click", () => openChange("web_assets"));
      document.getElementById("billing-change-drops")?.addEventListener("click", () => openChange("drops_pro"));
      document.getElementById("billing-cancel-wa")?.addEventListener("click", (e) => {
        openCancel("web_assets", e.currentTarget.getAttribute("data-period-end"));
      });
      document.getElementById("billing-cancel-drops")?.addEventListener("click", (e) => {
        openCancel("drops_pro", e.currentTarget.getAttribute("data-period-end"));
      });
      select?.addEventListener("change", () => {
        const c = card(changeProduct);
        const [plan, interval] = (select.value || "").split(":");
        const opt = (c && c.options || []).find((o) => o.plan === plan && o.interval === interval);
        if (preview && c && opt) {
          preview.textContent = "Current: " + c.planLabel + ". Change to " + opt.label + ". Effective " + fmt(c.periodEnd) + ". Next charge billed at renewal. No prorated charge today.";
        }
      });
      document.getElementById("billing-change-close")?.addEventListener("click", () => {
        if (changeModal) changeModal.hidden = true;
      });
      document.getElementById("billing-cancel-keep")?.addEventListener("click", () => {
        if (cancelModal) cancelModal.hidden = true;
      });
      document.getElementById("billing-change-ok")?.addEventListener("click", async () => {
        const [plan, interval] = (select && select.value || "").split(":");
        const res = await fetch("/api/billing/revise", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: changeProduct, plan, interval }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (changeErr) { changeErr.hidden = false; changeErr.textContent = body.error || "Could not start that plan change."; }
          return;
        }
        if (body.url) location.href = body.url;
        else location.reload();
      });
      document.getElementById("billing-cancel-ok")?.addEventListener("click", async () => {
        const res = await fetch("/api/billing/cancel", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: cancelProduct }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (cancelErr) { cancelErr.hidden = false; cancelErr.textContent = body.error || "Could not cancel renewal."; }
          return;
        }
        location.reload();
      });

      const params = new URLSearchParams(location.search);
      if (params.get("checkout") === "success" && params.get("product") === "web_assets") {
        const status = document.getElementById("wa-billing-status");
        if (status) {
          status.hidden = false;
          status.textContent = "Payment received. Activating Web Assets…";
        }
        const subscriptionId = params.get("subscription_id");
        void fetch("/api/billing/web-assets/sync", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscriptionId ? { subscription_id: subscriptionId } : {}),
        }).then((res) => res.ok ? location.replace("/app/billing") : null);
      }
      if (params.get("revise") === "success") {
        const subscriptionId = params.get("subscription_id");
        const product = params.get("product");
        const path = product === "drops_pro" ? "/api/billing/sync" : "/api/billing/web-assets/sync";
        void fetch(path, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscriptionId ? { subscription_id: subscriptionId } : {}),
        }).then(() => location.replace("/app/billing"));
      }
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
