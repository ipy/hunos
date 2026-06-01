import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Link } from "@/types/graph";
import type { Note } from "@/types/note";
import {
  backlinkPrefixFromContext,
  disambiguateBacklinkContexts,
} from "@/graph/linkExtractor";
import { graphEngine, stableBacklinkLinkId } from "@/graph/graphEngine";
import { splitBacklinkSnippetParts } from "@/components/backlinks/formatBacklinkSnippet";
import { getBootstrapPlaygroundSeedContent } from "@/storage/bootstrapTagSeeds";
import { getProjectDocsSeed } from "@/storage/welcomeNotes";

const notesById = new Map<string, Note>();
const linksByTarget = new Map<string, Link[]>();

const bootstrapHygieneSource = readFileSync(
  join(process.cwd(), "src/storage/bootstrapGraphHygiene.ts"),
  "utf8",
);

vi.mock("@/storage/noteStorage", () => ({
  noteStorage: {
    get: async (id: string) => notesById.get(id),
  },
}));

vi.mock("@/storage/linkStorage", () => ({
  linkStorage: {
    getIncoming: async (noteId: string) => linksByTarget.get(noteId) ?? [],
  },
}));

function seedNote(note: Note): void {
  notesById.set(note.id, note);
}

function seedIncomingLink(link: Link): void {
  const incoming = linksByTarget.get(link.targetNoteId) ?? [];
  incoming.push(link);
  linksByTarget.set(link.targetNoteId, incoming);
}

describe("iteration 64 — canonical project docs count (AC64-backlinks-canonical-count-runtime)", () => {
  beforeEach(() => {
    notesById.clear();
    linksByTarget.clear();
  });

  it("returns exactly two incoming rows from the playground source id", async () => {
    const playgroundContent = getBootstrapPlaygroundSeedContent("zh");
    const projectDocs = getProjectDocsSeed("zh");
    seedNote({
      id: "docs-zh",
      title: projectDocs.title,
      content: JSON.stringify(projectDocs.content),
      contentPlain: projectDocs.contentPlain,
      status: "active",
      isPinned: false,
      createdAt: 1,
      modifiedAt: 1,
      trashedAt: null,
      wordCount: 0,
    });
    seedNote({
      id: "pg-zh",
      title: "格式试炼场",
      content: playgroundContent,
      contentPlain: "",
      status: "active",
      isPinned: true,
      createdAt: 2,
      modifiedAt: 2,
      trashedAt: null,
      wordCount: 0,
    });

    const wikiLinkPositions = [100, 200];
    seedIncomingLink({
      id: "link-a",
      sourceNoteId: "pg-zh",
      targetNoteId: "docs-zh",
      type: "wiki_link",
      context: "... first [[项目文档]] ...",
      position: wikiLinkPositions[0]!,
      createdAt: 1,
    });
    seedIncomingLink({
      id: "link-b",
      sourceNoteId: "pg-zh",
      targetNoteId: "docs-zh",
      type: "wiki_link",
      context: "... second [[项目文档]] #42 ...",
      position: wikiLinkPositions[1]!,
      createdAt: 1,
    });
    seedIncomingLink({
      id: "link-stray",
      sourceNoteId: "docs-old",
      targetNoteId: "docs-zh",
      type: "wiki_link",
      context: "stray duplicate",
      position: 300,
      createdAt: 1,
    });

    const incoming = await graphEngine.getBacklinks("docs-zh");
    expect(incoming).toHaveLength(2);
    expect(new Set(incoming.map((row) => row.noteId))).toEqual(
      new Set(["pg-zh"]),
    );
    expect(incoming.map((row) => row.linkId)).toEqual([
      stableBacklinkLinkId("pg-zh", wikiLinkPositions[0]!),
      stableBacklinkLinkId("pg-zh", wikiLinkPositions[1]!),
    ]);
  });

  it("bootstrap hygiene closes prune with inactive-source cleanup", () => {
    expect(bootstrapHygieneSource).toContain(
      "pruneInactiveSourceIncomingWikiLinks",
    );
    expect(bootstrapHygieneSource).toContain("playgroundId");
    expect(bootstrapHygieneSource).not.toMatch(
      /pruneStrayProjectDocsIncomingLinks[\s\S]*pickFormatPlaygroundNote/,
    );
  });
});

describe("iteration 64 — prefix uniqueness (AC64-backlink-prefix-unique-runtime)", () => {
  beforeEach(() => {
    notesById.clear();
    linksByTarget.clear();
  });

  it("derives pairwise distinct prefixes for playground duplicate-source rows", async () => {
    const projectDocs = getProjectDocsSeed("zh");
    const playgroundContentStr = getBootstrapPlaygroundSeedContent("zh");
    seedNote({
      id: "docs-zh",
      title: projectDocs.title,
      content: JSON.stringify(projectDocs.content),
      contentPlain: projectDocs.contentPlain,
      status: "active",
      isPinned: false,
      createdAt: 1,
      modifiedAt: 1,
      trashedAt: null,
      wordCount: 0,
    });
    seedNote({
      id: "pg-zh",
      title: "格式试炼场",
      content: playgroundContentStr,
      contentPlain: "",
      status: "active",
      isPinned: true,
      createdAt: 2,
      modifiedAt: 2,
      trashedAt: null,
      wordCount: 0,
    });

    const {
      backlinkContextWithSection,
      extractFromPlainText,
      extractPlainTextForGraphSync,
      graphHeadingOffsetsFromJson,
      sectionForWikiLinkAtOffset,
    } = await import("@/graph/linkExtractor");
    const parsed = JSON.parse(playgroundContentStr);
    const plain = extractPlainTextForGraphSync(parsed);
    const headings = graphHeadingOffsetsFromJson(parsed);
    const projectDocLinks = extractFromPlainText(plain).wikiLinks.filter(
      (link) => link.title === "项目文档",
    );
    expect(projectDocLinks).toHaveLength(2);

    for (const link of projectDocLinks) {
      seedIncomingLink({
        id: `link-${link.position}`,
        sourceNoteId: "pg-zh",
        targetNoteId: "docs-zh",
        type: "wiki_link",
        context: backlinkContextWithSection(
          link.context,
          sectionForWikiLinkAtOffset(plain, link.position, headings),
        ),
        position: link.position,
        createdAt: 1,
      });
    }

    const incoming = await graphEngine.getBacklinks("docs-zh");
    const prefixes = incoming.map((row) =>
      backlinkPrefixFromContext(row.context),
    );
    expect(incoming).toHaveLength(2);
    expect(new Set(prefixes).size).toBe(2);
    expect(prefixes.join(" ")).toMatch(/标签与链接/);
    expect(prefixes.join(" ")).toMatch(/自由试炼/);
  });

  it("disambiguates colliding section prefixes into distinct prefix strings", () => {
    const contexts = disambiguateBacklinkContexts([
      {
        context: "标签与链接 · ... first ...",
        noteTitle: "格式试炼场",
      },
      {
        context: "自由试炼 · ... second ...",
        noteTitle: "格式试炼场",
      },
    ]);
    const prefixes = contexts.map((context) =>
      backlinkPrefixFromContext(context),
    );
    expect(new Set(prefixes).size).toBe(2);
    expect(prefixes.join(" ")).toMatch(/标签与链接/);
    expect(prefixes.join(" ")).toMatch(/自由试炼/);
  });
});

describe("iteration 64 — prefix visual separator (AC64-prefix-visual-separator)", () => {
  it("splits section prefix from snippet body for rendering", () => {
    const parts = splitBacklinkSnippetParts(
      "标签与链接 · ... 详见 [[项目文档]] ...",
    );
    expect(parts.prefix).toBe("标签与链接");
    expect(parts.body).toMatch(/项目文档/);
    expect(parts.body).not.toMatch(/^标签与链接/);
  });
});
