import { db } from '@/lib/firebase';
import { collection, doc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface FollowedArtist {
  artistId: string;
  artistName: string;
  followedAt: number;
}

/** artistId can be a raw artist name when no stable itunes/mb id is
 *  available (see ArtistDiscographyPage's :id route param) - encode it so
 *  it's always a valid Firestore doc id regardless of what characters the
 *  name contains. */
function docId(artistId: string): string {
  return encodeURIComponent(artistId);
}

export function subscribeFollowedArtists(uid: string, callback: (artists: FollowedArtist[]) => void): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'followedArtists'),
    (snap) => {
      const artists = (snap.docs.map((d) => d.data()) as FollowedArtist[]).sort((a, b) => b.followedAt - a.followedAt);
      callback(artists);
    },
    (error) => console.warn('Followed artists subscription error:', error)
  );
}

export async function followArtist(uid: string, artistId: string, artistName: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'followedArtists', docId(artistId)), {
    artistId,
    artistName,
    followedAt: Date.now(),
  });
}

export async function unfollowArtist(uid: string, artistId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'followedArtists', docId(artistId)));
}
