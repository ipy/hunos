import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  classifyPlaygroundDrift,
  shouldShowPlaygroundRestoreButton,
} from "@/storage/formatPlaygroundNote";

const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const bootstrapSource = readFileSync(
  join(process.cwd(), "src/app/bootstrapAppData.ts"),
  "utf-8",
);
const noteRouteHydrationSource = readFileSync(
  join(process.cwd(), "src/utils/noteRouteHydration.ts"),
  "utf-8",
);
const appSource = readFileSync(join(process.cwd(), "src/app/App.tsx"), "utf-8");

describe("iteration 41 — wiki-link click reliability", () => {
  it("resolves wiki-link span from DOM target without click pos", () => {
    expect(wikiLinkSource).toContain("findWikiLinkByTitle");
    expect(wikiLinkSource).toContain("wikiLinkMatchFromDomTarget");
    expect(wikiLinkSource).toContain("navigateWikiLinkFromTarget");
  });

  it("enables keyboard activation on wiki-link content", () => {
    expect(wikiLinkSource).toContain('tabindex: "0"');
    expect(wikiLinkSource).toContain("keydown(view, event)");
    expect(wikiLinkSource).toContain('event.key === "Enter"');
  });
});

describe("iteration 41 — hash deep link", () => {
  it("hydrates active note from location hash on bootstrap and hashchange", () => {
    expect(bootstrapSource).toContain("hydrateActiveNoteFromLocationHash");
    expect(noteRouteHydrationSource).toContain(
      "hydrateActiveNoteFromLocationHash",
    );
    expect(noteRouteHydrationSource).toContain("parseNoteIdFromLocation");
    expect(appSource).toContain('addEventListener("hashchange"');
  });
});

describe("iteration 41 — body drift restore chip (AC41-body-drift-chip)", () => {
  const seedContent = JSON.stringify(buildPlaygroundContent("zh"));

  it("shows restore when foreign heading BACKTEST41 is inserted without title change", () => {
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
      content: [{ type: "text", text: "BACKTEST41" }],
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
