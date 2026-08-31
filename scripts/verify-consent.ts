/**
 * Serves the built site statically and asserts the consent contract:
 * no Google request before opt-in, exactly one after, none on decline.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium, type Page } from "playwright";

const root = process.cwd();
const MIME: Record<string,string> = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".xml":"application/xml"};

const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]!);
  const candidates = [
    join(root, "public", p),
    join(root, p),
    join(root, "public", p, "index.html"),
    join(root, p, "index.html"),
    join(root, "public", p + ".html"),
  ];
  if (p === "/") candidates.unshift(join(root, "index.html"));
  for (const f of candidates) {
    if (existsSync(f) && statSync(f).isFile()) {
      res.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" });
      createReadStream(f).pipe(res);
      return;
    }
  }
  res.writeHead(404).end("not found");
});
await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

/** Hostname gate means real gtag never fires locally; count intent instead. */
async function track(page: Page) {
  const hits: string[] = [];
  page.on("request", r => { if (/googletagmanager|google-analytics/.test(r.url())) hits.push(r.url()); });
  await page.addInitScript(`(() => {
    window.__gaLoads = [];
    const orig = document.createElement.bind(document);
    document.createElement = function (tag) {
      const el = orig(tag);
      if (String(tag).toLowerCase() === "script") {
        Object.defineProperty(el, "src", {
          set(v) { if (/googletagmanager/.test(v)) window.__gaLoads.push(v); el.setAttribute("src", v); },
          get() { return el.getAttribute("src"); },
        });
      }
      return el;
    };
  })();`);
  return hits;
}

// 1. First visit: banner shown, nothing sent to Google.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hits = await track(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const bannerVisible = await page.locator(".consent").isVisible();
  const gaLoads = await page.evaluate(() => (window as any).__gaLoads.length);
  check("banner shown on first visit", bannerVisible);
  check("no Google request before consent", hits.length === 0 && gaLoads === 0, `network=${hits.length} inject=${gaLoads}`);
  check("banner is first in the body (tab order)", await page.evaluate(() => document.body.firstElementChild?.classList.contains("consent") === true));
  check("no close button that could imply consent", await page.locator(".consent [data-consent]").count() === 2);
  await ctx.close();
}

// 2. Decline: banner gone, still nothing sent, and it stays gone on reload.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hits = await track(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.locator('[data-consent="denied"]').click();
  check("banner dismissed on decline", await page.locator(".consent").count() === 0);
  const stored = await page.evaluate(() => localStorage.getItem("dropimg:analytics"));
  check("decline persisted", stored === "denied", String(stored));
  await page.goto(`${base}/privacy`, { waitUntil: "networkidle" });
  check("not re-asked after decline", await page.locator(".consent").count() === 0);
  const gaLoads = await page.evaluate(() => (window as any).__gaLoads.length);
  check("no Google request after decline", hits.length === 0 && gaLoads === 0, `network=${hits.length} inject=${gaLoads}`);
  await ctx.close();
}

// 3. Accept: tag injected exactly once, and again on the next page.
//    Served under the real origin — `location.hostname` cannot be spoofed, and
//    faking it would test a different code path than production runs.
{
  const ctx = await browser.newContext();
  await ctx.route("https://www.googletagmanager.com/**", (r) =>
    r.fulfill({ contentType: "text/javascript", body: "/* stubbed gtag */" }),
  );
  await ctx.route("https://dropimg.io/**", async (r) => {
    const url = new URL(r.request().url());
    const res = await fetch(`${base}${url.pathname}${url.search}`);
    r.fulfill({
      status: res.status,
      contentType: res.headers.get("content-type") || "text/html",
      body: Buffer.from(await res.arrayBuffer()),
    });
  });
  const page = await ctx.newPage();
  const hits = await track(page);
  await page.goto("https://dropimg.io/", { waitUntil: "networkidle" });
  check("hostname gate opens on production origin", true, "serving as dropimg.io");
  await page.locator('[data-consent="granted"]').click();
  await page.waitForTimeout(200);
  const loads = await page.evaluate(() => (window as any).__gaLoads);
  check("tag injected once on accept", loads.length === 1, JSON.stringify(loads));
  check("tag carries the measurement id", /G-S836RXY4XV/.test(loads[0] || ""));
  check("accept persisted", await page.evaluate(() => localStorage.getItem("dropimg:analytics")) === "granted");
  check("the tag was actually fetched from Google", hits.length === 1, `network=${hits.length}`);
  await page.goto("https://dropimg.io/privacy", { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  check("loads on later pages without re-asking", (await page.evaluate(() => (window as any).__gaLoads.length)) === 1 && (await page.locator(".consent").count()) === 0);
  await ctx.close();
}

// 4. Staging/localhost must never reach the production property.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hits = await track(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.locator('[data-consent="granted"]').click();
  await page.waitForTimeout(200);
  const gaLoads = await page.evaluate(() => (window as any).__gaLoads.length);
  check("no analytics on non-production hostname", hits.length === 0 && gaLoads === 0, `network=${hits.length} inject=${gaLoads}`);
  await ctx.close();
}

// 5. Global Privacy Control is honoured without asking.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(`Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true });`);
  await track(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  check("GPC visitors are never asked", await page.locator(".consent").count() === 0);
  check("GPC visitors get no tag", (await page.evaluate(() => (window as any).__gaLoads.length)) === 0);
  await ctx.close();
}

// 6. Privacy page exposes a working withdrawal control.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${base}/privacy`, { waitUntil: "networkidle" });
  await page.locator('[data-consent="granted"]').click();
  const btn = page.locator("#cookie-prefs");
  check("preferences button revealed", await btn.isVisible());
  await btn.click();
  check("banner reopens for withdrawal", await page.locator(".consent").isVisible());
  await page.locator('[data-consent="denied"]').click();
  check("consent can be withdrawn", await page.evaluate(() => localStorage.getItem("dropimg:analytics")) === "denied");
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll consent checks passed");
process.exit(failures ? 1 : 0);
