import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WIKI_LINK_SUGGESTION_MENU_TESTID,
  wikiLinkSuggestionItemTestId,
} from "./WikiLinkSuggestionMenu";

const menuSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkSuggestionMenu.tsx"),
  "utf-8",
);

describe("WikiLinkSuggestionMenu automation testids", () => {
  it("exports stable menu and item testids", () => {
    expect(WIKI_LINK_SUGGESTION_MENU_TESTID).toBe("wiki-link-suggestion-menu");
    expect(wikiLinkSuggestionItemTestId(0)).toBe("wiki-link-suggestion-item-0");
    expect(wikiLinkSuggestionItemTestId(2)).toBe("wiki-link-suggestion-item-2");
  });

  it("wires testids on menu root and suggestion rows", () => {
    expect(menuSource).toContain(
      `data-testid={WIKI_LINK_SUGGESTION_MENU_TESTID}`,
    );
    expect(menuSource).toContain(
      "data-testid={wikiLinkSuggestionItemTestId(index)}",
    );
  });
});
