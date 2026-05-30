import { beforeEach, describe, expect, it } from "vitest";
import {
  bumpPlaygroundWriteEpoch,
  getPlaygroundWriteEpoch,
  isStalePlaygroundWrite,
  resetPlaygroundWriteEpochForTests,
} from "./noteStorePlaygroundWriteEpoch";

describe("noteStorePlaygroundWriteEpoch", () => {
  beforeEach(() => {
    resetPlaygroundWriteEpochForTests();
  });

  it("bumps epoch and rejects stale writes", () => {
    expect(getPlaygroundWriteEpoch("pg-1")).toBe(0);
    expect(isStalePlaygroundWrite("pg-1", 0)).toBe(false);

    bumpPlaygroundWriteEpoch("pg-1");
    expect(getPlaygroundWriteEpoch("pg-1")).toBe(1);
    expect(isStalePlaygroundWrite("pg-1", 0)).toBe(true);
    expect(isStalePlaygroundWrite("pg-1", 1)).toBe(false);
  });
});
