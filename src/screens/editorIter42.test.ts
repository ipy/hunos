import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  classifyPlaygroundDrift,
  shouldShowPlaygroundRestoreButton,
} from "@/storage/formatPlaygroundNote";
import { filterNotesByTitleFirstSearch } from "@/storage/noteSearchRank";
import {
  EDITOR_NOTE_SEARCH_INPUT_TESTID,
  EDITOR_NOTE_SEARCH_TESTID,
} from "@/components/editor/EditorNoteSearch";

const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const focusShortcutsSource = readFileSync(
  join(process.cwd(), "src/components/editor/FocusModeShortcuts.ts"),
  "utf-8",
);
const e2eBridgeSource = readFileSync(
  join(process.cwd(), "src/testing/hunos-e2e-bridge.ts"),
  "utf-8",
);
const appSource = readFileSync(
  join(process.cwd(), "src/app/App.tsx"),
  "utf-8",
);
const noteSearchSource = readFileSync(
  join(process.cwd(), "src/components/editor/EditorNoteSearch.tsx"),
  "utf-8",
);

describe("iteration 42 — offscreen wiki-link activation", () => {
  it("resolves wiki-link from composed event path for 0×0 decoration targets", () => {
    expect(wikiLinkSource).toContain("findWikiLinkContentInEventPath");
    expect(wikiLinkSource).toContain("event.composedPath()");
    expect(wikiLinkSource).toContain("target.closest(\".wiki-link-content\")");
    expect(wikiLinkSource).toContain(
      'addEventListener("click", onClickCapture, true)',
    );
    expect(wikiLinkSource).toContain('nodeName: "a"');
  });

  it("supports programmatic activation by title without scroll", () => {
    expect(wikiLinkSource).toContain("activateWikiLinkByTitle");
    expect(e2eBridgeSource).toContain("activateWikiLink:");
    expect(e2eBridgeSource).toContain("registerWikiLinkActivator");
    expect(appSource).toContain("import.meta.env.DEV");
    expect(appSource).toContain("mountHunosE2eBridge");
  });
});

describe("iteration 42 — search while editing", () => {
  it("mounts editor note search bar with stable testids", () => {
    expect(EDITOR_NOTE_SEARCH_TESTID).toBe("editor-note-search");
    expect(EDITOR_NOTE_SEARCH_INPUT_TESTID).toBe("editor-note-search-input");
    expect(editorSource).toContain("EditorNoteSearch");
    expect(editorSource).toContain('data-testid="editor-note-search-toggle"');
  });

  it("opens editor note search from noteSearchOpen signal", () => {
    expect(editorSource).toContain("noteSearchOpen");
    expect(editorSource).toContain("setNoteSearchVisible(true)");
    expect(noteSearchSource).toContain("performSearch");
  });

  it("does not steal Mod-Shift-f from note search", () => {
    expect(focusShortcutsSource).not.toContain("Mod-Shift-f");
  });

  it("ranks 欢迎使用 Hunos above playground body wiki-link for 欢迎", () => {
    const results = filterNotesByTitleFirstSearch(
      [
        {
          title: "格式试炼场",
          contentPlain: "链接 [[欢迎使用 Hunos]]",
        },
        { title: "欢迎使用 Hunos", contentPlain: "欢迎使用 Hunos 简介" },
      ],
      "欢迎",
    );
    expect(results.map((n) => n.title)).toEqual(["欢迎使用 Hunos"]);
  });
});

describe("iteration 42 — body drift restore chip regression (AC41-body-drift-chip)", () => {
  const seedContent = JSON.stringify(buildPlaygroundContent("zh"));

  it("shows restore when foreign heading BACKTEST42 is inserted without title change", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        attrs?: { level: number };
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    parsed.content.splice(5, 0, {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "BACKTEST42" }],
    });
    const pendingDraft = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        liveContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe("structural");
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
});
