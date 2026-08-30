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
    footerProduct: "Product",
    footerLegal: "Legal",
    footerTagline: "Temporary image sharing, without the clutter.",
    footerSeo: {
      temporary: "Temporary image hosting",
      paste: "Paste screenshot online",
      share: "Share image with a link",
      extension: "Chrome / Edge extension",
    },
    homeLink: "Home",
    productHighlights: "Product highlights",
    aboutAria: "About dropimg.io",
    langSuggest: {
      es: "¿Prefieres verlo en español?",
      "pt-BR": "Prefere ver em português?",
      de: "Lieber auf Deutsch?",
    },
    suggestSwitch: "Switch",
    suggestDismiss: "Dismiss",
    signIn: "Sign in",
    signOut: "Sign out",
    myDrops: "My drops",
    pro: "Pro",
    proPrice: "Pro · $2.99",
    upgradeToPro: "Upgrade",
    editAccount: "Edit account",
    accountAria: "Account",
    themeToggleAria: "Color theme",
    themeToLight: "Switch to light",
    themeToDark: "Switch to dark",
  },
  es: {
    skipToUpload: "Ir a subir",
    brandHomeAria: "Inicio de dropimg.io",
    langMenuAria: "Idioma",
    privacy: "Privacidad",
    terms: "Términos",
    abuse: "Abuso",
    learnMoreAria: "Más información",
    relatedAria: "También te puede interesar",
    footerProduct: "Producto",
    footerLegal: "Legal",
    footerTagline: "Imágenes temporales, sin complicaciones.",
    footerSeo: {
      temporary: "Alojamiento temporal de imágenes",
      paste: "Pegar captura online",
      share: "Compartir imagen con enlace",
      extension: "Extensión Chrome / Edge",
    },
    homeLink: "Inicio",
    productHighlights: "En resumen",
    aboutAria: "Sobre dropimg.io",
    langSuggest: {
      es: "¿Prefieres verlo en español?",
      "pt-BR": "Prefere ver em português?",
      de: "Lieber auf Deutsch?",
    },
    suggestSwitch: "Cambiar",
    suggestDismiss: "Ahora no",
    signIn: "Entrar",
    signOut: "Salir",
    myDrops: "Mis envíos",
    pro: "Pro",
    proPrice: "Pro · $2.99",
    upgradeToPro: "Mejorar",
    editAccount: "Editar cuenta",
    accountAria: "Cuenta",
    themeToggleAria: "Tema",
    themeToLight: "Cambiar a claro",
    themeToDark: "Cambiar a oscuro",
  },
  "pt-BR": {
    skipToUpload: "Ir para o envio",
    brandHomeAria: "Início do dropimg.io",
    langMenuAria: "Idioma",
    privacy: "Privacidade",
    terms: "Termos",
    abuse: "Abuso",
    learnMoreAria: "Saiba mais",
    relatedAria: "Veja também",
    footerProduct: "Produto",
    footerLegal: "Jurídico",
    footerTagline: "Imagens temporárias, sem bagunça.",
    footerSeo: {
      temporary: "Hospedagem temporária de imagens",
      paste: "Colar print online",
      share: "Compartilhar imagem com link",
      extension: "Extensão Chrome / Edge",
    },
    homeLink: "Início",
    productHighlights: "Em resumo",
    aboutAria: "Sobre o dropimg.io",
    langSuggest: {
      es: "¿Prefieres verlo en español?",
      "pt-BR": "Prefere ver em português?",
      de: "Lieber auf Deutsch?",
    },
    suggestSwitch: "Mudar",
    suggestDismiss: "Agora não",
    signIn: "Entrar",
    signOut: "Sair",
    myDrops: "Meus envios",
    pro: "Pro",
    proPrice: "Pro · $2.99",
    upgradeToPro: "Assinar",
    editAccount: "Editar conta",
    accountAria: "Conta",
    themeToggleAria: "Tema",
    themeToLight: "Mudar para claro",
    themeToDark: "Mudar para escuro",
  },
  de: {
    skipToUpload: "Zum Upload",
    brandHomeAria: "dropimg.io Startseite",
    langMenuAria: "Sprache",
    privacy: "Datenschutz",
    terms: "Nutzungsbedingungen",
    abuse: "Missbrauch",
    learnMoreAria: "Mehr erfahren",
    relatedAria: "Weiterlesen",
    footerProduct: "Produkt",
    footerLegal: "Rechtliches",
    footerTagline: "Bilder teilen, temporär und ohne Ballast.",
    footerSeo: {
      temporary: "Temporäres Bildhosting",
      paste: "Screenshot online einfügen",
      share: "Bild per Link teilen",
      extension: "Chrome- / Edge-Erweiterung",
    },
    homeLink: "Startseite",
    productHighlights: "Auf einen Blick",
    aboutAria: "Über dropimg.io",
    langSuggest: {
      es: "¿Prefieres verlo en español?",
      "pt-BR": "Prefere ver em português?",
      de: "Lieber auf Deutsch?",
    },
    suggestSwitch: "Wechseln",
    suggestDismiss: "Nein danke",
    signIn: "Anmelden",
    signOut: "Abmelden",
    myDrops: "Meine Drops",
    pro: "Pro",
    proPrice: "Pro · $2.99",
    upgradeToPro: "Upgrade",
    editAccount: "Konto bearbeiten",
    accountAria: "Konto",
    themeToggleAria: "Farbschema",
    themeToLight: "Hell einschalten",
    themeToDark: "Dunkel einschalten",
  },
};

export const HOME: Record<Locale, HomeCopy> = {
  en: {
    title: "Temporary Image Hosting & Screenshot Sharing | dropimg.io",
    description:
      "Paste or drop a screenshot and get a shareable link in seconds. No account required. Choose 1 hour, 24 hours, or 7 days. PNG, JPEG, WebP, GIF up to 10 MB.",
    ogTitle: "Temporary Image Hosting & Screenshot Sharing | dropimg.io",
    ogDescription:
      "Paste or drop a screenshot and get a shareable link in seconds. No account required. You choose when it expires.",
    twitterTitle: "dropimg.io — Drop an image. Get a link.",
    twitterDescription:
      "Fast temporary screenshot sharing. No account required. Links expire when you say so.",
    h1: "Drop an image. Get a link.",
    subHtml:
      "Paste, drop, or choose an image.<br />\n            No account required. You choose when it expires.",
    dropzoneAria: "Paste, drop, or choose an image to upload",
    trust: ["No account required", "You pick the expiry", "Metadata stripped"],
    howtoHeading: "How it works",
    howto: [
      { name: "Drop image", detail: "Paste, drop, or choose a file" },
      { name: "Copy link", detail: "Short URL, ready to send" },
      { name: "Share it", detail: "Chat, email, tickets — done" },
    ],
    feature: {
      kicker: "Temporary by default",
      title: "Share it. Forget it.",
      body: "Every link deletes itself. Pick 1 hour, 24 hours, or 7 days before you upload — no cleanup, no archive, nothing left sitting on a server.",
      note: "1 hour to 7 days, free",
    },
    faqHeading: "FAQ",
    faqs: [
      {
        q: "How long do images stay online?",
        a: "As long as you choose: 1 hour, 24 hours, or 7 days, with 7 days selected by default. Pro links can last up to 90 days.",
      },
      {
        q: "Do I need an account?",
        a: "No. Upload and share without signing up. An account is optional — free accounts keep your last 10 active links together, and Pro adds longer links, larger uploads, and passwords.",
      },
      {
        q: "Can I delete an image early?",
        a: "Yes. After upload you get a private delete control to remove it before expiry.",
      },
    ],
    schemaAppDescription:
      "A temporary image sharing tool that lets users paste or upload an image and generate a shareable link that expires after 1 hour, 24 hours, or 7 days.",
    schemaSiteDescription:
      "dropimg.io is a temporary image-sharing service that lets users paste, drag, or upload an image and instantly create a shareable link that expires on a schedule they choose.",
    schemaHowtoName: "How to share a temporary image link with dropimg.io",
    schemaHowtoDescription:
      "Drop an image, choose how long the link lives, copy it, and share. Every link expires.",
  },
  es: {
    title: "Comparte capturas con un enlace temporal | dropimg.io",
    description:
      "Pega o arrastra una captura y genera un enlace en segundos. Sin crear cuenta. Elige 1 hora, 24 horas o 7 días. PNG, JPEG, WebP o GIF hasta 10 MB.",
    ogTitle: "Comparte capturas con un enlace temporal | dropimg.io",
    ogDescription:
      "Pega o arrastra una captura y genera un enlace en segundos. Sin crear cuenta. Tú eliges cuándo caduca.",
    twitterTitle: "dropimg.io — Suelta una imagen. Llévate el enlace.",
    twitterDescription:
      "Comparte capturas sin crear cuenta. Tú decides cuánto dura el enlace.",
    h1: "Suelta una imagen. Llévate el enlace.",
    subHtml:
      "Pega, arrastra o elige una imagen.<br />\n            Sin crear cuenta. Tú eliges cuándo caduca.",
    dropzoneAria: "Pega, arrastra o elige una imagen para subir",
    trust: ["Sin crear cuenta", "Tú eliges la caducidad", "Sin metadatos"],
    howtoHeading: "Cómo funciona",
    howto: [
      { name: "Sube la imagen", detail: "Pégala, arrástrala o elige el archivo" },
      { name: "Copia el enlace", detail: "Corto y listo para mandar" },
      { name: "Compártelo", detail: "WhatsApp, email, ticket… y ya" },
    ],
    feature: {
      kicker: "Temporal por diseño",
      title: "Compártelo y olvídate.",
      body: "Cada enlace se borra solo. Elige 1 hora, 24 horas o 7 días antes de subir: sin limpiar nada, sin archivo, sin restos en ningún servidor.",
      note: "De 1 hora a 7 días, gratis",
    },
    faqHeading: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Cuánto tiempo está disponible la imagen?",
        a: "El tiempo que elijas: 1 hora, 24 horas o 7 días, con 7 días por defecto. Con Pro el enlace puede durar hasta 90 días.",
      },
      {
        q: "¿Hace falta crear una cuenta?",
        a: "No. Subes, compartes y listo — sin registro. La cuenta es opcional: la gratuita reúne tus 10 últimos enlaces activos y Pro añade enlaces más largos, archivos más grandes y contraseñas.",
      },
      {
        q: "¿Puedo borrarla antes de que expire?",
        a: "Sí. Al subirla te damos un enlace privado para eliminarla cuando quieras.",
      },
    ],
    schemaAppDescription:
      "Herramienta para compartir imágenes de forma temporal: pegas o subes una imagen y obtienes un enlace que caduca a la hora, a las 24 horas o a los 7 días.",
    schemaSiteDescription:
      "dropimg.io te deja pegar, arrastrar o subir una imagen y crear al momento un enlace temporal que caduca cuando tú decides.",
    schemaHowtoName: "Cómo compartir una imagen temporal con dropimg.io",
    schemaHowtoDescription:
      "Sube una imagen, elige cuánto dura el enlace y compártelo. Todos los enlaces caducan.",
  },
  "pt-BR": {
    title: "Compartilhe prints com um link temporário | dropimg.io",
    description:
      "Cole ou arraste um print e ganhe um link em segundos. Sem criar conta. Escolha 1 hora, 24 horas ou 7 dias. PNG, JPEG, WebP ou GIF até 10 MB.",
    ogTitle: "Compartilhe prints com um link temporário | dropimg.io",
    ogDescription:
      "Cole ou arraste um print e ganhe um link em segundos. Sem criar conta. Você escolhe quando expira.",
    twitterTitle: "dropimg.io — Solte a imagem. Pegue o link.",
    twitterDescription:
      "Manda o print sem criar conta. Você decide quanto tempo o link dura.",
    h1: "Solte a imagem. Pegue o link.",
    subHtml:
      "Cole, arraste ou escolha uma imagem.<br />\n            Sem criar conta. Você escolhe quando expira.",
    dropzoneAria: "Cole, arraste ou escolha uma imagem para enviar",
    trust: ["Sem criar conta", "Você escolhe o prazo", "Sem metadados"],
    howtoHeading: "Como funciona",
    howto: [
      { name: "Envia a imagem", detail: "Cola, arrasta ou escolhe o arquivo" },
      { name: "Copia o link", detail: "Curto e pronto pra mandar" },
      { name: "Compartilha", detail: "WhatsApp, e-mail, ticket… acabou" },
    ],
    feature: {
      kicker: "Temporário por padrão",
      title: "Compartilhe e esqueça.",
      body: "Todo link se apaga sozinho. Escolha 1 hora, 24 horas ou 7 dias antes de enviar: sem faxina, sem arquivo, sem nada parado num servidor.",
      note: "De 1 hora a 7 dias, grátis",
    },
    faqHeading: "Perguntas frequentes",
    faqs: [
      {
        q: "Por quanto tempo a imagem fica no ar?",
        a: "Pelo tempo que você escolher: 1 hora, 24 horas ou 7 dias, sendo 7 dias o padrão. Com o Pro, o link pode durar até 90 dias.",
      },
      {
        q: "Preciso criar conta?",
        a: "Não. Envia, compartilha e pronto — sem cadastro. A conta é opcional: a gratuita reúne os seus 10 últimos links ativos e o Pro acrescenta links mais longos, arquivos maiores e senhas.",
      },
      {
        q: "Dá pra apagar antes de expirar?",
        a: "Sim. Depois do envio você ganha um link privado pra excluir quando quiser.",
      },
    ],
    schemaAppDescription:
      "Ferramenta pra compartilhar imagens por tempo limitado: cole ou envie uma imagem e receba um link que expira em 1 hora, 24 horas ou 7 dias.",
    schemaSiteDescription:
      "Com o dropimg.io você cola, arrasta ou envia uma imagem e cria na hora um link temporário que expira quando você decidir.",
    schemaHowtoName: "Como compartilhar uma imagem temporária com o dropimg.io",
    schemaHowtoDescription:
      "Envie a imagem, escolha a duração do link e compartilhe. Todo link expira.",
  },
  de: {
    title: "Temporäre Bildlinks & Screenshot-Sharing | dropimg.io",
    description:
      "Screenshot einfügen oder ablegen — in Sekunden einen Link. Ohne Konto. Wähle 1 Stunde, 24 Stunden oder 7 Tage. PNG, JPEG, WebP, GIF bis 10 MB.",
    ogTitle: "Temporäre Bildlinks & Screenshot-Sharing | dropimg.io",
    ogDescription:
      "Screenshot einfügen oder ablegen — in Sekunden einen Link. Ohne Konto. Du bestimmst, wann er abläuft.",
    twitterTitle: "dropimg.io — Bild rein. Link raus.",
    twitterDescription:
      "Screenshots teilen ohne Konto. Du bestimmst, wie lange der Link hält.",
    h1: "Bild rein. Link raus.",
    subHtml:
      "Einfügen, ablegen oder Datei wählen.<br />\n            Ohne Konto. Du bestimmst die Laufzeit.",
    dropzoneAria: "Bild einfügen, ablegen oder auswählen",
    trust: ["Ohne Konto", "Laufzeit wählbar", "Ohne Metadaten"],
    howtoHeading: "So geht's",
    howto: [
      { name: "Bild rein", detail: "Einfügen, ablegen oder Datei wählen" },
      { name: "Link kopieren", detail: "Kurz und sofort verschickbar" },
      { name: "Weitergeben", detail: "Chat, Mail, Ticket — fertig" },
    ],
    feature: {
      kicker: "Von Haus aus temporär",
      title: "Teilen und vergessen.",
      body: "Jeder Link löscht sich selbst. Wähle vor dem Upload 1 Stunde, 24 Stunden oder 7 Tage — kein Aufräumen, kein Archiv, nichts, das auf einem Server liegen bleibt.",
      note: "1 Stunde bis 7 Tage, gratis",
    },
    faqHeading: "Häufige Fragen",
    faqs: [
      {
        q: "Wie lange bleibt das Bild online?",
        a: "So lange du willst: 1 Stunde, 24 Stunden oder 7 Tage, voreingestellt sind 7 Tage. Mit Pro sind bis zu 90 Tage möglich.",
      },
      {
        q: "Brauche ich ein Konto?",
        a: "Nein. Hochladen und teilen — ohne Anmeldung. Ein Konto ist optional: gratis sammelt es deine letzten 10 aktiven Links, Pro bringt längere Links, größere Uploads und Passwörter.",
      },
      {
        q: "Kann ich es früher löschen?",
        a: "Ja. Nach dem Upload bekommst du einen privaten Link zum Sofortlöschen.",
      },
    ],
    schemaAppDescription:
      "Tool zum kurzen Teilen von Bildern: einfügen oder hochladen und einen Link bekommen, der nach 1 Stunde, 24 Stunden oder 7 Tagen verschwindet.",
    schemaSiteDescription:
      "Mit dropimg.io fügst du ein Bild ein, lädst es hoch oder legst es ab — und hast sofort einen temporären Link, dessen Laufzeit du selbst bestimmst.",
    schemaHowtoName: "So teilst du einen temporären Bildlink mit dropimg.io",
    schemaHowtoDescription:
      "Bild hochladen, Laufzeit wählen, Link kopieren und weitergeben. Jeder Link läuft ab.",
  },
};

/** SEO landing copy keyed by pageId (excluding home). */
export const LANDINGS: Record<
  Exclude<PageId, "home">,
  Record<Locale, LandingCopy>
> = {
  "temporary-hosting": {
    en: {
      title: "Temporary Image Hosting — No Account Needed | dropimg.io",
      description:
        "Temporary image hosting without an account. Upload a PNG, JPEG, WebP, or GIF and get a shareable link that expires in 1 hour, 24 hours, or 7 days. Metadata stripped when supported.",
      ogTitle: "Temporary Image Hosting | dropimg.io",
      ogDescription:
        "Host an image for an hour, a day, or a week. No account. Get a link and move on.",
      twitterTitle: "Temporary Image Hosting | dropimg.io",
      twitterDescription:
        "Host an image for an hour, a day, or a week. No account. Get a link and move on.",
      h1: "Temporary image hosting",
      lede: "Need a link for an image — not a permanent gallery? dropimg.io hosts the file for as long as you choose, then deletes it.",
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
        { type: "h2", text: "How long it lasts is up to you" },
        {
          type: "p",
          text: "Most shared images are useful for minutes or hours, not months. Pick 1 hour, 24 hours, or 7 days before you upload — 7 days is the default — and storage stays short-lived instead of quietly filling up with old files.",
        },
        {
          type: "p",
          text: "Need longer? A Pro account can choose 30 or 90 days, add a password, and upload up to 50 MB. Need it gone sooner? After upload you get a private delete control.",
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
          text: "No signup required, and no searchable library of uploads. Share pages are marked noindex. JPEG, PNG, and WebP uploads have EXIF and similar metadata stripped before storage when stripping succeeds — otherwise the upload is rejected rather than keeping original metadata.",
        },
      ],
    },
    es: {
      title: "Alojamiento temporal de imágenes sin cuenta | dropimg.io",
      description:
        "Sube una imagen, genera un enlace y olvídate. Sin crear cuenta. Caduca en 1 hora, 24 horas o 7 días. PNG, JPEG, WebP o GIF. Metadatos quitados al guardar.",
      ogTitle: "Alojamiento temporal de imágenes | dropimg.io",
      ogDescription:
        "Un enlace para tu imagen durante una hora, un día o una semana. Sin crear cuenta.",
      twitterTitle: "Alojamiento temporal de imágenes | dropimg.io",
      twitterDescription:
        "Un enlace para tu imagen durante una hora, un día o una semana. Sin crear cuenta.",
      h1: "Alojamiento temporal de imágenes",
      lede: "¿Solo necesitas un enlace — no una galería para siempre? dropimg.io guarda el archivo el tiempo que elijas y después lo borra.",
      blocks: [
        {
          type: "h2",
          text: "Para qué sirve de verdad",
        },
        {
          type: "p",
          text: "Los sitios “para siempre” van bien para blogs y portfolios. El resto del día es otra cosa: un bug en Slack o Teams, un boceto en Discord, un recibo en un ticket, un mockup en un pull request, una captura por WhatsApp.",
        },
        {
          type: "p",
          text: "Te llevas una URL corta. Quien la tenga puede ver la imagen hasta que expire. No hay galería pública ni obligación de registrarte.",
        },
        { type: "h2", text: "Tú decides cuánto dura" },
        {
          type: "p",
          text: "Casi todas las imágenes que compartes sirven minutos u horas, no meses. Elige 1 hora, 24 horas o 7 días antes de subirla — 7 días viene por defecto — y así no se acumulan archivos viejos que ya nadie pide.",
        },
        {
          type: "p",
          text: "¿Necesitas más tiempo? Con Pro puedes elegir 30 o 90 días, poner contraseña y subir hasta 50 MB. ¿Hay que quitarla ya? Al subirla tienes un enlace privado para borrarla al momento.",
        },
        { type: "h2", text: "Qué puedes subir" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Hasta 10\u00a0MB",
            "Sin SVG (por seguridad)",
          ],
        },
        { type: "h2", text: "Privacidad desde el principio" },
        {
          type: "p",
          text: "Sin registro obligatorio. Sin carpeta pública de subidas. Las páginas de compartir van con noindex. En JPEG, PNG y WebP quitamos EXIF y metadatos parecidos antes de guardar; si no se pueden quitar, rechazamos la subida en lugar de dejarlos.",
        },
        {
          type: "p",
          text: "Con dropimg.io pegas, arrastras o subes una imagen y creas un enlace temporal que se borra solo cuando se cumple el plazo que elegiste.",
        },
      ],
    },
    "pt-BR": {
      title: "Hospedagem temporária de imagens sem conta | dropimg.io",
      description:
        "Manda a imagem, ganha o link e segue. Sem criar conta. Expira em 1 hora, 24 horas ou 7 dias. PNG, JPEG, WebP ou GIF. Metadados removidos na hora de salvar.",
      ogTitle: "Hospedagem temporária de imagens | dropimg.io",
      ogDescription:
        "Um link pra sua imagem por uma hora, um dia ou uma semana. Sem criar conta.",
      twitterTitle: "Hospedagem temporária de imagens | dropimg.io",
      twitterDescription:
        "Um link pra sua imagem por uma hora, um dia ou uma semana. Sem criar conta.",
      h1: "Hospedagem temporária de imagens",
      lede: "Precisa só de um link — não de uma galeria eterna? O dropimg.io guarda o arquivo pelo tempo que você escolher e depois apaga.",
      blocks: [
        {
          type: "h2",
          text: "Pra que isso serve de verdade",
        },
        {
          type: "p",
          text: "Hospedagem permanente é ótima pra blog e portfólio. O dia a dia é outro: print de bug no Slack, rascunho no Discord, comprovante num ticket, mockup num pull request, print no WhatsApp.",
        },
        {
          type: "p",
          text: "Você leva uma URL curta. Quem tiver o link vê a imagem até expirar. Sem galeria pública e sem cadastro.",
        },
        { type: "h2", text: "Você decide quanto tempo dura" },
        {
          type: "p",
          text: "Quase todo print que a gente manda vale por minutos ou horas, não por meses. Escolha 1 hora, 24 horas ou 7 dias antes de enviar — 7 dias já vem selecionado — e nada fica parado por aí sem ninguém pedir.",
        },
        {
          type: "p",
          text: "Precisa de mais tempo? Com o Pro dá pra escolher 30 ou 90 dias, colocar senha e enviar até 50 MB. Precisa sumir agora? Depois do envio você ganha um link privado pra excluir na hora.",
        },
        { type: "h2", text: "O que dá pra enviar" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Até 10\u00a0MB",
            "Sem SVG (por segurança)",
          ],
        },
        { type: "h2", text: "Privacidade desde o começo" },
        {
          type: "p",
          text: "Sem cadastro obrigatório. Sem pasta pública de uploads. Páginas de compartilhamento vão com noindex. Em JPEG, PNG e WebP a gente remove EXIF e metadados parecidos antes de guardar; se não der pra remover, o envio é recusado.",
        },
        {
          type: "p",
          text: "Com o dropimg.io você cola, arrasta ou envia uma imagem e cria um link temporário que some sozinho quando o prazo escolhido termina.",
        },
      ],
    },
    de: {
      title: "Temporäres Bildhosting ohne Konto | dropimg.io",
      description:
        "Bild hochladen, Link holen, weiterarbeiten. Ohne Konto. Wähle 1 Stunde, 24 Stunden oder 7 Tage. PNG, JPEG, WebP oder GIF. Metadaten werden beim Speichern entfernt.",
      ogTitle: "Temporäres Bildhosting | dropimg.io",
      ogDescription:
        "Ein Link für dein Bild — eine Stunde, einen Tag oder eine Woche, ohne Anmeldung.",
      twitterTitle: "Temporäres Bildhosting | dropimg.io",
      twitterDescription:
        "Ein Link für dein Bild — eine Stunde, einen Tag oder eine Woche, ohne Anmeldung.",
      h1: "Temporäres Bildhosting",
      lede: "Du brauchst einen Link — keine Galerie für die Ewigkeit? dropimg.io legt die Datei so lange ab, wie du willst, und löscht sie danach.",
      blocks: [
        {
          type: "h2",
          text: "Wofür das wirklich gedacht ist",
        },
        {
          type: "p",
          text: "Dauerhafte Hosts passen zu Blog und Portfolio. Der Arbeitsalltag ist anders: Bug-Screenshot in Slack oder Teams, Entwurf in Discord, Beleg im Ticket, Mockup im Pull Request.",
        },
        {
          type: "p",
          text: "Du bekommst eine kurze URL. Wer den Link hat, sieht das Bild bis zum Ablauf. Keine öffentliche Galerie, keine Pflicht zur Anmeldung.",
        },
        { type: "h2", text: "Du bestimmst die Laufzeit" },
        {
          type: "p",
          text: "Die meisten geteilten Bilder sind Minuten oder Stunden nützlich — nicht Monate. Wähle vor dem Upload 1 Stunde, 24 Stunden oder 7 Tage — voreingestellt sind 7 Tage — dann bleibt nichts ewig liegen.",
        },
        {
          type: "p",
          text: "Länger nötig? Mit Pro sind 30 oder 90 Tage, ein Passwort und bis zu 50 MB drin. Früher weg? Nach dem Upload gibt’s einen privaten Link zum Sofortlöschen.",
        },
        { type: "h2", text: "Was du hochladen kannst" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, GIF",
            "Bis 10\u00a0MB",
            "Kein SVG (Sicherheitsgrund)",
          ],
        },
        { type: "h2", text: "Privatsphäre von Anfang an" },
        {
          type: "p",
          text: "Keine Anmeldepflicht. Keine durchsuchbare Upload-Bibliothek. Share-Seiten sind noindex. Bei JPEG, PNG und WebP entfernen wir EXIF und ähnliche Metadaten vor dem Speichern — klappt das nicht, lehnen wir den Upload ab statt sie zu behalten.",
        },
        {
          type: "p",
          text: "Mit dropimg.io fügst du ein Bild ein, lädst es hoch oder legst es per Drag-and-drop ab — und hast sofort einen temporären Link, der nach der gewählten Laufzeit verschwindet.",
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
          text: "dropimg.io returns a temporary URL that lasts 1 hour, 24 hours, or 7 days — your choice. Send it wherever the conversation is happening. You have a screenshot in your clipboard and need a URL — paste it here.",
        },
        {
          type: "h2",
          text: "Prefer one-click from the browser?",
        },
        {
          type: "p",
          text: "Our Chrome / Edge extension captures the visible tab and uploads it for you — same temporary links, no account. See /browser-extension.",
        },
        { type: "h2", text: "Formats" },
        {
          type: "p",
          text: "PNG and JPEG screenshots work best. WebP and GIF are fine too. Max 10\u00a0MB. SVG is not accepted.",
        },
      ],
    },
    es: {
      title: "Pega tu captura y genera un enlace | dropimg.io",
      description:
        "Captura en el portapapeles → Ctrl/Cmd+V → enlace temporal. macOS y Windows. Sin guardar el archivo ni crear cuenta.",
      ogTitle: "Pega tu captura online | dropimg.io",
      ogDescription:
        "Copia la captura, pégala aquí y listo: un enlace. Sin el rollo de guardar y subir.",
      twitterTitle: "Pega tu captura online | dropimg.io",
      twitterDescription:
        "Copia la captura, pégala aquí y listo: un enlace.",
      h1: "Pega una captura y genera el enlace",
      lede: "Captura → portapapeles → pegar → enlace. Sin guardar un PNG solo para subirlo a otro sitio.",
      blocks: [
        { type: "h2", text: "En Mac" },
        {
          type: "ul",
          items: [
            "Captura al portapapeles: Control + Command + Shift + 3 o 4",
            "Abre dropimg.io",
            "Pulsa Command + V",
          ],
        },
        {
          type: "p",
          text: "Si el .png ya está en el escritorio, arrástralo a la página o pulsa Elegir imagen.",
        },
        { type: "h2", text: "En Windows" },
        {
          type: "ul",
          items: [
            "Recortes / Snip & Sketch → copia el recorte",
            "O Windows + Shift + S y luego copia",
            "Abre dropimg.io y pulsa Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Por qué pegar es más rápido que “guardar y subir”",
        },
        {
          type: "p",
          text: "En soporte, Discord, Slack o un ticket casi siempre es “una captura rápida”. Guardar en Descargas, buscar el archivo y adjuntarlo es un rollo. Pegar desde el portapapeles deja todo en la misma pestaña.",
        },
        {
          type: "p",
          text: "dropimg.io te devuelve un enlace temporal que dura 1 hora, 24 horas o 7 días, lo que elijas. Lo mandas donde estés hablando. ¿Tienes la captura en el portapapeles y te hace falta una URL? Pégala aquí.",
        },
        { type: "h2", text: "Formatos" },
        {
          type: "p",
          text: "PNG y JPEG van de lujo. WebP y GIF también. Máximo 10\u00a0MB. SVG no se acepta.",
        },
      ],
    },
    "pt-BR": {
      title: "Cole o print e ganhe um link | dropimg.io",
      description:
        "Print na área de transferência → Ctrl/Cmd+V → link temporário. macOS e Windows. Sem salvar arquivo e sem criar conta.",
      ogTitle: "Cole o print online | dropimg.io",
      ogDescription:
        "Copia o print, cola aqui e pronto: um link. Sem o vai-e-volta de salvar e enviar.",
      twitterTitle: "Cole o print online | dropimg.io",
      twitterDescription:
        "Copia o print, cola aqui e pronto: um link.",
      h1: "Cole o print e pegue o link",
      lede: "Print → área de transferência → colar → link. Sem salvar um PNG só pra mandar em outro lugar.",
      blocks: [
        { type: "h2", text: "No Mac" },
        {
          type: "ul",
          items: [
            "Print pra área de transferência: Control + Command + Shift + 3 ou 4",
            "Abre o dropimg.io",
            "Aperta Command + V",
          ],
        },
        {
          type: "p",
          text: "Se o .png já tá na área de trabalho, arrasta pra página ou usa Escolher imagem.",
        },
        { type: "h2", text: "No Windows" },
        {
          type: "ul",
          items: [
            "Ferramenta de Captura / Snip & Sketch → copia o recorte",
            "Ou Windows + Shift + S e depois copia",
            "Abre o dropimg.io e aperta Ctrl + V",
          ],
        },
        {
          type: "h2",
          text: "Por que colar é melhor que “salvar e enviar”",
        },
        {
          type: "p",
          text: "Em suporte, Discord, Slack ou chamado quase sempre é “um print rápido”. Salvar em Downloads, achar o arquivo e anexar é perda de tempo. Colar da área de transferência deixa tudo numa aba só.",
        },
        {
          type: "p",
          text: "O dropimg.io devolve um link temporário que dura 1 hora, 24 horas ou 7 dias, como você preferir. Você manda onde a conversa tá acontecendo. Tem o print na área de transferência e precisa de uma URL? Cola aqui.",
        },
        { type: "h2", text: "Formatos" },
        {
          type: "p",
          text: "PNG e JPEG funcionam melhor. WebP e GIF também. Máximo 10\u00a0MB. SVG não entra.",
        },
      ],
    },
    de: {
      title: "Screenshot einfügen und Link holen | dropimg.io",
      description:
        "Screenshot in der Zwischenablage → Ctrl/Cmd+V → temporärer Link. macOS und Windows. Ohne Speichern, ohne Konto.",
      ogTitle: "Screenshot online einfügen | dropimg.io",
      ogDescription:
        "Screenshot kopieren, hier einfügen — Link fertig. Ohne Speichern und erneut Hochladen.",
      twitterTitle: "Screenshot online einfügen | dropimg.io",
      twitterDescription:
        "Screenshot kopieren, hier einfügen — Link fertig.",
      h1: "Screenshot einfügen, Link bekommen",
      lede: "Screenshot → Zwischenablage → einfügen → Link. Kein Speichern nur zum erneuten Hochladen.",
      blocks: [
        { type: "h2", text: "Unter macOS" },
        {
          type: "ul",
          items: [
            "In die Zwischenablage: Control + Command + Shift + 3 oder 4",
            "dropimg.io öffnen",
            "Command + V drücken",
          ],
        },
        {
          type: "p",
          text: "Liegt die .png schon auf dem Schreibtisch: auf die Seite ziehen oder Bild wählen.",
        },
        { type: "h2", text: "Unter Windows" },
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
          text: "Warum Einfügen besser ist als „speichern und hochladen“",
        },
        {
          type: "p",
          text: "In Support-Chats, Discord, Slack oder Tickets heißt es meist „schnell einen Screenshot“. Speichern, finden, anhängen — umständlich. Einfügen aus der Zwischenablage bleibt in einem Tab.",
        },
        {
          type: "p",
          text: "dropimg.io gibt dir eine temporäre URL — 1 Stunde, 24 Stunden oder 7 Tage, du entscheidest. Die schickst du dorthin, wo das Gespräch läuft. Screenshot in der Zwischenablage, URL gebraucht? Hier einfügen.",
        },
        { type: "h2", text: "Formate" },
        {
          type: "p",
          text: "PNG und JPEG passen am besten. WebP und GIF auch. Maximal 10\u00a0MB. SVG wird nicht angenommen.",
        },
      ],
    },
  },
  "share-link": {
    en: {
      title: "Share an Image with a Link — Temporary URL | dropimg.io",
      description:
        "Turn an image into a shareable link in seconds. Temporary URLs for chat, support, and developer workflows. No account required. Choose 1 hour, 24 hours, or 7 days.",
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
          text: "Links expire on the schedule you pick — 1 hour, 24 hours, or 7 days, and up to 90 days with Pro. Temporary by design: not a CMS, not a CDN for your brand assets.",
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
      title: "Comparte una imagen con un enlace | dropimg.io",
      description:
        "Convierte una imagen en URL en segundos. Ideal para WhatsApp, Slack, tickets y GitHub. Sin crear cuenta. Elige 1 hora, 24 horas o 7 días.",
      ogTitle: "Comparte una imagen con un enlace | dropimg.io",
      ogDescription:
        "Sube la imagen, copia la URL y mándala. Pensado para chats y soporte — no para hosting eterno.",
      twitterTitle: "Comparte una imagen con un enlace | dropimg.io",
      twitterDescription:
        "Sube la imagen, copia la URL y mándala. Para chats y soporte.",
      h1: "Comparte una imagen con un enlace",
      lede: "A veces lo que necesitan es una URL, no un adjunto. dropimg.io convierte el archivo (o la captura pegada) en un enlace corto para mandar donde sea.",
      blocks: [
        { type: "h2", text: "El truco de siempre" },
        {
          type: "ul",
          items: [
            "Arrastra, pega o elige la imagen",
            "Copia el enlace (casi siempre se copia solo)",
            "Pégalo en el chat, el email, el ticket o el comentario del PR",
          ],
        },
        { type: "p", text: "Y ya. Captura → enlace. Listo." },
        { type: "h2", text: "Dónde encaja un enlace temporal" },
        {
          type: "ul",
          items: [
            "Chat: WhatsApp, Discord, Slack, Teams, Reddit — sin pelear con límites de subida",
            "Soporte: enseña exactamente lo que ves en pantalla, sin hilos eternos de adjuntos",
            "Dev: bugs, revisiones en GitHub, “¿se ve bien así?”",
            "Email: cuando el cliente del otro lado destroza las imágenes incrustadas",
          ],
        },
        {
          type: "p",
          text: "Los enlaces caducan cuando tú digas: 1 hora, 24 horas o 7 días, y hasta 90 días con Pro. Son temporales a propósito: no es un CMS ni un sitio para los assets de tu marca.",
        },
        { type: "h2", text: "Qué ve quien recibe el enlace" },
        {
          type: "p",
          text: "Una página sencilla con la imagen y cuándo caduca. Va con noindex, así que no está pensada para aparecer en Google. Quien tenga la URL puede verla hasta que expire o la borres.",
        },
        { type: "h2", text: "Compartir rápido vs dejarla publicada" },
        {
          type: "p",
          text: "Usa dropimg.io cuando la imagen es parte de la conversación. Usa un host permanente cuando forma parte de un producto, una doc o un post que debe quedarse.",
        },
      ],
    },
    "pt-BR": {
      title: "Compartilhe uma imagem com um link | dropimg.io",
      description:
        "Transforme a imagem em URL em segundos. Ideal pra WhatsApp, Slack, tickets e GitHub. Sem criar conta. Escolha 1 hora, 24 horas ou 7 dias.",
      ogTitle: "Compartilhe uma imagem com um link | dropimg.io",
      ogDescription:
        "Manda a imagem, copia a URL e envia. Feito pra chat e suporte — não pra hospedagem eterna.",
      twitterTitle: "Compartilhe uma imagem com um link | dropimg.io",
      twitterDescription:
        "Manda a imagem, copia a URL e envia. Pra chat e suporte.",
      h1: "Compartilhe uma imagem com um link",
      lede: "Às vezes o que falta é uma URL, não um anexo. O dropimg.io transforma o arquivo (ou o print colado) num link curto pra mandar pra qualquer lugar.",
      blocks: [
        { type: "h2", text: "O passo a passo" },
        {
          type: "ul",
          items: [
            "Arrasta, cola ou escolhe a imagem",
            "Copia o link (muitas vezes já vai copiado)",
            "Cola no chat, e-mail, ticket ou comentário do PR",
          ],
        },
        { type: "p", text: "É isso. Print → link. Pronto." },
        { type: "h2", text: "Onde um link temporário ajuda" },
        {
          type: "ul",
          items: [
            "Chat: WhatsApp, Discord, Slack, Teams, Reddit — sem brigar com limite de upload",
            "Suporte: mostra exatamente a tela, sem mil mensagens com anexo",
            "Dev: bugs, review no GitHub, “fica bom assim?”",
            "E-mail: quando o cliente do outro lado estraga imagem embutida",
          ],
        },
        {
          type: "p",
          text: "Os links expiram quando você quiser: 1 hora, 24 horas ou 7 dias, e até 90 dias com o Pro. São temporários de propósito: não é CMS nem CDN pra asset de marca.",
        },
        { type: "h2", text: "O que quem recebe vê" },
        {
          type: "p",
          text: "Uma página simples com a imagem e até quando vale. Vai com noindex, então não é pra aparecer no Google. Quem tiver a URL vê até expirar ou você excluir.",
        },
        { type: "h2", text: "Compartilhar rápido vs deixar no ar" },
        {
          type: "p",
          text: "Usa o dropimg.io quando a imagem faz parte da conversa. Usa host permanente quando ela faz parte de produto, docs ou post que precisa ficar.",
        },
      ],
    },
    de: {
      title: "Bild per Link teilen | dropimg.io",
      description:
        "Aus dem Bild in Sekunden eine URL machen. Für Chat, Support und GitHub. Ohne Konto. Wähle 1 Stunde, 24 Stunden oder 7 Tage.",
      ogTitle: "Bild per Link teilen | dropimg.io",
      ogDescription:
        "Bild rein, URL kopieren, senden. Für Chat und Support — nicht fürs ewige Hosting.",
      twitterTitle: "Bild per Link teilen | dropimg.io",
      twitterDescription:
        "Bild rein, URL kopieren, senden. Für Chat und Support.",
      h1: "Bild per Link teilen",
      lede: "Manche Tools wollen eine URL, keinen Anhang. dropimg.io macht aus der Datei (oder dem eingefügten Screenshot) einen kurzen Link zum Weitergeben.",
      blocks: [
        { type: "h2", text: "Der Ablauf" },
        {
          type: "ul",
          items: [
            "Ablegen, einfügen oder Bild wählen",
            "Link kopieren (oft schon für dich kopiert)",
            "In Chat, Mail, Ticket oder PR-Kommentar einfügen",
          ],
        },
        { type: "p", text: "Fertig. Screenshot → Link." },
        { type: "h2", text: "Wo kurze Links helfen" },
        {
          type: "ul",
          items: [
            "Chat: Discord, Slack, Teams, Reddit — ohne Upload-Limit-Kampf",
            "Support: genauen Bildschirmzustand zeigen, ohne Anhang-Marathon",
            "Dev: Bugreports, GitHub-Reviews, „sieht das so aus?“",
            "E-Mail: wenn der Client eingebettete Bilder zerlegt",
          ],
        },
        {
          type: "p",
          text: "Links laufen ab, wann du willst: 1 Stunde, 24 Stunden oder 7 Tage, mit Pro bis zu 90 Tage. Absichtlich temporär — kein CMS und kein CDN für Marken-Assets.",
        },
        { type: "h2", text: "Was Empfänger sehen" },
        {
          type: "p",
          text: "Eine schlichte Seite mit Bild und Ablaufhinweis. Share-Seiten sind noindex und sollen nicht in der Suche landen. Wer die URL hat, sieht das Bild bis zum Ablauf oder bis du es löschst.",
        },
        { type: "h2", text: "Schnell teilen vs. dauerhaft hosten" },
        {
          type: "p",
          text: "Nimm dropimg.io, wenn das Bild zur Unterhaltung gehört. Nimm einen dauerhaften Host, wenn es zu Produkt, Doku oder einem langlebigen Beitrag gehört.",
        },
      ],
    },
  },
};
