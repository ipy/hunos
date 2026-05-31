import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BACKLINKS_INCOMING_SECTION_TESTID,
  BACKLINKS_OUTGOING_SECTION_TESTID,
  BACKLINKS_PANEL_TESTID,
  BACKLINKS_PANEL_TOGGLE_TESTID,
  assertUniqueBacklinkRowKeys,
  backlinksItemTestId,
  backlinksRowKey,
} from "./BacklinksPanel";
import { dedupeBacklinkResults } from "@/graph/graphEngine";

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

  it("keeps row keys unique after render-time dedupe of duplicate link ids", () => {
    const duplicate = {
      linkId: "mppmosoy-004-nqniss1y",
      noteId: "pg-zh",
      noteTitle: "格式试炼场",
      context: "[[Welcome]]",
      type: "wiki_link" as const,
    };
    const rows = dedupeBacklinkResults([duplicate, duplicate]);
    expect(rows).toHaveLength(1);
    expect(() => assertUniqueBacklinkRowKeys("incoming", rows)).not.toThrow();
  });

  it("derives stable row keys from section, link id, note id, and list index", () => {
    expect(
      backlinksRowKey(
        "incoming",
        {
          linkId: "dup",
          noteId: "pg-zh",
          noteTitle: "格式试炼场",
          context: "ctx",
          type: "wiki_link",
        },
        1,
      ),
    ).toBe("incoming:dup:pg-zh:1");
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
    expect(panelSource).toContain("key={backlinksRowKey(section, bl, index)}");
    expect(panelSource).toContain("let cancelled = false");
    expect(panelSource).toContain("noteLinkRevision");
    expect(panelSource).toContain("dedupeBacklinkResults");
    expect(panelSource).toContain(
      "data-testid={backlinksItemTestId(bl.noteId)}",
    );
    expect(panelSource).toContain("data-note-title={bl.noteTitle}");
  });
});
