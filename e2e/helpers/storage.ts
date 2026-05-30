import type { Page } from "@playwright/test";

const HUNOS_DB = "hunos";

/** Fresh IndexedDB per test — mirrors DevLoop isolation and avoids playground pollution. */
export async function resetHunosDatabase(page: Page): Promise<void> {
  await page.evaluate(async (dbName) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("deleteDatabase failed"));
      req.onblocked = () => resolve();
    });
  }, HUNOS_DB);
}
