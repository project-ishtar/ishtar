import { GlobalSettings } from '@ishtar/commons/types';
import { db } from '../index';

let cachedGlobalSettings: GlobalSettings | null = null;
let cachedGlobalSettingsPromise: Promise<GlobalSettings> | null = null;

let lastFetchTime: number = 0;

const CACHE_DURATION_MS = 10 * 60 * 100;

const GLOBAL_SETTINGS_DOC_PATH = '_settings/global';

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const now = Date.now();

  if (cachedGlobalSettings && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedGlobalSettings;
  }

  if (cachedGlobalSettingsPromise) return cachedGlobalSettingsPromise;

  cachedGlobalSettingsPromise = db
    .doc(GLOBAL_SETTINGS_DOC_PATH)
    .get()
    .then((settingsDoc) => {
      const settings = (settingsDoc.data() ?? {}) as GlobalSettings;

      cachedGlobalSettings = settings;
      lastFetchTime = Date.now();

      return settings;
    })
    .catch(() => {
      cachedGlobalSettings = {};
      lastFetchTime = Date.now();

      return cachedGlobalSettings;
    })
    .finally(() => {
      cachedGlobalSettingsPromise = null;
    });

  return cachedGlobalSettingsPromise;
}
