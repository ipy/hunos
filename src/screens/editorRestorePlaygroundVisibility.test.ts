import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  formatPlaygroundMatchesCanonicalSeed,
  formatPlaygroundNeedsRestore,
  isFormatPlaygroundNote,
  shouldShowPlaygroundRestoreButton,
} from "@/storage/formatPlaygroundNote";

describe("playground restore visibility", () => {
  const seedContent = JSON.stringify(buildPlaygroundContent("zh"));

  it("hides restore when title and body match canonical zh seed", () => {
    expect(
      formatPlaygroundNeedsRestore("格式试炼场", seedContent, "zh"),
    ).toBe(false);
    expect(
      formatPlaygroundMatchesCanonicalSeed("格式试炼场", seedContent, "zh"),
    ).toBe(true);
  });

  it("shows restore after non-canonical title rename with seed body", () => {
    expect(isFormatPlaygroundNote("NonCanonicalTitleFinal4", seedContent)).toBe(
      true,
    );
    expect(
      formatPlaygroundNeedsRestore("NonCanonicalTitleFinal4", seedContent, "zh"),
    ).toBe(true);
    expect(
      formatPlaygroundNeedsRestore("TitleUnload3", seedContent, "zh"),
    ).toBe(true);
  });

  it("shows restore when body drifts from seed", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T4-MIXED-marker" }],
    });
    const drifted = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", drifted, "zh")).toBe(true);
  });

  it("hides restore when persisted row is canonical even if editor JSON differs", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !(parsed.content.at(-1)?.content?.length)
    ) {
      parsed.content.pop();
    }
    const editorRoundTrip = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        editorContent: editorRoundTrip,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("hides restore immediately when stored canonical after restore tap", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        editorContent: JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "T4-MIXED-stale-editor" }],
            },
          ],
        }),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});
