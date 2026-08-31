/**
 * Standalone entry for `public/consent.js`.
 *
 * Loaded by every page type from one shared tag rather than imported into the
 * page bundles, because the static legal pages under `public/` ship no bundle
 * at all. One delivery mechanism everywhere is easier to audit than three.
 */
import { openConsentPreferences, setupConsent } from "./consent";

declare global {
  interface Window {
    dropimgConsent?: { open: () => void };
  }
}

window.dropimgConsent = { open: openConsentPreferences };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupConsent, { once: true });
} else {
  setupConsent();
}
