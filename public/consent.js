"use strict";
(() => {
  // client/consent.ts
  var GA_MEASUREMENT_ID = "G-S836RXY4XV";
  var STORAGE_KEY = "dropimg:analytics";
  var ANALYTICS_HOSTS = /* @__PURE__ */ new Set(["dropimg.io", "www.dropimg.io"]);
  var STRINGS = {
    en: {
      title: "Analytics cookies",
      body: "We'd like to use Google Analytics to see which pages are worth keeping. It sets cookies. Nothing loads until you choose, and declining costs you nothing.",
      accept: "Accept",
      decline: "Decline",
      privacy: "Privacy policy"
    },
    es: {
      title: "Cookies de anal\xEDtica",
      body: "Nos gustar\xEDa usar Google Analytics para saber qu\xE9 p\xE1ginas merece la pena mantener. Instala cookies. No se carga nada hasta que elijas, y rechazar no te cuesta nada.",
      accept: "Aceptar",
      decline: "Rechazar",
      privacy: "Pol\xEDtica de privacidad"
    },
    "pt-BR": {
      title: "Cookies de an\xE1lise",
      body: "Queremos usar o Google Analytics para saber quais p\xE1ginas valem a pena manter. Ele usa cookies. Nada \xE9 carregado at\xE9 voc\xEA escolher, e recusar n\xE3o custa nada.",
      accept: "Aceitar",
      decline: "Recusar",
      privacy: "Pol\xEDtica de privacidade"
    },
    de: {
      title: "Analyse-Cookies",
      body: "Wir w\xFCrden gern Google Analytics nutzen, um zu sehen, welche Seiten sich lohnen. Dabei werden Cookies gesetzt. Vor deiner Wahl wird nichts geladen, und Ablehnen kostet dich nichts.",
      accept: "Akzeptieren",
      decline: "Ablehnen",
      privacy: "Datenschutzerkl\xE4rung"
    }
  };
  function strings() {
    const tag = (document.documentElement.lang || "en").toLowerCase();
    if (tag.startsWith("pt")) return STRINGS["pt-BR"];
    if (tag.startsWith("es")) return STRINGS.es;
    if (tag.startsWith("de")) return STRINGS.de;
    return STRINGS.en;
  }
  function readChoice() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === "granted" || raw === "denied" ? raw : null;
    } catch {
      return null;
    }
  }
  function writeChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
    }
  }
  function gpcDeclined() {
    return navigator.globalPrivacyControl === true;
  }
  var loaded = false;
  function loadAnalytics() {
    if (loaded || !ANALYTICS_HOSTS.has(location.hostname)) return;
    loaded = true;
    const w = window;
    w.dataLayer = w.dataLayer || [];
    function gtag() {
      w.dataLayer.push(arguments);
    }
    gtag("js", /* @__PURE__ */ new Date());
    gtag("config", GA_MEASUREMENT_ID);
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
  }
  var banner = null;
  function dismiss(choice) {
    writeChoice(choice);
    banner?.remove();
    banner = null;
    if (choice === "granted") loadAnalytics();
  }
  function showBanner() {
    if (banner) return;
    const t = strings();
    const el = document.createElement("div");
    el.className = "consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "consent-title");
    el.setAttribute("aria-describedby", "consent-body");
    el.innerHTML = `
    <div class="consent-card">
      <div class="consent-copy">
        <h2 class="consent-title" id="consent-title"></h2>
        <p class="consent-body" id="consent-body"></p>
      </div>
      <div class="consent-actions">
        <button type="button" class="btn secondary" data-consent="denied"></button>
        <button type="button" class="btn primary" data-consent="granted"></button>
      </div>
    </div>`;
    el.querySelector(".consent-title").textContent = t.title;
    const body = el.querySelector(".consent-body");
    body.textContent = `${t.body} `;
    const link = document.createElement("a");
    link.href = "/privacy";
    link.textContent = t.privacy;
    body.appendChild(link);
    el.querySelector('[data-consent="denied"]').textContent = t.decline;
    el.querySelector('[data-consent="granted"]').textContent = t.accept;
    for (const btn of el.querySelectorAll("[data-consent]")) {
      btn.addEventListener("click", () => dismiss(btn.dataset.consent));
    }
    banner = el;
    document.body.insertBefore(el, document.body.firstChild);
  }
  function setupConsent() {
    const choice = readChoice();
    if (choice === "granted") {
      loadAnalytics();
      return;
    }
    if (choice === "denied" || gpcDeclined()) return;
    showBanner();
  }
  function openConsentPreferences() {
    banner?.remove();
    banner = null;
    showBanner();
  }

  // client/consent-boot.ts
  window.dropimgConsent = { open: openConsentPreferences };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupConsent, { once: true });
  } else {
    setupConsent();
  }
})();
