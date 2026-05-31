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

import { graphEngine } from "./graphEngine";

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
): Link {
  const link: Link = {
    id,
    sourceNoteId,
    targetNoteId,
    type: "wiki_link",
    context,
    position: 0,
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

describe("graphEngine backlink keys", () => {
  beforeEach(() => {
    notesById.clear();
    linksByTarget.clear();
    linksBySource.clear();
  });

  it("returns unique linkId per wiki-link even when target note repeats", async () => {
    seedNote("target", "Welcome");
    seedNote("source", "格式试炼场");
    seedWikiLink("link-1", "source", "target", "first [[Welcome]]");
    seedWikiLink("link-2", "source", "target", "second [[Welcome]]");

    const incoming = await graphEngine.getBacklinks("target");
    expect(incoming).toHaveLength(2);
    expect(incoming.map((row) => row.linkId)).toEqual(["link-1", "link-2"]);
    expect(new Set(incoming.map((row) => row.linkId)).size).toBe(2);
    expect(incoming.every((row) => row.noteId === "source")).toBe(true);
  });

  it("returns unique linkId per outgoing wiki-link to the same target", async () => {
    seedNote("target", "Welcome");
    seedNote("source", "格式试炼场");
    seedWikiLink("out-1", "source", "target", "[[Welcome]] one");
    seedWikiLink("out-2", "source", "target", "[[Welcome]] two");

    const outgoing = await graphEngine.getOutgoingLinks("source");
    expect(outgoing).toHaveLength(2);
    expect(new Set(outgoing.map((row) => row.linkId)).size).toBe(2);
    expect(outgoing.every((row) => row.noteId === "target")).toBe(true);
  });
});
