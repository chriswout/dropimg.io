import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export type SanitizeSvgOk = {
  ok: true;
  svg: string;
  width: number | null;
  height: number | null;
};

export type SanitizeSvgFail = { ok: false; reason: "invalid" | "unsafe" };

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

const ALLOWED_NS = new Set(["", SVG_NS, XLINK_NS, "http://www.w3.org/XML/1998/namespace"]);

const REJECT_TAGS = new Set([
  "script",
  "a",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "link",
  "html",
  "body",
  "head",
  "meta",
  "base",
  "form",
  "input",
  "video",
  "audio",
  "canvas",
  "iframe",
  "math",
  "animate",
  "animatetransform",
  "animatemotion",
  "set",
  "handler",
  "listener",
  "prefetch",
  "cursor",
]);

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "marker",
  "clippath",
  "mask",
  "pattern",
  "lineargradient",
  "radialgradient",
  "stop",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textpath",
  "title",
  "desc",
  "style",
  "switch",
  "filter",
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fecomposite",
  "feconvolvematrix",
  "fediffuselighting",
  "fedisplacementmap",
  "feflood",
  "fegaussianblur",
  "feimage",
  "femerge",
  "femergenode",
  "femorphology",
  "feoffset",
  "fespecularlighting",
  "fetile",
  "feturbulence",
  "fefuncr",
  "fefuncg",
  "fefuncb",
  "fefunca",
  "fedistantlight",
  "fepointlight",
  "fespotlight",
  "image",
  "view",
]);

const REF_ATTRS = new Set(["href", "xlink:href"]);

/**
 * Parse SVG with xmldom, allowlist elements/attributes, store only the sanitized tree.
 * Original unsafe bytes are never returned.
 */
export function sanitizeSvg(bytes: ArrayBuffer): SanitizeSvgOk | SanitizeSvgFail {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (raw.includes("\u0000")) return { ok: false, reason: "unsafe" };
  if (/<!DOCTYPE/i.test(raw) || /<!ENTITY/i.test(raw)) return { ok: false, reason: "unsafe" };
  if (/<\?xml-stylesheet/i.test(raw)) return { ok: false, reason: "unsafe" };

  let doc: Document;
  try {
    const parser = new DOMParser({
      onError(level) {
        if (level === "fatalError" || level === "error") throw new Error("xml");
      },
    });
    doc = parser.parseFromString(raw, "image/svg+xml");
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!doc || !doc.documentElement) return { ok: false, reason: "invalid" };
  const root = doc.documentElement;
  if (localName(root) !== "svg") return { ok: false, reason: "invalid" };
  if (root.namespaceURI && root.namespaceURI !== SVG_NS) return { ok: false, reason: "unsafe" };

  try {
    walk(root);
  } catch (err) {
    return { ok: false, reason: err instanceof Error && err.message === "unsafe" ? "unsafe" : "invalid" };
  }

  let serialized: string;
  try {
    serialized = new XMLSerializer().serializeToString(root);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!serialized.includes("<svg")) return { ok: false, reason: "invalid" };
  if (/<script/i.test(serialized) || /\son[a-z]/i.test(serialized)) {
    return { ok: false, reason: "unsafe" };
  }

  const dim = svgDimensions(root);
  return { ok: true, svg: serialized, width: dim.width, height: dim.height };
}

function walk(node: Element): void {
  const tag = localName(node);
  if (REJECT_TAGS.has(tag)) throw new Error("unsafe");
  if (node.namespaceURI && !ALLOWED_NS.has(node.namespaceURI)) {
    throw new Error("unsafe");
  }
  if (!ALLOWED_TAGS.has(tag)) {
    const parent = node.parentNode;
    if (!parent) throw new Error("unsafe");
    parent.removeChild(node);
    return;
  }

  const toRemove: Attr[] = [];
  const attrs = node.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs.item(i);
    if (!attr) continue;
    const name = attr.name.toLowerCase();
    if (name.startsWith("xmlns")) continue;
    if (name.startsWith("on")) {
      throw new Error("unsafe");
    }
    if (name === "style") {
      if (!cssSafe(attr.value, "declaration")) throw new Error("unsafe");
      continue;
    }
    if (REF_ATTRS.has(name) || name.endsWith(":href")) {
      if (!hrefSafe(tag, attr.value)) throw new Error("unsafe");
      continue;
    }
    if (name.includes(":") && !name.startsWith("xml:") && !name.startsWith("xlink:")) {
      toRemove.push(attr);
    }
  }
  for (const attr of toRemove) node.removeAttribute(attr.name);

  if (tag === "style") {
    const css = textContent(node);
    if (!cssSafe(css, "sheet")) throw new Error("unsafe");
  }

  const snapshot: ChildNode[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes.item(i);
    if (child) snapshot.push(child as ChildNode);
  }
  for (const child of snapshot) {
    if (child.nodeType === 8) {
      node.removeChild(child);
      continue;
    }
    if (child.nodeType === 7) throw new Error("unsafe");
    if (child.nodeType === 3 || child.nodeType === 4) continue;
    if (child.nodeType === 1) walk(child as Element);
    else node.removeChild(child);
  }
}

function hrefSafe(tag: string, value: string): boolean {
  const v = value.trim();
  if (v.startsWith("#") && !v.includes("://") && !/\s/.test(v)) return true;
  if (tag === "image" || tag === "feimage") {
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/i.test(v.replace(/\s+/g, ""));
  }
  return false;
}

function cssSafe(css: string, kind: "sheet" | "declaration"): boolean {
  const lower = css.toLowerCase();
  if (lower.includes("@import") || lower.includes("expression(") || lower.includes("javascript:")) {
    return false;
  }
  if (lower.includes("-moz-binding") || lower.includes("behavior:")) return false;
  if (kind === "sheet" && lower.includes("@charset")) return false;
  const urlRe = /url\s*\(([^)]*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(css))) {
    const inner = m[1]!.trim().replace(/^['"]|['"]$/g, "");
    if (inner.startsWith("#")) continue;
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(inner)) continue;
    return false;
  }
  return true;
}

function svgDimensions(root: Element): { width: number | null; height: number | null } {
  const w = parseUserUnit(root.getAttribute("width"));
  const h = parseUserUnit(root.getAttribute("height"));
  if (w && h) return { width: w, height: h };
  const vb = root.getAttribute("viewBox") || root.getAttribute("viewbox");
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2]! > 0 && parts[3]! > 0) {
      return { width: Math.round(parts[2]!), height: Math.round(parts[3]!) };
    }
  }
  return { width: null, height: null };
}

function parseUserUnit(raw: string | null): number | null {
  if (!raw) return null;
  const m = /^([0-9]+(?:\.[0-9]+)?)(px)?$/i.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function localName(node: Element): string {
  const name = (node.localName || node.nodeName || "").replace(/^.*:/, "");
  return name.toLowerCase();
}

function textContent(node: Element): string {
  let s = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes.item(i);
    if (c && (c.nodeType === 3 || c.nodeType === 4)) s += c.nodeValue || "";
  }
  return s;
}
