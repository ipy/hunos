import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("restore playground chip compact label", () => {
  it("uses short visible text on all layouts with full phrase in aria-label", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'const restorePlaygroundVisibleText = t(\n    "notes.actions.restorePlaygroundShort",\n  );',
    );
    expect(source).toContain("aria-label={restorePlaygroundLabel}");
    expect(source).toContain("title={restorePlaygroundLabel}");
    expect(source).toContain("{restorePlaygroundVisibleText}");
    expect(source).toContain("requestRestorePlaygroundConfirm");
    expect(source).toContain("restore-playground-confirm");
  });
});
