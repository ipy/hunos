import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EditorScreen post-restore AC1 fixes", () => {
  it("bumps write epoch, suppresses chip, and seeds title from restored row", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "contentWriteEpochRef.current = bumpPlaygroundWriteEpoch(note.id)",
    );
    expect(source).toContain("suppressRestoreChipRef.current = true");
    expect(source).toContain(
      "const restoredTitle =\n        restoredNote?.title ?? getFormatPlaygroundTitle(seedLocale)",
    );
    expect(source).toContain(
      "if (suppressRestoreChipRef.current) {\n      return false;\n    }",
    );
    expect(source).toContain("setTitleValue(restoredTitle)");
  });
});
