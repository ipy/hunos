import { describe, expect, it } from "vitest";
import { applyHideCompletedTasksDomAttribute } from "./hideCompletedTasksDom";

class MockDomElement {
  private attrs = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
}

describe("applyHideCompletedTasksDomAttribute", () => {
  it("sets data-hide-completed-tasks when hiding is enabled", () => {
    const dom = new MockDomElement() as unknown as HTMLElement;

    applyHideCompletedTasksDomAttribute(dom, true);

    expect(dom.getAttribute("data-hide-completed-tasks")).toBe("true");
  });

  it("removes data-hide-completed-tasks when hiding is disabled", () => {
    const dom = new MockDomElement() as unknown as HTMLElement;
    dom.setAttribute("data-hide-completed-tasks", "true");

    applyHideCompletedTasksDomAttribute(dom, false);

    expect(dom.hasAttribute("data-hide-completed-tasks")).toBe(false);
  });
});
