import type { Locale } from "./locales";
import { DEFAULT_LOCALE, isLocale } from "./locales";

export type UiStrings = {
  chooseImage: string;
  idleDesktop: string;
  idleMobile: string;
  dropHintFormats: string;
  dropItHere: string;
  uploading: string;
  uploaded: string;
  uploadedCopied: string;
  copy: string;
  copied: string;
  open: string;
  deleteNow: string;
  uploadAnother: string;
  tryAgain: string;
  uploadFailed: string;
  shareUrlLabel: string;
  recentDrops: string;
  delete: string;
  imageDeleted: string;
  couldNotDelete: string;
  invalidFormat: string;
  tooLarge: string;
  tooLargeLimit: (mb: number) => string;
  passwordTooShort: string;
  passwordProtected: string;
  manageInDrops: string;
  needLongerTitle: string;
  needLongerBody: string;
  proControlsKicker: string;
  expiresLabel: string;
  expiry1h: string;
  expiry24h: string;
  expiry7d: string;
  expiry30d: string;
  expiry90d: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  networkError: string;
  uploadAborted: string;
  expiresSoon: string;
  expiresInDays: (d: number) => string;
  expiresInHours: (h: number) => string;
  expiresInMins: (m: number) => string;
  expiresPrefix: string;
  errors: Record<string, string>;
  skipToUpload: string;
  langMenu: string;
  suggestSwitch: string;
  suggestDismiss: string;
  productHighlights: string;
  learnMore: string;
};

const en: UiStrings = {
  chooseImage: "Choose image",
  idleDesktop: "Paste, drop, or choose an image",
  idleMobile: "Choose an image to share",
  dropHintFormats: "PNG, JPEG, WebP, GIF · max 10\u00a0MB",
  dropItHere: "Drop it here",
  uploading: "Uploading…",
  uploaded: "Uploaded.",
  uploadedCopied: "Uploaded. Link copied.",
  copy: "Copy",
  copied: "Copied",
  open: "Open",
  deleteNow: "Delete now",
  uploadAnother: "Upload another",
  tryAgain: "Try again",
  uploadFailed: "Upload failed",
  shareUrlLabel: "Share URL",
  recentDrops: "Recent drops",
  delete: "Delete",
  imageDeleted: "Image deleted",
  couldNotDelete: "Could not delete image.",
  invalidFormat: "Please choose a PNG, JPEG, WebP, or GIF image.",
  tooLarge: "File exceeds the 10 MB limit.",
  tooLargeLimit: (mb) => `File exceeds the ${mb} MB limit.`,
  passwordTooShort: "Password must be at least 8 characters.",
  passwordProtected: "Password protected",
  manageInDrops: "Manage in My drops",
  needLongerTitle: "Need it longer?",
  needLongerBody: "Keep links up to 90 days with Pro — €2.99/month.",
  proControlsKicker: "PRO",
  expiresLabel: "Expires",
  expiry1h: "1 hour",
  expiry24h: "24 hours",
  expiry7d: "7 days",
  expiry30d: "30 days",
  expiry90d: "90 days",
  passwordLabel: "Password",
  passwordPlaceholder: "Min. 8 characters",
  networkError: "Network error during upload",
  uploadAborted: "Upload aborted",
  expiresSoon: "soon",
  expiresInDays: (d) => `in ${d} ${d === 1 ? "day" : "days"}`,
  expiresInHours: (h) => `in ${h} ${h === 1 ? "hour" : "hours"}`,
  expiresInMins: (m) => `in ${m} ${m === 1 ? "minute" : "minutes"}`,
  expiresPrefix: "Expires",
  errors: {
    too_large: "File exceeds the 10 MB limit.",
    unsupported_type: "Unsupported or invalid image. Use PNG, JPEG, WebP, or GIF.",
    invalid_image: "Invalid or truncated image file.",
    rate_limited: "Too many uploads. Try again shortly.",
    quota_exceeded: "Daily upload limit reached. Try again tomorrow.",
    server_error: "Upload temporarily unavailable.",
    strip_failed: "Could not strip image metadata.",
    too_many_pixels: "Image dimensions exceed the 50 megapixel limit.",
  },
  skipToUpload: "Skip to upload",
  langMenu: "Language",
  suggestSwitch: "Switch",
  suggestDismiss: "Dismiss",
  productHighlights: "Product highlights",
  learnMore: "Learn more",
};

const es: UiStrings = {
  ...en,
  chooseImage: "Elegir imagen",
  idleDesktop: "Pega, arrastra o elige una imagen",
  idleMobile: "Elige una imagen para compartir",
  dropHintFormats: "PNG, JPEG, WebP, GIF · máx. 10\u00a0MB",
  dropItHere: "Suéltala aquí",
  uploading: "Subiendo…",
  uploaded: "Listo.",
  uploadedCopied: "Listo. Enlace copiado.",
  copy: "Copiar",
  copied: "Copiado",
  open: "Abrir",
  deleteNow: "Borrar ahora",
  uploadAnother: "Subir otra",
  tryAgain: "Reintentar",
  uploadFailed: "No se pudo subir",
  shareUrlLabel: "Enlace para compartir",
  recentDrops: "Recientes",
  delete: "Borrar",
  imageDeleted: "Imagen borrada",
  couldNotDelete: "No se pudo borrar la imagen.",
  invalidFormat: "Elige una imagen PNG, JPEG, WebP o GIF.",
  tooLarge: "El archivo supera los 10 MB.",
  tooLargeLimit: (mb) => `El archivo supera los ${mb} MB.`,
  passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
  passwordProtected: "Protegido con contraseña",
  manageInDrops: "Gestionar en Mis envíos",
  needLongerTitle: "¿Lo necesitas más tiempo?",
  needLongerBody: "Conserva enlaces hasta 90 días con Pro — €2.99/mes.",
  proControlsKicker: "PRO",
  expiresLabel: "Caduca",
  expiry1h: "1 hora",
  expiry24h: "24 horas",
  expiry7d: "7 días",
  expiry30d: "30 días",
  expiry90d: "90 días",
  passwordLabel: "Contraseña",
  passwordPlaceholder: "Mín. 8 caracteres",
  networkError: "Error de red al subir",
  uploadAborted: "Subida cancelada",
  expiresSoon: "enseguida",
  expiresInDays: (d) => `en ${d} ${d === 1 ? "día" : "días"}`,
  expiresInHours: (h) => `en ${h} ${h === 1 ? "hora" : "horas"}`,
  expiresInMins: (m) => `en ${m} ${m === 1 ? "minuto" : "minutos"}`,
  expiresPrefix: "Caduca",
  errors: {
    too_large: "El archivo supera los 10 MB.",
    unsupported_type: "Ese formato no vale. Usa PNG, JPEG, WebP o GIF.",
    invalid_image: "La imagen está incompleta o no se puede leer.",
    rate_limited: "Demasiadas subidas. Prueba en un momento.",
    quota_exceeded: "Llegaste al límite de hoy. Mañana otra vez.",
    server_error: "Ahora mismo no se puede subir. Prueba más tarde.",
    strip_failed: "No se pudieron quitar los metadatos.",
    too_many_pixels: "La imagen es demasiado grande (máx. 50 megapíxeles).",
  },
  skipToUpload: "Ir a subir",
  langMenu: "Idioma",
  suggestSwitch: "Cambiar",
  suggestDismiss: "Ahora no",
  productHighlights: "En resumen",
  learnMore: "Más información",
};

const ptBR: UiStrings = {
  ...en,
  chooseImage: "Escolher imagem",
  idleDesktop: "Cole, arraste ou escolha uma imagem",
  idleMobile: "Escolha uma imagem pra compartilhar",
  dropHintFormats: "PNG, JPEG, WebP, GIF · máx. 10\u00a0MB",
  dropItHere: "Solta aqui",
  uploading: "Enviando…",
  uploaded: "Pronto.",
  uploadedCopied: "Pronto. Link copiado.",
  copy: "Copiar",
  copied: "Copiado",
  open: "Abrir",
  deleteNow: "Excluir agora",
  uploadAnother: "Enviar outra",
  tryAgain: "Tentar de novo",
  uploadFailed: "Não deu pra enviar",
  shareUrlLabel: "Link pra compartilhar",
  recentDrops: "Recentes",
  delete: "Excluir",
  imageDeleted: "Imagem excluída",
  couldNotDelete: "Não deu pra excluir a imagem.",
  invalidFormat: "Escolha uma imagem PNG, JPEG, WebP ou GIF.",
  tooLarge: "O arquivo passa de 10 MB.",
  tooLargeLimit: (mb) => `O arquivo passa de ${mb} MB.`,
  passwordTooShort: "A senha precisa ter pelo menos 8 caracteres.",
  passwordProtected: "Protegido por senha",
  manageInDrops: "Gerenciar em Meus envios",
  needLongerTitle: "Precisa por mais tempo?",
  needLongerBody: "Mantenha links por até 90 dias com Pro — €2.99/mês.",
  proControlsKicker: "PRO",
  expiresLabel: "Expira",
  expiry1h: "1 hora",
  expiry24h: "24 horas",
  expiry7d: "7 dias",
  expiry30d: "30 dias",
  expiry90d: "90 dias",
  passwordLabel: "Senha",
  passwordPlaceholder: "Mín. 8 caracteres",
  networkError: "Erro de rede no envio",
  uploadAborted: "Envio cancelado",
  expiresSoon: "já já",
  expiresInDays: (d) => `em ${d} ${d === 1 ? "dia" : "dias"}`,
  expiresInHours: (h) => `em ${h} ${h === 1 ? "hora" : "horas"}`,
  expiresInMins: (m) => `em ${m} ${m === 1 ? "minuto" : "minutos"}`,
  expiresPrefix: "Expira",
  errors: {
    too_large: "O arquivo passa de 10 MB.",
    unsupported_type: "Formato não aceito. Use PNG, JPEG, WebP ou GIF.",
    invalid_image: "A imagem tá incompleta ou não dá pra ler.",
    rate_limited: "Muitos envios. Tenta de novo daqui a pouco.",
    quota_exceeded: "Limite de hoje esgotado. Volta amanhã.",
    server_error: "Envio indisponível agora. Tenta mais tarde.",
    strip_failed: "Não deu pra remover os metadados.",
    too_many_pixels: "A imagem é grande demais (máx. 50 megapixels).",
  },
  skipToUpload: "Ir pro envio",
  langMenu: "Idioma",
  suggestSwitch: "Mudar",
  suggestDismiss: "Agora não",
  productHighlights: "Em resumo",
  learnMore: "Saiba mais",
};

const de: UiStrings = {
  ...en,
  chooseImage: "Bild wählen",
  idleDesktop: "Einfügen, ablegen oder Bild wählen",
  idleMobile: "Bild zum Teilen wählen",
  dropHintFormats: "PNG, JPEG, WebP, GIF · max. 10\u00a0MB",
  dropItHere: "Hier ablegen",
  uploading: "Wird hochgeladen…",
  uploaded: "Fertig.",
  uploadedCopied: "Fertig. Link kopiert.",
  copy: "Kopieren",
  copied: "Kopiert",
  open: "Öffnen",
  deleteNow: "Jetzt löschen",
  uploadAnother: "Weiteres Bild",
  tryAgain: "Nochmal versuchen",
  uploadFailed: "Upload fehlgeschlagen",
  shareUrlLabel: "Link zum Teilen",
  recentDrops: "Zuletzt",
  delete: "Löschen",
  imageDeleted: "Bild gelöscht",
  couldNotDelete: "Bild ließ sich nicht löschen.",
  invalidFormat: "Bitte PNG, JPEG, WebP oder GIF wählen.",
  tooLarge: "Datei ist größer als 10 MB.",
  tooLargeLimit: (mb) => `Datei ist größer als ${mb} MB.`,
  passwordTooShort: "Passwort muss mindestens 8 Zeichen haben.",
  passwordProtected: "Passwortgeschützt",
  manageInDrops: "In Meine Drops verwalten",
  needLongerTitle: "Länger behalten?",
  needLongerBody: "Links bis 90 Tage mit Pro — €2.99/Monat.",
  proControlsKicker: "PRO",
  expiresLabel: "Läuft ab",
  expiry1h: "1 Stunde",
  expiry24h: "24 Stunden",
  expiry7d: "7 Tage",
  expiry30d: "30 Tage",
  expiry90d: "90 Tage",
  passwordLabel: "Passwort",
  passwordPlaceholder: "Mind. 8 Zeichen",
  networkError: "Netzwerkfehler beim Upload",
  uploadAborted: "Upload abgebrochen",
  expiresSoon: "gleich",
  expiresInDays: (d) => `in ${d} ${d === 1 ? "Tag" : "Tagen"}`,
  expiresInHours: (h) => `in ${h} ${h === 1 ? "Stunde" : "Stunden"}`,
  expiresInMins: (m) => `in ${m} ${m === 1 ? "Minute" : "Minuten"}`,
  expiresPrefix: "Läuft ab",
  errors: {
    too_large: "Datei ist größer als 10 MB.",
    unsupported_type: "Dieses Format geht nicht. Bitte PNG, JPEG, WebP oder GIF.",
    invalid_image: "Bilddatei ist ungültig oder unvollständig.",
    rate_limited: "Zu viele Uploads. Kurz warten und nochmal.",
    quota_exceeded: "Tageslimit erreicht. Morgen wieder.",
    server_error: "Upload gerade nicht möglich. Später nochmal.",
    strip_failed: "Metadaten ließen sich nicht entfernen.",
    too_many_pixels: "Bild ist zu groß (max. 50 Megapixel).",
  },
  skipToUpload: "Zum Upload",
  langMenu: "Sprache",
  suggestSwitch: "Wechseln",
  suggestDismiss: "Nein danke",
  productHighlights: "Auf einen Blick",
  learnMore: "Mehr erfahren",
};

export const UI: Record<Locale, UiStrings> = {
  en,
  es,
  "pt-BR": ptBR,
  de,
};

export function resolveLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE;
  if (isLocale(raw)) return raw;
  if (raw === "pt-br" || raw === "pt") return "pt-BR";
  return DEFAULT_LOCALE;
}

export function t(locale: Locale): UiStrings {
  return UI[locale] ?? UI[DEFAULT_LOCALE];
}
