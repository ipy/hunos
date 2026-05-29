import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYGROUND_SAMPLE_IMAGE_SRC } from "@/components/editor/imageEmbedUtils";
import {
  buildPlaygroundContent,
  syncFormatPlaygroundOnLocaleChange,
} from "./formatPlaygroundNote";

const mockNoteStoreState = vi.hoisted(() => {
  const saveNoteContent = vi.fn().mockResolvedValue(undefined);
  const saveNoteTitle = vi.fn().mockResolvedValue(undefined);
  return {
    activeNoteId: "pg-1" as string | null,
    notes: [] as Array<{ id: string; title: string; content: string }>,
    saveNoteContent,
    saveNoteTitle,
  };
});

const saveNoteContent = mockNoteStoreState.saveNoteContent;
const saveNoteTitle = mockNoteStoreState.saveNoteTitle;

const noteStorageList = vi.fn();

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => mockNoteStoreState,
  },
}));

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => noteStorageList(...args),
  },
}));

describe("syncFormatPlaygroundOnLocaleChange", () => {
  beforeEach(() => {
    saveNoteContent.mockClear();
    saveNoteTitle.mockClear();
    noteStorageList.mockReset();
    mockNoteStoreState.activeNoteId = "pg-1";
    mockNoteStoreState.notes = [
      {
        id: "pg-1",
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
      },
    ];
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
      (node) => node.type === "heading" && node.content?.[0]?.text === "图片",
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
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
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

  it("migrates playground from storage on cold load without activeNoteId", async () => {
    mockNoteStoreState.activeNoteId = null;
    mockNoteStoreState.notes = [];
    noteStorageList.mockResolvedValue([
      {
        id: "pg-1",
        title: "Format Playground",
        content: JSON.stringify(buildPlaygroundContent("en")),
      },
    ]);

    await syncFormatPlaygroundOnLocaleChange("zh");

    expect(noteStorageList).toHaveBeenCalled();
    expect(saveNoteContent).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(saveNoteContent.mock.calls[0][1] as string) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(saved.attrs?.playgroundContentLocale).toBe("zh");
    const imagesSection = saved.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "图片",
    );
    expect(imagesSection).toBeGreaterThan(-1);
    expect(saveNoteTitle).toHaveBeenCalledWith("pg-1", "格式试炼场");
  });
});
