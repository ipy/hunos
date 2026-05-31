import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("playground title and body H1 decouple (AC34-title-h1-decouple)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
    "utf8",
  );

  it("does not sync body H1 when the metadata title field changes", () => {
    expect(source).not.toContain("syncPlaygroundDocumentH1WithTitle");
    expect(source).not.toContain("playgroundTitleH1Sync");
  });
});
