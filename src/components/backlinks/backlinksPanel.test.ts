import { describe, expect, it } from "vitest";
import {
  BACKLINKS_INCOMING_SECTION_TESTID,
  BACKLINKS_OUTGOING_SECTION_TESTID,
  BACKLINKS_PANEL_TESTID,
  BACKLINKS_PANEL_TOGGLE_TESTID,
  assertUniqueBacklinkPanelKeys,
  backlinksItemSnippetTestId,
  backlinksItemTestId,
  backlinksRowKey,
} from "./BacklinksPanel";
import { dedupeBacklinkResults } from "@/graph/graphEngine";

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

  it("derives per-link item testids from link id", () => {
    expect(backlinksItemTestId("link-abc")).toBe("backlinks-item-link-abc");
  });

  it("derives per-link snippet testids from link id (AC59-backlink-snippet-testid)", () => {
    expect(backlinksItemSnippetTestId("link-abc")).toBe(
      "backlinks-snippet-link-abc",
    );
    expect(backlinksItemSnippetTestId("link-abc")).not.toBe(
      backlinksItemTestId("link-abc"),
    );
  });

  it("keeps item testids unique when two rows share the same note id", () => {
    const rowA = {
      linkId: "link-1",
      noteId: "pg-zh",
      noteTitle: "格式试炼场",
      context: "first [[项目文档]]",
      type: "wiki_link" as const,
    };
    const rowB = {
      linkId: "link-2",
      noteId: "pg-zh",
      noteTitle: "格式试炼场",
      context: "second [[项目文档]]",
      type: "wiki_link" as const,
    };
    expect(backlinksItemTestId(rowA.linkId)).not.toBe(
      backlinksItemTestId(rowB.linkId),
    );
    expect(() => assertUniqueBacklinkPanelKeys([rowA, rowB], [])).not.toThrow();
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
    expect(() => assertUniqueBacklinkPanelKeys(rows, [])).not.toThrow();
  });

  it("keeps react keys unique when the same link id appears in incoming and outgoing", () => {
    const row = {
      linkId: "mppmosoy-004-nqniss1y",
      noteId: "pg-zh",
      noteTitle: "格式试炼场",
      context: "[[Welcome]]",
      type: "wiki_link" as const,
    };
    expect(backlinksRowKey("incoming", row, 0)).not.toBe(
      backlinksRowKey("outgoing", row, 0),
    );
    expect(() => assertUniqueBacklinkPanelKeys([row], [row])).not.toThrow();
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
});
