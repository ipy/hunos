import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_LIST_TAG_FILTER_TESTID } from "./NoteListScreen";

const noteListSource = readFileSync(
  join(process.cwd(), "src/screens/NoteListScreen.tsx"),
  "utf-8",
);

describe("NoteListScreen tag filter automation testid", () => {
  it("exports stable tag filter testid", () => {
    expect(NOTE_LIST_TAG_FILTER_TESTID).toBe("note-list-tag-filter");
  });

  it("wires testid and tag name only when a tag filter is active", () => {
    expect(noteListSource).toContain(
      `"data-testid": NOTE_LIST_TAG_FILTER_TESTID`,
    );
    expect(noteListSource).toContain(`"data-tag-name": activeTag.displayName`);
    expect(noteListSource).toContain("...(activeTag");
  });
});
