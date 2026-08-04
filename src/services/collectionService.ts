import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';
import type { Album } from '@/types/album';

export interface UserCollectionsState {
  likedIds: Set<string>;
  toListenIds: Set<string>;
  likedAlbums: Album[];
  toListenAlbums: Album[];
}

/**
 * Sort Albums by dateAdded descending (Latest liked album first)
 */
function sortByLatestAdded(albums: Album[]): Album[] {
  return [...albums].sort((a, b) => {
    const timeA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
    const timeB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
    return timeB - timeA; // Descending: Newest additions at top
  });
}

/**
 * LocalStorage Fallback helpers for offline/unconfigured environments
 */
function getLocalCollection(key: string): Album[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalCollection(key: string, albums: Album[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(albums));
  } catch (error) {
    console.error('LocalStorage write failed:', error);
  }
}

/**
 * Wraps onSnapshot with a single retry when the very first error is
 * 'permission-denied'. Right after sign-in on a fresh browser/device the
 * Firestore SDK can start a listener a moment before the Firebase Auth ID
 * token is attached to its requests, so the first attempt can be rejected
 * even though the caller genuinely owns the data. A plain onSnapshot never
 * recovers from that on its own (the listener just stays dead), so without
 * this retry a user's own 'toListen' queue could silently appear empty
 * after logging in on a new device until they refresh the page.
 */
function subscribeWithAuthRaceRetry(
  ref: ReturnType<typeof collection>,
  onData: (snapshot: import('firebase/firestore').QuerySnapshot) => void,
  onGiveUp: (error: unknown) => void
): () => void {
  const state = { unsub: () => {} };

  const start = (isRetry: boolean) => {
    state.unsub = onSnapshot(ref, onData, (error: any) => {
      if (!isRetry && error?.code === 'permission-denied') {
        setTimeout(() => start(true), 400);
        return;
      }
      onGiveUp(error);
    });
  };

  start(false);
  return () => state.unsub();
}

/**
 * Subscribe to real-time updates for Liked and ToListen collections for a user.
 * Automatically sorts albums by dateAdded descending (latest at the top).
 */
export function subscribeUserCollections(
  uid: string,
  onUpdate: (state: UserCollectionsState) => void
): () => void {
  let likedAlbums: Album[] = [];
  let toListenAlbums: Album[] = [];
  let likedIds = new Set<string>();
  let toListenIds = new Set<string>();

  const emit = () => {
    onUpdate({
      likedIds: new Set(likedIds),
      toListenIds: new Set(toListenIds),
      likedAlbums: [...likedAlbums],
      toListenAlbums: [...toListenAlbums],
    });
  };

  // 1. Subscribe to 'liked' collection
  const likedRef = collection(db, 'users', uid, 'liked');
  const unsubLiked = subscribeWithAuthRaceRetry(
    likedRef,
    (snapshot) => {
      const rawAlbums = snapshot.docs.map((d) => d.data() as Album);
      likedAlbums = sortByLatestAdded(rawAlbums);
      likedIds = new Set(likedAlbums.map((a) => a.id));
      setLocalCollection(`mviewie_liked_${uid}`, likedAlbums);
      emit();
    },
    (error) => {
      console.warn('Firestore liked collection sync warning, using local state fallback:', error);
      const rawLocal = getLocalCollection(`mviewie_liked_${uid}`);
      likedAlbums = sortByLatestAdded(rawLocal);
      likedIds = new Set(likedAlbums.map((a) => a.id));
      emit();
    }
  );

  // 2. Subscribe to 'toListen' collection
  const toListenRef = collection(db, 'users', uid, 'toListen');
  const unsubToListen = subscribeWithAuthRaceRetry(
    toListenRef,
    (snapshot) => {
      const rawAlbums = snapshot.docs.map((d) => d.data() as Album);
      toListenAlbums = sortByLatestAdded(rawAlbums);
      toListenIds = new Set(toListenAlbums.map((a) => a.id));
      setLocalCollection(`mviewie_toListen_${uid}`, toListenAlbums);
      emit();
    },
    (error) => {
      console.warn('Firestore toListen collection sync warning, using local state fallback:', error);
      const rawLocal = getLocalCollection(`mviewie_toListen_${uid}`);
      toListenAlbums = sortByLatestAdded(rawLocal);
      toListenIds = new Set(toListenAlbums.map((a) => a.id));
      emit();
    }
  );

  return () => {
    unsubLiked();
    unsubToListen();
  };
}

/**
 * Automatically sync and migrate any guest/local storage albums to authenticated Google user account
 */
export async function migrateGuestDataToUserAccount(targetUid: string): Promise<void> {
  if (!targetUid) return;
  try {
    const localGuestUid = localStorage.getItem('mviewie_user_uid');
    if (!localGuestUid || localGuestUid === targetUid) return;

    const guestLiked = getLocalCollection(`mviewie_liked_${localGuestUid}`);
    const guestToListen = getLocalCollection(`mviewie_toListen_${localGuestUid}`);

    // Migrate liked
    for (const album of guestLiked) {
      const docRef = doc(db, 'users', targetUid, 'liked', album.id);
      await setDoc(docRef, { ...album, dateAdded: album.dateAdded || new Date().toISOString() }, { merge: true });
    }

    // Migrate toListen
    for (const album of guestToListen) {
      const docRef = doc(db, 'users', targetUid, 'toListen', album.id);
      await setDoc(docRef, { ...album, dateAdded: album.dateAdded || new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    console.warn('Guest data migration warning:', err);
  }
}

/**
 * Fetch Public Shared Liked Collection for a specific user ID (Sorted by latest first)
 */
export async function fetchSharedLikedCollection(uid: string): Promise<Album[]> {
  if (!uid) return [];
  try {
    const likedRef = collection(db, 'users', uid, 'liked');
    const snapshot = await getDocs(likedRef);
    if (!snapshot.empty) {
      const rawAlbums = snapshot.docs.map((d) => d.data() as Album);
      return sortByLatestAdded(rawAlbums);
    }
  } catch (error) {
    console.warn('Firestore shared fetch failed or offline, checking local storage:', error);
  }

  const rawLocal = getLocalCollection(`mviewie_liked_${uid}`);
  return sortByLatestAdded(rawLocal);
}

/**
 * Toggle Album in 'liked' collection (Add if absent, Remove if present)
 */
export async function toggleLikeAlbum(
  uid: string,
  album: Album,
  isCurrentlyLiked: boolean
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'liked', album.id);

  if (isCurrentlyLiked) {
    // Remove from Firestore
    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Firestore delete error, updating local storage:', error);
    }
    // Update Local Storage
    const local = getLocalCollection(`mviewie_liked_${uid}`).filter((a) => a.id !== album.id);
    setLocalCollection(`mviewie_liked_${uid}`, local);
  } else {
    // Add to Firestore with current timestamp for latest-first sorting
    const albumDoc: Album = {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl || undefined,
      releaseYear: album.releaseYear || undefined,
      source: album.source,
      dateAdded: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, albumDoc);
    } catch (error) {
      console.warn('Firestore write error, updating local storage:', error);
    }

    // Update Local Storage
    const local = getLocalCollection(`mviewie_liked_${uid}`);
    if (!local.some((a) => a.id === album.id)) {
      local.unshift(albumDoc);
      setLocalCollection(`mviewie_liked_${uid}`, local);
    }
  }
}

/**
 * Toggle Album in 'toListen' collection (Add if absent, Remove if present)
 */
export async function toggleToListenAlbum(
  uid: string,
  album: Album,
  isCurrentlyToListen: boolean
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'toListen', album.id);

  if (isCurrentlyToListen) {
    // Remove from Firestore
    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Firestore delete error, updating local storage:', error);
    }
    // Update Local Storage
    const local = getLocalCollection(`mviewie_toListen_${uid}`).filter((a) => a.id !== album.id);
    setLocalCollection(`mviewie_toListen_${uid}`, local);
  } else {
    // Add to Firestore with current timestamp for latest-first sorting
    const albumDoc: Album = {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl || undefined,
      releaseYear: album.releaseYear || undefined,
      source: album.source,
      dateAdded: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, albumDoc);
    } catch (error) {
      console.warn('Firestore write error, updating local storage:', error);
    }

    // Update Local Storage
    const local = getLocalCollection(`mviewie_toListen_${uid}`);
    if (!local.some((a) => a.id === album.id)) {
      local.unshift(albumDoc);
      setLocalCollection(`mviewie_toListen_${uid}`, local);
    }
  }
}
