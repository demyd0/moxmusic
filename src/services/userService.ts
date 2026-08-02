import { db, auth } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import type { Album } from '@/types/album';

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  photoURL?: string;
  createdAt?: string;
  consentGiven?: boolean;
  consentDate?: string;
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
          consentGiven: data.consentGiven || false,
          consentDate: data.consentDate,
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
  const existing = await getUserProfile(uid);

  const profile: UserProfile = {
    uid,
    username: username.trim().toLowerCase(),
    email: email || existing?.email || '',
    photoURL: photoURL || existing?.photoURL || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    consentGiven: existing?.consentGiven || false,
    consentDate: existing?.consentDate,
  };

  const docRef = doc(db, 'users', uid);
  try {
    await setDoc(docRef, { 
      username: profile.username, 
      email: profile.email, 
      photoURL: profile.photoURL,
      createdAt: profile.createdAt,
      consentGiven: profile.consentGiven,
      consentDate: profile.consentDate,
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore user profile write failed, updating local storage:', error);
  }

  try {
    localStorage.setItem(`mviewie_profile_${uid}`, JSON.stringify(profile));
  } catch {}

  return profile;
}

/**
 * Record First-Time Privacy Policy Consent in Firestore
 */
export async function recordUserConsent(uid: string): Promise<void> {
  const consentDate = new Date().toISOString();
  const docRef = doc(db, 'users', uid);
  try {
    await setDoc(docRef, { consentGiven: true, consentDate }, { merge: true });
  } catch (error) {
    console.warn('Failed to record consent in Firestore:', error);
  }

  try {
    const local = localStorage.getItem(`mviewie_profile_${uid}`);
    if (local) {
      const profile = JSON.parse(local);
      profile.consentGiven = true;
      profile.consentDate = consentDate;
      localStorage.setItem(`mviewie_profile_${uid}`, JSON.stringify(profile));
    }
  } catch {}
}

/**
 * Export All User Data to downloadable JSON file (Right to Portability)
 */
export async function exportUserData(uid: string, username: string): Promise<void> {
  let liked: Album[] = [];
  let toListen: Album[] = [];

  try {
    const likedRef = collection(db, 'users', uid, 'liked');
    const likedSnap = await getDocs(likedRef);
    liked = likedSnap.docs.map((d) => d.data() as Album);

    const toListenRef = collection(db, 'users', uid, 'toListen');
    const toListenSnap = await getDocs(toListenRef);
    toListen = toListenSnap.docs.map((d) => d.data() as Album);
  } catch (err) {
    console.warn('Firestore export query warning, using local fallback:', err);
    try {
      const l = localStorage.getItem(`mviewie_liked_${uid}`);
      if (l) liked = JSON.parse(l);
      const t = localStorage.getItem(`mviewie_toListen_${uid}`);
      if (t) toListen = JSON.parse(t);
    } catch {}
  }

  const exportPayload = {
    exportDate: new Date().toISOString(),
    username: username || 'user',
    likedCount: liked.length,
    toListenCount: toListen.length,
    liked,
    toListen,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportPayload, null, 2)
  )}`;

  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `moxmusic_export_${username || 'data'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Permanently Delete User Account & All Firestore Data (Right to be Forgotten)
 */
export async function deleteUserAccount(uid: string): Promise<void> {
  // 1. Delete all documents in 'liked' subcollection
  try {
    const likedRef = collection(db, 'users', uid, 'liked');
    const likedSnap = await getDocs(likedRef);
    for (const d of likedSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (e) {
    console.warn('Error deleting liked subcollection:', e);
  }

  // 2. Delete all documents in 'toListen' subcollection
  try {
    const toListenRef = collection(db, 'users', uid, 'toListen');
    const toListenSnap = await getDocs(toListenRef);
    for (const d of toListenSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (e) {
    console.warn('Error deleting toListen subcollection:', e);
  }

  // 3. Delete parent user profile document
  try {
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  } catch (e) {
    console.warn('Error deleting user parent doc:', e);
  }

  // 4. Clear local storage
  try {
    localStorage.removeItem(`mviewie_profile_${uid}`);
    localStorage.removeItem(`mviewie_liked_${uid}`);
    localStorage.removeItem(`mviewie_toListen_${uid}`);
    localStorage.removeItem('mviewie_user_uid');
  } catch {}

  // 5. Delete Firebase Auth User
  if (auth.currentUser) {
    await auth.currentUser.delete();
  }
}
