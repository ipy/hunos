import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BACKLINKS_INCOMING_SECTION_TESTID,
  BACKLINKS_OUTGOING_SECTION_TESTID,
  BACKLINKS_PANEL_TESTID,
  BACKLINKS_PANEL_TOGGLE_TESTID,
  backlinksItemTestId,
} from "./BacklinksPanel";

const panelSource = readFileSync(
  join(process.cwd(), "src/components/backlinks/BacklinksPanel.tsx"),
  "utf-8",
);

describe("BacklinksPanel automation testids", () => {
  it("exports stable panel and section testids", () => {
    expect(BACKLINKS_PANEL_TESTID).toBe("backlinks-panel");
    expect(BACKLINKS_PANEL_TOGGLE_TESTID).toBe("backlinks-panel-toggle");
    expect(BACKLINKS_OUTGOING_SECTION_TESTID).toBe(
      "backlinks-outgoing-section",
    );
    expect(BACKLINKS_INCOMING_SECTION_TESTID).toBe(
      "backlinks-incoming-section",
    );
  });

  it("derives per-note item testids from note id", () => {
    expect(backlinksItemTestId("pg-zh")).toBe("backlinks-item-pg-zh");
  });

  it("wires testids on panel root, toggle, sections, and items", () => {
    expect(panelSource).toContain(`data-testid={BACKLINKS_PANEL_TESTID}`);
    expect(panelSource).toContain(
      `data-testid={BACKLINKS_PANEL_TOGGLE_TESTID}`,
    );
    expect(panelSource).toContain(
      `data-testid={BACKLINKS_OUTGOING_SECTION_TESTID}`,
    );
    expect(panelSource).toContain(
      `data-testid={BACKLINKS_INCOMING_SECTION_TESTID}`,
    );
    expect(panelSource).toContain("key={bl.linkId}");
    expect(panelSource).toContain(
      "data-testid={backlinksItemTestId(bl.noteId)}",
    );
    expect(panelSource).toContain("data-note-title={bl.noteTitle}");
  });
});
