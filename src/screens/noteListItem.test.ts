import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NOTE_LIST_ITEM_PREVIEW_TESTID,
  NOTE_LIST_ITEM_TITLE_TESTID,
} from "./NoteListScreen";

const noteListSource = readFileSync(
  join(process.cwd(), "src/screens/NoteListScreen.tsx"),
  "utf-8",
);

describe("NoteListScreen list row testids", () => {
  it("exports stable title and preview testids", () => {
    expect(NOTE_LIST_ITEM_TITLE_TESTID).toBe("note-list-item-title");
    expect(NOTE_LIST_ITEM_PREVIEW_TESTID).toBe("note-list-item-preview");
  });

  it("wires distinct title and preview nodes", () => {
    expect(noteListSource).toContain(
      `data-testid={NOTE_LIST_ITEM_TITLE_TESTID}`,
    );
    expect(noteListSource).toContain(
      `data-testid={NOTE_LIST_ITEM_PREVIEW_TESTID}`,
    );
    expect(noteListSource).toContain("deriveNoteListPreview");
    expect(noteListSource).toContain("WebkitLineClamp: 2");
  });
});
