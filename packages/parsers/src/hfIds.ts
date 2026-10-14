/**
 * Stable hf- element id minting (R1). Node-safe (linkedom only, not browser DOM).
 *
 * Two surfaces share these helpers:
 *  - ensureHfIds(html): node-id surface — mints data-hf-id on every element.
 *  - mintHfId(el, assigned): shared by htmlParser for clip ids.
 *
 * Hash is CONTENT ONLY (tag + sorted attrs + own text) — no sibling position,
 * so inserting a non-identical sibling never shifts another element's id.
 */
import { parseHTML } from "linkedom";
import { assignHfIds, getChildElements } from "./hfIdAssignment.js";
export {
  EXCLUDED_TAGS,
  mintHfId,
  isCompositionTemplate,
  walkCompositionDescendants,
} from "./hfIdAssignment.js";

export function ensureHfIds(html: string): string {
  const { document, wrapped } = parseFragmentOrDocument(html);
  if (!document.body) return html;
  assignHfIds(document.body);
  return wrapped ? document.body.innerHTML || "" : document.toString();
}

function parseFragmentOrDocument(html: string) {
  // Wrap fragments so every body element participates in stable ID assignment.
  const wrapped = !/^(?:<!doctype|<html[\s>/])/i.test(
    html.replace(/^(?:\s|<!--(?:>|->|[\s\S]*?-->))*/, ""),
  );
  const { document } = wrapped
    ? parseHTML(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`)
    : parseHTML(html);
  return { document, wrapped };
}

/** ensureHfIds for a file someone edits: the same ids, inserted into the source text so nothing else in it changes.
 * Markup whose tags the parser did not keep one-to-one falls back to ensureHfIds. */
export function stampHfIdsInPlace(html: string): string {
  const { document, wrapped } = parseFragmentOrDocument(html);
  if (!document.body) return html;
  const elements = wrapped
    ? getChildElements(document.body).flatMap(inDocumentOrder)
    : inDocumentOrder(document.documentElement);
  const pinned = elements.map((el) => el.hasAttribute("data-hf-id"));
  assignHfIds(document.body);
  const minted = elements.map((el, n) => (pinned[n] ? null : el.getAttribute("data-hf-id")));
  const tags = startTags(html);
  const inserts = tags && alignInserts(tags, elements, minted);
  return inserts ? spliceIds(html, inserts) : ensureHfIds(html);
}

function inDocumentOrder(el: Element): Element[] {
  return [el, ...getChildElements(el).flatMap(inDocumentOrder)];
}

const RAW_TEXT = new Set(["script", "style", "textarea", "title", "xmp", "noembed", "noframes"]);
const IMPLIED = new Set(["html", "head", "body", "tbody"]);

type StartTag = { name: string; nameEnd: number };

function startTags(html: string): StartTag[] | null {
  const lower = html.toLowerCase();
  const tags: StartTag[] = [];
  let i = html.indexOf("<");
  while (i >= 0) {
    const name = html.startsWith("<!--", i)
      ? null
      : /^<([a-zA-Z][^\s/>]*)/.exec(html.slice(i, i + 128));
    if (!name) {
      i = nextTagAfter(html, i);
      continue;
    }
    const end = closingBracket(html, i + name[0].length);
    if (end < 0) return null;
    const tag = name[1]!.toLowerCase();
    tags.push({ name: tag, nameEnd: i + name[0].length });
    const after = RAW_TEXT.has(tag) ? rawTextEnd(lower, tag, end) : end;
    i = after < 0 ? -1 : html.indexOf("<", after + 1);
  }
  return tags;
}

function rawTextEnd(lower: string, tag: string, from: number): number {
  const marker = `</${tag}`;
  for (
    let at = lower.indexOf(marker, from);
    at >= 0;
    at = lower.indexOf(marker, at + marker.length)
  ) {
    const next = lower[at + marker.length];
    if (next !== undefined && /[\s/>]/.test(next)) return at;
  }
  return -1;
}

function nextTagAfter(html: string, lt: number): number {
  const comment = html.startsWith("<!--", lt);
  const end = comment ? html.indexOf("-->", lt + 4) : html.indexOf(">", lt);
  return end < 0 ? -1 : html.indexOf("<", end + 1);
}

function closingBracket(html: string, from: number): number {
  let quote = "";
  for (let i = from; i < html.length; i++) {
    const c = html[i];
    if (quote) quote = c === quote ? "" : quote;
    else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

function alignInserts(tags: StartTag[], elements: Element[], minted: (string | null)[]) {
  const inserts: { at: number; id: string }[] = [];
  let next = 0;
  for (const [n, el] of elements.entries()) {
    const name = el.tagName.toLowerCase();
    const id = minted[n];
    if (tags[next]?.name === name) {
      if (id) inserts.push({ at: tags[next]!.nameEnd, id });
      next++;
    } else if (!IMPLIED.has(name) || id) return null;
  }
  return next === tags.length ? inserts : null;
}

function spliceIds(html: string, inserts: { at: number; id: string }[]): string {
  let out = "";
  let from = 0;
  for (const { at, id } of inserts) {
    out += `${html.slice(from, at)} data-hf-id="${id}"`;
    from = at;
  }
  return out + html.slice(from);
}
