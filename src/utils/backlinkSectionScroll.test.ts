import { describe, expect, it, vi } from "vitest";
import {
  headingDocPosForBacklinkSection,
  scheduleBacklinkSectionScroll,
  scrollToBacklinkSection,
} from "./backlinkSectionScroll";

const scrollToTocDocPos = vi.fn((_editor: unknown, _pos: number) => true);

vi.mock("@/utils/tocNavigation", () => ({
  scrollToTocDocPos: (editor: unknown, pos: number, options?: unknown) =>
    scrollToTocDocPos(editor, pos, options),
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
    expect(scrollToTocDocPos).toHaveBeenCalledWith(editor, 10, {
      anchorHeadingOnly: true,
    });
  });
});

describe("scheduleBacklinkSectionScroll", () => {
  it("retries until scroll succeeds", () => {
    let attempts = 0;
    const tryScroll = vi.fn(() => {
      attempts += 1;
      return attempts >= 3;
    });
    const onSuccess = vi.fn();
    const frames: FrameRequestCallback[] = [];
    const frame = (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    };
    const cancelFrame = vi.fn();

    scheduleBacklinkSectionScroll(tryScroll, onSuccess, frame, cancelFrame, 10);

    expect(tryScroll).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();

    frames[0]!(0);
    expect(tryScroll).toHaveBeenCalledTimes(2);
    expect(onSuccess).not.toHaveBeenCalled();

    frames[1]!(0);
    expect(tryScroll).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("stops after max attempts without calling onSuccess", () => {
    const tryScroll = vi.fn(() => false);
    const onSuccess = vi.fn();
    const frames: FrameRequestCallback[] = [];
    const frame = (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    };

    scheduleBacklinkSectionScroll(tryScroll, onSuccess, frame, vi.fn(), 2);

    frames[0]!(0);
    frames[1]!(0);
    expect(tryScroll).toHaveBeenCalledTimes(3);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("cancels pending frames on cleanup", () => {
    const tryScroll = vi.fn(() => false);
    const onSuccess = vi.fn();
    const frames: FrameRequestCallback[] = [];
    const frame = (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    };
    const cancelFrame = vi.fn();

    const cancel = scheduleBacklinkSectionScroll(
      tryScroll,
      onSuccess,
      frame,
      cancelFrame,
      10,
    );
    cancel();
    frames[0]!(0);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(cancelFrame).toHaveBeenCalled();
  });
});
