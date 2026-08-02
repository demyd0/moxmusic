import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';

// Environment variables or fallback default config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoConfigKeyForMviewieLocal',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mviewie-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mviewie-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mviewie-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Safe Persistence Setup to prevent IndexedDB "Database is closing/hidden" crashes
setPersistence(auth, browserLocalPersistence).catch(() => {
  setPersistence(auth, inMemoryPersistence).catch((err) => {
    console.warn('Auth persistence fallback warning:', err);
  });
});

export const googleProvider = new GoogleAuthProvider();

// Scope configuration for minimal GDPR data access (only basic profile & email)
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Trigger Google Sign-In Popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error?.code, error?.message);
    throw error;
  }
}

/**
 * Sign Out Current User
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
}

/**
 * Helper to get or ensure user UID (Authenticated or persistent local Fallback)
 */
export async function getOrCreateUserId(): Promise<string> {
  return new Promise((resolve) => {
    const user = auth.currentUser;
    if (user) {
      resolve(user.uid);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser: User | null) => {
      unsubscribe();
      if (authUser) {
        resolve(authUser.uid);
      } else {
        let localUid = localStorage.getItem('mviewie_user_uid');
        if (!localUid) {
          localUid = `user_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('mviewie_user_uid', localUid);
        }
        resolve(localUid);
      }
    });
  });
}
