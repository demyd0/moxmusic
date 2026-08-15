import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, writeBatch, getDocs, where } from 'firebase/firestore';
import { getPublicUserProfile } from '@/services/userService';
import { omitUndefined } from '@/lib/utils';

export interface NotificationEvent {
  id: string;
  type: 'follow';
  fromUid: string;
  fromUsername: string;
  fromPhotoURL?: string;
  createdAt: number;
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;

export function subscribeNotifications(uid: string, callback: (events: NotificationEvent[]) => void): () => void {
  const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(MAX_NOTIFICATIONS));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationEvent));
    },
    (error) => console.warn('Notifications subscription error:', error)
  );
}

/** Writes into the FOLLOWED user's private notification inbox - the
 *  follower is the writer here, not the owner, so firestore.rules only
 *  lets a create through when fromUid matches the caller's own uid. */
export async function notifyFollow(followerUid: string, followingUid: string): Promise<void> {
  try {
    const profile = await getPublicUserProfile(followerUid);
    if (!profile?.username) return;
    await addDoc(
      collection(db, 'users', followingUid, 'notifications'),
      omitUndefined({
        type: 'follow' as const,
        fromUid: followerUid,
        fromUsername: profile.username,
        fromPhotoURL: profile.photoURL,
        createdAt: Date.now(),
        read: false,
      })
    );
  } catch (error) {
    console.warn('Failed to write follow notification:', error);
  }
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  try {
    const q = query(collection(db, 'users', uid, 'notifications'), where('read', '==', false));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (error) {
    console.warn('Failed to mark notifications read:', error);
  }
}
