import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const noteListSource = readFileSync(
  join(process.cwd(), "src/screens/NoteListScreen.tsx"),
  "utf-8",
);
const wikiLinkDecorationSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const tiptapSource = readFileSync(
  join(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
  "utf-8",
);
const noteSwitchSource = readFileSync(
  join(process.cwd(), "src/store/noteStoreActiveNoteSwitch.ts"),
  "utf-8",
);

describe("iteration 40 — search pin strip vs hits", () => {
  it("keeps pinned strip separate from title-first search hits", () => {
    expect(noteListSource).toContain("activePinnedNotesDuringSearch");
    expect(noteListSource).toContain("searchHitNotes");
    expect(noteListSource).not.toContain("mergePinnedNotesForSearchDisplay");
  });
});

describe("iteration 40 — wiki-link navigation", () => {
  it("exposes link role and label on wiki-link content", () => {
    expect(wikiLinkDecorationSource).toContain('role: "link"');
    expect(wikiLinkDecorationSource).toContain('"aria-label": wl.title');
  });

  it("syncs browser URL when active note changes", () => {
    expect(noteSwitchSource).toContain("syncActiveNoteUrl");
  });
});

describe("iteration 40 — checkbox a11y", () => {
  it("derives distinct checkbox labels from task item text", () => {
    expect(tiptapSource).toContain("node.textContent.trim()");
    expect(tiptapSource).toContain("${stateLabel}：${taskText}");
    expect(tiptapSource).not.toMatch(
      /checkboxLabel:\s*\(_node,\s*checked\)\s*=>/,
    );
  });
});
