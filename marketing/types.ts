export type FaqItem = { q: string; a: string };

export type HowToStep = { name: string; detail: string };

export type SeoBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type PageSeo = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
};

export type HomeCopy = PageSeo & {
  h1: string;
  subHtml: string;
  dropzoneAria: string;
  trust: [string, string, string];
  howtoHeading: string;
  howto: [HowToStep, HowToStep, HowToStep];
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem];
  schemaAppDescription: string;
  schemaSiteDescription: string;
  schemaHowtoName: string;
  schemaHowtoDescription: string;
};

export type LandingCopy = PageSeo & {
  h1: string;
  lede: string;
  blocks: SeoBlock[];
};

export type SharedChrome = {
  skipToUpload: string;
  brandHomeAria: string;
  langMenuAria: string;
  privacy: string;
  terms: string;
  abuse: string;
  learnMoreAria: string;
  relatedAria: string;
  footerProduct: string;
  footerLegal: string;
  footerTagline: string;
  footerSeo: {
    temporary: string;
    paste: string;
    share: string;
    extension: string;
  };
  homeLink: string;
  productHighlights: string;
  aboutAria: string;
  /** Shown on English homepage when browser prefers another locale. */
  langSuggest: Record<"es" | "pt-BR" | "de", string>;
  suggestSwitch: string;
  suggestDismiss: string;
  signIn: string;
  signOut: string;
  myDrops: string;
  pro: string;
  proPrice: string;
  upgradeToPro: string;
  editAccount: string;
  accountAria: string;
  themeToggleAria: string;
  themeToLight: string;
  themeToDark: string;
};
