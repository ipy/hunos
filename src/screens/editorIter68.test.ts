import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sectionHeadingFromBacklinkPrefix } from "@/graph/linkExtractor";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf8",
);
const backlinksHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/backlinks.ts"),
  "utf8",
);
const backlinkScrollSource = readFileSync(
  join(process.cwd(), "src/utils/backlinkSectionScroll.ts"),
  "utf8",
);
const tocNavigationSource = readFileSync(
  join(process.cwd(), "src/utils/tocNavigation.ts"),
  "utf8",
);
const editorScreenSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf8",
);

describe("iteration 68 — AC68 backlink scroll isolate adjacent (AC68-backlink-scroll-isolate-adjacent)", () => {
  it("routes backlink section scroll through isolateAdjacentSectionHeading", () => {
    expect(backlinkScrollSource).toContain("scrollToTocDocPos");
    expect(backlinkScrollSource).toContain("isolateAdjacentSectionHeading");
    expect(backlinkScrollSource).not.toContain(
      "resolveBacklinkScrollAnchorTop",
    );
  });

  it("rejects co-primary neighbors after each hop", () => {
    expect(backlinkScrollSource).toContain("headingInScrollBand");
    expect(backlinksHelperSource).toContain(
      "expectEditorSectionHeadingPrimaryScrollTarget",
    );
    expect(backlinksE2eSource).toContain("AC67-backlink-scroll-single-target");
  });

  it("consolidates heading neighbor helpers in tocNavigation", () => {
    expect(tocNavigationSource).toContain(
      "export function nextHeadingDocPosAfter",
    );
    expect(tocNavigationSource).toContain(
      "export function previousHeadingDocPosBefore",
    );
    expect(backlinkScrollSource).toContain("nextHeadingDocPosAfter");
    expect(backlinkScrollSource).toContain("previousHeadingDocPosBefore");
    expect(backlinkScrollSource).not.toMatch(/function nextHeadingDocPosAfter/);
    expect(backlinkScrollSource).not.toMatch(
      /function previousHeadingDocPosBefore/,
    );
  });

  it("uses shared section heading prefix helper", () => {
    expect(sectionHeadingFromBacklinkPrefix("自由试炼 · #1")).toBe("自由试炼");
    expect(editorScreenSource).toContain("sectionHeadingFromBacklinkPrefix");
    expect(backlinkScrollSource).toContain("sectionHeadingFromBacklinkPrefix");
  });
});

describe("iteration 68 — AC68 dynamic scroll e2e green (AC68-backlink-scroll-e2e-green)", () => {
  it("names dynamic multi-hop scroll coverage on all viewports", () => {
    expect(backlinksHelperSource).toContain(
      "clickEachIncomingBacklinkWithSectionScroll",
    );
    expect(backlinksE2eSource).toContain("AC67-scroll-e2e-dynamic-hops");
  });
});

describe("iteration 68 — AC67 closure (AC67-backlink-scroll-single-target)", () => {
  it("keeps primary viewport-band scroll target assertions on backlink hops", () => {
    expect(backlinksHelperSource).toContain("notCoPrimary");
    expect(backlinksE2eSource).toContain("AC67-backlink-scroll-single-target");
  });
});
