import type { ElementDom, ElementNode } from "./elementMap.js";
import type { AuthoredHtml, HtmlTag as SourceTag } from "./sources";

const PLAIN_CLASS = /^[a-zA-Z_-][\w-]*$/;

export function withAuthoredState(snapshot: ElementDom, sources: AuthoredHtml): ElementDom {
  const byHfId = group(sources.htmlTags, (tag) => tag.hfId);
  const byId = group(sources.htmlTags, (tag) => tag.id);
  const live = snapshot.nodes;
  const matched = live.map((node) => sourceTag(node, byHfId, byId));
  const generated = generatedInsideText(live, matched, sources);
  const nodes = live.map((node, index) =>
    generated.has(index)
      ? steadyGenerated(node, live, generated)
      : authoredNode(node, matched[index], sources, live),
  );
  return { ...snapshot, nodes };
}

function authoredNode(
  node: ElementNode,
  tag: SourceTag | undefined,
  sources: AuthoredHtml,
  live: ElementNode[],
): ElementNode {
  if (!tag) return node;
  const text = leafText(sources, tag) || node.text;
  const id = node.id || tag.id || "";
  const classes = authoredClasses(node, tag, live);
  const next = { ...node, text, id };
  return classes ? { ...next, ...classes } : next;
}

function generatedInsideText(
  live: ElementNode[],
  matched: (SourceTag | undefined)[],
  sources: AuthoredHtml,
) {
  const generated = new Set<number>();
  for (const [index, tag] of matched.entries()) {
    if (!tag || !leafText(sources, tag)) continue;
    for (const child of live[index]!.children)
      if (!matched[child]) markGenerated(child, live, matched, generated);
  }
  return generated;
}

function markGenerated(
  index: number,
  live: ElementNode[],
  matched: (SourceTag | undefined)[],
  generated: Set<number>,
) {
  if (generated.has(index) || matched[index]) return;
  generated.add(index);
  for (const child of live[index]!.children) markGenerated(child, live, matched, generated);
}

function steadyGenerated(
  node: ElementNode,
  live: ElementNode[],
  generated: Set<number>,
): ElementNode {
  const siblings =
    node.parent === null ? [node] : live[node.parent]!.children.map((index) => live[index]!);
  const siblingMatchCount = siblings.filter(
    (other) => generated.has(other.index) && other.tag === node.tag,
  ).length;
  return {
    ...node,
    id: "",
    classes: [],
    text: "",
    generated: true,
    groupSelector: node.tag,
    relative: `${node.tag}:nth-child(${node.position})`,
    siblingMatchCount,
  };
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
  const classes = [...tag.classes];
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
