import { useEffect, useRef } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types';

/**
 * Detects a timezone mismatch between the stored user profile and the current
 * browser timezone. If a mismatch is found, calls `onMismatch` with the new
 * timezone so the caller can prompt the user.
 *
 * Only fires once per session to avoid repeated prompts.
 */
export function useTimezoneGuard(
  userId: string | undefined,
  userProfile: UserProfile | null,
  onMismatch: (newTz: string, accept: () => void) => void
) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!userId || !userProfile || checkedRef.current) return;
    checkedRef.current = true;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz === userProfile.timezone) return;

    onMismatch(browserTz, async () => {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { timezone: browserTz, updatedAt: Timestamp.now() }, { merge: true });
    });
  }, [userId, userProfile, onMismatch]);
}
