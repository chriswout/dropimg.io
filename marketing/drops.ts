import type { PageSeo } from "./types";
import { HOME } from "./content";

export const DROPS_PATH = "/drops";
export const DROPS_URL = "https://dropimg.io/drops";

export const DROPS_PAGE: PageSeo & {
  skip: string;
  kicker: string;
  h1: string;
  lede: string;
  webAssetsCta: string;
} = {
  title: "Temporary image hosting — Drop an image, get a URL | dropimg.io",
  description:
    "Paste or drop a screenshot and get a shareable link in seconds. No account required. PNG, JPEG, WebP, GIF. You choose when it expires. For logos and app files, use Web Assets.",
  ogTitle: "Drop an image. Get a link. | dropimg.io",
  ogDescription:
    "Temporary screenshot sharing. Paste, drop, or choose a file. No account required. Links expire when you say so.",
  twitterTitle: "dropimg.io Drops — Drop an image. Get a link.",
  twitterDescription:
    "Fast temporary screenshot sharing. No account required. For permanent app assets, use Web Assets.",
  skip: "Skip to upload",
  kicker: "Drops",
  h1: HOME.en.h1,
  lede: "Paste, drop, or choose an image. No account required. You choose when it expires. For site logos, heroes, favicons, and fonts, use Web Assets instead.",
  webAssetsCta: "Need a permanent URL? Web Assets",
};
