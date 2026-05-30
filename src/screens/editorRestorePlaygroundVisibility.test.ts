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
    expect(formatPlaygroundNeedsRestore("格式试炼场", seedContent, "zh")).toBe(
      false,
    );
    expect(
      formatPlaygroundMatchesCanonicalSeed("格式试炼场", seedContent, "zh"),
    ).toBe(true);
  });

  it("shows restore after non-canonical title rename with seed body", () => {
    expect(isFormatPlaygroundNote("NonCanonicalTitleFinal5", seedContent)).toBe(
      true,
    );
    expect(
      formatPlaygroundNeedsRestore(
        "NonCanonicalTitleFinal5",
        seedContent,
        "zh",
      ),
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
      content: [{ type: "text", text: "T5-MIXED-marker" }],
    });
    const drifted = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", drifted, "zh")).toBe(
      true,
    );
  });

  it("hides restore when pending draft is editor round-trip of canonical seed", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const roundTripPending = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: roundTripPending,
        editorContent: roundTripPending,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore when pending draft inserts T5-MIXED drift", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.splice(10, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T5-MIXED-lists" }],
    });
    const pendingDraft = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        editorContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore when persisted row is canonical even if editor JSON differs", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
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

  it("hides restore after reload when stored seed is canonical and editor echoes round-trip", () => {
    const parsed = JSON.parse(seedContent) as {
      attrs?: Record<string, unknown>;
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    delete parsed.attrs?.playgroundContentLocale;
    const editorEcho = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: editorEcho,
        editorContent: editorEcho,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("hides restore after durable restore when only editor JSON differs from IDB row", () => {
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
              content: [{ type: "text", text: "T5-MIXED-stale-editor" }],
            },
          ],
        }),
        fallbackLocale: "zh",
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
              content: [{ type: "text", text: "T5-MIXED-stale-editor" }],
            },
          ],
        }),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore during active restore session when stored row is canonical", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "NonCanonicalTitleFinal5",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        editorContent: null,
        fallbackLocale: "zh",
        isRestoringPlayground: true,
      }),
    ).toBe(false);
  });

  it("shows restore when pending title draft renames canonical playground", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "NonCanonicalTitleFinal5",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        pendingTitleDraft: "NonCanonicalTitleFinal5",
        editorContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore for unmodified English playground when app locale is zh", () => {
    const enSeed = JSON.stringify(buildPlaygroundContent("en"));
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "Format Playground",
        storedTitle: "Format Playground",
        storedContent: enSeed,
        pendingDraftContent: null,
        editorContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore after post-restore editor echo pending draft", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const restoredEcho = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: restoredEcho,
        editorContent: restoredEcho,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});
