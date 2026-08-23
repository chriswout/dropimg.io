import type { Locale } from "./locales";
import type { HomeCopy, LandingCopy, SharedChrome } from "./types";
import type { PageId } from "./pages";

export const CHROME: Record<Locale, SharedChrome> = {
  en: {
    skipToUpload: "Skip to upload",
    brandHomeAria: "dropimg.io home",
    langMenuAria: "Language",
    privacy: "Privacy",
    terms: "Terms",
    abuse: "Abuse",
    learnMoreAria: "Learn more",
    relatedAria: "Related",
    footerSeo: {
      temporary: "Temporary image hosting",
      paste: "Paste screenshot online",
      share: "Share image with a link",
    },
    homeLink: "Home",
    productHighlights: "Product highlights",
    aboutAria: "About dropimg.io",
    langSuggest: {
      es: "¿Prefieres Español?",
      "pt-BR": "Ver dropimg.io em Português?",
      de: "dropimg.io auf Deutsch anzeigen?",
    },
    suggestSwitch: "Switch",
    suggestDismiss: "Dismiss",
  },
  es: {
    skipToUpload: "Ir a subir",
    brandHomeAria: "Inicio de dropimg.io",
    langMenuAria: "Idioma",
    privacy: "Privacy",
    terms: "Terms",
    abuse: "Abuse",
    learnMoreAria: "Más información",
    relatedAria: "Relacionado",
    footerSeo: {
      temporary: "Alojamiento temporal de imágenes",
      paste: "Pegar captura de pantalla online",
      share: "Compartir imagen con un enlace",
    },
    homeLink: "Inicio",
    productHighlights: "Destacados",
    aboutAria: "Sobre dropimg.io",
    langSuggest: {
      es: "¿Prefieres Español?",
      "pt-BR": "Ver dropimg.io em Português?",
      de: "dropimg.io auf Deutsch anzeigen?",
    },
    suggestSwitch: "Cambiar",
    suggestDismiss: "Cerrar",
  },
  "pt-BR": {
    skipToUpload: "Ir para o envio",
    brandHomeAria: "Início do dropimg.io",
    langMenuAria: "Idioma",
    privacy: "Privacy",
    terms: "Terms",
    abuse: "Abuse",
    learnMoreAria: "Saiba mais",
    relatedAria: "Relacionado",
    footerSeo: {
      temporary: "Hospedagem temporária de imagens",
      paste: "Colar captura de tela online",
      share: "Compartilhar imagem com um link",
    },
    homeLink: "Início",
    productHighlights: "Destaques",
    aboutAria: "Sobre o dropimg.io",
    langSuggest: {
      es: "¿Prefieres Español?",
      "pt-BR": "Ver dropimg.io em Português?",
      de: "dropimg.io auf Deutsch anzeigen?",
    },
    suggestSwitch: "Mudar",
    suggestDismiss: "Dispensar",
  },
  de: {
    skipToUpload: "Zum Upload",
    brandHomeAria: "dropimg.io Startseite",
    langMenuAria: "Sprache",
    privacy: "Privacy",
    terms: "Terms",
    abuse: "Abuse",
    learnMoreAria: "Mehr erfahren",
    relatedAria: "Verwandt",
    footerSeo: {
      temporary: "Temporäres Bildhosting",
      paste: "Screenshot online einfügen",
      share: "Bild per Link teilen",
    },
    homeLink: "Start",
    productHighlights: "Highlights",
    aboutAria: "Über dropimg.io",
    langSuggest: {
      es: "¿Prefieres Español?",
      "pt-BR": "Ver dropimg.io em Português?",
      de: "dropimg.io auf Deutsch anzeigen?",
    },
    suggestSwitch: "Wechseln",
    suggestDismiss: "Schließen",
  },
};

export const HOME: Record<Locale, HomeCopy> = {
  en: {
    title: "Temporary Image Hosting & Screenshot Sharing | dropimg.io",
    description:
      "Paste or drop a screenshot and get a temporary shareable link in seconds. No account. Images expire after 24 hours. PNG, JPEG, WebP, GIF up to 10 MB.",
    ogTitle: "Temporary Image Hosting & Screenshot Sharing | dropimg.io",
    ogDescription:
      "Paste or drop a screenshot and get a temporary shareable link in seconds. No account. Images expire after 24 hours.",
    twitterTitle: "dropimg.io — Drop an image. Get a link.",
    twitterDescription:
      "Fast temporary screenshot sharing. No account. Images expire automatically after 24 hours.",
    h1: "Drop an image. Get a link.",
    subHtml:
      "Paste, drop, or choose an image.<br />\n            No account. Expires in 24 hours.",
    dropzoneAria: "Paste, drop, or choose an image to upload",
    trust: ["No account", "24h expiry", "Metadata stripped"],
    howtoHeading: "How it works",
    howto: [
      { name: "Drop image", detail: "Paste, drop, or choose a file" },
      { name: "Copy link", detail: "Short URL, ready to send" },
      { name: "Share it", detail: "Chat, email, tickets — done" },
    ],
    faqHeading: "FAQ",
    faqs: [
      {
        q: "How long do images stay online?",
        a: "Images expire automatically 24 hours after upload.",
      },
      {
        q: "Do I need an account?",
        a: "No. Upload and share without signing up.",
      },
      {
        q: "Can I delete an image early?",
        a: "Yes. After upload you get a private delete control to remove it before expiry.",
      },
    ],
    schemaAppDescription:
      "A temporary image sharing tool that lets users paste or upload an image and generate a shareable link that expires after 24 hours.",
    schemaSiteDescription:
      "dropimg.io is a temporary image-sharing service that lets users paste, drag, or upload an image and instantly create a shareable link that expires after 24 hours.",
    schemaHowtoName: "How to share a temporary image link with dropimg.io",
    schemaHowtoDescription:
      "Drop an image, copy the link, and share it. Links expire after 24 hours.",
  },
  es: {
    title: "Alojamiento temporal de imágenes y capturas | dropimg.io",
    description:
      "Pega o arrastra una captura y obtén un enlace temporal en segundos. Sin cuenta. Las imágenes expiran a las 24 horas. PNG, JPEG, WebP, GIF hasta 10 MB.",
    ogTitle: "Alojamiento temporal de imágenes y capturas | dropimg.io",
    ogDescription:
      "Pega o arrastra una captura y obtén un enlace temporal en segundos. Sin cuenta. Expira en 24 horas.",
    twitterTitle: "dropimg.io — Suelta una imagen. Obtén un enlace.",
    twitterDescription:
      "Comparte capturas de forma temporal. Sin cuenta. Expira automáticamente a las 24 horas.",
    h1: "Suelta una imagen. Obtén un enlace.",
    subHtml:
      "Pega, arrastra o elige una imagen.<br />\n            Sin cuenta. Expira en 24 horas.",
    dropzoneAria: "Pega, arrastra o elige una imagen para subir",
    trust: ["Sin cuenta", "Expira en 24 h", "Metadatos eliminados"],
    howtoHeading: "Cómo funciona",
    howto: [
      { name: "Sube la imagen", detail: "Pega, arrastra o elige un archivo" },
      { name: "Copia el enlace", detail: "URL corta, lista para enviar" },
      { name: "Compártelo", detail: "Chat, email, tickets — listo" },
    ],
    faqHeading: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Cuánto tiempo permanecen las imágenes online?",
        a: "Las imágenes expiran automáticamente 24 horas después de subirlas.",
      },
      {
        q: "¿Necesito una cuenta?",
        a: "No. Sube y comparte sin registrarte.",
      },
      {
        q: "¿Puedo eliminar una imagen antes?",
        a: "Sí. Tras subirla obtienes un control privado de eliminación para quitarla antes de que expire.",
      },
    ],
    schemaAppDescription:
      "Una herramienta de compartir imágenes temporales que permite pegar o subir una imagen y generar un enlace que expira a las 24 horas.",
    schemaSiteDescription:
      "dropimg.io es un servicio de compartir imágenes temporales: pega, arrastra o sube una imagen y crea al instante un enlace que expira a las 24 horas.",
    schemaHowtoName: "Cómo compartir un enlace temporal de imagen con dropimg.io",
    schemaHowtoDescription:
      "Sube una imagen, copia el enlace y compártelo. Los enlaces expiran a las 24 horas.",
  },
  "pt-BR": {
    title: "Hospedagem temporária de imagens e capturas | dropimg.io",
    description:
      "Cole ou arraste uma captura e receba um link temporário em segundos. Sem conta. As imagens expiram em 24 horas. PNG, JPEG, WebP, GIF até 10 MB.",
    ogTitle: "Hospedagem temporária de imagens e capturas | dropimg.io",
    ogDescription:
      "Cole ou arraste uma captura e receba um link temporário em segundos. Sem conta. Expira em 24 horas.",
    twitterTitle: "dropimg.io — Solte uma imagem. Receba um link.",
    twitterDescription:
      "Compartilhe capturas de forma temporária. Sem conta. Expira automaticamente em 24 horas.",
    h1: "Solte uma imagem. Receba um link.",
    subHtml:
      "Cole, arraste ou escolha uma imagem.<br />\n            Sem conta. Expira em 24 horas.",
    dropzoneAria: "Cole, arraste ou escolha uma imagem para enviar",
    trust: ["Sem conta", "Expira em 24 h", "Metadados removidos"],
    howtoHeading: "Como funciona",
    howto: [
      { name: "Envie a imagem", detail: "Cole, arraste ou escolha um arquivo" },
      { name: "Copie o link", detail: "URL curta, pronta para enviar" },
      { name: "Compartilhe", detail: "Chat, e-mail, tickets — pronto" },
    ],
    faqHeading: "Perguntas frequentes",
    faqs: [
      {
        q: "Por quanto tempo as imagens ficam online?",
        a: "As imagens expiram automaticamente 24 horas após o envio.",
      },
      {
        q: "Preciso de uma conta?",
        a: "Não. Envie e compartilhe sem se cadastrar.",
      },
      {
        q: "Posso excluir uma imagem antes?",
        a: "Sim. Após o envio você recebe um controle privado de exclusão para removê-la antes do prazo.",
      },
    ],
    schemaAppDescription:
      "Uma ferramenta de compartilhamento temporário de imagens que permite colar ou enviar uma imagem e gerar um link que expira em 24 horas.",
    schemaSiteDescription:
      "dropimg.io é um serviço de compartilhamento temporário de imagens: cole, arraste ou envie uma imagem e crie na hora um link que expira em 24 horas.",
    schemaHowtoName: "Como compartilhar um link temporário de imagem com dropimg.io",
    schemaHowtoDescription:
      "Envie uma imagem, copie o link e compartilhe. Os links expiram em 24 horas.",
  },
  de: {
    title: "Temporäres Bildhosting & Screenshot-Sharing | dropimg.io",
    description:
      "Screenshot einfügen oder ablegen und in Sekunden einen temporären Link erhalten. Kein Konto. Bilder laufen nach 24 Stunden ab. PNG, JPEG, WebP, GIF bis 10 MB.",
    ogTitle: "Temporäres Bildhosting & Screenshot-Sharing | dropimg.io",
    ogDescription:
      "Screenshot einfügen oder ablegen und in Sekunden einen temporären Link erhalten. Kein Konto. Läuft nach 24 Stunden ab.",
    twitterTitle: "dropimg.io — Bild hochladen. Link erhalten.",
    twitterDescription:
      "Schnelles temporäres Screenshot-Sharing. Kein Konto. Läuft automatisch nach 24 Stunden ab.",
    h1: "Bild hochladen. Link erhalten.",
    subHtml:
      "Bild einfügen, ablegen oder auswählen.<br />\n            Kein Konto. Läuft nach 24 Stunden ab.",
    dropzoneAria: "Bild einfügen, ablegen oder auswählen zum Hochladen",
    trust: ["Kein Konto", "24 Std. verfügbar", "Metadaten entfernt"],
    howtoHeading: "So funktioniert's",
    howto: [
      { name: "Bild hochladen", detail: "Einfügen, ablegen oder Datei wählen" },
      { name: "Link kopieren", detail: "Kurze URL, bereit zum Senden" },
      { name: "Teilen", detail: "Chat, E-Mail, Tickets — fertig" },
    ],
    faqHeading: "FAQ",
    faqs: [
      {
        q: "Wie lange bleiben Bilder online?",
        a: "Bilder laufen automatisch 24 Stunden nach dem Upload ab.",
      },
      {
        q: "Brauche ich ein Konto?",
        a: "Nein. Hochladen und teilen ohne Anmeldung.",
      },
      {
        q: "Kann ich ein Bild früher löschen?",
        a: "Ja. Nach dem Upload erhältst du eine private Löschfunktion, um es vor Ablauf zu entfernen.",
      },
    ],
    schemaAppDescription:
      "Ein Tool zum temporären Teilen von Bildern: Bild einfügen oder hochladen und einen Link erzeugen, der nach 24 Stunden abläuft.",
    schemaSiteDescription:
      "dropimg.io ist ein temporärer Bild-Sharing-Dienst: Bild einfügen, ablegen oder hochladen und sofort einen Link erzeugen, der nach 24 Stunden abläuft.",
    schemaHowtoName: "So teilst du einen temporären Bildlink mit dropimg.io",
    schemaHowtoDescription:
      "Bild hochladen, Link kopieren und teilen. Links laufen nach 24 Stunden ab.",
  },
};

/** SEO landing copy keyed by pageId (excluding home). */
export const LANDINGS: Record<
  Exclude<PageId, "home">,
  Record<Locale, LandingCopy>
> = {
  "temporary-hosting": {
    en: {
      title: "Temporary Image Hosting — No Account, 24h Expiry | dropimg.io",
      description:
        "Temporary image hosting without accounts. Upload a PNG, JPEG, WebP, or GIF and get a shareable link that expires in 24 hours. Metadata stripped when supported.",
      ogTitle: "Temporary Image Hosting | dropimg.io",
      ogDescription:
        "Host an image for 24 hours. No account. Get a shareable link and move on.",
      twitterTitle: "Temporary Image Hosting | dropimg.io",
      twitterDescription:
        "Host an image for 24 hours. No account. Get a shareable link and move on.",
      h1: "Temporary image hosting",
      lede: "Need a link for an image — not a permanent gallery? dropimg.io hosts the file for 24 hours, then deletes it.",
      blocks: [
        {
          type: "h2",
          text: "What temporary image hosting is for",
        },
        {
          type: "p",
          text: "Permanent hosts are great for blogs and portfolios. Temporary hosting is for the other 90% of sharing: a bug screenshot in Slack, a design draft in Discord, a receipt in a support ticket, a mockup in a pull request.",
        },
        {
          type: "p",
          text: "You get a short URL. Anyone with the link can view it until it expires. There is no public gallery and no account wall.",
        },
        { type: "h2", text: "Why 24 hours" },
        {
          type: "p",
          text: "Most shared images are useful for minutes or hours, not months. A fixed 24-hour lifetime keeps storage short-lived by default and reduces the chance that old uploads linger forever.",
        },
        {
          type: "p",
          text: "Need it gone sooner? After upload you get a private delete control.",
        },
        { type: "h2", text: "What you can upload" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Up to 10\u00a0MB",
            "No SVG (blocked for safety)",
          ],
        },
        { type: "h2", text: "Privacy defaults" },
        {
          type: "p",
          text: "No signup. No searchable library of uploads. Share pages are marked noindex. JPEG, PNG, and WebP uploads have EXIF and similar metadata stripped before storage when stripping succeeds — otherwise the upload is rejected rather than keeping original metadata.",
        },
      ],
    },
    es: {
      title: "Alojamiento temporal de imágenes — Sin cuenta, 24 h | dropimg.io",
      description:
        "Alojamiento temporal de imágenes sin cuenta. Sube PNG, JPEG, WebP o GIF y obtén un enlace que expira en 24 horas. Metadatos eliminados cuando es posible.",
      ogTitle: "Alojamiento temporal de imágenes | dropimg.io",
      ogDescription:
        "Aloja una imagen durante 24 horas. Sin cuenta. Obtén un enlace y sigue.",
      twitterTitle: "Alojamiento temporal de imágenes | dropimg.io",
      twitterDescription:
        "Aloja una imagen durante 24 horas. Sin cuenta. Obtén un enlace y sigue.",
      h1: "Alojamiento temporal de imágenes",
      lede: "¿Necesitas un enlace para una imagen, no una galería permanente? dropimg.io aloja el archivo 24 horas y luego lo elimina.",
      blocks: [
        {
          type: "h2",
          text: "Para qué sirve el alojamiento temporal",
        },
        {
          type: "p",
          text: "Los hosts permanentes sirven para blogs y portfolios. El alojamiento temporal cubre el resto: captura de un bug en Slack, borrador en Discord, recibo en un ticket, mockup en un pull request.",
        },
        {
          type: "p",
          text: "Obtienes una URL corta. Quien tenga el enlace puede verla hasta que expire. No hay galería pública ni muro de registro.",
        },
        { type: "h2", text: "Por qué 24 horas" },
        {
          type: "p",
          text: "La mayoría de las imágenes compartidas sirven minutos u horas, no meses. Un plazo fijo de 24 horas mantiene el almacenamiento breve por defecto.",
        },
        {
          type: "p",
          text: "¿Necesitas borrarla antes? Tras subirla obtienes un control privado de eliminación.",
        },
        { type: "h2", text: "Qué puedes subir" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Hasta 10\u00a0MB",
            "Sin SVG (bloqueado por seguridad)",
          ],
        },
        { type: "h2", text: "Privacidad por defecto" },
        {
          type: "p",
          text: "Sin registro. Sin biblioteca pública de subidas. Las páginas de compartir van con noindex. En JPEG, PNG y WebP se eliminan EXIF y metadatos similares antes de guardar; si no se pueden eliminar, se rechaza la subida.",
        },
        {
          type: "p",
          text: "dropimg.io permite pegar, arrastrar o subir una imagen y crear un enlace temporal que expira automáticamente después de 24 horas.",
        },
      ],
    },
    "pt-BR": {
      title: "Hospedagem temporária de imagens — Sem conta, 24 h | dropimg.io",
      description:
        "Hospedagem temporária de imagens sem conta. Envie PNG, JPEG, WebP ou GIF e receba um link que expira em 24 horas. Metadados removidos quando possível.",
      ogTitle: "Hospedagem temporária de imagens | dropimg.io",
      ogDescription:
        "Hospede uma imagem por 24 horas. Sem conta. Receba um link e siga em frente.",
      twitterTitle: "Hospedagem temporária de imagens | dropimg.io",
      twitterDescription:
        "Hospede uma imagem por 24 horas. Sem conta. Receba um link e siga em frente.",
      h1: "Hospedagem temporária de imagens",
      lede: "Precisa de um link para uma imagem — não de uma galeria permanente? O dropimg.io hospeda o arquivo por 24 horas e depois o exclui.",
      blocks: [
        {
          type: "h2",
          text: "Para que serve a hospedagem temporária",
        },
        {
          type: "p",
          text: "Hosts permanentes são ótimos para blogs e portfólios. A hospedagem temporária cobre o resto: print de bug no Slack, rascunho no Discord, recibo em um ticket, mockup em um pull request.",
        },
        {
          type: "p",
          text: "Você recebe uma URL curta. Quem tiver o link pode ver até expirar. Não há galeria pública nem cadastro.",
        },
        { type: "h2", text: "Por que 24 horas" },
        {
          type: "p",
          text: "A maioria das imagens compartilhadas serve por minutos ou horas, não meses. Um prazo fixo de 24 horas mantém o armazenamento curto por padrão.",
        },
        {
          type: "p",
          text: "Precisa apagar antes? Após o envio você recebe um controle privado de exclusão.",
        },
        { type: "h2", text: "O que você pode enviar" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Até 10\u00a0MB",
            "Sem SVG (bloqueado por segurança)",
          ],
        },
        { type: "h2", text: "Privacidade por padrão" },
        {
          type: "p",
          text: "Sem cadastro. Sem biblioteca pública de uploads. Páginas de compartilhamento vão com noindex. Em JPEG, PNG e WebP, EXIF e metadados similares são removidos antes do armazenamento; se a remoção falhar, o envio é rejeitado.",
        },
        {
          type: "p",
          text: "dropimg.io permite colar, arrastar ou enviar uma imagem e criar um link temporário que expira automaticamente após 24 horas.",
        },
      ],
    },
    de: {
      title: "Temporäres Bildhosting — Kein Konto, 24 Std. | dropimg.io",
      description:
        "Temporäres Bildhosting ohne Konto. PNG, JPEG, WebP oder GIF hochladen und einen Link erhalten, der nach 24 Stunden abläuft. Metadaten werden entfernt, wenn möglich.",
      ogTitle: "Temporäres Bildhosting | dropimg.io",
      ogDescription:
        "Bild 24 Stunden hosten. Kein Konto. Link holen und weiterarbeiten.",
      twitterTitle: "Temporäres Bildhosting | dropimg.io",
      twitterDescription:
        "Bild 24 Stunden hosten. Kein Konto. Link holen und weiterarbeiten.",
      h1: "Temporäres Bildhosting",
      lede: "Brauchst du einen Link für ein Bild — keine dauerhafte Galerie? dropimg.io hostet die Datei 24 Stunden und löscht sie danach.",
      blocks: [
        {
          type: "h2",
          text: "Wofür temporäres Bildhosting gut ist",
        },
        {
          type: "p",
          text: "Dauerhafte Hosts eignen sich für Blogs und Portfolios. Temporäres Hosting deckt den Rest ab: Bug-Screenshot in Slack, Entwurf in Discord, Beleg im Support-Ticket, Mockup im Pull Request.",
        },
        {
          type: "p",
          text: "Du bekommst eine kurze URL. Wer den Link hat, kann das Bild sehen, bis es abläuft. Keine öffentliche Galerie, keine Account-Wand.",
        },
        { type: "h2", text: "Warum 24 Stunden" },
        {
          type: "p",
          text: "Die meisten geteilten Bilder sind Minuten oder Stunden nützlich, nicht Monate. Eine feste 24-Stunden-Frist hält Speicher standardmäßig kurzlebig.",
        },
        {
          type: "p",
          text: "Früher weg damit? Nach dem Upload gibt es eine private Löschfunktion.",
        },
        { type: "h2", text: "Was du hochladen kannst" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Bis 10\u00a0MB",
            "Kein SVG (aus Sicherheitsgründen blockiert)",
          ],
        },
        { type: "h2", text: "Privatsphäre by default" },
        {
          type: "p",
          text: "Keine Anmeldung. Keine durchsuchbare Upload-Bibliothek. Share-Seiten sind noindex. Bei JPEG, PNG und WebP werden EXIF und ähnliche Metadaten vor dem Speichern entfernt — schlägt das fehl, wird der Upload abgelehnt.",
        },
        {
          type: "p",
          text: "Mit dropimg.io kannst du ein Bild einfügen, hochladen oder per Drag-and-drop ablegen und sofort einen temporären Link erstellen, der nach 24 Stunden abläuft.",
        },
      ],
    },
  },
  "paste-screenshot": {
    en: {
      title: "Paste Screenshot Online — Get a Shareable Link | dropimg.io",
      description:
        "Paste a screenshot from your clipboard and get a temporary shareable URL. Works with macOS screenshots, Windows Snipping Tool, Cmd+V / Ctrl+V. No account.",
      ogTitle: "Paste Screenshot Online | dropimg.io",
      ogDescription:
        "Copy a screenshot, paste it here, get a link. No save-to-disk → upload dance.",
      twitterTitle: "Paste Screenshot Online | dropimg.io",
      twitterDescription:
        "Copy a screenshot, paste it here, get a link. No save-to-disk → upload dance.",
      h1: "Paste a screenshot online",
      lede: "Screenshot → clipboard → paste → link. Skip saving a file just to upload it somewhere else.",
      blocks: [
        { type: "h2", text: "macOS" },
        {
          type: "ul",
          items: [
            "Capture to clipboard with Control + Command + Shift + 3/4",
            "Open dropimg.io",
            "Press Command + V",
          ],
        },
        {
          type: "p",
          text: "If you already saved a .png to the desktop, drag it onto the page or use Choose image.",
        },
        { type: "h2", text: "Windows" },
        {
          type: "ul",
          items: [
            "Snipping Tool / Snip & Sketch → copy the snip",
            "Or Windows + Shift + S, then copy",
            "Open dropimg.io and press Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Why clipboard paste beats “save then upload”",
        },
        {
          type: "p",
          text: "Support chats, Discord, Slack, and bug reports are full of “one quick screenshot.” Saving to Downloads, finding the file, and attaching it is friction. Pasting from the clipboard keeps the loop in one browser tab.",
        },
        {
          type: "p",
          text: "dropimg.io returns a temporary URL (24 hours). Send that URL wherever the conversation is happening. You have a screenshot in your clipboard and need a URL — paste it here.",
        },
        { type: "h2", text: "Formats" },
        {
          type: "p",
          text: "PNG and JPEG screenshots work best. WebP and GIF are fine too. Max 10\u00a0MB. SVG is not accepted.",
        },
      ],
    },
    es: {
      title: "Pegar captura de pantalla online — Enlace para compartir | dropimg.io",
      description:
        "Pega una captura del portapapeles y obtén una URL temporal. Funciona con capturas de macOS, Herramienta Recortes de Windows, Cmd+V / Ctrl+V. Sin cuenta.",
      ogTitle: "Pegar captura de pantalla online | dropimg.io",
      ogDescription:
        "Copia una captura, pégala aquí, obtén un enlace. Sin guardar en disco para luego subir.",
      twitterTitle: "Pegar captura de pantalla online | dropimg.io",
      twitterDescription:
        "Copia una captura, pégala aquí, obtén un enlace. Sin el baile de guardar y subir.",
      h1: "Pegar una captura de pantalla online",
      lede: "Captura → portapapeles → pegar → enlace. Olvídate de guardar un archivo solo para subirlo a otro sitio.",
      blocks: [
        { type: "h2", text: "macOS" },
        {
          type: "ul",
          items: [
            "Captura al portapapeles con Control + Command + Shift + 3/4",
            "Abre dropimg.io",
            "Pulsa Command + V",
          ],
        },
        {
          type: "p",
          text: "Si ya guardaste un .png en el escritorio, arrástralo a la página o usa Elegir imagen.",
        },
        { type: "h2", text: "Windows" },
        {
          type: "ul",
          items: [
            "Herramienta Recortes / Snip & Sketch → copia el recorte",
            "O Windows + Shift + S y luego copia",
            "Abre dropimg.io y pulsa Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Por qué pegar desde el portapapeles gana",
        },
        {
          type: "p",
          text: "Chats de soporte, Discord, Slack y reportes de bugs están llenos de “una captura rápida”. Guardar en Descargas, buscar el archivo y adjuntarlo es fricción. Pegar desde el portapapeles deja el flujo en una sola pestaña.",
        },
        {
          type: "p",
          text: "dropimg.io permite pegar, arrastrar o subir una imagen y crear un enlace temporal que expira automáticamente después de 24 horas. Tienes una captura en el portapapeles y necesitas una URL: pégala aquí.",
        },
        { type: "h2", text: "Formatos" },
        {
          type: "p",
          text: "PNG y JPEG van mejor. WebP y GIF también. Máx. 10\u00a0MB. SVG no se acepta.",
        },
      ],
    },
    "pt-BR": {
      title: "Colar captura de tela online — Link para compartilhar | dropimg.io",
      description:
        "Cole uma captura da área de transferência e receba uma URL temporária. Funciona com macOS, Ferramenta de Captura do Windows, Cmd+V / Ctrl+V. Sem conta.",
      ogTitle: "Colar captura de tela online | dropimg.io",
      ogDescription:
        "Copie uma captura, cole aqui, receba um link. Sem salvar no disco para depois enviar.",
      twitterTitle: "Colar captura de tela online | dropimg.io",
      twitterDescription:
        "Copie uma captura, cole aqui, receba um link. Sem o vai-e-volta de salvar e enviar.",
      h1: "Colar uma captura de tela online",
      lede: "Captura → área de transferência → colar → link. Pule salvar um arquivo só para enviar em outro lugar.",
      blocks: [
        { type: "h2", text: "macOS" },
        {
          type: "ul",
          items: [
            "Capture para a área de transferência com Control + Command + Shift + 3/4",
            "Abra o dropimg.io",
            "Pressione Command + V",
          ],
        },
        {
          type: "p",
          text: "Se você já salvou um .png na área de trabalho, arraste para a página ou use Escolher imagem.",
        },
        { type: "h2", text: "Windows" },
        {
          type: "ul",
          items: [
            "Ferramenta de Captura / Snip & Sketch → copie o recorte",
            "Ou Windows + Shift + S e depois copie",
            "Abra o dropimg.io e pressione Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Por que colar da área de transferência vence",
        },
        {
          type: "p",
          text: "Chats de suporte, Discord, Slack e relatórios de bug estão cheios de “uma captura rápida”. Salvar em Downloads, achar o arquivo e anexar é atrito. Colar da área de transferência mantém o fluxo em uma aba.",
        },
        {
          type: "p",
          text: "dropimg.io permite colar, arrastar ou enviar uma imagem e criar um link temporário que expira automaticamente após 24 horas. Você tem uma captura na área de transferência e precisa de uma URL — cole aqui.",
        },
        { type: "h2", text: "Formatos" },
        {
          type: "p",
          text: "PNG e JPEG funcionam melhor. WebP e GIF também. Máx. 10\u00a0MB. SVG não é aceito.",
        },
      ],
    },
    de: {
      title: "Screenshot online einfügen — Sharebaren Link | dropimg.io",
      description:
        "Screenshot aus der Zwischenablage einfügen und eine temporäre URL erhalten. Funktioniert mit macOS-Screenshots, Windows Snipping Tool, Cmd+V / Ctrl+V. Kein Konto.",
      ogTitle: "Screenshot online einfügen | dropimg.io",
      ogDescription:
        "Screenshot kopieren, hier einfügen, Link erhalten. Ohne Speichern → Upload-Tanz.",
      twitterTitle: "Screenshot online einfügen | dropimg.io",
      twitterDescription:
        "Screenshot kopieren, hier einfügen, Link erhalten. Ohne Speichern und erneutes Hochladen.",
      h1: "Screenshot online einfügen",
      lede: "Screenshot → Zwischenablage → einfügen → Link. Kein Speichern nur zum erneuten Hochladen.",
      blocks: [
        { type: "h2", text: "macOS" },
        {
          type: "ul",
          items: [
            "In die Zwischenablage mit Control + Command + Shift + 3/4",
            "dropimg.io öffnen",
            "Command + V drücken",
          ],
        },
        {
          type: "p",
          text: "Falls die .png schon auf dem Schreibtisch liegt: auf die Seite ziehen oder Bild wählen.",
        },
        { type: "h2", text: "Windows" },
        {
          type: "ul",
          items: [
            "Snipping Tool / Snip & Sketch → Ausschnitt kopieren",
            "Oder Windows + Shift + S, dann kopieren",
            "dropimg.io öffnen und Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Warum Einfügen aus der Zwischenablage besser ist",
        },
        {
          type: "p",
          text: "Support-Chats, Discord, Slack und Bugreports sind voll von „schnell mal einen Screenshot“. Speichern, finden, anhängen ist Reibung. Einfügen aus der Zwischenablage hält den Loop in einem Tab.",
        },
        {
          type: "p",
          text: "Mit dropimg.io kannst du ein Bild einfügen, hochladen oder per Drag-and-drop ablegen und sofort einen temporären Link erstellen, der nach 24 Stunden abläuft. Screenshot in der Zwischenablage, URL gebraucht — hier einfügen.",
        },
        { type: "h2", text: "Formate" },
        {
          type: "p",
          text: "PNG und JPEG funktionieren am besten. WebP und GIF auch. Max. 10\u00a0MB. SVG wird nicht akzeptiert.",
        },
      ],
    },
  },
  "share-link": {
    en: {
      title: "Share an Image with a Link — Temporary URL | dropimg.io",
      description:
        "Turn an image into a shareable link in seconds. Temporary URLs for chat, support, and developer workflows. No account. Expires in 24 hours.",
      ogTitle: "Share an Image with a Link | dropimg.io",
      ogDescription:
        "Drop an image, copy the URL, send it. Built for chat and support workflows — not permanent hosting.",
      twitterTitle: "Share an Image with a Link | dropimg.io",
      twitterDescription:
        "Drop an image, copy the URL, send it. Built for chat and support — not permanent hosting.",
      h1: "Share an image with a link",
      lede: "Some tools want a URL, not an attachment. dropimg.io turns a file (or a pasted screenshot) into a short link you can send anywhere.",
      blocks: [
        { type: "h2", text: "The loop" },
        {
          type: "ul",
          items: [
            "Drop, paste, or choose an image",
            "Copy the link (often copied for you)",
            "Paste it into chat, email, a ticket, or a PR comment",
          ],
        },
        { type: "p", text: "That’s it. Screenshot → link. Done." },
        { type: "h2", text: "Where temporary links help" },
        {
          type: "ul",
          items: [
            "Chat: Discord, Slack, Teams, Reddit — share without fighting upload limits",
            "Support: show the exact UI state without a long email thread of attachments",
            "Dev: bug reports, GitHub reviews, “does this look right?”",
            "Email: when the recipient’s client mangles inline images",
          ],
        },
        {
          type: "p",
          text: "Links expire after 24 hours. Temporary by design — not a CMS, not a CDN for your brand assets.",
        },
        { type: "h2", text: "What recipients see" },
        {
          type: "p",
          text: "A simple page with the image and an expiry note. Share pages are noindex, so they are not meant to show up in search results. Anyone with the unique URL can view the image until it expires or you delete it.",
        },
        { type: "h2", text: "Quick sharing vs permanent hosting" },
        {
          type: "p",
          text: "Use dropimg.io when the image is part of a conversation. Use a permanent host when the image is part of a product, docs site, or long-lived post.",
        },
      ],
    },
    es: {
      title: "Compartir imagen con un enlace — URL temporal | dropimg.io",
      description:
        "Convierte una imagen en un enlace en segundos. URLs temporales para chat, soporte y desarrollo. Sin cuenta. Expira en 24 horas.",
      ogTitle: "Compartir imagen con un enlace | dropimg.io",
      ogDescription:
        "Suelta una imagen, copia la URL, envíala. Pensado para chat y soporte — no para hosting permanente.",
      twitterTitle: "Compartir imagen con un enlace | dropimg.io",
      twitterDescription:
        "Suelta una imagen, copia la URL, envíala. Para chat y soporte — no hosting permanente.",
      h1: "Compartir una imagen con un enlace",
      lede: "Algunas herramientas quieren una URL, no un adjunto. dropimg.io convierte un archivo (o una captura pegada) en un enlace corto que puedes enviar a cualquier sitio.",
      blocks: [
        { type: "h2", text: "El flujo" },
        {
          type: "ul",
          items: [
            "Arrastra, pega o elige una imagen",
            "Copia el enlace (a menudo se copia solo)",
            "Pégalo en chat, email, un ticket o un comentario de PR",
          ],
        },
        { type: "p", text: "Eso es todo. Captura → enlace. Listo." },
        { type: "h2", text: "Dónde ayudan los enlaces temporales" },
        {
          type: "ul",
          items: [
            "Chat: Discord, Slack, Teams, Reddit — comparte sin pelear con límites de subida",
            "Soporte: muestra el estado exacto de la UI sin hilos eternos de adjuntos",
            "Dev: reportes de bugs, revisiones en GitHub, “¿se ve bien?”",
            "Email: cuando el cliente del destinatario rompe las imágenes incrustadas",
          ],
        },
        {
          type: "p",
          text: "Los enlaces expiran a las 24 horas. Temporales a propósito — no es un CMS ni un CDN para assets de marca.",
        },
        { type: "h2", text: "Qué ven los destinatarios" },
        {
          type: "p",
          text: "Una página simple con la imagen y una nota de caducidad. Las páginas de compartir van con noindex. Quien tenga la URL única puede ver la imagen hasta que expire o la elimines.",
        },
        { type: "h2", text: "Compartir rápido vs hosting permanente" },
        {
          type: "p",
          text: "Usa dropimg.io cuando la imagen forma parte de una conversación. Usa un host permanente cuando forma parte de un producto, documentación o publicación duradera.",
        },
      ],
    },
    "pt-BR": {
      title: "Compartilhar imagem com um link — URL temporária | dropimg.io",
      description:
        "Transforme uma imagem em um link em segundos. URLs temporárias para chat, suporte e desenvolvimento. Sem conta. Expira em 24 horas.",
      ogTitle: "Compartilhar imagem com um link | dropimg.io",
      ogDescription:
        "Solte uma imagem, copie a URL, envie. Feito para chat e suporte — não para hospedagem permanente.",
      twitterTitle: "Compartilhar imagem com um link | dropimg.io",
      twitterDescription:
        "Solte uma imagem, copie a URL, envie. Para chat e suporte — não hospedagem permanente.",
      h1: "Compartilhar uma imagem com um link",
      lede: "Algumas ferramentas querem uma URL, não um anexo. O dropimg.io transforma um arquivo (ou uma captura colada) em um link curto que você envia para qualquer lugar.",
      blocks: [
        { type: "h2", text: "O fluxo" },
        {
          type: "ul",
          items: [
            "Arraste, cole ou escolha uma imagem",
            "Copie o link (muitas vezes já é copiado)",
            "Cole no chat, e-mail, ticket ou comentário de PR",
          ],
        },
        { type: "p", text: "É isso. Captura → link. Pronto." },
        { type: "h2", text: "Onde links temporários ajudam" },
        {
          type: "ul",
          items: [
            "Chat: Discord, Slack, Teams, Reddit — compartilhe sem brigar com limites de upload",
            "Suporte: mostre o estado exato da UI sem threads eternas de anexos",
            "Dev: bugs, reviews no GitHub, “fica bom assim?”",
            "E-mail: quando o cliente do destinatário estraga imagens embutidas",
          ],
        },
        {
          type: "p",
          text: "Os links expiram em 24 horas. Temporários de propósito — não é CMS nem CDN para assets de marca.",
        },
        { type: "h2", text: "O que os destinatários veem" },
        {
          type: "p",
          text: "Uma página simples com a imagem e a expiração. Páginas de compartilhamento vão com noindex. Quem tiver a URL única pode ver até expirar ou você excluir.",
        },
        { type: "h2", text: "Compartilhamento rápido vs hospedagem permanente" },
        {
          type: "p",
          text: "Use o dropimg.io quando a imagem faz parte de uma conversa. Use um host permanente quando faz parte de um produto, docs ou post duradouro.",
        },
      ],
    },
    de: {
      title: "Bild per Link teilen — Temporäre URL | dropimg.io",
      description:
        "Bild in Sekunden in einen teilbaren Link verwandeln. Temporäre URLs für Chat, Support und Dev-Workflows. Kein Konto. Läuft nach 24 Stunden ab.",
      ogTitle: "Bild per Link teilen | dropimg.io",
      ogDescription:
        "Bild ablegen, URL kopieren, senden. Für Chat und Support — nicht für dauerhaftes Hosting.",
      twitterTitle: "Bild per Link teilen | dropimg.io",
      twitterDescription:
        "Bild ablegen, URL kopieren, senden. Für Chat und Support — nicht dauerhaftes Hosting.",
      h1: "Bild per Link teilen",
      lede: "Manche Tools wollen eine URL, keinen Anhang. dropimg.io macht aus einer Datei (oder einem eingefügten Screenshot) einen kurzen Link zum Weitergeben.",
      blocks: [
        { type: "h2", text: "Der Ablauf" },
        {
          type: "ul",
          items: [
            "Ablegen, einfügen oder Bild wählen",
            "Link kopieren (oft schon für dich kopiert)",
            "In Chat, E-Mail, Ticket oder PR-Kommentar einfügen",
          ],
        },
        { type: "p", text: "Das war’s. Screenshot → Link. Fertig." },
        { type: "h2", text: "Wo temporäre Links helfen" },
        {
          type: "ul",
          items: [
            "Chat: Discord, Slack, Teams, Reddit — teilen ohne Upload-Limits",
            "Support: exakten UI-Zustand zeigen ohne Anhang-Marathon",
            "Dev: Bugreports, GitHub-Reviews, „sieht das so aus?“",
            "E-Mail: wenn der Client eingebettete Bilder zerlegt",
          ],
        },
        {
          type: "p",
          text: "Links laufen nach 24 Stunden ab. Temporär by Design — kein CMS, kein CDN für Marken-Assets.",
        },
        { type: "h2", text: "Was Empfänger sehen" },
        {
          type: "p",
          text: "Eine einfache Seite mit Bild und Ablaufhinweis. Share-Seiten sind noindex. Wer die einzigartige URL hat, kann das Bild sehen, bis es abläuft oder du es löschst.",
        },
        { type: "h2", text: "Schnelles Teilen vs dauerhaftes Hosting" },
        {
          type: "p",
          text: "Nutze dropimg.io, wenn das Bild Teil einer Unterhaltung ist. Nutze einen dauerhaften Host, wenn es Teil eines Produkts, einer Doku oder eines langlebigen Posts ist.",
        },
      ],
    },
  },
};
