#!/usr/bin/env node
/**
 * Build Chrome/Edge MV3 extension into extension/dist/
 * Usage: npm run ext:build
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { CHROME_LOCALES, MESSAGES } from "../extension/src/messages";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "extension");
const dist = join(src, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Generate _locales from typed message source
for (const locale of CHROME_LOCALES) {
  const dir = join(dist, "_locales", locale);
  mkdirSync(dir, { recursive: true });
  const catalog: Record<string, { message: string }> = {};
  for (const [key, message] of Object.entries(MESSAGES[locale])) {
    const entry: {
      message: string;
      placeholders?: Record<string, { content: string }>;
    } = { message };
    const placeholders: Record<string, { content: string }> = {};
    if (message.includes("$1$")) placeholders["1"] = { content: "$1" };
    if (message.includes("$2$")) placeholders["2"] = { content: "$2" };
    if (Object.keys(placeholders).length) entry.placeholders = placeholders;
    catalog[key] = entry;
  }
  writeFileSync(
    join(dir, "messages.json"),
    JSON.stringify(catalog, null, 2),
    "utf8",
  );
}

await esbuild.build({
  entryPoints: [
    join(src, "src/background.ts"),
    join(src, "src/popup.ts"),
    join(src, "src/offscreen.ts"),
  ],
  outdir: dist,
  bundle: true,
  format: "esm",
  target: ["chrome120", "edge120"],
  sourcemap: false,
  logLevel: "info",
});

// Content scripts must be IIFE (no imports) for executeScript({ files })
await esbuild.build({
  entryPoints: [
    join(src, "src/region-overlay.ts"),
    join(src, "src/toast-inject.ts"),
  ],
  outdir: dist,
  bundle: true,
  format: "iife",
  target: ["chrome120", "edge120"],
  sourcemap: false,
  logLevel: "info",
});

const html = readFileSync(join(src, "src/popup.html"), "utf8");
writeFileSync(join(dist, "popup.html"), html, "utf8");
cpSync(join(src, "src/popup.css"), join(dist, "popup.css"));
cpSync(join(src, "src/offscreen.html"), join(dist, "offscreen.html"));
cpSync(join(src, "manifest.json"), join(dist, "manifest.json"));
cpSync(join(src, "icons"), join(dist, "icons"), { recursive: true });

console.log(`Extension built → extension/dist/ (v1.5.0)`);
