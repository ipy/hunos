import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("restore playground button placement (AC34-restore-placement)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
    "utf8",
  );

  it("renders restore chip adjacent to the title field, not only in top chrome", () => {
    const titleTestId = source.indexOf('data-testid="note-title"');
    const restoreTestId = source.indexOf(
      'data-testid="restore-playground-button"',
    );
    const headerStart = source.indexOf("<header");
    const headerEnd = source.indexOf("</header>", headerStart);

    expect(titleTestId).toBeGreaterThan(-1);
    expect(restoreTestId).toBeGreaterThan(titleTestId);
    expect(restoreTestId).toBeGreaterThan(headerEnd);
  });
});
