import type { GlobalSettings } from '@ishtar/commons/types';
import { firebaseApp } from '../firebase.ts';
import { doc, getDoc } from 'firebase/firestore';

let cachedGlobalSettings: GlobalSettings | null = null;
let cachedGlobalSettingsPromise: Promise<GlobalSettings> | null = null;

let lastFetchTime: number = 0;

const CACHE_DURATION_MS = 10 * 60 * 100;

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const now = Date.now();

  if (cachedGlobalSettings && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedGlobalSettings;
  }

  if (cachedGlobalSettingsPromise) return cachedGlobalSettingsPromise;

  const globalSettingsDocRef = doc(firebaseApp.firestore, '_settings/global');

  cachedGlobalSettingsPromise = getDoc(globalSettingsDocRef)
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
