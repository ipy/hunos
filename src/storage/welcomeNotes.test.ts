import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Locale } from "@/types/settings";

const noteStorageCreate = vi.fn();
const noteStorageUpdate = vi.fn();
const notesToArray = vi.fn();
const notesWhereEquals = vi.fn();
const graphSync = vi.fn();
const createFormatPlaygroundNote = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    create: (...args: unknown[]) => noteStorageCreate(...args),
    update: (...args: unknown[]) => noteStorageUpdate(...args),
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

    expect(tagNames.sort()).toEqual(
      ["hunos/format-test/welcome", "hunos/getting-started"].sort(),
    );
  });

  it("seeds a single nested 欢迎 tag for zh bootstrap locale", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const { extractFromPlainText, extractPlainTextFromTiptap } =
      await import("@/graph/linkExtractor");

    const seed = getWelcomeSeed("zh");
    const tagNames = extractFromPlainText(
      extractPlainTextFromTiptap(seed.content),
    ).tags.map((tag) => tag.name);

    expect(tagNames).toEqual(["hunos/入门指南", "hunos/格式测试/欢迎"]);
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
    noteStorageUpdate.mockReset();
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
    noteStorageUpdate.mockResolvedValue(undefined);
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

  it("migrates a sibling-locale welcome row to the bootstrap locale seed", async () => {
    notesWhereEquals.mockImplementation(async (title: string) =>
      title === "Welcome to Hunos"
        ? {
            id: "welcome-en",
            title: "Welcome to Hunos",
            content: JSON.stringify({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "#hunos/welcome" }],
                },
              ],
            }),
          }
        : undefined,
    );

    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("zh");

    expect(noteStorageCreate).not.toHaveBeenCalled();
    expect(noteStorageUpdate).toHaveBeenCalledOnce();
    expect(noteStorageUpdate.mock.calls[0]?.[0]).toBe("welcome-en");
    expect(noteStorageUpdate.mock.calls[0]?.[1]?.title).toBe("欢迎使用 Hunos");
    const syncedContent = graphSync.mock.calls[
      graphSync.mock.calls.length - 1
    ]?.[1] as string;
    expect(syncedContent).toContain("#hunos/格式测试/欢迎");
    expect(syncedContent).not.toContain("#hunos/welcome");
  });

  it("migrates existing welcome note content to latest seed tags", async () => {
    notesWhereEquals.mockImplementation(async (title: string) =>
      title === "Welcome to Hunos"
        ? {
            id: "welcome-en",
            title,
            content: JSON.stringify({
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "#hunos/welcome" }],
                },
              ],
            }),
          }
        : undefined,
    );

    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("en");

    expect(noteStorageCreate).not.toHaveBeenCalled();
    expect(noteStorageUpdate).toHaveBeenCalledOnce();
    expect(graphSync).toHaveBeenCalled();
    const syncedContent = graphSync.mock.calls.at(-1)?.[1] as string;
    expect(syncedContent).toContain("#hunos/format-test/welcome");
    expect(syncedContent).not.toContain("#hunos/welcome");
  });

  it("skips welcome creation when a welcome title already exists", async () => {
    const { getWelcomeSeed } = await import("./welcomeNotes");
    const seed = getWelcomeSeed("en");
    notesWhereEquals.mockImplementation(async (title: string) =>
      title === "Welcome to Hunos"
        ? {
            id: "w1",
            title,
            content: JSON.stringify(seed.content),
          }
        : undefined,
    );

    const { createWelcomeNotesIfNeeded } = await import("./welcomeNotes");
    await createWelcomeNotesIfNeeded("en");

    expect(noteStorageCreate).not.toHaveBeenCalled();
    expect(noteStorageUpdate).not.toHaveBeenCalled();
  });
});
