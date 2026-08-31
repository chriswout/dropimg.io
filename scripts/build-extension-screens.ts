#!/usr/bin/env node
/**
 * Render Chrome Web Store screenshots from the real popup.
 *
 * The popup is loaded as it ships — same markup, same CSS, same bundle — with
 * only the four `chrome.*` APIs it touches stubbed, and its state driven purely
 * by storage fixtures. Nothing here reimplements the UI, so a listing shot
 * cannot quietly disagree with what a reviewer installs.
 *
 * Usage: npm run ext:screens   (runs ext:build first)
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "extension/dist");
const outDir = join(root, "extension/store/screenshots");

if (!existsSync(join(dist, "popup.html"))) {
  console.error("extension/dist is missing — run `npm run ext:build` first.");
  process.exit(1);
}

const WIDTH = 1280;
const HEIGHT = 800;
const NOW = Math.floor(Date.now() / 1000);
const DAY = 86_400;

const messages = JSON.parse(
  readFileSync(join(dist, "_locales/en/messages.json"), "utf8"),
) as Record<string, { message: string }>;

type Fixture = {
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
};

type Scene = {
  file: string;
  caption: string;
  sub: string;
  fixture: Fixture;
};

const recent = (i: number, ageSec: number, ttl: number) => ({
  slug: ["k3Ynq7Ra", "PmT4wd2X", "9fBzLq6H"][i] ?? "aZ4nQ8vT",
  url: `https://dropimg.io/i/${["k3Ynq7Ra", "PmT4wd2X", "9fBzLq6H"][i] ?? "aZ4nQ8vT"}`,
  expiresAt: NOW - ageSec + ttl,
  deleteToken: "d".repeat(32),
  createdAt: NOW - ageSec,
});

const proProfile = {
  emailMasked: "c***@example.com",
  plan: "pro",
  maxUploadBytes: 50 * 1024 * 1024,
  allowedExpirySeconds: [3600, DAY, 7 * DAY, 30 * DAY, 90 * DAY],
  defaultExpirySeconds: 7 * DAY,
};

const scenes: Scene[] = [
  {
    file: "01-popup-idle.png",
    caption: "Screenshot to link, in one click",
    sub: "Capture the visible tab — or draw a region over just the part you mean.",
    fixture: { local: { recent: [] }, sync: { settings: { lastMode: "visible" } } },
  },
  {
    file: "02-popup-success.png",
    caption: "The link is already on your clipboard",
    sub: "Paste it straight into Slack, a PR comment, or an email.",
    fixture: {
      local: { recent: [recent(0, 0, 7 * DAY)] },
      sync: { settings: { lastMode: "visible" } },
    },
  },
  {
    file: "03-recent-drops.png",
    caption: "Your last ten drops, one click away",
    sub: "Re-copy, open or delete a link without leaving the page you're on.",
    fixture: {
      /** Two fills the list's 220px cap; a third would be clipped mid-card. */
      local: { recent: [recent(0, 3600, 7 * DAY), recent(1, 7200, DAY)] },
      sync: { settings: { lastMode: "region" } },
    },
  },
  {
    file: "04-account.png",
    caption: "Choose how long a link lives",
    sub: "Connect a free account for 1 hour to 7 days. Pro adds 30 and 90 days.",
    fixture: {
      local: {
        recent: [recent(0, 3600, 30 * DAY)],
        integrationToken: `dropimg_it_${"x".repeat(24)}`,
        accountProfile: proProfile,
        lastExpirySeconds: 30 * DAY,
      },
      sync: { settings: { lastMode: "visible" } },
    },
  },
];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0]!;
  const file = join(dist, path === "/" ? "popup.html" : path);
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});

await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

/**
 * The recent list points thumbnails at the real dropimg.io, which has no such
 * slug, so the shots would show a broken-image glyph. Serve a stand-in for
 * those requests and leave the visible link text alone.
 */
const thumbBody = await (async () => {
  const page = await browser.newPage({ viewport: { width: 240, height: 150 } });
  await page.setContent(`<body style="margin:0">
    <div style="width:240px;height:150px;background:linear-gradient(135deg,#1e3a8a,#0ea5e9);
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#e0f2fe;padding:14px">
      <div style="display:flex;gap:5px;margin-bottom:12px">
        <i style="width:8px;height:8px;border-radius:50%;background:#f87171;display:block"></i>
        <i style="width:8px;height:8px;border-radius:50%;background:#fbbf24;display:block"></i>
        <i style="width:8px;height:8px;border-radius:50%;background:#34d399;display:block"></i>
      </div>
      <div style="height:7px;width:78%;background:rgba(255,255,255,.55);border-radius:3px;margin-bottom:8px"></div>
      <div style="height:7px;width:52%;background:rgba(255,255,255,.32);border-radius:3px;margin-bottom:8px"></div>
      <div style="height:7px;width:64%;background:rgba(255,255,255,.32);border-radius:3px"></div>
    </div></body>`);
  const buf = await page.screenshot();
  await page.close();
  return buf;
})();

/**
 * Emitted as source text rather than a function. Playwright serializes an init
 * function with `toString()`, which would hand the page esbuild's `__name`
 * helper without its definition and throw before `chrome` is ever assigned.
 */
function stub(fixture: Fixture): string {
  return `(() => {
  const catalog = ${JSON.stringify(messages)};
  const fixture = ${JSON.stringify(fixture)};
  const store = function (bucket) {
    return {
      get: function (keys) {
        const list = typeof keys === "string" ? [keys] : keys;
        const out = {};
        for (const k of list) if (k in bucket) out[k] = bucket[k];
        return Promise.resolve(out);
      },
      set: function (items) { Object.assign(bucket, items); return Promise.resolve(); },
      remove: function (keys) {
        for (const k of (typeof keys === "string" ? [keys] : keys)) delete bucket[k];
        return Promise.resolve();
      },
    };
  };
  globalThis.chrome = {
    i18n: {
      getUILanguage: function () { return "en"; },
      getMessage: function (key, subs) {
        const entry = catalog[key];
        if (!entry) return "";
        const list = subs === undefined ? [] : (Array.isArray(subs) ? subs : [subs]);
        return entry.message.replace(/\\$(\\d)\\$/g, function (_m, d) {
          const v = list[Number(d) - 1];
          return v === undefined ? "" : v;
        });
      },
    },
    storage: { local: store(fixture.local), sync: store(fixture.sync) },
    runtime: { sendMessage: function () { return Promise.resolve({ ok: false }); } },
  };
})();`;
}

function wrapper(scene: Scene): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
  body{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:1.5rem;padding:2.5rem 0;
    font-family:"Segoe UI","Avenir Next","Helvetica Neue",ui-sans-serif,system-ui,sans-serif;
    background:
      radial-gradient(circle at 18% 8%, rgba(34,211,238,.22), transparent 45%),
      radial-gradient(circle at 84% 78%, rgba(37,99,235,.20), transparent 48%),
      #f4f8fc;
  }
  .copy{text-align:center;max-width:760px;padding:0 2rem}
  h1{margin:0 0 .5rem;font-size:2.15rem;line-height:1.15;letter-spacing:-.02em;color:#0f172a}
  p{margin:0;font-size:1.1rem;line-height:1.5;color:#475569}
  .frame{
    width:340px;border-radius:14px;overflow:hidden;background:#fff;
    box-shadow:0 24px 60px rgba(15,23,42,.18), 0 3px 10px rgba(15,23,42,.08);
  }
  iframe{display:block;width:340px;border:0}
  </style></head><body>
  <div class="copy"><h1>${scene.caption}</h1><p>${scene.sub}</p></div>
  <div class="frame"><iframe id="popup" src="${base}/popup.html" height="520"></iframe></div>
  </body></html>`;
}

for (const scene of scenes) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });

  await context.addInitScript({ content: stub(scene.fixture) });
  await context.route("https://dropimg.io/i/*", (route) =>
    route.fulfill({ contentType: "image/png", body: thumbBody }),
  );

  const page = await context.newPage();

  /**
   * A missing stub shows up as a half-rendered popup rather than a crash, and a
   * screenshot of that is worse than no screenshot: it looks plausible in the
   * listing and ships broken UI to reviewers. Fail the build instead.
   */
  const failures: string[] = [];
  page.on("pageerror", (err) => failures.push(err.message));

  await page.setContent(wrapper(scene), { waitUntil: "networkidle" });

  /** Size the frame to the popup so no scenario is cropped or padded. */
  const frame = page.frameLocator("#popup");
  await frame.locator("body").waitFor({ state: "attached" });
  await page.waitForTimeout(250);
  const h = await page
    .frame({ url: /popup\.html/ })!
    .evaluate(() => document.body.scrollHeight);

  /**
   * Tall states (a fresh result plus recents plus the account panel) would run
   * off the canvas at the roomy spacing, and a listing shot with a half-cut
   * button reads as a broken build. Tighten the frame instead of scaling it,
   * so every pixel stays 1:1.
   */
  const tight = h > 560;
  await page.evaluate(
    ({ height, tight }) => {
      const body = document.body;
      body.style.padding = tight ? "20px 0" : "40px 0";
      body.style.gap = tight ? "1rem" : "1.5rem";
      const h1 = document.querySelector("h1") as HTMLElement;
      const p = document.querySelector(".copy p") as HTMLElement;
      if (tight) {
        h1.style.fontSize = "1.9rem";
        p.style.fontSize = "1.02rem";
      }
      (document.getElementById("popup") as HTMLIFrameElement).height = String(height);
    },
    { height: h, tight },
  );
  await page.waitForTimeout(150);

  const overflow = await page.evaluate(() => {
    const copy = document.querySelector(".copy") as HTMLElement;
    const frame = document.querySelector(".frame") as HTMLElement;
    const style = getComputedStyle(document.body);
    const total =
      copy.offsetHeight +
      frame.offsetHeight +
      parseFloat(style.gap || "0") +
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom);
    return Math.max(0, Math.round(total - window.innerHeight));
  });
  if (overflow > 0) {
    failures.push(`layout overflows the canvas by ${overflow}px (popup ${h}px)`);
  }

  if (failures.length) {
    console.error(`\n${scene.file} — popup threw:\n  ${failures.join("\n  ")}`);
    await browser.close();
    server.close();
    process.exit(1);
  }

  await page.screenshot({ path: join(outDir, scene.file) });
  console.log(`  ${scene.file}  (popup ${h}px)`);
  await context.close();
}

await browser.close();
server.close();
console.log(`\nStore screenshots → extension/store/screenshots/ (${WIDTH}x${HEIGHT})`);
