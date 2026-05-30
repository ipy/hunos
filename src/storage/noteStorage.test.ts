import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";

const dbUpdate = vi.fn();

vi.mock("./database", () => ({
  db: {
    notes: {
      update: (...args: unknown[]) => dbUpdate(...args),
    },
  },
}));

import { noteStorage } from "./noteStorage";

const LEGACY_SRC = "data:image/png;base64,legacy";

function legacyImageContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: LEGACY_SRC, dataBlockImageFloor: true },
      },
    ],
  });
}

describe("noteStorage.update", () => {
  beforeEach(() => {
    dbUpdate.mockClear();
  });

  it("sanitizes legacy block-image floor attrs on content writes", async () => {
    const raw = legacyImageContent();
    const result = await noteStorage.update("note-b", { content: raw });

    expect(dbUpdate).toHaveBeenCalledOnce();
    const [, payload] = dbUpdate.mock.calls[0] as [
      string,
      { content: string; modifiedAt: number },
    ];
    const parsed = JSON.parse(payload.content) as {
      content?: Array<{ attrs?: Record<string, unknown> }>;
    };
    expect(parsed.content?.[0]?.attrs?.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(parsed.content?.[0]?.attrs).not.toHaveProperty(
      "dataBlockImageFloor",
    );
    expect(result?.content).toBe(payload.content);
  });

  it("does not rewrite content when attrs are already clean", async () => {
    const clean = JSON.stringify({
      type: "doc",
      content: [{ type: "image", attrs: { src: LEGACY_SRC, height: 200 } }],
    });

    await noteStorage.update("note-b", { content: clean });

    const [, payload] = dbUpdate.mock.calls[0] as [string, { content: string }];
    expect(payload.content).toBe(clean);
  });

  it("passes through non-content updates unchanged", async () => {
    await noteStorage.update("note-a", { title: "New Title" });

    expect(dbUpdate).toHaveBeenCalledWith("note-a", {
      title: "New Title",
      modifiedAt: expect.any(Number),
    });
  });
});
