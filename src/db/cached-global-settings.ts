import type { GlobalSettings } from '@ishtar/commons/types';
import { firebaseApp } from '../firebase.ts';
import { doc, getDoc } from 'firebase/firestore';
import {
  GLOBAL_SETTINGS_CACHE_DURATION_MS,
  GLOBAL_SETTINGS_DOC_PATH,
} from '@ishtar/commons/constants';

let cachedGlobalSettings: GlobalSettings | undefined = undefined;
let cachedGlobalSettingsPromise: Promise<GlobalSettings> | null = null;

let lastFetchTime: number = 0;

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const now = Date.now();

  if (
    cachedGlobalSettings &&
    now - lastFetchTime < GLOBAL_SETTINGS_CACHE_DURATION_MS
  ) {
    return cachedGlobalSettings;
  }

  if (cachedGlobalSettingsPromise) return cachedGlobalSettingsPromise;

  const globalSettingsDocRef = doc(
    firebaseApp.firestore,
    GLOBAL_SETTINGS_DOC_PATH,
  );

  cachedGlobalSettingsPromise = getDoc(globalSettingsDocRef)
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
