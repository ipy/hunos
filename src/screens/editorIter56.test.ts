import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const wikiLinkE2eSource = readFileSync(
  join(process.cwd(), "e2e/graph/wiki-link.spec.ts"),
  "utf-8",
);
const playgroundHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/playground.ts"),
  "utf-8",
);

describe("iteration 56 — wiki-link E2E bootstrap (e2e-wiki-link-restore-setup)", () => {
  it("opens 格式试炼场 from fresh seed without restore-playground-button", () => {
    expect(wikiLinkE2eSource).toContain("openFormatPlaygroundToc");
    expect(wikiLinkE2eSource).not.toContain("openCleanFormatPlayground");
    expect(wikiLinkE2eSource).toContain("e2e-wiki-link-restore-setup");
    expect(wikiLinkE2eSource).toContain(
      'getByTestId("restore-playground-button")).toHaveCount(0)',
    );
  });
});

describe("iteration 56 — wiki-link hash navigation (AC42)", () => {
  it("asserts location.hash after offscreen clicks without force:true", () => {
    expect(playgroundHelperSource).toContain("expectWikiLinkHashNavigation");
    expect(playgroundHelperSource).toContain("window.location.hash");
    expect(wikiLinkE2eSource).toContain("expectWikiLinkHashNavigation");
    expect(wikiLinkE2eSource).not.toContain("force: true");
    expect(wikiLinkE2eSource).not.toContain("scrollIntoView");
  });
});

describe("iteration 56 — wiki-link unique DOM E2E (AC54)", () => {
  it("clicks duplicate 项目文档 links via data-link-key", () => {
    expect(playgroundHelperSource).toContain("wikiLinkByLinkKey");
    expect(wikiLinkE2eSource).toContain("AC54-wiki-link-unique-dom");
    expect(wikiLinkE2eSource).toContain("data-link-key");
    expect(wikiLinkE2eSource).toContain("wikiLinkByTitle");
  });
});

describe("iteration 56 — info panel done E2E (AC55-info-panel-done)", () => {
  it("covers mobile 完成 control at gate viewport", () => {
    expect(wikiLinkE2eSource).toContain("AC55-info-panel-done");
    expect(wikiLinkE2eSource).toContain("info-panel-done");
    expect(wikiLinkE2eSource).toContain("GATE_VIEWPORT");
    expect(wikiLinkE2eSource).toContain("ProseMirror-focused");
  });
});

describe("iteration 56 — wiki-link spec coverage", () => {
  it("defines six primary gate scenarios in wiki-link.spec.ts", () => {
    const acMatches = wikiLinkE2eSource.match(
      /test\("(e2e-wiki-link-restore-setup|AC42|AC54|AC55|seed wiki-link)/g,
    );
    expect(acMatches?.length).toBe(6);
    expect(wikiLinkE2eSource).toContain(
      "AC42-wiki-link-offscreen-welcome",
    );
  });
});
