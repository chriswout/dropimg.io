import { DEFAULT_LOCALE, LOCALE_CONFIG, SITE_ORIGIN, type Locale } from "./locales";
import type { FaqItem, HowToStep, LandingCopy } from "./types";

/**
 * SEO intent landings. These live outside PAGE_IDS because they localize
 * independently: a page exists in a locale only where native copy has been
 * written for it, so hreflang can never point at a URL we did not author.
 */
export const INTENT_PAGE_IDS = [
  "screenshot-to-link",
  "image-to-url",
  "anonymous-image-hosting",
  "expiring-image-link",
] as const;

export type IntentPageId = (typeof INTENT_PAGE_IDS)[number];

export type IntentCopy = LandingCopy & {
  stepsHeading: string;
  steps: [HowToStep, HowToStep, HowToStep];
  faqHeading: string;
  faqs: FaqItem[];
  schemaHowtoName: string;
  schemaHowtoDescription: string;
};

export const INTENT_PAGE_PATHS: Record<
  IntentPageId,
  Partial<Record<Locale, string>>
> = {
  "screenshot-to-link": {
    en: "/screenshot-to-link",
    es: "/es/captura-de-pantalla-a-enlace",
    "pt-BR": "/pt-br/colar-print-online",
  },
  "image-to-url": {
    en: "/image-to-url",
    es: "/es/imagen-a-url",
    "pt-BR": "/pt-br/imagem-para-url",
  },
  "anonymous-image-hosting": { en: "/anonymous-image-hosting" },
  "expiring-image-link": { en: "/expiring-image-link" },
};

export const INTENT_PAGES: Record<
  IntentPageId,
  Partial<Record<Locale, IntentCopy>>
> = {
  "screenshot-to-link": {
    en: {
      title: "Screenshot to Link — Share a Screenshot in Seconds | dropimg.io",
      description:
        "Turn a screenshot into a shareable link in seconds. Paste or drop the image, choose 1 hour, 24 hours, or 7 days, copy the link. No account needed.",
      ogTitle: "Screenshot to link | dropimg.io",
      ogDescription:
        "Paste a screenshot, get a link. No account. You choose when it expires.",
      twitterTitle: "Screenshot to link",
      twitterDescription:
        "Paste or drop a screenshot and copy a temporary share link.",
      h1: "Screenshot to link",
      lede: "Paste or drop a screenshot and copy a short link you can send anywhere. No account, and you decide how long it stays online.",
      stepsHeading: "Share a screenshot in three steps",
      steps: [
        {
          name: "Paste the screenshot",
          detail:
            "Press ⌘V or Ctrl+V straight after taking it, or drop the file on the uploader.",
        },
        {
          name: "Choose how long it lasts",
          detail:
            "1 hour for a quick answer, 24 hours for a work day, or 7 days — the default.",
        },
        {
          name: "Send the link",
          detail:
            "The URL is copied the moment the upload finishes. Paste it into Slack, a ticket, or an email.",
        },
      ],
      blocks: [
        { type: "h2", text: "Made for the screenshot you just took" },
        {
          type: "p",
          text: "Most screenshots answer one question and then stop mattering. Instead of attaching a file to every message, paste it here and share a link that cleans itself up.",
        },
        { type: "h2", text: "Where a link beats an attachment" },
        {
          type: "ul",
          items: [
            "Support chats and ticket comments where attachments are awkward or size-capped.",
            "Bug reports that need a picture of the actual screen, not a description.",
            "Design and copy feedback, where the screenshot is only relevant this week.",
            "Forums and issue trackers that accept a URL but not an upload.",
          ],
        },
        { type: "h2", text: "Formats and limits" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP, and GIF up to 10 MB.",
            "Metadata is stripped when supported.",
            "Delete early with the one-time delete control shown after upload.",
            "Pro raises the limit to 50 MB and adds password-protected links.",
          ],
        },
        { type: "h2", text: "Not permanent hosting" },
        {
          type: "p",
          text: "Every link expires. dropimg.io is for sharing a screenshot now, not for storing one forever — there is no public gallery and no permanent storage tier.",
        },
      ],
      faqHeading: "Screenshot sharing questions",
      faqs: [
        {
          q: "Do I need an account to share a screenshot?",
          a: "No. Pasting and sharing works without signing up. A free account is optional and keeps your last 10 active links in one place; Pro adds longer links, 50 MB uploads, and passwords.",
        },
        {
          q: "How long does the screenshot link work?",
          a: "For as long as you picked before uploading: 1 hour, 24 hours, or 7 days. Seven days is the default. When the time is up the image is deleted and the link stops working.",
        },
        {
          q: "Can I password-protect a screenshot?",
          a: "Yes, with Pro. Pro links can require a password before the image is shown, and can stay online for up to 90 days.",
        },
        {
          q: "Can I delete a screenshot before it expires?",
          a: "Yes. The delete control appears next to the link right after upload, and signed-in users can delete any active drop from My drops.",
        },
      ],
      schemaHowtoName: "Share a screenshot with a link",
      schemaHowtoDescription:
        "Paste a screenshot, choose how long the link lives, and copy the URL.",
    },
    es: {
      title:
        "Captura de pantalla a enlace — Comparte una captura al instante | dropimg.io",
      description:
        "Convierte una captura de pantalla en un enlace en segundos. Pega la imagen, elige 1 hora, 24 horas o 7 días y copia el enlace. Sin crear cuenta.",
      ogTitle: "Captura de pantalla a enlace | dropimg.io",
      ogDescription:
        "Pega una captura y obtén un enlace. Sin cuenta. Tú eliges cuándo caduca.",
      twitterTitle: "Captura de pantalla a enlace",
      twitterDescription:
        "Pega o arrastra una captura y copia un enlace temporal para compartir.",
      h1: "Captura de pantalla a enlace",
      lede: "Pega o arrastra una captura y copia un enlace corto para enviarlo donde quieras. Sin cuenta, y tú decides cuánto tiempo sigue en línea.",
      stepsHeading: "Comparte una captura en tres pasos",
      steps: [
        {
          name: "Pega la captura",
          detail:
            "Pulsa ⌘V o Ctrl+V justo después de tomarla, o arrastra el archivo al recuadro.",
        },
        {
          name: "Elige cuánto dura",
          detail:
            "1 hora para una respuesta rápida, 24 horas para la jornada o 7 días, que es la opción por defecto.",
        },
        {
          name: "Envía el enlace",
          detail:
            "El enlace se copia en cuanto termina la subida. Pégalo en Slack, en un ticket o en un correo.",
        },
      ],
      blocks: [
        { type: "h2", text: "Pensado para la captura que acabas de hacer" },
        {
          type: "p",
          text: "La mayoría de las capturas resuelven una duda y dejan de importar. En vez de adjuntar un archivo en cada mensaje, pégala aquí y comparte un enlace que se borra solo.",
        },
        { type: "h2", text: "Cuándo conviene un enlace en lugar de un adjunto" },
        {
          type: "ul",
          items: [
            "Chats de soporte y comentarios de tickets donde los adjuntos molestan o tienen límite de tamaño.",
            "Reportes de errores que necesitan ver la pantalla real, no una descripción.",
            "Comentarios de diseño o de texto, cuando la captura solo sirve esta semana.",
            "Foros y gestores de incidencias que aceptan una URL pero no una subida.",
          ],
        },
        { type: "h2", text: "Formatos y límites" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP y GIF hasta 10 MB.",
            "Se eliminan los metadatos cuando el formato lo permite.",
            "Puedes borrarla antes de tiempo con el botón que aparece tras subirla.",
            "Pro sube el límite a 50 MB y añade enlaces con contraseña.",
          ],
        },
        { type: "h2", text: "No es alojamiento permanente" },
        {
          type: "p",
          text: "Todos los enlaces caducan. dropimg.io sirve para compartir una captura ahora, no para guardarla siempre: no hay galería pública ni plan de almacenamiento permanente.",
        },
      ],
      faqHeading: "Preguntas sobre compartir capturas",
      faqs: [
        {
          q: "¿Necesito una cuenta para compartir una captura?",
          a: "No. Pegar y compartir funciona sin registrarse. La cuenta gratuita es opcional y guarda tus 10 últimos enlaces activos; Pro añade enlaces más largos, subidas de 50 MB y contraseñas.",
        },
        {
          q: "¿Cuánto tiempo funciona el enlace?",
          a: "El que hayas elegido antes de subir: 1 hora, 24 horas o 7 días. Siete días es la opción por defecto. Cuando se acaba el plazo, la imagen se borra y el enlace deja de funcionar.",
        },
        {
          q: "¿Puedo proteger una captura con contraseña?",
          a: "Sí, con Pro. Los enlaces Pro pueden pedir una contraseña antes de mostrar la imagen y durar hasta 90 días.",
        },
        {
          q: "¿Puedo borrar la captura antes de que caduque?",
          a: "Sí. El botón de borrar aparece junto al enlace justo después de subirla, y si inicias sesión puedes borrar cualquier imagen activa desde Mis imágenes.",
        },
      ],
      schemaHowtoName: "Compartir una captura de pantalla con un enlace",
      schemaHowtoDescription:
        "Pega una captura, elige cuánto dura el enlace y cópialo.",
    },
    "pt-BR": {
      title: "Colar Print Online — Compartilhe um print na hora | dropimg.io",
      description:
        "Cole um print online e receba um link em segundos. Escolha 1 hora, 24 horas ou 7 dias e copie o link. Sem criar conta.",
      ogTitle: "Colar print online | dropimg.io",
      ogDescription:
        "Cole um print e receba um link. Sem conta. Você escolhe quando expira.",
      twitterTitle: "Colar print online",
      twitterDescription:
        "Cole ou arraste um print e copie um link temporário para compartilhar.",
      h1: "Colar print online",
      lede: "Cole ou arraste um print e copie um link curto para mandar onde quiser. Sem conta, e você decide por quanto tempo ele fica no ar.",
      stepsHeading: "Compartilhe um print em três passos",
      steps: [
        {
          name: "Cole o print",
          detail:
            "Aperte ⌘V ou Ctrl+V logo depois de capturar, ou arraste o arquivo para a área de envio.",
        },
        {
          name: "Escolha a duração",
          detail:
            "1 hora para tirar uma dúvida, 24 horas para o dia de trabalho ou 7 dias, que já vem selecionado.",
        },
        {
          name: "Mande o link",
          detail:
            "O link é copiado assim que o envio termina. Cole no Slack, num chamado ou num e-mail.",
        },
      ],
      blocks: [
        { type: "h2", text: "Feito para o print que você acabou de tirar" },
        {
          type: "p",
          text: "A maioria dos prints resolve uma dúvida e depois perde a utilidade. Em vez de anexar arquivo em cada mensagem, cole aqui e compartilhe um link que se apaga sozinho.",
        },
        { type: "h2", text: "Quando o link vale mais que o anexo" },
        {
          type: "ul",
          items: [
            "Atendimentos e comentários de chamado em que anexo atrapalha ou tem limite de tamanho.",
            "Relatos de bug que precisam mostrar a tela de verdade, não uma descrição.",
            "Feedback de design ou de texto, quando o print só importa nesta semana.",
            "Fóruns e sistemas de issues que aceitam URL, mas não upload.",
          ],
        },
        { type: "h2", text: "Formatos e limites" },
        {
          type: "ul",
          items: [
            "PNG, JPEG, WebP e GIF até 10 MB.",
            "Os metadados são removidos quando o formato permite.",
            "Dá para apagar antes da hora no botão que aparece depois do envio.",
            "O Pro aumenta o limite para 50 MB e adiciona links com senha.",
          ],
        },
        { type: "h2", text: "Não é hospedagem permanente" },
        {
          type: "p",
          text: "Todo link expira. O dropimg.io serve para compartilhar um print agora, não para guardar para sempre: não existe galeria pública nem plano de armazenamento permanente.",
        },
      ],
      faqHeading: "Dúvidas sobre compartilhar prints",
      faqs: [
        {
          q: "Preciso de conta para compartilhar um print?",
          a: "Não. Colar e compartilhar funciona sem cadastro. A conta gratuita é opcional e guarda os seus 10 últimos links ativos; o Pro adiciona links mais longos, envios de 50 MB e senhas.",
        },
        {
          q: "Por quanto tempo o link funciona?",
          a: "Pelo tempo que você escolheu antes de enviar: 1 hora, 24 horas ou 7 dias. Sete dias é o padrão. Quando o prazo acaba, a imagem é apagada e o link para de funcionar.",
        },
        {
          q: "Dá para proteger um print com senha?",
          a: "Sim, com o Pro. Os links Pro podem pedir uma senha antes de mostrar a imagem e durar até 90 dias.",
        },
        {
          q: "Consigo apagar o print antes de expirar?",
          a: "Sim. O botão de apagar aparece ao lado do link logo após o envio, e quem entra na conta pode apagar qualquer imagem ativa em Meus envios.",
        },
      ],
      schemaHowtoName: "Compartilhar um print com um link",
      schemaHowtoDescription:
        "Cole um print, escolha a duração do link e copie a URL.",
    },
  },

  "image-to-url": {
    en: {
      title: "Image to URL — Upload an Image and Get a Link | dropimg.io",
      description:
        "Convert an image to a URL instantly. Drop or paste a file, choose 1 hour, 24 hours, or 7 days, and copy the link. No account required.",
      ogTitle: "Image to URL | dropimg.io",
      ogDescription:
        "Drop an image, get a URL. No account required, and you choose when it expires.",
      twitterTitle: "Image to URL",
      twitterDescription:
        "Upload an image and copy a share link. You choose how long it lasts.",
      h1: "Image to URL",
      lede: "Drop or paste an image and copy a URL you can share anywhere. No account required, and you choose how long the link lives.",
      stepsHeading: "Turn an image into a URL",
      steps: [
        {
          name: "Add your image",
          detail:
            "Paste with ⌘V or Ctrl+V, drop a file on the uploader, or choose one from your device.",
        },
        {
          name: "Choose how long it lives",
          detail:
            "1 hour, 24 hours, or 7 days. Seven days is selected for you unless you change it.",
        },
        {
          name: "Copy the URL",
          detail:
            "The link is copied as soon as the upload finishes — paste it into chat, email, or a ticket.",
        },
      ],
      blocks: [
        { type: "h2", text: "From file to link" },
        {
          type: "p",
          text: "Use the uploader above. When the upload finishes the share URL is ready to copy, and the expiry you picked is shown next to it so you always know how long it will work.",
        },
        { type: "h2", text: "What you get" },
        {
          type: "ul",
          items: [
            "A short public page for the image.",
            "A direct image URL under /i/… for embedding where allowed.",
            "Automatic deletion when the lifetime you chose runs out.",
            "PNG, JPEG, WebP, and GIF up to 10 MB, with metadata stripped when supported.",
          ],
        },
        { type: "h2", text: "Upload an image, get a URL — without an account" },
        {
          type: "p",
          text: "Anonymous uploading is the default, not a trial. Signing in is optional: a free account keeps your last 10 active links in one place, and Pro adds links up to 90 days, 50 MB uploads, password protection, and browser extension and ShareX uploads.",
        },
        { type: "h2", text: "Not a CDN or a gallery" },
        {
          type: "p",
          text: "dropimg.io converts an image to a link for temporary sharing. There is no public gallery and no permanent storage tier — if you need the file online indefinitely, use a host built for that.",
        },
      ],
      faqHeading: "Image to URL questions",
      faqs: [
        {
          q: "Do I need an account to turn an image into a URL?",
          a: "No. Uploading and sharing works without signing up. An optional free account keeps your last 10 active links together, and Pro adds longer links, larger uploads, and passwords.",
        },
        {
          q: "How long will the image URL work?",
          a: "As long as you chose before uploading: 1 hour, 24 hours, or 7 days. Seven days is the default. Pro can keep a link online for up to 90 days from the original upload.",
        },
        {
          q: "Is this permanent image hosting?",
          a: "No. Every dropimg.io URL expires and the file is deleted afterwards. It is built for temporary sharing, not permanent storage.",
        },
        {
          q: "What files can I convert to a URL?",
          a: "PNG, JPEG, WebP, and GIF up to 10 MB on the free tier, or up to 50 MB with Pro. SVG is not accepted.",
        },
      ],
      schemaHowtoName: "Convert an image to a URL",
      schemaHowtoDescription:
        "Upload an image, choose how long the link lives, and copy the URL.",
    },
    es: {
      title: "Imagen a URL — Sube una imagen y obtén un enlace | dropimg.io",
      description:
        "Convierte una imagen en URL al instante. Arrastra o pega el archivo, elige 1 hora, 24 horas o 7 días y copia el enlace. Sin crear cuenta.",
      ogTitle: "Imagen a URL | dropimg.io",
      ogDescription:
        "Sube una imagen y obtén un enlace. Sin cuenta, y tú eliges cuándo caduca.",
      twitterTitle: "Imagen a URL",
      twitterDescription:
        "Sube una imagen y copia un enlace para compartir. Tú eliges cuánto dura.",
      h1: "Imagen a URL",
      lede: "Arrastra o pega una imagen y copia un enlace para compartir donde quieras. Sin crear cuenta, y tú eliges cuánto dura.",
      stepsHeading: "Convierte una imagen en enlace",
      steps: [
        {
          name: "Añade tu imagen",
          detail:
            "Pega con ⌘V o Ctrl+V, arrastra el archivo al recuadro o elígelo desde tu dispositivo.",
        },
        {
          name: "Elige cuánto dura",
          detail:
            "1 hora, 24 horas o 7 días. Se selecciona 7 días salvo que lo cambies.",
        },
        {
          name: "Copia el enlace",
          detail:
            "Se copia en cuanto termina la subida: pégalo en un chat, un correo o un ticket.",
        },
      ],
      blocks: [
        { type: "h2", text: "Del archivo al enlace" },
        {
          type: "p",
          text: "Usa el recuadro de arriba. Al terminar la subida, el enlace queda listo para copiar y verás junto a él la caducidad que elegiste, así siempre sabes hasta cuándo funciona.",
        },
        { type: "h2", text: "Qué obtienes" },
        {
          type: "ul",
          items: [
            "Una página pública breve para la imagen.",
            "Una URL directa bajo /i/… para insertarla donde esté permitido.",
            "Borrado automático cuando se cumple el plazo que elegiste.",
            "PNG, JPEG, WebP y GIF hasta 10 MB, sin metadatos cuando el formato lo permite.",
          ],
        },
        { type: "h2", text: "Subir imagen y obtener enlace, sin cuenta" },
        {
          type: "p",
          text: "Subir de forma anónima es lo normal aquí, no una prueba. Iniciar sesión es opcional: la cuenta gratuita reúne tus 10 últimos enlaces activos, y Pro añade enlaces de hasta 90 días, subidas de 50 MB, protección con contraseña y subidas desde la extensión y ShareX.",
        },
        { type: "h2", text: "No es una CDN ni una galería" },
        {
          type: "p",
          text: "dropimg.io convierte una imagen en enlace para compartirla un rato. No hay galería pública ni plan de almacenamiento permanente: si necesitas el archivo en línea de forma indefinida, usa un servicio pensado para eso.",
        },
      ],
      faqHeading: "Preguntas sobre imagen a URL",
      faqs: [
        {
          q: "¿Necesito una cuenta para convertir una imagen en URL?",
          a: "No. Subir y compartir funciona sin registrarse. La cuenta gratuita es opcional y reúne tus 10 últimos enlaces activos; Pro añade enlaces más largos, archivos más grandes y contraseñas.",
        },
        {
          q: "¿Cuánto tiempo funcionará la URL de la imagen?",
          a: "El que elijas antes de subirla: 1 hora, 24 horas o 7 días. Siete días es la opción por defecto. Con Pro un enlace puede durar hasta 90 días desde la subida original.",
        },
        {
          q: "¿Esto es alojamiento permanente de imágenes?",
          a: "No. Todas las URL de dropimg.io caducan y después el archivo se borra. Está pensado para compartir temporalmente, no para almacenar.",
        },
        {
          q: "¿Qué archivos puedo convertir en URL?",
          a: "PNG, JPEG, WebP y GIF hasta 10 MB en el plan gratuito, o hasta 50 MB con Pro. No se aceptan SVG.",
        },
      ],
      schemaHowtoName: "Convertir una imagen en URL",
      schemaHowtoDescription:
        "Sube una imagen, elige cuánto dura el enlace y cópialo.",
    },
    "pt-BR": {
      title: "Imagem para URL — Envie uma imagem e receba um link | dropimg.io",
      description:
        "Transforme imagem em URL na hora. Arraste ou cole o arquivo, escolha 1 hora, 24 horas ou 7 dias e copie o link. Sem criar conta.",
      ogTitle: "Imagem para URL | dropimg.io",
      ogDescription:
        "Envie uma imagem e receba um link. Sem conta, e você escolhe quando expira.",
      twitterTitle: "Imagem para URL",
      twitterDescription:
        "Envie uma imagem e copie um link para compartilhar. Você escolhe a duração.",
      h1: "Imagem para URL",
      lede: "Arraste ou cole uma imagem e copie um link para compartilhar onde quiser. Sem criar conta, e você escolhe quanto tempo ele dura.",
      stepsHeading: "Transforme uma imagem em link",
      steps: [
        {
          name: "Adicione a imagem",
          detail:
            "Cole com ⌘V ou Ctrl+V, arraste o arquivo para a área de envio ou escolha do seu aparelho.",
        },
        {
          name: "Escolha a duração",
          detail:
            "1 hora, 24 horas ou 7 dias. Sete dias já vem selecionado, se você não mudar.",
        },
        {
          name: "Copie o link",
          detail:
            "Ele é copiado assim que o envio termina: cole num chat, num e-mail ou num chamado.",
        },
      ],
      blocks: [
        { type: "h2", text: "Do arquivo ao link" },
        {
          type: "p",
          text: "Use a área de envio acima. Quando o upload termina, o link fica pronto para copiar e o prazo escolhido aparece do lado, então você sempre sabe até quando ele funciona.",
        },
        { type: "h2", text: "O que você recebe" },
        {
          type: "ul",
          items: [
            "Uma página pública curta para a imagem.",
            "Uma URL direta em /i/… para incorporar onde for permitido.",
            "Exclusão automática quando o prazo escolhido termina.",
            "PNG, JPEG, WebP e GIF até 10 MB, sem metadados quando o formato permite.",
          ],
        },
        { type: "h2", text: "Gerar link para imagem sem criar conta" },
        {
          type: "p",
          text: "Enviar sem conta é o padrão aqui, não um teste. Entrar é opcional: a conta gratuita reúne os seus 10 últimos links ativos, e o Pro acrescenta links de até 90 dias, envios de 50 MB, proteção por senha e envio pela extensão e pelo ShareX.",
        },
        { type: "h2", text: "Não é CDN nem galeria" },
        {
          type: "p",
          text: "O dropimg.io transforma imagem em link para compartilhar por um tempo. Não há galeria pública nem plano de armazenamento permanente: se você precisa do arquivo no ar por tempo indeterminado, use um serviço feito para isso.",
        },
      ],
      faqHeading: "Dúvidas sobre imagem para URL",
      faqs: [
        {
          q: "Preciso de conta para transformar imagem em URL?",
          a: "Não. Enviar e compartilhar funciona sem cadastro. A conta gratuita é opcional e reúne os seus 10 últimos links ativos; o Pro acrescenta links mais longos, arquivos maiores e senhas.",
        },
        {
          q: "Por quanto tempo a URL da imagem funciona?",
          a: "Pelo prazo que você escolher antes de enviar: 1 hora, 24 horas ou 7 dias. Sete dias é o padrão. Com o Pro, um link pode durar até 90 dias contados do envio original.",
        },
        {
          q: "Isso é hospedagem permanente de imagens?",
          a: "Não. Toda URL do dropimg.io expira e o arquivo é apagado depois. Ele foi feito para compartilhar por um tempo, não para armazenar.",
        },
        {
          q: "Quais arquivos posso transformar em URL?",
          a: "PNG, JPEG, WebP e GIF até 10 MB no plano gratuito, ou até 50 MB com o Pro. SVG não é aceito.",
        },
      ],
      schemaHowtoName: "Transformar uma imagem em URL",
      schemaHowtoDescription:
        "Envie uma imagem, escolha a duração do link e copie a URL.",
    },
  },

  "anonymous-image-hosting": {
    en: {
      title: "Anonymous Image Hosting (Temporary) | dropimg.io",
      description:
        "Anonymous temporary image hosting with no account required. Paste or upload, choose 1 hour, 24 hours, or 7 days, share a link, and it deletes itself.",
      ogTitle: "Anonymous temporary image hosting | dropimg.io",
      ogDescription:
        "No account required. Temporary links that delete themselves when you say so.",
      twitterTitle: "Anonymous image hosting",
      twitterDescription:
        "Upload without an account. You choose when the link expires.",
      h1: "Anonymous temporary image hosting",
      lede: "Share an image without creating an account. Links are temporary and delete themselves after the time you choose.",
      stepsHeading: "Upload anonymously in three steps",
      steps: [
        {
          name: "Upload without signing up",
          detail:
            "Paste, drop, or choose a file. Nothing is asked of you — no email, no profile.",
        },
        {
          name: "Set the lifetime",
          detail: "1 hour, 24 hours, or 7 days, chosen before the upload runs.",
        },
        {
          name: "Share and forget it",
          detail:
            "Copy the link. When the time is up the image is deleted for you.",
        },
      ],
      blocks: [
        { type: "h2", text: "No account required" },
        {
          type: "p",
          text: "Upload from the page above without signing up. Accounts exist but are entirely optional: a free account only adds a list of your last 10 active links, and Pro adds longer links, larger uploads, and passwords. There are no public profiles and no searchable library of uploads.",
        },
        { type: "h2", text: "What we do and do not keep" },
        {
          type: "ul",
          items: [
            "IP addresses are hashed for abuse rate limits, not for identity.",
            "Image metadata is stripped when the format supports it.",
            "The image itself is deleted when the lifetime you chose runs out.",
            "Anonymous uploads are never attached to an account unless you claim them yourself.",
          ],
        },
        { type: "h2", text: "Still accountable" },
        {
          type: "p",
          text: "Anonymous does not mean unmoderated. Abuse can be reported at /abuse, and illegal content is removed. See the Privacy Policy and Terms for details.",
        },
        { type: "h2", text: "Temporary by design" },
        {
          type: "ul",
          items: [
            "Free uploads last 1 hour, 24 hours, or 7 days — 7 days by default.",
            "You can delete sooner with the delete control from your upload session.",
            "There is no permanent storage option, anonymous or otherwise.",
            "Password-protected links and lifetimes up to 90 days require a Pro account.",
          ],
        },
      ],
      faqHeading: "Anonymous hosting questions",
      faqs: [
        {
          q: "Is an account ever required?",
          a: "No. Anonymous uploading is the normal way to use dropimg.io. Accounts are optional and only add history, longer links, larger files, passwords, and integrations.",
        },
        {
          q: "How long does an anonymous link last?",
          a: "You choose 1 hour, 24 hours, or 7 days before uploading, and 7 days is the default. After that the image is deleted and the link stops serving.",
        },
        {
          q: "Can I host an image anonymously forever?",
          a: "No. Every link expires — there is no permanent storage tier. The longest lifetime on the service is 90 days, with Pro.",
        },
        {
          q: "Are uploads really anonymous?",
          a: "No email or profile is required, and metadata is stripped when supported. IP addresses are hashed for rate limiting and abuse handling only. Read the Privacy Policy for the full picture.",
        },
      ],
      schemaHowtoName: "Host an image anonymously",
      schemaHowtoDescription:
        "Upload without an account, choose a lifetime, and share a temporary link.",
    },
  },

  "expiring-image-link": {
    en: {
      title: "Expiring Image Link — Choose 1 Hour to 7 Days | dropimg.io",
      description:
        "Create an expiring image link in seconds. Paste a screenshot or drop a file, pick 1 hour, 24 hours, or 7 days, and it auto-deletes. No account.",
      ogTitle: "Expiring image link | dropimg.io",
      ogDescription:
        "Image URLs that delete themselves. Pick 1 hour, 24 hours, or 7 days.",
      twitterTitle: "Expiring image link",
      twitterDescription:
        "Share an image with a link that disappears when you say so.",
      h1: "Expiring image link",
      lede: "Get a shareable image URL that deletes itself on your schedule. Pick 1 hour, 24 hours, or 7 days, then paste or drop to start.",
      stepsHeading: "Create an expiring link",
      steps: [
        {
          name: "Add the image",
          detail: "Paste, drop, or choose a PNG, JPEG, WebP, or GIF.",
        },
        {
          name: "Pick the expiry",
          detail:
            "1 hour, 24 hours, or 7 days — the choice sits right under the uploader.",
        },
        {
          name: "Share it",
          detail:
            "Copy the link. The countdown starts at upload, and deletion is automatic.",
        },
      ],
      blocks: [
        { type: "h2", text: "Built to expire" },
        {
          type: "p",
          text: "Every dropimg.io link has an end date, and you set it. When the time is up the image is removed from storage and the URL stops serving — no cleanup, no archive, nothing left behind.",
        },
        { type: "h2", text: "Choose the lifetime that fits" },
        {
          type: "ul",
          items: [
            "1 hour for a password reset screenshot or a one-question answer.",
            "24 hours for something you are actively working through today.",
            "7 days for a thread, a review, or a ticket that stays open — this is the default.",
            "Up to 30 or 90 days with Pro, when a link has to outlive the week.",
          ],
        },
        { type: "h2", text: "Good for" },
        {
          type: "ul",
          items: [
            "Quick screenshots in support chats",
            "One-off mockups and previews",
            "Anything you do not want hosted forever",
          ],
        },
        { type: "h2", text: "Delete early, or lock it down" },
        {
          type: "p",
          text: "After upload, use the delete control to remove the image before it expires — recipients simply see that the link is gone. Pro accounts can also require a password before the image is shown, and can extend an existing link up to 90 days from its original upload.",
        },
      ],
      faqHeading: "Expiring link questions",
      faqs: [
        {
          q: "How do I set when an image link expires?",
          a: "Pick 1 hour, 24 hours, or 7 days under the uploader before you upload. Seven days is selected by default, and the link shows its expiry once it is ready.",
        },
        {
          q: "What is the longest an image link can last?",
          a: "Seven days on the free tier. Pro can choose 30 or 90 days, and 90 days from the original upload is the hard maximum — links cannot be extended past it.",
        },
        {
          q: "What happens when the link expires?",
          a: "The image is deleted from storage and the URL stops serving. There is no archive and no way to restore it, so keep your own copy of anything you need.",
        },
        {
          q: "Can I make the link expire sooner?",
          a: "Yes. Use the delete control shown after upload, or delete the drop from My drops if you are signed in.",
        },
      ],
      schemaHowtoName: "Create an expiring image link",
      schemaHowtoDescription:
        "Upload an image, choose when it expires, and share the link.",
    },
  },
};

/** Locales this intent page has been natively written for, English first. */
export function intentLocales(id: IntentPageId): Locale[] {
  const paths = INTENT_PAGE_PATHS[id];
  const copy = INTENT_PAGES[id];
  return (Object.keys(paths) as Locale[]).filter((locale) => copy[locale]);
}

export function intentPagePath(id: IntentPageId, locale: Locale): string {
  const path = INTENT_PAGE_PATHS[id][locale];
  if (!path) throw new Error(`No ${locale} path for intent page ${id}`);
  return path;
}

export function intentPageUrl(
  id: IntentPageId,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${SITE_ORIGIN}${intentPagePath(id, locale)}`;
}

export function intentPageCopy(id: IntentPageId, locale: Locale): IntentCopy {
  const copy = INTENT_PAGES[id][locale];
  if (!copy) throw new Error(`No ${locale} copy for intent page ${id}`);
  return copy;
}

/**
 * Alternates for a localized intent cluster. English-only pages get none at
 * all rather than a lone self-referencing tag, and a locale is listed only
 * when its page actually exists.
 */
export function intentAlternateLinks(
  id: IntentPageId,
): { hreflang: string; href: string }[] {
  const locales = intentLocales(id);
  if (locales.length < 2) return [];
  const links = locales.map((locale) => ({
    hreflang: LOCALE_CONFIG[locale].hreflang,
    href: intentPageUrl(id, locale),
  }));
  links.push({
    hreflang: "x-default",
    href: intentPageUrl(id, DEFAULT_LOCALE),
  });
  return links;
}

/** Every intent URL across every locale, for sitemap and IndexNow. */
export function allIntentUrls(): string[] {
  return INTENT_PAGE_IDS.flatMap((id) =>
    intentLocales(id).map((locale) => intentPageUrl(id, locale)),
  );
}
