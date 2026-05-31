import { describe, expect, it, vi, afterEach } from "vitest";
import {
  noteHashForId,
  parseNoteIdFromLocation,
  syncActiveNoteUrl,
} from "./noteRoute";

describe("noteRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds and parses note hash fragments", () => {
    expect(noteHashForId("note-abc")).toBe("#note/note-abc");
    expect(parseNoteIdFromLocation("#note/note-abc")).toBe("note-abc");
  });

  it("encodes note ids with special characters", () => {
    const id = "id/with space";
    expect(parseNoteIdFromLocation(noteHashForId(id))).toBe(id);
  });

  it("syncActiveNoteUrl updates location hash via replaceState", () => {
    const location = { href: "http://127.0.0.1:5173/" };
    const replaceState = vi.fn((_state, _title, url: string) => {
      location.href = url;
    });
    vi.stubGlobal("window", {
      location,
      history: { replaceState },
    });

    syncActiveNoteUrl("welcome-1");
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "http://127.0.0.1:5173/#note/welcome-1",
    );

    syncActiveNoteUrl(null);
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "http://127.0.0.1:5173/",
    );
  });
});
