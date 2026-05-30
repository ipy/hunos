import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Locale } from "@/types/settings";

const noteStorageCreate = vi.fn();
const notesToArray = vi.fn();
const notesWhereEquals = vi.fn();
const graphSync = vi.fn();
const createFormatPlaygroundNote = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    create: (...args: unknown[]) => noteStorageCreate(...args),
  },
}));

vi.mock("./database", () => ({
  db: {
    notes: {
      where: () => ({
        equals: (title: string) => ({
          first: () => notesWhereEquals(title),
        }),
      }),
      toArray: () => notesToArray(),
    },
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: (...args: unknown[]) => graphSync(...args),
  },
}));

vi.mock("./formatPlaygroundNote", () => ({
  createFormatPlaygroundNote: (...args: unknown[]) =>
    createFormatPlaygroundNote(...args),
  getFormatPlaygroundTitle: (locale: Locale) =>
    locale === "zh" ? "格式试炼场" : "Format Playground",
  isFormatPlaygroundNote: (title: string) =>
    title === "Format Playground" || title === "格式试炼场",
}));

describe("getWelcomeSeed", () => {
  it("seeds a single nested welcome tag for en bootstrap locale", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const { extractFromPlainText, extractPlainTextFromTiptap } =
      await import("@/graph/linkExtractor");

    const seed = getWelcomeSeed("en");
    const tagNames = extractFromPlainText(
      extractPlainTextFromTiptap(seed.content),
    ).tags.map((tag) => tag.name);

    expect(tagNames).toEqual(["hunos/getting-started", "hunos/welcome"]);
  });

  it("seeds a single nested 欢迎 tag for zh bootstrap locale", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const { extractFromPlainText, extractPlainTextFromTiptap } =
      await import("@/graph/linkExtractor");

    const seed = getWelcomeSeed("zh");
    const tagNames = extractFromPlainText(
      extractPlainTextFromTiptap(seed.content),
    ).tags.map((tag) => tag.name);

    expect(tagNames).toEqual(["hunos/入门指南", "hunos/欢迎"]);
  });

  it("returns English welcome copy for en bootstrap locale", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const seed = getWelcomeSeed("en");
    expect(seed.title).toBe("Welcome to Hunos");
    expect(JSON.stringify(seed.content)).toContain("Welcome to Hunos");
    expect(JSON.stringify(seed.content)).not.toContain("欢迎使用");
  });

  it("returns zh welcome copy for zh bootstrap locale", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const seed = getWelcomeSeed("zh");
    expect(seed.title).toBe("欢迎使用 Hunos");
    expect(JSON.stringify(seed.content)).toContain("欢迎使用 Hunos");
  });
});

describe("createWelcomeNotesIfNeeded", () => {
  beforeEach(() => {
    noteStorageCreate.mockReset();
    notesToArray.mockReset();
    notesWhereEquals.mockReset();
    graphSync.mockReset();
    createFormatPlaygroundNote.mockReset();
    notesToArray.mockResolvedValue([]);
    notesWhereEquals.mockResolvedValue(undefined);
    noteStorageCreate.mockImplementation(
      async (payload: { title: string }) => ({
        id: "note-1",
        content: "{}",
        title: payload.title,
      }),
    );
    graphSync.mockResolvedValue(undefined);
    createFormatPlaygroundNote.mockResolvedValue(undefined);
  });

  it("creates exactly one welcome row for en locale on empty store", async () => {
    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("en");

    expect(noteStorageCreate).toHaveBeenCalledTimes(1);
    expect(noteStorageCreate.mock.calls[0]?.[0]?.title).toBe(
      "Welcome to Hunos",
    );
    expect(createFormatPlaygroundNote).toHaveBeenCalledWith("en");
  });

  it("creates exactly one welcome row for zh locale on empty store", async () => {
    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("zh");

    expect(noteStorageCreate).toHaveBeenCalledTimes(1);
    expect(noteStorageCreate.mock.calls[0]?.[0]?.title).toBe("欢迎使用 Hunos");
    expect(createFormatPlaygroundNote).toHaveBeenCalledWith("zh");
  });

  it("dedupes concurrent bootstrap seed calls", async () => {
    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await Promise.all([
      createWelcomeNotesIfNeeded("en"),
      createWelcomeNotesIfNeeded("en"),
    ]);

    expect(noteStorageCreate).toHaveBeenCalledTimes(1);
    expect(createFormatPlaygroundNote).toHaveBeenCalledTimes(1);
  });

  it("skips welcome creation when a welcome title already exists", async () => {
    notesWhereEquals.mockImplementation(async (title: string) =>
      title === "Welcome to Hunos" ? { id: "w1", title } : undefined,
    );

    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("en");

    expect(noteStorageCreate).not.toHaveBeenCalled();
  });
});
