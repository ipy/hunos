import { describe, expect, it, vi } from "vitest";
import {
  headingDocPosForBacklinkSection,
  scrollToBacklinkSection,
} from "./backlinkSectionScroll";

const scrollToTocDocPos = vi.fn((_editor: unknown, _pos: number) => true);

vi.mock("@/utils/tocNavigation", () => ({
  scrollToTocDocPos: (editor: unknown, pos: number) =>
    scrollToTocDocPos(editor, pos),
}));

function mockEditor(headings: Array<{ title: string; pos: number }>) {
  return {
    state: {
      doc: {
        descendants(
          fn: (
            node: { type: { name: string }; textContent: string },
            pos: number,
          ) => void | false,
        ) {
          for (const heading of headings) {
            const stop = fn(
              {
                type: { name: "heading" },
                textContent: heading.title,
              },
              heading.pos,
            );
            if (stop === false) break;
          }
        },
      },
    },
  };
}

describe("headingDocPosForBacklinkSection", () => {
  it("matches a section heading by exact title", () => {
    const editor = mockEditor([
      { title: "标签与链接", pos: 10 },
      { title: "自由试炼", pos: 80 },
    ]);
    expect(headingDocPosForBacklinkSection(editor as never, "标签与链接")).toBe(
      10,
    );
  });

  it("falls back to the first segment before the disambiguation separator", () => {
    const editor = mockEditor([{ title: "自由试炼", pos: 80 }]);
    expect(
      headingDocPosForBacklinkSection(editor as never, "自由试炼 · #1"),
    ).toBe(80);
  });
});

describe("scrollToBacklinkSection", () => {
  it("delegates to scrollToTocDocPos when the heading exists", () => {
    scrollToTocDocPos.mockClear();
    const editor = mockEditor([{ title: "标签与链接", pos: 10 }]);
    expect(scrollToBacklinkSection(editor as never, "标签与链接")).toBe(true);
    expect(scrollToTocDocPos).toHaveBeenCalledWith(editor, 10);
  });
});
