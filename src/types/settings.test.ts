import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings";

describe("DEFAULT_SETTINGS", () => {
  it("keeps completed tasks visible by default", () => {
    expect(DEFAULT_SETTINGS.hideCompletedTasks).toBe(false);
  });
});
