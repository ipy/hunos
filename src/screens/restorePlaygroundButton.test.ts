import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";
import zh from "@/i18n/zh.json";

describe("restore playground button labels", () => {
  it("uses compact zh visible text with full accessibility label", () => {
    expect(zh.notes.actions.restorePlaygroundShort).toBe("恢复");
    expect(zh.notes.actions.restorePlayground).toBe("恢复格式试炼场");
    expect(zh.notes.actions.restorePlaygroundShort).not.toBe(
      zh.notes.actions.restorePlayground,
    );
  });

  it("uses compact en visible text with full accessibility label", () => {
    expect(en.notes.actions.restorePlaygroundShort).toBe("Restore");
    expect(en.notes.actions.restorePlayground).toBe(
      "Restore Format Playground",
    );
    expect(en.notes.actions.restorePlaygroundShort).not.toBe(
      en.notes.actions.restorePlayground,
    );
  });

  it("uses compact es visible text with full accessibility label", () => {
    expect(es.notes.actions.restorePlaygroundShort).toBe("Restaurar");
    expect(es.notes.actions.restorePlayground).toBe(
      "Restaurar patio de formatos",
    );
    expect(es.notes.actions.restorePlaygroundDone).toBe(
      "Patio de formatos restaurado",
    );
    expect(es.notes.actions.restorePlaygroundShort).not.toBe(
      es.notes.actions.restorePlayground,
    );
  });
});
