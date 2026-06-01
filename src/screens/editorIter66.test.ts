import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf8",
);
const backlinksHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/backlinks.ts"),
  "utf8",
);
const backlinksPanelSource = readFileSync(
  join(process.cwd(), "src/components/backlinks/BacklinksPanel.tsx"),
  "utf8",
);

describe("iteration 66 — AC65 section scroll e2e (AC65-backlink-section-scroll-e2e)", () => {
  it("names AC65 Playwright scenario on desktop and 606×844", () => {
    expect(backlinksE2eSource).toContain("AC65-backlink-section-scroll-e2e");
    expect(backlinksE2eSource).toContain(
      "clickEachIncomingBacklinkWithSectionScroll",
    );
    expect(backlinksE2eSource).toContain("mobile 606×844");
    expect(backlinksE2eSource).toContain("desktop");
    expect(backlinksHelperSource).toContain(
      "expectEditorSectionHeadingVisible",
    );
    expect(backlinksHelperSource).toContain("标签与链接");
    expect(backlinksHelperSource).toContain("自由试炼");
  });
});

describe("iteration 66 — AC64 section scroll regression (AC64-backlink-section-scroll)", () => {
  it("keeps AC64 runtime gates in Playwright alongside AC65 scroll proof", () => {
    for (const ac of [
      "AC64-backlinks-canonical-count-runtime",
      "AC64-backlink-prefix-unique-runtime",
      "AC64-prefix-visual-separator",
    ]) {
      expect(backlinksE2eSource).toContain(ac);
    }
    expect(backlinksE2eSource).toContain("AC65-backlink-section-scroll-e2e");
  });
});

describe("iteration 66 — e2e viewport isolation (AC66-e2e-viewport-isolation)", () => {
  it("does not share describe-scoped formatPlaygroundNoteId across viewport projects", () => {
    expect(backlinksE2eSource).not.toMatch(
      /let\s+formatPlaygroundNoteId\s*:\s*string/,
    );
    expect(backlinksE2eSource).toContain("resolveFormatPlaygroundNoteId");
    expect(backlinksHelperSource).toContain("resolveFormatPlaygroundNoteId");
  });
});

describe("iteration 66 — backlink row a11y (AC66-backlink-row-a11y)", () => {
  it("exposes › between source title and section in row aria-label", () => {
    expect(backlinksPanelSource).toContain("backlinkRowAccessibleLabel");
    expect(backlinksPanelSource).toContain("aria-label={rowAriaLabel}");
    expect(backlinksPanelSource).toContain('role="button"');
  });
});
