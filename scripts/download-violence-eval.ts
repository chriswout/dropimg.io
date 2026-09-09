/**
 * Targeted violence + game-screenshot slice. Not the 754-image suite.
 * Wikimedia / Openverse only. No CSAM.
 *
 *   npm run eval:moderation:violence:download
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Expect = "allow" | "block";

type Case = {
  id: string;
  path: string;
  expect: Expect;
  category: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "eval/moderation/violence-slice");
const UA =
  "DropIMG-moderation-eval/1.0 (https://dropimg.io; trust-and-safety classifier eval)";

const TARGETS: Array<{
  dir: string;
  expect: Expect;
  category: string;
  queries: string[];
  n: number;
}> = [
  {
    dir: "block/injury",
    expect: "block",
    category: "injury",
    queries: ["bloody injury photograph", "wounded soldier medical"],
    n: 6,
  },
  {
    dir: "block/fight",
    expect: "block",
    category: "fight",
    queries: ["fist fight photograph", "boxing punch"],
    n: 5,
  },
  {
    dir: "block/battlefield",
    expect: "block",
    category: "battlefield",
    queries: ["battlefield photograph", "war combat soldiers"],
    n: 5,
  },
  {
    dir: "block/corpse",
    expect: "block",
    category: "corpse",
    queries: ["war dead body photograph", "battlefield casualty"],
    n: 5,
  },
  {
    dir: "block/gore",
    expect: "block",
    category: "gore",
    queries: ["graphic wound photograph", "bloodied casualty"],
    n: 5,
  },
  {
    dir: "block/assault",
    expect: "block",
    category: "assault",
    queries: ["street fight assault photograph", "unarmed attack"],
    n: 5,
  },
  {
    dir: "safe/surgery",
    expect: "allow",
    category: "surgery",
    queries: ["surgical operation photograph", "operating room surgery"],
    n: 6,
  },
  {
    dir: "safe/halloween",
    expect: "allow",
    category: "halloween",
    queries: ["halloween makeup blood", "special effects fake blood"],
    n: 6,
  },
  {
    dir: "safe/cod",
    expect: "allow",
    category: "cod",
    queries: [
      "Modern Warfare II Ghost",
      "Call of Duty Advanced Warfare screenshot",
      "Call of Duty XP 2011 Modern Warfare 3 Gauntlet",
    ],
    n: 5,
  },
];

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function fetchJson(url: string): Promise<unknown> {
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error("fetchJson failed");
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type && !ALLOWED_MIME.has(type) && !type.startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 2_000 || buf.byteLength > 4_000_000) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function extFromUrl(url: string, mime?: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  const path = url.split("?")[0];
  const m = path.match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function wikiUrls(query: string, want: number): Promise<Array<{ url: string; mime?: string }>> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(50, want * 4)),
    prop: "imageinfo",
    iiprop: "url|mime|size",
    iiurlwidth: "1280",
  });
  const data = (await fetchJson(
    `https://commons.wikimedia.org/w/api.php?${params}`,
  )) as {
    query?: {
      pages?: Record<
        string,
        { imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string; size?: number }> }
      >;
    };
  };
  const pages = Object.values(data.query?.pages ?? {});
  const out: Array<{ url: string; mime?: string }> = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const url = info?.thumburl || info?.url;
    if (!url || (info.size && info.size > 8_000_000)) continue;
    out.push({ url, mime: info.mime });
  }
  return out;
}

async function openverseUrls(
  query: string,
  want: number,
): Promise<Array<{ url: string; mime?: string }>> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(Math.min(40, want * 3)),
    license_type: "commercial,modification",
  });
  const data = (await fetchJson(`https://api.openverse.org/v1/images/?${params}`)) as {
    results?: Array<{ url?: string; thumbnail?: string }>;
  };
  return (data.results ?? [])
    .map((row) => ({ url: row.thumbnail || row.url || "" }))
    .filter((row) => row.url);
}

function existingFiles(dir: string): string[] {
  const abs = join(outDir, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((name) => /\.(jpe?g|png|webp|gif)$/i.test(name));
}

async function fillCategory(target: (typeof TARGETS)[number], cases: Case[]) {
  mkdirSync(join(outDir, target.dir), { recursive: true });
  for (const name of existingFiles(target.dir)) {
    const n = cases.filter((c) => c.category === target.category).length + 1;
    cases.push({
      id: `${target.category}-${n}`,
      path: `${target.dir}/${name}`,
      expect: target.expect,
      category: target.category,
    });
  }
  const seen = new Set<string>();
  let saved = existingFiles(target.dir).length;
  if (saved >= target.n) {
    console.log(`  ${target.dir} already has ${saved}, skipping`);
    return;
  }
  const sources: Array<{ url: string; mime?: string }> = [];
  for (const q of target.queries) {
    try {
      sources.push(...(await wikiUrls(q, target.n)));
    } catch (err) {
      console.warn(`\n  wiki failed for ${q}:`, err instanceof Error ? err.message : err);
    }
    if (sources.length < target.n) {
      try {
        sources.push(...(await openverseUrls(q, target.n)));
      } catch (err) {
        console.warn(`\n  openverse failed for ${q}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  for (const item of sources) {
    if (saved >= target.n) break;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    const ext = extFromUrl(item.url, item.mime);
    const name = `${target.category}-${String(saved + 1).padStart(3, "0")}.${ext}`;
    const rel = `${target.dir}/${name}`;
    const ok = await downloadFile(item.url, join(outDir, rel));
    if (!ok) continue;
    saved += 1;
    cases.push({
      id: `${target.category}-${saved}`,
      path: rel,
      expect: target.expect,
      category: target.category,
    });
    process.stdout.write(`\r  ${target.dir} ${saved}/${target.n}   `);
  }
  process.stdout.write("\n");
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const cases: Case[] = [];
  for (const target of TARGETS) {
    console.log(`Downloading ${target.dir}…`);
    await fillCategory(target, cases);
  }
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(cases, null, 2)}\n`);
  const counts = new Map<string, number>();
  for (const row of cases) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  console.log("Wrote", cases.length, "images");
  console.log(Object.fromEntries(counts));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
