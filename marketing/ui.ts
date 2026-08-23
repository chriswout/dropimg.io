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
  networkError: string;
  uploadAborted: string;
  expiresSoon: string;
  expiresAbout24h: string;
  expiresInHours: (h: number, m: number) => string;
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
  networkError: "Network error during upload",
  uploadAborted: "Upload aborted",
  expiresSoon: "soon",
  expiresAbout24h: "in about 24 hours",
  expiresInHours: (h, m) => `in ${h}h ${m}m`,
  expiresInMins: (m) => `in ${m}m`,
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
  uploaded: "Subida.",
  uploadedCopied: "Subida. Enlace copiado.",
  copy: "Copiar",
  copied: "Copiado",
  open: "Abrir",
  deleteNow: "Eliminar ahora",
  uploadAnother: "Subir otra",
  tryAgain: "Reintentar",
  uploadFailed: "Error al subir",
  shareUrlLabel: "URL para compartir",
  recentDrops: "Recientes",
  delete: "Eliminar",
  imageDeleted: "Imagen eliminada",
  couldNotDelete: "No se pudo eliminar la imagen.",
  invalidFormat: "Elige una imagen PNG, JPEG, WebP o GIF.",
  tooLarge: "El archivo supera el límite de 10 MB.",
  networkError: "Error de red al subir",
  uploadAborted: "Subida cancelada",
  expiresSoon: "pronto",
  expiresAbout24h: "en unas 24 horas",
  expiresInHours: (h, m) => `en ${h}h ${m}m`,
  expiresInMins: (m) => `en ${m}m`,
  expiresPrefix: "Expira",
  errors: {
    too_large: "El archivo supera el límite de 10 MB.",
    unsupported_type: "Imagen no admitida. Usa PNG, JPEG, WebP o GIF.",
    invalid_image: "Archivo de imagen inválido o incompleto.",
    rate_limited: "Demasiadas subidas. Inténtalo en un momento.",
    quota_exceeded: "Límite diario alcanzado. Prueba mañana.",
    server_error: "Subida temporalmente no disponible.",
    strip_failed: "No se pudieron eliminar los metadatos.",
    too_many_pixels: "La imagen supera el límite de 50 megapíxeles.",
  },
  skipToUpload: "Ir a subir",
  langMenu: "Idioma",
  suggestSwitch: "Cambiar",
  suggestDismiss: "Cerrar",
  productHighlights: "Destacados",
  learnMore: "Más información",
};

const ptBR: UiStrings = {
  ...en,
  chooseImage: "Escolher imagem",
  idleDesktop: "Cole, arraste ou escolha uma imagem",
  idleMobile: "Escolha uma imagem para compartilhar",
  dropHintFormats: "PNG, JPEG, WebP, GIF · máx. 10\u00a0MB",
  dropItHere: "Solte aqui",
  uploading: "Enviando…",
  uploaded: "Enviado.",
  uploadedCopied: "Enviado. Link copiado.",
  copy: "Copiar",
  copied: "Copiado",
  open: "Abrir",
  deleteNow: "Excluir agora",
  uploadAnother: "Enviar outra",
  tryAgain: "Tentar de novo",
  uploadFailed: "Falha no envio",
  shareUrlLabel: "URL para compartilhar",
  recentDrops: "Recentes",
  delete: "Excluir",
  imageDeleted: "Imagem excluída",
  couldNotDelete: "Não foi possível excluir a imagem.",
  invalidFormat: "Escolha uma imagem PNG, JPEG, WebP ou GIF.",
  tooLarge: "O arquivo ultrapassa o limite de 10 MB.",
  networkError: "Erro de rede no envio",
  uploadAborted: "Envio cancelado",
  expiresSoon: "em breve",
  expiresAbout24h: "em cerca de 24 horas",
  expiresInHours: (h, m) => `em ${h}h ${m}m`,
  expiresInMins: (m) => `em ${m}m`,
  expiresPrefix: "Expira",
  errors: {
    too_large: "O arquivo ultrapassa o limite de 10 MB.",
    unsupported_type: "Imagem não suportada. Use PNG, JPEG, WebP ou GIF.",
    invalid_image: "Arquivo de imagem inválido ou incompleto.",
    rate_limited: "Muitos envios. Tente novamente em breve.",
    quota_exceeded: "Limite diário atingido. Tente amanhã.",
    server_error: "Envio temporariamente indisponível.",
    strip_failed: "Não foi possível remover os metadados.",
    too_many_pixels: "A imagem ultrapassa o limite de 50 megapixels.",
  },
  skipToUpload: "Ir para o envio",
  langMenu: "Idioma",
  suggestSwitch: "Mudar",
  suggestDismiss: "Dispensar",
  productHighlights: "Destaques",
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
  uploaded: "Hochgeladen.",
  uploadedCopied: "Hochgeladen. Link kopiert.",
  copy: "Kopieren",
  copied: "Kopiert",
  open: "Öffnen",
  deleteNow: "Jetzt löschen",
  uploadAnother: "Weiteres hochladen",
  tryAgain: "Erneut versuchen",
  uploadFailed: "Upload fehlgeschlagen",
  shareUrlLabel: "Share-URL",
  recentDrops: "Zuletzt",
  delete: "Löschen",
  imageDeleted: "Bild gelöscht",
  couldNotDelete: "Bild konnte nicht gelöscht werden.",
  invalidFormat: "Bitte eine PNG-, JPEG-, WebP- oder GIF-Datei wählen.",
  tooLarge: "Datei überschreitet das 10-MB-Limit.",
  networkError: "Netzwerkfehler beim Upload",
  uploadAborted: "Upload abgebrochen",
  expiresSoon: "bald",
  expiresAbout24h: "in etwa 24 Stunden",
  expiresInHours: (h, m) => `in ${h}h ${m}m`,
  expiresInMins: (m) => `in ${m}m`,
  expiresPrefix: "Läuft ab",
  errors: {
    too_large: "Datei überschreitet das 10-MB-Limit.",
    unsupported_type: "Nicht unterstütztes Bild. PNG, JPEG, WebP oder GIF verwenden.",
    invalid_image: "Ungültige oder unvollständige Bilddatei.",
    rate_limited: "Zu viele Uploads. Bitte kurz warten.",
    quota_exceeded: "Tageslimit erreicht. Morgen erneut versuchen.",
    server_error: "Upload vorübergehend nicht verfügbar.",
    strip_failed: "Metadaten konnten nicht entfernt werden.",
    too_many_pixels: "Bild überschreitet das 50-Megapixel-Limit.",
  },
  skipToUpload: "Zum Upload",
  langMenu: "Sprache",
  suggestSwitch: "Wechseln",
  suggestDismiss: "Schließen",
  productHighlights: "Highlights",
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
