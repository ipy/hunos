import { describe, expect, it } from "vitest";
import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";
import {
  migrateLegacyBlockImageFloor,
  sanitizeBlockImageFloorInDoc,
  sanitizeBlockImageNoteContent,
} from "./migrateBlockImageFloor";

const LEGACY_SRC = "data:image/png;base64,legacy";

function imageNode(attrs: Record<string, unknown>) {
  return {
    type: "doc",
    content: [{ type: "image", attrs: { src: LEGACY_SRC, ...attrs } }],
  };
}

describe("sanitizeBlockImageFloorInDoc", () => {
  it("adds height 80 and strips floor flag when height is missing", () => {
    const doc = imageNode({ dataBlockImageFloor: true });
    const { doc: sanitized, changed } = sanitizeBlockImageFloorInDoc(doc);

    expect(changed).toBe(true);
    expect(sanitized.content?.[0]?.attrs).toEqual({
      src: LEGACY_SRC,
      height: MIN_BLOCK_IMAGE_HEIGHT,
    });
    expect(sanitized.content?.[0]?.attrs).not.toHaveProperty(
      "dataBlockImageFloor",
    );
  });

  it("strips floor flag only when height is already set", () => {
    const doc = imageNode({ dataBlockImageFloor: true, height: 80 });
    const { doc: sanitized, changed } = sanitizeBlockImageFloorInDoc(doc);

    expect(changed).toBe(true);
    expect(sanitized.content?.[0]?.attrs).toEqual({
      src: LEGACY_SRC,
      height: 80,
    });
  });

  it("preserves custom height when stripping floor flag", () => {
    const doc = imageNode({ dataBlockImageFloor: true, height: 200 });
    const { doc: sanitized, changed } = sanitizeBlockImageFloorInDoc(doc);

    expect(changed).toBe(true);
    expect(sanitized.content?.[0]?.attrs).toEqual({
      src: LEGACY_SRC,
      height: 200,
    });
  });

  it("is a no-op for clean images", () => {
    const withHeight = imageNode({ height: 200 });
    expect(sanitizeBlockImageFloorInDoc(withHeight).changed).toBe(false);

    const srcOnly = imageNode({});
    expect(sanitizeBlockImageFloorInDoc(srcOnly).changed).toBe(false);

    const atFloor = imageNode({ height: MIN_BLOCK_IMAGE_HEIGHT });
    expect(sanitizeBlockImageFloorInDoc(atFloor).changed).toBe(false);
  });

  it("sanitizes nested image nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "image",
              attrs: { src: LEGACY_SRC, dataBlockImageFloor: true },
            },
          ],
        },
      ],
    };

    const { doc: sanitized, changed } = sanitizeBlockImageFloorInDoc(doc);
    expect(changed).toBe(true);
    expect(
      sanitized.content?.[0]?.content?.[0]?.attrs?.height,
    ).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(
      sanitized.content?.[0]?.content?.[0]?.attrs,
    ).not.toHaveProperty("dataBlockImageFloor");
  });
});

describe("sanitizeBlockImageNoteContent", () => {
  it("returns the original string when content is unchanged", () => {
    const content = JSON.stringify(imageNode({ height: 200 }));
    const result = sanitizeBlockImageNoteContent(content);

    expect(result.changed).toBe(false);
    expect(result.content).toBe(content);
  });

  it("returns migrated JSON for legacy floor-only nodes", () => {
    const content = JSON.stringify(imageNode({ dataBlockImageFloor: true }));
    const result = sanitizeBlockImageNoteContent(content);

    expect(result.changed).toBe(true);
    const parsed = JSON.parse(result.content) as {
      content?: Array<{ attrs?: Record<string, unknown> }>;
    };
    expect(parsed.content?.[0]?.attrs?.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(parsed.content?.[0]?.attrs).not.toHaveProperty(
      "dataBlockImageFloor",
    );
  });

  it("passes through invalid JSON unchanged", () => {
    expect(sanitizeBlockImageNoteContent("not json")).toEqual({
      content: "not json",
      changed: false,
    });
  });

  it("passes through empty content unchanged", () => {
    expect(sanitizeBlockImageNoteContent("")).toEqual({
      content: "",
      changed: false,
    });
  });
});

describe("migrateLegacyBlockImageFloor", () => {
  it("returns null for already-clean content", () => {
    expect(
      migrateLegacyBlockImageFloor(JSON.stringify(imageNode({ height: 200 }))),
    ).toBeNull();
  });

  it("returns migrated JSON when legacy attrs are present", () => {
    const migrated = migrateLegacyBlockImageFloor(
      JSON.stringify(imageNode({ dataBlockImageFloor: true })),
    );
    expect(migrated).not.toBeNull();
    expect(migrated).not.toContain("dataBlockImageFloor");
    expect(migrated).toContain(`"height":${MIN_BLOCK_IMAGE_HEIGHT}`);
  });
});
