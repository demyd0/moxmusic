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
 * Subscribe to real-time updates for Liked and ToListen collections for a user.
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
  const unsubLiked = onSnapshot(
    likedRef,
    (snapshot) => {
      likedAlbums = snapshot.docs.map((d) => d.data() as Album);
      likedIds = new Set(likedAlbums.map((a) => a.id));
      setLocalCollection(`mviewie_liked_${uid}`, likedAlbums);
      emit();
    },
    (error) => {
      console.warn('Firestore liked collection sync warning, using local state fallback:', error);
      likedAlbums = getLocalCollection(`mviewie_liked_${uid}`);
      likedIds = new Set(likedAlbums.map((a) => a.id));
      emit();
    }
  );

  // 2. Subscribe to 'toListen' collection
  const toListenRef = collection(db, 'users', uid, 'toListen');
  const unsubToListen = onSnapshot(
    toListenRef,
    (snapshot) => {
      toListenAlbums = snapshot.docs.map((d) => d.data() as Album);
      toListenIds = new Set(toListenAlbums.map((a) => a.id));
      setLocalCollection(`mviewie_toListen_${uid}`, toListenAlbums);
      emit();
    },
    (error) => {
      console.warn('Firestore toListen collection sync warning, using local state fallback:', error);
      toListenAlbums = getLocalCollection(`mviewie_toListen_${uid}`);
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
 * Fetch Public Shared Liked Collection for a specific user ID
 */
export async function fetchSharedLikedCollection(uid: string): Promise<Album[]> {
  if (!uid) return [];
  try {
    const likedRef = collection(db, 'users', uid, 'liked');
    const snapshot = await getDocs(likedRef);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => d.data() as Album);
    }
  } catch (error) {
    console.warn('Firestore shared fetch failed or offline, checking local storage:', error);
  }

  return getLocalCollection(`mviewie_liked_${uid}`);
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
    // Add to Firestore
    const albumDoc = {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl || null,
      releaseYear: album.releaseYear || null,
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
      local.unshift(album);
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
    // Add to Firestore
    const albumDoc = {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl || null,
      releaseYear: album.releaseYear || null,
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
      local.unshift(album);
      setLocalCollection(`mviewie_toListen_${uid}`, local);
    }
  }
}
