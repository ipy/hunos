import { describe, expect, it, vi } from "vitest";
import { reparentBubbleMenuElement } from "./bubbleMenuHostUtils";

function createHost() {
  const host = {
    appendChild: vi.fn(function (this: { child: HTMLElement | null }, child) {
      this.child = child;
      child.parentNode = host as unknown as HTMLElement;
      return child;
    }),
    child: null as HTMLElement | null,
  };
  return host as unknown as HTMLElement & { child: HTMLElement | null };
}

function createMenu(parent: HTMLElement | null) {
  return {
    parentNode: parent,
    style: { visibility: "visible" },
  } as unknown as HTMLElement;
}

describe("reparentBubbleMenuElement", () => {
  it("reparents a detached bubble menu element into the host", () => {
    const host = createHost();
    const detachedParent = {} as HTMLElement;
    const menu = createMenu(detachedParent);

    reparentBubbleMenuElement(host, menu);

    expect(host.appendChild).toHaveBeenCalledWith(menu);
    expect(menu.parentNode).toBe(host);
    expect(menu.style.visibility).toBe("hidden");
  });

  it("no-ops when the element is already under the host", () => {
    const host = createHost();
    const menu = createMenu(host);

    reparentBubbleMenuElement(host, menu);

    expect(host.appendChild).not.toHaveBeenCalled();
  });
});
