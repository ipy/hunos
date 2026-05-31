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
    expect(isFormatPlaygroundNote("NonCanonicalTitleFinal7", seedContent)).toBe(
      true,
    );
    expect(
      formatPlaygroundNeedsRestore(
        "NonCanonicalTitleFinal7",
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
      content: [{ type: "text", text: "T7-MIXED-marker" }],
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
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore when pending draft inserts T7-MIXED drift", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.splice(10, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T7-MIXED-lists" }],
    });
    const pendingDraft = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore when persisted row is canonical", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
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
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("hides restore after durable restore when stored row is canonical", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore immediately when stored canonical after restore tap", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "NonCanonicalTitleFinal7",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore during active restore session when stored row is canonical", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "NonCanonicalTitleFinal7",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        fallbackLocale: "zh",
        isRestoringPlayground: true,
      }),
    ).toBe(false);
  });

  it("shows restore when pending title draft renames canonical playground", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "NonCanonicalTitleFinal7",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        pendingTitleDraft: "NonCanonicalTitleFinal7",
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
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore for unmodified English playground when app locale is en", () => {
    const enSeed = JSON.stringify(buildPlaygroundContent("en"));
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "Format Playground",
        storedTitle: "Format Playground",
        storedContent: enSeed,
        pendingDraftContent: null,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("hides restore when canonical row read returns null (no raw-content fallback)", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "Meeting Notes",
        storedTitle: "Meeting Notes",
        storedContent: '{"type":"doc","content":[]}',
        pendingDraftContent: null,
        fallbackLocale: "en",
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
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore when format QA only toggles inline marks on list text", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: Array<{ type: string }> }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = parsed.content[listsIndex + 1];
    const secondItemText = bulletList?.content?.[1]?.content?.[0]?.content?.[0];
    if (secondItemText) {
      secondItemText.marks = [{ type: "bold" }];
    }
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: JSON.stringify(parsed),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore when bold splits list text into adjacent nodes (TipTap)", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表" },
        { type: "text", text: "第一项", marks: [{ type: "bold" }] },
      ];
    }
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: JSON.stringify(parsed),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore when italic is applied to list text (Meta+I)", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: Array<{ type: string }> }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "italic" }];
    }
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: JSON.stringify(parsed),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore when T19-MIXED marker is inserted in Lists section", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    parsed.content.splice(listsIndex + 1, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T19-MIXED-lists" }],
    });
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: JSON.stringify(parsed),
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore when edits stay in 自由试炼 sandbox (iter 32)", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        content?: Array<{
          type?: string;
          content?: Array<{ type?: string; text?: string; marks?: unknown[] }>;
        }>;
      }>;
    };
    const tryIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "自由试炼",
    );
    const sandboxParagraph = parsed.content[tryIndex + 2];
    if (sandboxParagraph?.type === "paragraph") {
      sandboxParagraph.content = [
        { type: "text", text: "斜体", marks: [{ type: "italic" }] },
      ];
    }
    const pendingDraft = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore when title renames to T32-Drift (iter 32)", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T32-Drift",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: null,
        pendingTitleDraft: "T32-Drift",
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore after autosave when persisted row only adds inline marks", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表第一项", marks: [{ type: "bold" }] },
      ];
    }
    const marked = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", marked, "zh")).toBe(
      false,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: marked,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});
