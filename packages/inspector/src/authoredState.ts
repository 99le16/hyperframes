import type { ElementDom, ElementNode } from "./elementMap.js";
import type { AuthoredHtml, HtmlTag as SourceTag } from "./sources";

const PLAIN_CLASS = /^[a-zA-Z_-][\w-]*$/;

export function withAuthoredState(snapshot: ElementDom, sources: AuthoredHtml): ElementDom {
  const byHfId = group(sources.htmlTags, (tag) => tag.hfId);
  const byId = group(sources.htmlTags, (tag) => tag.id);
  const live = snapshot.nodes;
  const nodes = live.map((node) => {
    const tag = sourceTag(node, byHfId, byId);
    if (!tag) return node;
    const text = node.children.length ? node.text : (leafText(sources, tag) ?? node.text);
    const classes = authoredClasses(node, tag, live);
    return classes ? { ...node, text, ...classes } : { ...node, text };
  });
  return { ...snapshot, nodes };
}

function group(tags: SourceTag[], key: (tag: SourceTag) => string | undefined) {
  const groups = new Map<string, SourceTag[]>();
  for (const tag of tags) {
    const value = key(tag);
    if (value) groups.set(value, [...(groups.get(value) ?? []), tag]);
  }
  return groups;
}

function sourceTag(
  node: ElementNode,
  byHfId: Map<string, SourceTag[]>,
  byId: Map<string, SourceTag[]>,
): SourceTag | undefined {
  const named = (node.hfId && byHfId.get(node.hfId)) || (node.id && byId.get(node.id)) || [];
  const matches = named.filter((tag) => tag.tag === node.tag);
  return matches.length === 1 ? matches[0] : undefined;
}

function leafText(sources: AuthoredHtml, tag: SourceTag): string | null {
  const text = sources.files.get(tag.file)?.text;
  if (!text) return null;
  const close = text.indexOf("<", tag.end);
  if (close < 0 || !text.startsWith(`</${tag.tag}`, close)) return null;
  const own = text.slice(tag.end, close);
  return own.includes("&") ? null : own.replace(/\s+/g, " ").trim();
}

function authoredClasses(node: ElementNode, tag: SourceTag, live: ElementNode[]) {
  const classes = [...tag.classes].sort();
  if (classes.join(" ") === node.classes.join(" ")) return null;
  if (!classes.every((c) => PLAIN_CLASS.test(c) && node.classes.includes(c))) return null;
  const simple = `${node.tag}${classes.map((c) => `.${c}`).join("")}`;
  const siblings = node.parent === null ? [node] : live[node.parent]!.children.map((i) => live[i]!);
  const siblingMatchCount = siblings.filter(
    (other) => other.tag === node.tag && classes.every((c) => other.classes.includes(c)),
  ).length;
  const relative = node.relative.startsWith("#")
    ? node.relative
    : siblingMatchCount === 1
      ? simple
      : `${node.tag}:nth-child(${node.position})`;
  return { classes, groupSelector: simple, siblingMatchCount, relative };
}
