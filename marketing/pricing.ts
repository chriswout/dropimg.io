import { WEB_ASSETS_PLANS } from "../src/lib/web-assets-plans";
import type { FaqItem, PageSeo } from "./types";

export const PRICING_PATH = "/pricing";
export const PRICING_URL = "https://dropimg.io/pricing";

export type PricingTierId = "free" | "developer" | "pro";

export type PricingMetric = {
  value: string;
  label: string;
};

export type PricingTier = {
  id: PricingTierId;
  name: string;
  recommended: boolean;
  price: string;
  period: string;
  annual: string | null;
  annualAmount: string | null;
  annualBill: string | null;
  positioning: string;
  teaser: string;
  metrics: [PricingMetric, PricingMetric, PricingMetric];
  includesLabel: string | null;
  features: string[];
  cta: string;
};

const gb = (bytes: number) => `${Math.round(bytes / 1024 ** 3)} GB`;
const deliveries = (n: number) =>
  n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}K`;

export const PRICING_TIERS: [PricingTier, PricingTier, PricingTier] = [
  {
    id: "free",
    name: "Free",
    recommended: false,
    price: "$0",
    period: "forever",
    annual: null,
    annualAmount: null,
    annualBill: null,
    positioning: "For experiments and small personal apps.",
    teaser: "3 projects",
    metrics: [
      { value: String(WEB_ASSETS_PLANS.free.projectLimit), label: "projects" },
      { value: gb(WEB_ASSETS_PLANS.free.storageBytesLimit), label: "storage" },
      {
        value: deliveries(WEB_ASSETS_PLANS.free.deliveryLimitMonthly),
        label: "deliveries / mo",
      },
    ],
    includesLabel: null,
    features: [
      "Stable asset URLs",
      "REST + MCP",
      "Asset replacement",
      "Supported Web Asset formats",
      `${WEB_ASSETS_PLANS.free.projectKeyLimit} active project keys`,
      "10 MB/file",
    ],
    cta: "Start free",
  },
  {
    id: "developer",
    name: "Developer",
    recommended: true,
    price: "$9",
    period: "/month",
    annual: "$90/year",
    annualAmount: "$7.50",
    annualBill: "$90 billed annually",
    positioning: "For developers shipping real products.",
    teaser: "10 GB · 2M deliveries",
    metrics: [
      { value: String(WEB_ASSETS_PLANS.developer.projectLimit), label: "projects" },
      { value: gb(WEB_ASSETS_PLANS.developer.storageBytesLimit), label: "storage" },
      {
        value: deliveries(WEB_ASSETS_PLANS.developer.deliveryLimitMonthly),
        label: "deliveries / mo",
      },
    ],
    includesLabel: "Everything in Free, plus:",
    features: [
      `${WEB_ASSETS_PLANS.developer.projectKeyLimit} project keys`,
      "Version history",
      "Commercial use",
      "Higher storage & delivery limits",
    ],
    cta: "Choose Developer",
  },
  {
    id: "pro",
    name: "Pro",
    recommended: false,
    price: "$29",
    period: "/month",
    annual: "$290/year",
    annualAmount: "$24.17",
    annualBill: "$290 billed annually",
    positioning: "For agencies, multiple apps, and higher traffic.",
    teaser: "100 GB · 10M deliveries",
    metrics: [
      { value: String(WEB_ASSETS_PLANS.pro.projectLimit), label: "projects" },
      { value: gb(WEB_ASSETS_PLANS.pro.storageBytesLimit), label: "storage" },
      {
        value: deliveries(WEB_ASSETS_PLANS.pro.deliveryLimitMonthly),
        label: "deliveries / mo",
      },
    ],
    includesLabel: "Everything in Developer, plus:",
    features: [
      `${WEB_ASSETS_PLANS.pro.projectKeyLimit} project keys`,
      `${gb(WEB_ASSETS_PLANS.pro.storageBytesLimit)} storage`,
      `${deliveries(WEB_ASSETS_PLANS.pro.deliveryLimitMonthly)} monthly deliveries`,
      "Built for multiple production apps",
    ],
    cta: "Choose Pro",
  },
];

export type PricingCompareRow = {
  feature: string;
  free: string;
  developer: string;
  pro: string;
};

export const PRICING_COMPARE_ROWS: PricingCompareRow[] = [
  {
    feature: "Projects",
    free: String(WEB_ASSETS_PLANS.free.projectLimit),
    developer: String(WEB_ASSETS_PLANS.developer.projectLimit),
    pro: String(WEB_ASSETS_PLANS.pro.projectLimit),
  },
  {
    feature: "Storage",
    free: gb(WEB_ASSETS_PLANS.free.storageBytesLimit),
    developer: gb(WEB_ASSETS_PLANS.developer.storageBytesLimit),
    pro: gb(WEB_ASSETS_PLANS.pro.storageBytesLimit),
  },
  {
    feature: "Monthly deliveries",
    free: deliveries(WEB_ASSETS_PLANS.free.deliveryLimitMonthly),
    developer: deliveries(WEB_ASSETS_PLANS.developer.deliveryLimitMonthly),
    pro: deliveries(WEB_ASSETS_PLANS.pro.deliveryLimitMonthly),
  },
  {
    feature: "Active project keys",
    free: String(WEB_ASSETS_PLANS.free.projectKeyLimit),
    developer: String(WEB_ASSETS_PLANS.developer.projectKeyLimit),
    pro: String(WEB_ASSETS_PLANS.pro.projectKeyLimit),
  },
  { feature: "REST API", free: "Yes", developer: "Yes", pro: "Yes" },
  { feature: "MCP", free: "Yes", developer: "Yes", pro: "Yes" },
  { feature: "Stable aliases", free: "Yes", developer: "Yes", pro: "Yes" },
  { feature: "Asset replacement", free: "Yes", developer: "Yes", pro: "Yes" },
  { feature: "Versioning", free: "Yes", developer: "Yes", pro: "Yes" },
  { feature: "Commercial use", free: "Personal apps", developer: "Yes", pro: "Yes" },
  { feature: "Max file size", free: "10 MB", developer: "10 MB", pro: "10 MB" },
];

export const PRICING_PAGE: PageSeo & {
  skip: string;
  kicker: string;
  h1: string;
  lede: string;
  launchNote: string;
  monthly: string;
  annual: string;
  annualSave: string;
  intervalAria: string;
  recommended: string;
  trustLine: string;
  noEgress: string;
  noMcpFee: string;
  overageHeading: string;
  overageLead: string;
  overageBody: string;
  overageNote: string;
  compareHeading: string;
  compareAria: string;
  dropProHeading: string;
  dropProBody: string;
  dropFreeName: string;
  dropFreePos: string;
  dropProName: string;
  dropProPrice: string;
  dropProFeatures: [string, string];
  dropProCta: string;
  dropProSeparate: string;
  faqHeading: string;
  faqs: [FaqItem, FaqItem, FaqItem, FaqItem, FaqItem, FaqItem, FaqItem];
  closeHeading: string;
  closeLede: string;
  closePrimary: string;
  closeSecondary: string;
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
  kicker: "Web Assets pricing",
  h1: "Simple pricing for assets your apps actually use.",
  lede: "Start free. Upgrade when you need more projects, storage, or asset deliveries. No egress surcharge and no per-MCP-call fees.",
  launchNote:
    "Free starts instantly. Developer and Pro are billed on PayPal. Drops Pro (€2.99) for temporary Drops is a separate product.",
  monthly: "Monthly",
  annual: "Annual",
  annualSave: "Save 17%",
  intervalAria: "Billing interval",
  recommended: "Recommended",
  trustLine: "No egress fees · No per-MCP-call charges · Cancel anytime",
  noEgress: "No bandwidth / egress fees.",
  noMcpFee: "No per-MCP-call charges.",
  overageHeading: "Usage protection",
  overageLead: "We don't suddenly break your live assets.",
  overageBody:
    "At 80% of your monthly delivery limit we'll warn you. At 100%, a 3-day grace period begins while existing /m/... URLs keep serving.",
  overageNote: "New projects and uploads still respect plan limits.",
  compareHeading: "Compare plans",
  compareAria: "Web Assets plan comparison",
  dropProHeading: "Need temporary image sharing instead?",
  dropProBody:
    "Drops are free for temporary image sharing. Drops Pro adds longer expiry and password protection for €2.99/month. Web Assets subscriptions do not change Drop expiry or password features.",
  dropFreeName: "Drops",
  dropFreePos: "Temporary screenshots and images.",
  dropProName: "Drops Pro",
  dropProPrice: "€2.99/month",
  dropProFeatures: ["Up to 180-day expiry", "Password-protected Drops"],
  dropProCta: "View Drops Pro",
  dropProSeparate: "Drops subscriptions are separate from Web Assets plans.",
  faqHeading: "Pricing questions",
  faqs: [
    {
      q: "Can I buy Developer or Pro today?",
      a: "Yes. Choose Developer or Pro on this page. Checkout is PayPal. Free does not require a card.",
    },
    {
      q: "What happens when I reach a limit?",
      a: "New projects, storage, and project keys stop at the plan cap. Delivery counts successful GET /m/… responses in the UTC calendar month. There is no per-call MCP meter and no extra egress line item.",
    },
    {
      q: "What happens to my live assets if I exceed deliveries?",
      a: "Live /m/… URLs keep serving. Crossing 100% of monthly deliveries starts a 3-day grace window. New uploads and projects still respect plan limits.",
    },
    {
      q: "Are Drops included?",
      a: "No. Temporary Drops stay free at the current site limits. Drops Pro is €2.99/month for longer Drop links and passwords. Web Assets storage is billed on the table above.",
    },
    {
      q: "Is there a per-MCP-call fee?",
      a: "No. Plans cover projects, storage, keys, and monthly deliveries. There is no per-MCP-call charge.",
    },
    {
      q: "Is there a bandwidth/egress charge?",
      a: "No. There is no bandwidth or egress surcharge on top of the plan. Fair-use and plan limits still apply.",
    },
    {
      q: "Can I switch Web Assets plans?",
      a: "Yes. Change plan from Billing. PayPal revises the same subscription; the new price starts at the next renewal. There is no prorated charge today and no second subscription.",
    },
  ],
  closeHeading: "Ready to give your coding agent permanent web assets?",
  closeLede: "Start free with 3 projects and upgrade when your app grows.",
  closePrimary: "Start free",
  closeSecondary: "Read the docs",
};
