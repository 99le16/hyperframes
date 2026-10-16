// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeElementClipboard } from "@hyperframes/core/element-clipboard";
import { useClipboard } from "./useClipboard";
import { usePlayerStore } from "../player";

const SOURCE =
  '<html><body><div data-composition-id="main" data-duration="2"><p id="element-1">Existing</p></div></body></html>';
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
function mount(readOnlyPreview = false, source = SOURCE) {
  let file = source;
  let systemText = encodeElementClipboard({
    html: '<div id="source" style="position:fixed;left:99px"><h1>Editable</h1></div>',
    css: "h1 {color:rgb(255,0,0)}",
    width: 320,
    height: 180,
    warnings: [],
  });
  const records: Array<{ files: Record<string, { before: string; after: string }> }> = [];
  const reload = vi.fn();
  const toast = vi.fn();
  const write = vi.fn(async (_path: string, content: string) => {
    file = content;
  });
  vi.stubGlobal("navigator", { clipboard: { readText: vi.fn(async () => systemText) } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ content: file }))),
  );
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  iframe.contentDocument!.body.innerHTML = source;
  let api: ReturnType<typeof useClipboard> | null = null;
  function Harness() {
    api = useClipboard({
      projectId: "p",
      activeCompPath: "index.html",
      readOnlyPreview,
      domEditSelectionRef: { current: null },
      showToast: toast,
      writeProjectFile: write,
      recordEdit: async (record) => {
        records.push(record);
      },
      reloadPreview: reload,
      handleTimelineElementsDelete: async () => {},
      handleDomEditElementDelete: async () => {},
      previewIframeRef: { current: iframe },
      waitForPendingDomEditSaves: async () => {},
    });
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root?.render(<Harness />));
  usePlayerStore.setState({
    currentTime: 7,
    elements: [],
    selectedElementId: null,
    selectedElementIds: new Set(),
  });
  return {
    api: () => api!,
    file: () => file,
    records,
    reload,
    toast,
    write,
    iframe,
    system: (value: string) => {
      systemText = value;
    },
  };
}

describe("system element clipboard consumer", () => {
  it("inserts an editable clip at the playhead, selects it and records a reversible saved file", async () => {
    const view = mount();
    await view.api().handlePaste();
    const doc = new DOMParser().parseFromString(view.file(), "text/html");
    const clip = doc.querySelector(".clip")!;
    expect(clip).not.toBeNull();
    expect(clip.getAttribute("data-start")).toBe("7");
    expect(clip.getAttribute("data-duration")).toBe("5");
    expect(doc.querySelector("[data-composition-id]")?.getAttribute("data-duration")).toBe("12");
    expect(clip.querySelector("h1")?.textContent).toBe("Editable");
    expect(clip.querySelector("img")).toBeNull();
    expect(clip.id).not.toBe("element-1");
    expect(clip.getAttribute("data-hf-id")).toBeTruthy();
    expect(view.records).toHaveLength(1);
    expect(view.records[0].files["index.html"]).toEqual({ before: SOURCE, after: view.file() });
    expect(usePlayerStore.getState().selectedElementId).toContain(clip.id);
    expect(usePlayerStore.getState().currentTime).toBe(7);
    expect(view.reload).toHaveBeenCalledTimes(1);
    view.iframe.contentDocument!.open();
    view.iframe.contentDocument!.write(view.file());
    view.iframe.contentDocument!.close();
    expect(view.iframe.contentDocument!.querySelector(".clip h1")?.textContent).toBe("Editable");
    await view.write("index.html", view.records[0].files["index.html"].before);
    expect(view.file()).toBe(SOURCE);
  });
  it("blocks external elements in a read-only preview even with no selection", async () => {
    const view = mount(true);
    await view.api().handlePaste();
    expect(view.write).not.toHaveBeenCalled();
    expect(view.records).toHaveLength(0);
  });
  it("leaves foreign clipboard text and failed clipboard reads harmless", async () => {
    const view = mount();
    view.system("ordinary text");
    await view.api().handlePaste();
    expect(view.write).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", {
      clipboard: {
        readText: async () => {
          throw new Error("Denied");
        },
      },
    });
    await view.api().handlePaste();
    expect(view.write).not.toHaveBeenCalled();
  });
  it("remints IDs on each external paste", async () => {
    const view = mount();
    await view.api().handlePaste();
    await view.api().handlePaste();
    const doc = new DOMParser().parseFromString(view.file(), "text/html");
    const ids = Array.from(doc.querySelectorAll("[id]"), (el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc.querySelectorAll(".clip")).toHaveLength(2);
  });
});

it.each([
  { attribute: 'id="element-1-node-0"', existingId: "element-1-node-0" },
  { attribute: "id='element-1'", existingId: "element-1" },
  { attribute: "id=element-1", existingId: "element-1" },
  { attribute: 'ID="element-1"', existingId: "element-1" },
  { attribute: 'id="element&#45;1"', existingId: "element-1" },
])(
  "does not collide with existing HTML IDs or descendant namespaces: $attribute",
  async ({ attribute, existingId }) => {
    const view = mount(false, SOURCE.replace('id="element-1"', attribute));
    view.system(
      encodeElementClipboard({
        html: '<div id="source">Editable</div>',
        css: "#source{color:red}",
        width: 100,
        height: 50,
        warnings: [],
      }),
    );
    await view.api().handlePaste();
    const doc = new DOMParser().parseFromString(view.file(), "text/html");
    expect(doc.querySelector(".clip")?.id).toBe("element-2");
    expect(doc.querySelector(".clip div")?.id).toBe("element-2-node-0");
    expect(doc.querySelector("style")?.textContent).toContain("#element-2-node-0");
    expect(doc.querySelectorAll(`#${existingId}`)).toHaveLength(1);
  },
);

it("does not replace an existing composition font with the pasted font", async () => {
  const before = SOURCE.replace(
    "<body>",
    "<head><style>@font-face{font-family:element-2-font-0;src:local(Arial)} p{font-family:element-2-font-0}</style></head><body>",
  );
  const view = mount(false, before);
  view.system(
    encodeElementClipboard({
      html: '<div style="font-family:Test">Editable</div>',
      css: '@font-face{font-family:Test;src:url("data:font/woff2;base64,d09GMg==")}',
      width: 100,
      height: 50,
      warnings: [],
    }),
  );
  await view.api().handlePaste();
  const doc = new DOMParser().parseFromString(view.file(), "text/html");
  expect(doc.head.textContent).toContain("font-family:element-2-font-0");
  const added = doc.querySelector(".clip style")?.textContent ?? "";
  expect(added).toContain("font-family:");
  expect(added).not.toContain('"element-2-font-0"');
});
