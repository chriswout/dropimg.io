import type { FaqItem, PageSeo } from "./types";

export const PRICING_PATH = "/pricing";
export const PRICING_URL = "https://dropimg.io/pricing";

export type PricingTierId = "free" | "developer" | "pro";

export type PricingTier = {
  id: PricingTierId;
  name: string;
  price: string;
  period: string;
  annual: string | null;
  positioning: string;
  teaser: string;
  features: string[];
  cta: string;
};

export const PRICING_TIERS: [PricingTier, PricingTier, PricingTier] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    annual: null,
    positioning: "For experiments and small AI-built apps",
    teaser: "3 projects",
    features: [
      "3 projects",
      "1 GB Web Asset storage",
      "100K asset deliveries / month",
      "MCP",
      "REST API",
      "Stable aliases",
      "Asset replacement",
      "Supported Web Asset formats",
    ],
    cta: "Start free",
  },
  {
    id: "developer",
    name: "Developer",
    price: "$9",
    period: "/month",
    annual: "$90/year",
    positioning: "For developers shipping real applications",
    teaser: "10 GB · 2M deliveries",
    features: [
      "20 projects",
      "10 GB storage",
      "2M asset deliveries / month",
      "Project API keys",
      "REST + MCP",
      "Versioning",
      "Agent integrations",
      "Commercial use",
    ],
    cta: "Choose Developer",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    annual: "$290/year",
    positioning: "For active apps and agencies",
    teaser: "100 GB · 10M deliveries",
    features: [
      "100 projects",
      "100 GB storage",
      "10M asset deliveries / month",
      "Higher project / key limits",
      "REST + MCP",
      "Versioning",
      "Larger usage allowance",
    ],
    cta: "Choose Pro",
  },
];

export const PRICING_PAGE: PageSeo & {
  skip: string;
  kicker: string;
  h1: string;
  lede: string;
  launchNote: string;
  noEgress: string;
  noMcpFee: string;
  overageNote: string;
  dropProHeading: string;
  dropProBody: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem];
} = {
  title: "Web Assets pricing — Free, Developer $9, Pro $29 | dropimg.io",
  description:
    "Web Assets plans: Free $0 (3 projects, 1 GB, 100K deliveries), Developer $9/month or $90/year, Pro $29/month or $290/year. No bandwidth surcharge. No per-MCP-call fee.",
  ogTitle: "Web Assets pricing | dropimg.io",
  ogDescription:
    "Free for experiments. Developer $9/month. Pro $29/month. No egress fees. No per-MCP-call charges. Plan limits still apply.",
  twitterTitle: "Web Assets pricing",
  twitterDescription:
    "Free, Developer $9, Pro $29. Storage and deliveries included. No bandwidth surcharge, no MCP call fees.",
  skip: "Skip to plans",
  kicker: "Web Assets",
  h1: "Web Assets pricing",
  lede: "Pay for projects, storage, and deliveries — not per MCP call, and not a bandwidth surcharge on top of the plan. Fair-use and plan limits still apply.",
  launchNote:
    "Free starts instantly. Developer and Pro are billed on PayPal. Drops Pro (€2.99) for temporary Drops is a separate product.",
  noEgress: "No bandwidth / egress fees.",
  noMcpFee: "No per-MCP-call charges.",
  overageNote:
    "Storage and delivery overages stay on the plan. Crossing 100% of monthly deliveries starts a 3-day grace window — live /m/… URLs keep serving. New uploads and projects still respect plan limits.",
  dropProHeading: "Looking for Drops pricing?",
  dropProBody:
    "Drops are free for temporary image sharing. Drops Pro adds longer expiry and password protection for €2.99/month. Web Assets subscriptions do not change Drop expiry or password features.",
  faqHeading: "Pricing questions",
  faqs: [
    {
      q: "Can I buy Developer or Pro today?",
      a: "Yes. Choose Developer or Pro on this page. Checkout is PayPal. Free does not require a card.",
    },
    {
      q: "Are the plans metered?",
      a: "Yes. Each plan has project, storage, and delivery limits. There is no per-call MCP meter and no extra egress line item.",
    },
    {
      q: "What about Drops?",
      a: "Temporary Drops stay free at the current site limits. Drops Pro is still €2.99/month for longer Drop links and passwords. Web Assets storage is billed on the table above.",
    },
  ],
};
