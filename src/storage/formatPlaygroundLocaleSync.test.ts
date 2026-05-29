import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYGROUND_SAMPLE_IMAGE_SRC } from "@/components/editor/imageEmbedUtils";
import {
  buildPlaygroundContent,
  syncFormatPlaygroundOnLocaleChange,
} from "./formatPlaygroundNote";

const saveNoteContent = vi.fn().mockResolvedValue(undefined);
const saveNoteTitle = vi.fn().mockResolvedValue(undefined);

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => ({
      activeNoteId: "pg-1",
      notes: [
        {
          id: "pg-1",
          title: "格式试炼场",
          content: JSON.stringify(buildPlaygroundContent("zh")),
        },
      ],
      saveNoteContent,
      saveNoteTitle,
    }),
  },
}));

describe("syncFormatPlaygroundOnLocaleChange", () => {
  beforeEach(() => {
    saveNoteContent.mockClear();
    saveNoteTitle.mockClear();
  });

  it("migrates active playground using flushed editor JSON", async () => {
    const zh = buildPlaygroundContent("zh") as {
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    const imagesIndex = zh.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "图片",
    );
    const imageNode = zh.content[imagesIndex + 2];
    if (imageNode?.attrs) {
      imageNode.attrs.height = 240;
    }
    const flushed = JSON.stringify(zh);

    await syncFormatPlaygroundOnLocaleChange("en", flushed);

    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(saveNoteContent.mock.calls[0][1] as string) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(saved.attrs?.playgroundContentLocale).toBe("en");
    const imagesSection = saved.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    const migratedImage = saved.content[imagesSection + 2];
    expect(migratedImage?.attrs?.height).toBe(240);
    expect(migratedImage?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
    expect(saveNoteTitle).toHaveBeenCalledWith("pg-1", "Format Playground");
  });

  it("no-ops when flushed content is already current for locale", async () => {
    const content = JSON.stringify(buildPlaygroundContent("zh"));
    await syncFormatPlaygroundOnLocaleChange("zh", content);
    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(saveNoteTitle).not.toHaveBeenCalled();
  });
});
