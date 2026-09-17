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

export type CompareRow = {
  use: string;
  drops: boolean;
  media: boolean;
};

export type HomeCopy = PageSeo & {
  h1Lead: string;
  h1Rest: string;
  /** @deprecated Drop-era H1; kept as the Drops section heading. */
  h1: string;
  subHtml: string;
  primaryCta: string;
  secondaryCta: string;
  worksWith: string;
  demoHeading: string;
  demoYou: string;
  demoPrompt: string;
  demoAgent: string;
  demoSteps: [string, string, string];
  demoUrl: string;
  demoUnchanged: string;
  dropKicker: string;
  dropzoneAria: string;
  trust: [string, string, string];
  compareHeading: string;
  compareDrops: string;
  compareDropsLead: string;
  compareDropsBody: string;
  compareMedia: string;
  compareMediaLead: string;
  compareMediaBody: string;
  compareRows: [CompareRow, CompareRow, CompareRow, CompareRow, CompareRow, CompareRow, CompareRow, CompareRow];
  stableKicker: string;
  stableTitle: string;
  stableBody: string;
  stablePath: string;
  stableV1: string;
  stableV2: string;
  stableExamples: [string, string, string, string, string];
  formatsHeading: string;
  formatsIntro: string;
  formatsRaster: string;
  formatsVector: string;
  formatsIcons: string;
  formatsFonts: string;
  formatsFocus: string;
  formatsUnsupportedHeading: string;
  formatsUnsupported: string[];
  agentsHeading: string;
  agentsBody: string;
  agentsFlow: [string, string, string];
  pricingHeading: string;
  pricingCta: string;
  closingHeading: string;
  closingPrimary: string;
  closingSecondary: string;
  ctaSoon: string;
  securityHeading: string;
  securityFacts: [string, string, string, string];
  securityPublic: string;
  howtoHeading: string;
  howto: [HowToStep, HowToStep, HowToStep];
  /** Single commercial beat between the steps and the FAQ. */
  feature: {
    kicker: string;
    title: string;
    body: string;
    /** Caption under the expiry visual. */
    note: string;
  };
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
  refunds: string;
  contact: string;
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
    sharex: string;
    api: string;
    mcp: string;
    webAssets: string;
    pricing: string;
    drops: string;
  };
  navWebAssets: string;
  navDrops: string;
  navPricing: string;
  navDocs: string;
  getStarted: string;
  productNavAria: string;
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
