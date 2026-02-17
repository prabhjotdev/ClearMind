import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserSettings, DEFAULT_SETTINGS } from '../types';

function settingsDoc(userId: string) {
  return doc(db, 'users', userId, 'settings', 'preferences');
}

export async function initializeSettings(userId: string): Promise<UserSettings> {
  const docSnap = await getDoc(settingsDoc(userId));

  if (docSnap.exists()) {
    return docSnap.data() as UserSettings;
  }

  const settings = { ...DEFAULT_SETTINGS, lastSyncAt: Timestamp.now() };
  await setDoc(settingsDoc(userId), settings);
  return settings;
}

export async function updateSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<void> {
  await setDoc(settingsDoc(userId), updates, { merge: true });
}

export function subscribeToSettings(
  userId: string,
  callback: (settings: UserSettings) => void
): () => void {
  return onSnapshot(settingsDoc(userId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserSettings);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  });
}
