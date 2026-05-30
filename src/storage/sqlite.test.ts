import { afterEach, describe, expect, it, vi } from "vitest";
import { sqliteAdapter } from "./sqlite";

describe("sqliteAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not support WAL checkpoint outside OpenHarmony", () => {
    expect(sqliteAdapter.supportsWalCheckpoint()).toBe(false);
  });

  it("supports WAL checkpoint when ohosEnvironment is present", () => {
    const globalRecord = globalThis as Record<string, unknown>;
    globalRecord.ohosEnvironment = {};
    try {
      expect(sqliteAdapter.supportsWalCheckpoint()).toBe(true);
    } finally {
      delete globalRecord.ohosEnvironment;
    }
  });

  it("checkpointWal resolves without throwing when not implemented", async () => {
    await expect(sqliteAdapter.checkpointWal()).resolves.toBeUndefined();
  });
});
