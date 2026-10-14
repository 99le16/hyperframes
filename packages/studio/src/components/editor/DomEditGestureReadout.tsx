import { useRef, type RefObject } from "react";
import { useMountEffect } from "../../hooks/useMountEffect";
import type { GestureState } from "./domEditOverlayGestures";
import { computeOverlayRootScale } from "./domEditOverlayBasis";
import { orientedOverlayRect } from "./domEditOverlayGeometry";
import { readStudioBoxSize } from "./manualEdits";
import { readRotationBase } from "./rotationDraft";
import { subscribeOverlayFrame } from "./overlayFrameLoop";

type ReadoutGesture = Pick<
  GestureState,
  "kind" | "plainRotation" | "actualWidth" | "actualHeight"
> & {
  selection: Pick<GestureState["selection"], "element">;
};

interface DomEditGestureReadoutProps {
  gestureRef: RefObject<ReadoutGesture | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

function readGestureText(
  gesture: ReadoutGesture,
  overlay: HTMLDivElement,
  iframe: HTMLIFrameElement,
): string | null {
  const element = gesture.selection.element;
  if (gesture.kind === "resize") {
    const size = readStudioBoxSize(element);
    return `${Math.round(size.width || gesture.actualWidth)} × ${Math.round(size.height || gesture.actualHeight)}`;
  }
  if (gesture.kind === "rotate") {
    return `${Math.round(readRotationBase(element, gesture.plainRotation !== null))}°`;
  }
  const scale = computeOverlayRootScale(overlay, iframe, iframe.contentDocument);
  const rect = orientedOverlayRect(overlay, iframe, element, scale);
  if (!scale || !rect || scale.rootScaleX <= 0 || scale.rootScaleY <= 0) return null;
  const x = (rect.left - (scale.iframeRect.left - scale.overlayRect.left)) / scale.rootScaleX;
  const y = (rect.top - (scale.iframeRect.top - scale.overlayRect.top)) / scale.rootScaleY;
  return `X ${Math.round(x)} · Y ${Math.round(y)}`;
}

function positionGestureReadout(
  label: HTMLDivElement,
  gesture: ReadoutGesture,
  overlay: HTMLDivElement,
  iframe: HTMLIFrameElement,
): void {
  const bounds = overlay.getBoundingClientRect();
  const element = gesture.selection.element.getBoundingClientRect();
  const scale = computeOverlayRootScale(overlay, iframe, iframe.contentDocument);
  if (!scale) {
    label.style.display = "none";
    return;
  }
  const right = scale.iframeRect.left + element.right * scale.rootScaleX - bounds.left;
  const top = scale.iframeRect.top + element.top * scale.rootScaleY - bounds.top;
  const minX = Math.max(0, -bounds.left) + 4;
  const minY = Math.max(0, -bounds.top) + 4;
  const maxX = Math.min(bounds.width, window.innerWidth - bounds.left) - label.offsetWidth - 4;
  const maxY = Math.min(bounds.height, window.innerHeight - bounds.top) - label.offsetHeight - 4;
  label.style.left = `${Math.max(minX, Math.min(maxX, right + 8))}px`;
  label.style.top = `${Math.max(minY, Math.min(maxY, top - label.offsetHeight - 8))}px`;
}

export function DomEditGestureReadout({
  gestureRef,
  overlayRef,
  iframeRef,
}: DomEditGestureReadoutProps) {
  const labelRef = useRef<HTMLDivElement | null>(null);
  useMountEffect(() =>
    subscribeOverlayFrame(() => {
      const label = labelRef.current;
      if (!label) return;
      const gesture = gestureRef.current;
      const overlay = overlayRef.current;
      const iframe = iframeRef.current;
      if (!gesture || !overlay || !iframe) {
        label.style.display = "none";
        return;
      }
      const text = readGestureText(gesture, overlay, iframe);
      if (!text) {
        label.style.display = "none";
        return;
      }
      label.textContent = text;
      label.style.display = "block";
      positionGestureReadout(label, gesture, overlay, iframe);
    }),
  );
  return (
    <div
      ref={labelRef}
      aria-hidden="true"
      data-dom-edit-gesture-readout="true"
      className="pointer-events-none absolute z-50 rounded bg-studio-surface px-2 py-1 font-mono text-xs whitespace-nowrap text-studio-text shadow-md"
      style={{ display: "none" }}
    />
  );
}
