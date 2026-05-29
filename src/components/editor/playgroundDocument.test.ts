import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { PlaygroundDocument } from "./PlaygroundDocument";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  migratePlaygroundContentIfStale,
} from "@/storage/formatPlaygroundNote";
import {
  PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
  PLAYGROUND_SAMPLE_IMAGE_SRC,
} from "./imageEmbedUtils";

function getPlaygroundSchema() {
  return getSchema([
    StarterKit.configure({
      document: false,
      codeBlock: false,
    }),
    PlaygroundDocument,
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          height: { default: null },
        };
      },
    }),
  ]);
}

function roundTripPlaygroundJson(content: unknown) {
  const schema = getPlaygroundSchema();
  const node = schema.nodeFromJSON(content);
  return node.toJSON();
}

function findPlaygroundSampleImage(doc: {
  type: string;
  content?: Array<{ type: string; attrs?: { src?: string; height?: number } }>;
}) {
  return doc.content?.find(
    (node) =>
      node.type === "image" && node.attrs?.src === PLAYGROUND_SAMPLE_IMAGE_SRC,
  );
}

describe("PlaygroundDocument", () => {
  it("preserves playground doc attrs through schema JSON round-trip", () => {
    const json = roundTripPlaygroundJson({
      type: "doc",
      attrs: {
        playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "格式试炼场" }],
        },
      ],
    }) as {
      attrs?: {
        playgroundContentVersion?: number;
        playgroundContentLocale?: string;
      };
    };

    expect(json.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(json.attrs?.playgroundContentLocale).toBe("zh");
  });

  it("preserves resized sample image height through schema JSON round-trip", () => {
    const json = roundTripPlaygroundJson({
      type: "doc",
      attrs: {
        playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "image",
          attrs: {
            src: PLAYGROUND_SAMPLE_IMAGE_SRC,
            alt: "示例",
            height: 215,
          },
        },
      ],
    }) as {
      attrs?: { playgroundContentVersion?: number };
      content?: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
      }>;
    };

    const savedImage = findPlaygroundSampleImage(json);
    expect(savedImage?.attrs?.height).toBe(215);
    expect(json.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    expect(
      migratePlaygroundContentIfStale(JSON.stringify(json), "zh"),
    ).toBeNull();
  });

  it("seeds default sample image height only when missing during migration", () => {
    const stale = JSON.parse(JSON.stringify(buildPlaygroundContent("en"))) as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
      }>;
    };
    stale.attrs = { playgroundContentVersion: 16 };
    const sampleImage = findPlaygroundSampleImage(stale);
    delete sampleImage?.attrs?.height;

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      content: Array<{ type: string; attrs?: { height?: number } }>;
    };
    const migratedImage = findPlaygroundSampleImage(parsed);
    expect(migratedImage?.attrs?.height).toBe(PLAYGROUND_SAMPLE_IMAGE_HEIGHT);
  });
});
