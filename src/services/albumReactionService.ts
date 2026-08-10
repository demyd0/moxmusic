import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';

/** Global, public reactions on an album/track - separate from the private
 *  per-user "liked" system. Doc id is the album/track id, content is a flat
 *  uid -> emoji map (mirrors the chat message reactions shape). */
export function subscribeToAlbumReactions(albumId: string, callback: (reactions: Record<string, string>) => void): () => void {
  return onSnapshot(
    doc(db, 'albumReactions', albumId),
    (snap) => callback((snap.data() as Record<string, string> | undefined) || {}),
    (error) => console.warn('Album reactions subscription error:', error)
  );
}

/** Sets or changes the caller's reaction on an album/track. */
export async function setAlbumReaction(albumId: string, uid: string, emoji: string): Promise<void> {
  await setDoc(doc(db, 'albumReactions', albumId), { [uid]: emoji }, { merge: true });
}

/** Clears the caller's reaction on an album/track. */
export async function removeAlbumReaction(albumId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'albumReactions', albumId), { [uid]: deleteField() });
}
