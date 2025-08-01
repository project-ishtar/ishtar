import { GlobalSettings } from '@ishtar/commons/types';
import { db } from '../index';

let cachedGlobalSettings: GlobalSettings | null = null;
let cachedGlobalSettingsPromise: Promise<GlobalSettings> | null = null;

let lastFetchTime: number = 0;

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const now = Date.now();

  if (cachedGlobalSettings && now - lastFetchTime < 10 * 60 * 100) {
    return cachedGlobalSettings;
  }

  if (cachedGlobalSettingsPromise) return cachedGlobalSettingsPromise;

  cachedGlobalSettingsPromise = db
    .doc('_settings/global')
    .get()
    .then((settingsDoc) => {
      const settings = (settingsDoc.data() ?? {}) as GlobalSettings;

      cachedGlobalSettings = settings;
      lastFetchTime = Date.now();

      return settings;
    })
    .catch(() => {
      throw new Error('Could not get global settings');
    })
    .finally(() => {
      cachedGlobalSettingsPromise = null;
    });

  return cachedGlobalSettingsPromise;
}
