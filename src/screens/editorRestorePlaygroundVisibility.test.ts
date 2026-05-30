import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen restore playground visibility", () => {
  it("shows restore for playground content even after non-canonical title rename", () => {
    expect(editorSource).toContain("showRestorePlayground = isPlaygroundNote");
    expect(editorSource).toContain("persistUnloadDraftSync");

    const content = JSON.stringify(buildPlaygroundContent("zh"));
    expect(isFormatPlaygroundNote("TitleUnload3", content)).toBe(true);
    expect(isFormatPlaygroundNote("NonCanonicalRestore3", content)).toBe(true);
  });
});
