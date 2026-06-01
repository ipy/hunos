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
const linkExtractorSource = readFileSync(
  join(process.cwd(), "src/graph/linkExtractor.ts"),
  "utf8",
);
const backlinkScrollSource = readFileSync(
  join(process.cwd(), "src/utils/backlinkSectionScroll.ts"),
  "utf8",
);

describe("iteration 67 — AC67 scroll single target (AC67-backlink-scroll-single-target)", () => {
  it("asserts primary viewport-band scroll target per hop", () => {
    expect(backlinksHelperSource).toContain(
      "expectEditorSectionHeadingPrimaryScrollTarget",
    );
    expect(backlinksHelperSource).toContain("notCoPrimary");
    expect(backlinksE2eSource).toContain("AC67-backlink-scroll-single-target");
  });

  it("anchors backlink hops with heading-only scroll", () => {
    expect(backlinkScrollSource).toContain("anchorHeadingOnly: true");
  });
});

describe("iteration 67 — AC67 snippet section bound (AC67-backlink-snippet-section-bound)", () => {
  it("extracts section-scoped backlink context at graph sync", () => {
    expect(linkExtractorSource).toContain("extractBacklinkContext");
    expect(backlinksHelperSource).toContain(
      "expectBacklinkSnippetSectionBoundaries",
    );
    expect(backlinksE2eSource).toContain("AC67-backlink-snippet-section-bound");
  });
});

describe("iteration 67 — AC67 dynamic scroll hops (AC67-scroll-e2e-dynamic-hops)", () => {
  it("collects incoming row test ids dynamically on each hop", () => {
    expect(backlinksHelperSource).toContain(
      "collectIncomingBacklinkRowTestIds(page)",
    );
    expect(backlinksHelperSource).not.toContain(
      "for (const hop of BACKLINK_SECTION_SCROLL_HOPS)",
    );
    expect(backlinksE2eSource).toContain("AC67-scroll-e2e-dynamic-hops");
  });
});
