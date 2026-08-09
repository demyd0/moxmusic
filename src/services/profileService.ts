import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { omitUndefined } from '@/lib/utils';
import { sanitizeCustomization } from '@/lib/profileValidation';
import { DEFAULT_PROFILE_CUSTOMIZATION, type ProfileCustomization } from '@/types/profile';

/**
 * Customization lives inside publicProfiles/{uid} (same doc as
 * username/photoURL) rather than a new collection - it's already
 * public-read/owner-write in firestore.rules, and a profile page needs
 * both pieces together anyway.
 */
export async function getProfileCustomization(uid: string): Promise<ProfileCustomization> {
  if (!uid) return DEFAULT_PROFILE_CUSTOMIZATION;
  try {
    const snap = await getDoc(doc(db, 'publicProfiles', uid));
    const data = snap.exists() ? snap.data() : null;
    if (data?.customization) {
      return sanitizeCustomization({ ...DEFAULT_PROFILE_CUSTOMIZATION, ...data.customization });
    }
  } catch (error) {
    console.warn('Failed to fetch profile customization:', error);
  }
  return DEFAULT_PROFILE_CUSTOMIZATION;
}

export async function saveProfileCustomization(uid: string, customization: ProfileCustomization): Promise<void> {
  const clean = sanitizeCustomization(customization);
  await setDoc(doc(db, 'publicProfiles', uid), omitUndefined({ customization: clean }), { merge: true });
}
