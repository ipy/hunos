import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf8",
);
const editorScreenSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf8",
);

describe("iteration 65 — AC64 e2e runtime gates (AC65-backlinks-ac64-e2e)", () => {
  it("names AC64 primary scenarios explicitly on desktop and 606×844", () => {
    for (const ac of [
      "AC64-backlinks-canonical-count-runtime",
      "AC64-backlink-prefix-unique-runtime",
      "AC64-prefix-visual-separator",
    ]) {
      expect(backlinksE2eSource).toContain(ac);
    }
    expect(backlinksE2eSource).toContain("mobile 606×844");
    expect(backlinksE2eSource).toContain("desktop");
    expect(backlinksE2eSource).toContain("collectIncomingBacklinkPrefixTexts");
    expect(backlinksE2eSource).toContain("incomingBacklinkTargetNoteId");
  });
});

describe("iteration 65 — backlink section scroll retry", () => {
  it("retries section scroll while editor content hydrates", () => {
    expect(editorScreenSource).toContain("scheduleBacklinkSectionScroll");
    expect(editorScreenSource).toContain("noteContentForEditor");
    expect(editorScreenSource).toContain("restoreEditorSyncTick");
    expect(editorScreenSource).not.toMatch(
      /pendingBacklinkSectionRef[\s\S]{0,400}requestAnimationFrame\(\(\) => \{/,
    );
  });
});
