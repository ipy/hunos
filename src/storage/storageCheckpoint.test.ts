import { beforeEach, describe, expect, it, vi } from "vitest";

const supportsWalCheckpoint = vi.fn(() => false);
const checkpointWal = vi.fn(async () => undefined);

vi.mock("./sqlite", () => ({
  sqliteAdapter: {
    supportsWalCheckpoint: () => supportsWalCheckpoint(),
    checkpointWal: () => checkpointWal(),
  },
}));

import { checkpointStorageAfterFlush } from "./storageCheckpoint";

describe("checkpointStorageAfterFlush", () => {
  beforeEach(() => {
    supportsWalCheckpoint.mockReset();
    checkpointWal.mockClear();
    supportsWalCheckpoint.mockReturnValue(false);
  });

  it("no-ops when WAL checkpoint is not supported", async () => {
    await checkpointStorageAfterFlush();

    expect(checkpointWal).not.toHaveBeenCalled();
  });

  it("invokes WAL checkpoint when adapter supports it", async () => {
    supportsWalCheckpoint.mockReturnValue(true);

    await checkpointStorageAfterFlush();

    expect(checkpointWal).toHaveBeenCalledOnce();
  });
});
