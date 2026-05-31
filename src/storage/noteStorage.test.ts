import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";
import type { Note } from "@/types/note";

const dbUpdate = vi.fn();
const notesById = new Map<string, Note>();

function legacyImageContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          src: "data:image/png;base64,legacy",
          dataBlockImageFloor: true,
        },
      },
    ],
  });
}

function parseImageAttrs(content: string) {
  const parsed = JSON.parse(content) as {
    content?: Array<{ attrs?: Record<string, unknown> }>;
  };
  return parsed.content?.[0]?.attrs;
}

vi.mock("./database", () => ({
  db: {
    notes: {
      add: async (note: Note) => {
        notesById.set(note.id, { ...note });
      },
      get: async (id: string) => notesById.get(id),
      update: async (id: string, updates: Partial<Note>) => {
        dbUpdate(id, updates);
        const existing = notesById.get(id);
        if (existing) {
          notesById.set(id, { ...existing, ...updates });
        }
      },
      where: () => ({
        equals: (status: string) => ({
          toArray: async () =>
            [...notesById.values()].filter((n) => n.status === status),
          count: async () =>
            [...notesById.values()].filter((n) => n.status === status).length,
        }),
      }),
      filter: (predicate?: (note: Note) => boolean) => ({
        toArray: async () => {
          const all = [...notesById.values()];
          return predicate ? all.filter(predicate) : all;
        },
      }),
      bulkGet: async () => [] as (Note | undefined)[],
      bulkDelete: async () => undefined,
      delete: async () => undefined,
    },
  },
}));

import { noteStorage } from "./noteStorage";

describe("noteStorage.create", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
  });

  it("sanitizes legacy block-image floor attrs on create", async () => {
    const created = await noteStorage.create({ content: legacyImageContent() });

    expect(dbUpdate).not.toHaveBeenCalled();
    const stored = notesById.get(created.id);
    const attrs = parseImageAttrs(stored!.content);
    expect(attrs?.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(attrs).not.toHaveProperty("dataBlockImageFloor");

    expect(parseImageAttrs(created.content)?.height).toBe(
      MIN_BLOCK_IMAGE_HEIGHT,
    );
    expect(created.content).not.toContain("dataBlockImageFloor");
  });

  it("derives contentPlain from content when contentPlain is omitted", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });

    const created = await noteStorage.create({ content });

    expect(created.contentPlain).toBe("Hello world\n");
    expect(notesById.get(created.id)?.contentPlain).toBe("Hello world\n");
  });

  it("sets contentPlain to empty string for empty doc on create", async () => {
    const content = JSON.stringify({ type: "doc", content: [] });

    const created = await noteStorage.create({ content });

    expect(created.contentPlain).toBe("");
    expect(notesById.get(created.id)?.contentPlain).toBe("");
  });

  it("leaves contentPlain empty when create has no partial", async () => {
    const created = await noteStorage.create();

    expect(created.contentPlain).toBe("");
    expect(notesById.get(created.id)?.contentPlain).toBe("");
  });

  it("leaves contentPlain empty when create only sets title", async () => {
    const created = await noteStorage.create({ title: "x" });

    expect(created.contentPlain).toBe("");
    expect(notesById.get(created.id)?.contentPlain).toBe("");
  });
});

describe("noteStorage.get", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
  });

  it("returns sanitized content and lazy-persists legacy rows", async () => {
    const note = await noteStorage.create({ title: "Legacy" });
    notesById.set(note.id, {
      ...note,
      content: legacyImageContent(),
    });

    const loaded = await noteStorage.get(note.id);

    expect(loaded?.content).not.toContain("dataBlockImageFloor");
    expect(parseImageAttrs(loaded!.content)?.height).toBe(
      MIN_BLOCK_IMAGE_HEIGHT,
    );
    expect(dbUpdate).toHaveBeenCalledOnce();
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content: loaded!.content,
    });
    expect(notesById.get(note.id)?.content).toBe(loaded!.content);
  });

  it("backfills missing contentPlain from content and persists", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });
    const note = await noteStorage.create({ title: "No plain", content });
    notesById.set(note.id, {
      ...note,
      contentPlain: undefined as unknown as string,
    });

    const loaded = await noteStorage.get(note.id);

    expect(loaded?.contentPlain).toBe("Hello world\n");
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      contentPlain: "Hello world\n",
    });
    expect(notesById.get(note.id)?.contentPlain).toBe("Hello world\n");
  });

  it("backfills empty string contentPlain for empty doc", async () => {
    const note = await noteStorage.create({ title: "Empty" });
    notesById.set(note.id, {
      ...note,
      contentPlain: undefined as unknown as string,
    });

    const loaded = await noteStorage.get(note.id);

    expect(loaded?.contentPlain).toBe("");
    expect(dbUpdate).toHaveBeenCalledWith(note.id, { contentPlain: "" });
  });

  it("refreshes stale contentPlain when legacy content is sanitized on read", async () => {
    const note = await noteStorage.create({ title: "Legacy stale plain" });
    notesById.set(note.id, {
      ...note,
      content: legacyImageContent(),
      contentPlain: "Old text",
    });

    const loaded = await noteStorage.get(note.id);

    expect(loaded?.contentPlain).toBe("");
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content: loaded!.content,
      contentPlain: "",
    });
  });
});

describe("noteStorage.list", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
  });

  it("returns sanitized notes and lazy-persists each legacy row", async () => {
    const clean = await noteStorage.create({ title: "Clean" });
    const legacy = await noteStorage.create({ title: "Legacy" });
    notesById.set(legacy.id, {
      ...legacy,
      content: legacyImageContent(),
    });

    const listed = await noteStorage.list({ status: "active" });

    const legacyListed = listed.find((n) => n.id === legacy.id);
    expect(legacyListed?.content).not.toContain("dataBlockImageFloor");
    expect(parseImageAttrs(legacyListed!.content)?.height).toBe(
      MIN_BLOCK_IMAGE_HEIGHT,
    );
    expect(dbUpdate).toHaveBeenCalledOnce();
    expect(dbUpdate).toHaveBeenCalledWith(legacy.id, {
      content: legacyListed!.content,
    });

    const cleanListed = listed.find((n) => n.id === clean.id);
    expect(cleanListed?.content).toBe("");
  });

  it("backfills missing contentPlain for each listed note", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Snippet text" }],
        },
      ],
    });
    const note = await noteStorage.create({ title: "Listed", content });
    notesById.set(note.id, {
      ...note,
      contentPlain: undefined as unknown as string,
    });

    const listed = await noteStorage.list({ status: "active" });
    const found = listed.find((n) => n.id === note.id);

    expect(found?.contentPlain).toBe("Snippet text\n");
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      contentPlain: "Snippet text\n",
    });
  });
});

describe("noteStorage.update", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
  });

  it("sanitizes legacy block-image floor attrs on content writes", async () => {
    const raw = legacyImageContent();
    const result = await noteStorage.update("note-b", { content: raw });

    expect(dbUpdate).toHaveBeenCalledOnce();
    const [, payload] = dbUpdate.mock.calls[0] as [
      string,
      { content: string; modifiedAt: number },
    ];
    expect(parseImageAttrs(payload.content)?.height).toBe(
      MIN_BLOCK_IMAGE_HEIGHT,
    );
    expect(parseImageAttrs(payload.content)).not.toHaveProperty(
      "dataBlockImageFloor",
    );
    expect(result?.content).toBe(payload.content);
  });

  it("does not rewrite content when attrs are already clean", async () => {
    const clean = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "data:image/png;base64,legacy", height: 200 },
        },
      ],
    });

    await noteStorage.update("note-b", { content: clean });

    const [, payload] = dbUpdate.mock.calls[0] as [string, { content: string }];
    expect(payload.content).toBe(clean);
  });

  it("passes through non-content updates unchanged", async () => {
    await noteStorage.update("note-a", { title: "New Title" });

    expect(dbUpdate).toHaveBeenCalledWith("note-a", {
      title: "New Title",
      modifiedAt: expect.any(Number),
    });
  });

  it("derives contentPlain from content when contentPlain is omitted", async () => {
    const oldContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Old text" }],
        },
      ],
    });
    const note = await noteStorage.create({ content: oldContent });
    dbUpdate.mockClear();

    const newContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "New paragraph" }],
        },
      ],
    });
    await noteStorage.update(note.id, { content: newContent });

    expect(notesById.get(note.id)?.contentPlain).toBe("New paragraph\n");
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content: newContent,
      contentPlain: "New paragraph\n",
      wordCount: 2,
      modifiedAt: expect.any(Number),
    });
  });

  it("derives wordCount from content when wordCount is omitted", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "one two three four five six seven eight nine ten",
            },
          ],
        },
      ],
    });
    const note = await noteStorage.create({ content: "" });
    dbUpdate.mockClear();

    await noteStorage.update(note.id, { content });

    expect(notesById.get(note.id)?.wordCount).toBe(10);
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content,
      contentPlain: "one two three four five six seven eight nine ten\n",
      wordCount: 10,
      modifiedAt: expect.any(Number),
    });
  });

  it("preserves explicit contentPlain and wordCount when provided with content", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body text" }],
        },
      ],
    });
    const note = await noteStorage.create({ content });
    dbUpdate.mockClear();

    await noteStorage.update(note.id, {
      content,
      contentPlain: "Custom plain",
      wordCount: 42,
    });

    expect(notesById.get(note.id)?.contentPlain).toBe("Custom plain");
    expect(notesById.get(note.id)?.wordCount).toBe(42);
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content,
      contentPlain: "Custom plain",
      wordCount: 42,
      modifiedAt: expect.any(Number),
    });
  });
});

describe("noteStorage.search", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
  });

  it("returns title matches only when any title matches (AC37-search-title-first)", async () => {
    await noteStorage.create({
      title: "格式试炼场",
      contentPlain: "链接 [[欢迎使用 Hunos]]",
    });
    await noteStorage.create({
      title: "欢迎使用 Hunos",
      contentPlain: "欢迎使用 Hunos 简介",
    });

    const results = await noteStorage.search("欢迎");

    expect(results.map((note) => note.title)).toEqual(["欢迎使用 Hunos"]);
  });

  it("excludes playground when 欢迎 is only inside a wiki link in stored content", async () => {
    const wikiLinkDoc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "链接 " },
            {
              type: "text",
              text: "欢迎使用 Hunos",
              marks: [{ type: "wikiLink", attrs: { title: "欢迎使用 Hunos" } }],
            },
          ],
        },
      ],
    });
    await noteStorage.create({
      title: "格式试炼场",
      content: wikiLinkDoc,
      contentPlain: "",
    });
    await noteStorage.create({
      title: "欢迎使用 Hunos",
      contentPlain: "欢迎使用 Hunos 简介",
    });

    const results = await noteStorage.search("欢迎");

    expect(results.map((note) => note.title)).toEqual(["欢迎使用 Hunos"]);
  });

  it("falls back to body matches when no title matches", async () => {
    await noteStorage.create({
      title: "Meeting notes",
      contentPlain: "Discussed onboarding welcome flow.",
    });

    const results = await noteStorage.search("welcome");

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Meeting notes");
  });
});
