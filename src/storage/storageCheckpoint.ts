import { sqliteAdapter } from "./sqlite";

/** Persist flushed writes to durable storage when the active adapter supports it. */
export async function checkpointStorageAfterFlush(): Promise<void> {
  if (!sqliteAdapter.supportsWalCheckpoint()) {
    return;
  }
  await sqliteAdapter.checkpointWal();
}
