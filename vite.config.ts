import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { LOCALES } from "./marketing/locales";
import { PAGE_IDS, pageDir } from "./marketing/pages";

const root = dirname(fileURLToPath(import.meta.url));

function marketingHtmlInputs(): Record<string, string> {
  const input: Record<string, string> = {};
  for (const pageId of PAGE_IDS) {
    for (const locale of LOCALES) {
      const dir = pageDir(pageId, locale);
      const key = dir === "." ? "home" : dir.replace(/\//g, "--");
      input[key] =
        dir === "."
          ? resolve(root, "index.html")
          : resolve(root, dir, "index.html");
    }
  }
  return input;
}

export default defineConfig({
  plugins: [cloudflare()],
  // MPA inputs must be client-scoped — root build.rollupOptions breaks the Worker env.
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: marketingHtmlInputs(),
        },
      },
    },
  },
});
