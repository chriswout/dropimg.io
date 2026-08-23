/**
 * One-shot IndexNow ping for marketing URLs.
 * Usage: INDEXNOW_KEY=... npx tsx scripts/notify-indexnow.ts
 */
import { MARKETING_URLS } from "../src/lib/marketing-urls.gen";

const key = (process.env.INDEXNOW_KEY || "").trim();
if (!key) {
  console.error("Set INDEXNOW_KEY");
  process.exit(1);
}

const host = "dropimg.io";
const body = {
  host,
  key,
  keyLocation: `https://${host}/${key}.txt`,
  urlList: [...MARKETING_URLS],
};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log("status", res.status, await res.text());
console.log("submitted", MARKETING_URLS.length, "urls");
if (res.status !== 200 && res.status !== 202) process.exit(1);
