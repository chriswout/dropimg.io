/**
 * Copy homepage CSS and bundle header/chrome JS for Worker-rendered
 * pages (/login, /app) that are not part of the Vite MPA graph.
 */
import { cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

cpSync(join(root, "client/styles.css"), join(root, "public/site.css"));

await esbuild.build({
  entryPoints: [join(root, "client/chrome-boot.ts")],
  outfile: join(root, "public/chrome.js"),
  bundle: true,
  format: "iife",
  target: ["es2022"],
  sourcemap: false,
  logLevel: "info",
});

await esbuild.build({
  entryPoints: [join(root, "client/pro.ts")],
  outfile: join(root, "public/pro.js"),
  bundle: true,
  format: "iife",
  target: ["es2022"],
  sourcemap: false,
  logLevel: "info",
});
