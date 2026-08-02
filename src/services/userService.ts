import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  photoURL?: string;
  createdAt?: string;
}

/**
 * Fetch User Profile Document by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.username) {
        return {
          uid,
          username: data.username,
          email: data.email,
          photoURL: data.photoURL,
          createdAt: data.createdAt,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to fetch user profile:', error);
  }

  // Check localStorage fallback
  try {
    const local = localStorage.getItem(`mviewie_profile_${uid}`);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return null;
}

/**
 * Save / Update User Profile in Firestore & LocalStorage
 */
export async function saveUserProfile(
  uid: string,
  username: string,
  email?: string,
  photoURL?: string
): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    username: username.trim().toLowerCase(),
    email: email || '',
    photoURL: photoURL || '',
    createdAt: new Date().toISOString(),
  };

  const docRef = doc(db, 'users', uid);
  try {
    await setDoc(docRef, { username: profile.username, email: profile.email, photoURL: profile.photoURL }, { merge: true });
  } catch (error) {
    console.warn('Firestore user profile write failed, updating local storage:', error);
  }

  try {
    localStorage.setItem(`mviewie_profile_${uid}`, JSON.stringify(profile));
  } catch {}

  return profile;
}
