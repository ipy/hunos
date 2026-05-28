import { describe, expect, it } from "vitest";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  migratePlaygroundContentIfStale,
} from "./formatPlaygroundNote";

describe("migratePlaygroundContentIfStale", () => {
  it("returns null when playground content version is current", () => {
    const content = JSON.stringify(buildPlaygroundContent("en"));
    expect(migratePlaygroundContentIfStale(content, "en")).toBeNull();
  });

  it("updates tryHint and version for stale playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 0 };
    const staleContent = JSON.stringify(stale);

    const migrated = migratePlaygroundContentIfStale(staleContent, "en");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const trySectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    expect(trySectionIndex).toBeGreaterThan(-1);
    const tryHintNode = parsed.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Alt+↑/↓");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+D");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Shift+K");
  });
});
