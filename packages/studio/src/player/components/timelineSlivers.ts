import type { TimelineElement } from "../store/playerStore";
import { clipWidthPx } from "./TimelineClip";

/**
 * The row's clips without those hidden under a clip already drawn: one that starts inside the
 * drawn box of an earlier clip and is not the last of its run. At a long film's fit zoom most
 * clips are drawn at the minimum width over their neighbours, and mounting each one cost the
 * open seconds for boxes nobody can see. A run keeps its last clip, so it still ends where its
 * last clip ends; `keep` names the clips that must stay (selected, hovered, focused, pinned).
 * Order is unchanged, so z and DOM order are too.
 */
export function withoutHiddenSlivers(
  elements: readonly TimelineElement[],
  pps: number,
  keep: (element: TimelineElement) => boolean,
): readonly TimelineElement[] {
  if (elements.length < 2) return elements;
  const byStart = [...elements].sort((a, b) => a.start - b.start);
  const hidden = new Set<TimelineElement>();
  let edge = -Infinity;
  for (let i = 0; i < byStart.length; i++) {
    const el = byStart[i]!;
    const left = el.start * pps;
    const right = left + clipWidthPx(el, pps);
    const next = byStart[i + 1];
    const endsRun = !next || next.start * pps >= right;
    // Only a sliver: a clip drawn wider than it is long. A real overlap (two clips an author labels one transition)
    // stays, however it starts.
    const sliver = el.duration * pps < right - left;
    if (sliver && left < edge && !endsRun && !keep(el)) {
      hidden.add(el);
      continue;
    }
    edge = Math.max(edge, right);
  }
  return hidden.size === 0 ? elements : elements.filter((el) => !hidden.has(el));
}
