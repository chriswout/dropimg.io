import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { LOCALES } from "./marketing/locales";
import {
  INTENT_PAGE_IDS,
  intentLocales,
  intentPagePath,
} from "./marketing/intent-pages";
import { PAGE_IDS, pageDir } from "./marketing/pages";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Workers AI has no local simulator. The Vite plugin therefore starts a remote
 * proxy by default, which demands CLOUDFLARE_API_TOKEN in CI and can reach
 * live Cloudflare from a developer laptop. Keep Vite on local bindings unless
 * someone explicitly opts in (for example to experiment with moderation).
 */
function viteRemoteBindingsEnabled(): boolean {
  return process.env.CLOUDFLARE_VITE_REMOTE_BINDINGS === "true";
}

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
  input["browser-extension"] = resolve(root, "browser-extension/index.html");
  input["sharex"] = resolve(root, "sharex/index.html");
  input.developers = resolve(root, "developers/index.html");
  input.mcp = resolve(root, "mcp/index.html");
  for (const id of INTENT_PAGE_IDS) {
    for (const locale of intentLocales(id)) {
      const dir = intentPagePath(id, locale).replace(/^\//, "");
      input[dir.replace(/\//g, "--")] = resolve(root, dir, "index.html");
    }
  }
  return input;
}

export default defineConfig({
  plugins: [cloudflare({ remoteBindings: viteRemoteBindingsEnabled() })],
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
