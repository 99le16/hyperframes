import { afterEach, describe, expect, it } from "vitest";
import { authoredCssSelector, installInspection } from "./inspection";

describe("authoredCssSelector", () => {
  it("drops page resets and keeps a rule that also names the element", () => {
    expect(authoredCssSelector("*")).toBeNull();
    expect(authoredCssSelector("html, body")).toBeNull();
    expect(authoredCssSelector("html *")).toBeNull();
    expect(authoredCssSelector("rect, *")).toBe("rect");
    expect(authoredCssSelector(".Card")).toBe(".Card");
  });
});

describe("installInspection CSS matching", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete (window as { __hfInspection?: unknown }).__hfInspection;
  });

  it("does not attach a universal reset to a rect", () => {
    document.body.innerHTML = '<svg id="world-grain"><rect id="grain"></rect></svg>';
    const api = installInspection(window, "gen");
    const [result] = api.query({
      targets: [{ selector: "rect" }],
      descendants: false,
      cssRules: [
        { id: "reset", selector: "*" },
        { id: "page", selector: "html, body" },
        { id: "desc", selector: "body *" },
        { id: "own", selector: "rect" },
        { id: "shared", selector: "rect, *" },
      ],
    }).results;

    expect(result?.status).toBe("found");
    expect(result?.css).toEqual(["own", "shared"]);
    api.dispose();
  });
});
