// @vitest-environment happy-dom
import React, { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DomEditGestureReadout } from "./DomEditGestureReadout";
import { applyStudioBoxSizeDraft } from "./manualEdits";
import { readRotationBase } from "./rotationDraft";

const frames = vi.hoisted(() => ({ update: () => {} }));
vi.mock("./overlayFrameLoop", () => ({
  subscribeOverlayFrame: (update: () => void) => {
    frames.update = update;
    return () => {
      frames.update = () => {};
    };
  },
}));
vi.mock("./rotationDraft", () => ({ readRotationBase: vi.fn(() => 0) }));
// React needs its runtime test flag, which the global typings do not declare.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function mount(kind: "drag" | "resize" | "rotate") {
  const host = document.createElement("div");
  const overlay = document.createElement("div");
  const iframe = document.createElement("iframe");
  document.body.append(host, overlay, iframe);
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Missing preview document");
  const composition = doc.createElement("div");
  composition.setAttribute("data-composition-id", "scene");
  composition.setAttribute("data-width", "1000");
  composition.setAttribute("data-height", "800");
  const element = doc.createElement("div");
  composition.append(element);
  doc.body.append(composition);
  let x = 70.25;
  let y = 40.75;
  const width = 100;
  const height = 60;
  overlay.getBoundingClientRect = () => new DOMRect(20, 30, 500, 400);
  iframe.getBoundingClientRect = () => new DOMRect(20, 30, 500, 400);
  composition.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 800);
  element.getBoundingClientRect = () => new DOMRect(x, y, width, height);
  Object.defineProperties(element, {
    offsetWidth: { value: width },
    offsetHeight: { value: height },
  });
  const gestureRef: ComponentProps<typeof DomEditGestureReadout>["gestureRef"] = {
    current: {
      kind,
      selection: { element },
      plainRotation: null,
      actualWidth: width,
      actualHeight: height,
    },
  };
  root = createRoot(host);
  act(() =>
    root?.render(
      <DomEditGestureReadout
        gestureRef={gestureRef}
        overlayRef={{ current: overlay }}
        iframeRef={{ current: iframe }}
      />,
    ),
  );
  const label = host.querySelector<HTMLDivElement>("[data-dom-edit-gesture-readout]");
  if (!label) throw new Error("Missing readout");
  Object.defineProperties(label, { offsetWidth: { value: 120 }, offsetHeight: { value: 24 } });
  const draw = () => frames.update();
  const end = () => {
    gestureRef.current = null;
    draw();
  };
  return {
    element,
    doc,
    label,
    draw,
    end,
    move: (nextX: number, nextY: number) => {
      x = nextX;
      y = nextY;
    },
  };
}

describe("gesture readout", () => {
  it("shows rounded composition coordinates during a move, accounting for preview zoom", () => {
    const view = mount("drag");
    view.draw();
    expect(view.label.textContent).toBe("X 70 · Y 41");
    view.move(120.25, 70.75);
    view.draw();
    expect(view.label.textContent).toBe("X 120 · Y 71");
    expect(view.doc.querySelector("[data-dom-edit-gesture-readout]")).toBeNull();
    view.end();
    expect(view.label.style.display).toBe("none");
  });
  it("shows the actual size draft during resize and hides on release", () => {
    const view = mount("resize");
    view.draw();
    expect(view.label.textContent).toBe("100 × 60");
    applyStudioBoxSizeDraft(view.element, { width: 143.6, height: 87.2 });
    view.draw();
    expect(view.label.textContent).toBe("144 × 87");
    view.end();
    expect(view.label.style.display).toBe("none");
  });
  it("reads the live angle during rotation and hides on cancellation", () => {
    const view = mount("rotate");
    vi.mocked(readRotationBase).mockReturnValue(31.6);
    view.draw();
    expect(view.label.textContent).toBe("32°");
    expect(readRotationBase).toHaveBeenCalledWith(view.element, false);
    vi.mocked(readRotationBase).mockReturnValue(-46.2);
    view.draw();
    expect(view.label.textContent).toBe("-46°");
    view.end();
    expect(view.label.style.display).toBe("none");
  });
  it("clamps the label inside the visible overlay at either edge", () => {
    const view = mount("drag");
    view.move(900, -100);
    view.draw();
    expect(view.label.style.left).toBe("376px");
    expect(view.label.style.top).toBe("4px");
    view.move(-900, 900);
    view.draw();
    expect(view.label.style.left).toBe("4px");
    expect(view.label.style.top).toBe("372px");
  });
});
