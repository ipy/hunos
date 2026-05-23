import { db } from './database';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings';

export const settingsStorage = {
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const record = await db.settings.get(key);
    return (record?.value as AppSettings[K]) ?? DEFAULT_SETTINGS[key];
  },

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await db.settings.put({ key, value });
  },

  async getAll(): Promise<AppSettings> {
    const records = await db.settings.toArray();
    const settings = { ...DEFAULT_SETTINGS };
    for (const record of records) {
      if (record.key in settings) {
        (settings as Record<string, unknown>)[record.key] = record.value;
      }
    }
    return settings;
  },
};
