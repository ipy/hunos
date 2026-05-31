import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Link } from "@/types/graph";
import type { Note } from "@/types/note";

const notesById = new Map<string, Note>();
const linksByTarget = new Map<string, Link[]>();
const linksBySource = new Map<string, Link[]>();

vi.mock("@/storage/noteStorage", () => ({
  noteStorage: {
    get: async (id: string) => notesById.get(id),
  },
}));

vi.mock("@/storage/linkStorage", () => ({
  linkStorage: {
    getIncoming: async (noteId: string) => linksByTarget.get(noteId) ?? [],
    getOutgoing: async (noteId: string) => linksBySource.get(noteId) ?? [],
  },
}));

import {
  dedupeBacklinkResults,
  graphEngine,
  stableBacklinkLinkId,
} from "./graphEngine";

function seedNote(id: string, title: string): Note {
  const note: Note = {
    id,
    title,
    content: "",
    contentPlain: "",
    isPinned: false,
    status: "active",
    trashedAt: null,
    createdAt: 1,
    modifiedAt: 1,
    wordCount: 0,
  };
  notesById.set(id, note);
  return note;
}

function seedWikiLink(
  id: string,
  sourceNoteId: string,
  targetNoteId: string,
  context: string,
  position: number = 0,
): Link {
  const link: Link = {
    id,
    sourceNoteId,
    targetNoteId,
    type: "wiki_link",
    context,
    position,
    createdAt: 1,
  };
  const incoming = linksByTarget.get(targetNoteId) ?? [];
  incoming.push(link);
  linksByTarget.set(targetNoteId, incoming);
  const outgoing = linksBySource.get(sourceNoteId) ?? [];
  outgoing.push(link);
  linksBySource.set(sourceNoteId, outgoing);
  return link;
}

describe("stableBacklinkLinkId", () => {
  it("derives identity from source note and wiki-link position", () => {
    expect(stableBacklinkLinkId("pg-zh", 142)).toBe("pg-zh-pos-142");
  });
});

describe("dedupeBacklinkResults", () => {
  it("drops rows that share the same link id", () => {
    const row = {
      linkId: stableBacklinkLinkId("source", 10),
      noteId: "source",
      noteTitle: "格式试炼场",
      context: "ctx",
      type: "wiki_link" as const,
    };
    expect(dedupeBacklinkResults([row, row])).toEqual([row]);
  });
});

describe("graphEngine backlink keys", () => {
  beforeEach(() => {
    notesById.clear();
    linksByTarget.clear();
    linksBySource.clear();
  });

  it("returns unique stable linkId per wiki-link even when target note repeats", async () => {
    seedNote("target", "Welcome");
    seedNote("source", "格式试炼场");
    seedWikiLink("link-1", "source", "target", "first [[Welcome]]", 10);
    seedWikiLink("link-2", "source", "target", "second [[Welcome]]", 80);

    const incoming = await graphEngine.getBacklinks("target");
    expect(incoming).toHaveLength(2);
    expect(incoming.map((row) => row.linkId)).toEqual([
      stableBacklinkLinkId("source", 10),
      stableBacklinkLinkId("source", 80),
    ]);
    expect(new Set(incoming.map((row) => row.linkId)).size).toBe(2);
    expect(incoming.every((row) => row.noteId === "source")).toBe(true);
  });

  it("returns unique stable linkId per outgoing wiki-link to the same target", async () => {
    seedNote("target", "Welcome");
    seedNote("source", "格式试炼场");
    seedWikiLink("out-1", "source", "target", "[[Welcome]] one", 5);
    seedWikiLink("out-2", "source", "target", "[[Welcome]] two", 55);

    const outgoing = await graphEngine.getOutgoingLinks("source");
    expect(outgoing).toHaveLength(2);
    expect(new Set(outgoing.map((row) => row.linkId)).size).toBe(2);
    expect(outgoing.every((row) => row.noteId === "target")).toBe(true);
  });

  it("keeps stable linkId when db ids change after resync", async () => {
    seedNote("target", "项目文档");
    seedNote("source", "格式试炼场");
    seedWikiLink("session-a-1", "source", "target", "first [[项目文档]]", 100);
    seedWikiLink("session-a-2", "source", "target", "second [[项目文档]]", 200);

    const beforeResync = await graphEngine.getBacklinks("target");
    expect(beforeResync.map((row) => row.linkId)).toEqual([
      stableBacklinkLinkId("source", 100),
      stableBacklinkLinkId("source", 200),
    ]);

    linksByTarget.clear();
    linksBySource.clear();
    seedWikiLink("session-b-1", "source", "target", "first [[项目文档]]", 100);
    seedWikiLink("session-b-2", "source", "target", "second [[项目文档]]", 200);

    const afterResync = await graphEngine.getBacklinks("target");
    expect(afterResync.map((row) => row.linkId)).toEqual(
      beforeResync.map((row) => row.linkId),
    );
  });

  it("dedupes duplicate stable link ids defensively in incoming results", async () => {
    seedNote("target", "Welcome");
    seedNote("source", "格式试炼场");
    const link = seedWikiLink(
      "dup-link",
      "source",
      "target",
      "[[Welcome]]",
      42,
    );
    linksByTarget.set("target", [link, link]);

    const incoming = await graphEngine.getBacklinks("target");
    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.linkId).toBe(stableBacklinkLinkId("source", 42));
  });

  it("enriches context with section heading when source note has structured content", async () => {
    seedNote("target", "项目文档");
    const sourceContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "标签与链接" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "详见 " },
            {
              type: "text",
              text: "项目文档",
              marks: [{ type: "wikiLink", attrs: { title: "项目文档" } }],
            },
          ],
        },
      ],
    });
    const source: Note = {
      id: "source",
      title: "格式试炼场",
      content: sourceContent,
      contentPlain: "标签与链接\n详见 [[项目文档]]\n",
      isPinned: false,
      status: "active",
      trashedAt: null,
      createdAt: 1,
      modifiedAt: 1,
      wordCount: 0,
    };
    notesById.set("source", source);
    seedWikiLink(
      "link-1",
      "source",
      "target",
      "标签与链接 · ... 详见 [[项目文档]] ...",
      10,
    );

    const incoming = await graphEngine.getBacklinks("target");
    expect(incoming[0]?.context).toMatch(/^标签与链接 ·/);
  });
});
