import { db } from '@/lib/firebase';
import { collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getPublicUserProfile } from '@/services/userService';

export interface FollowUser {
  uid: string;
  username: string;
  photoURL?: string;
}

function followDocId(followerUid: string, followingUid: string): string {
  return `${followerUid}_${followingUid}`;
}

export async function isFollowing(followerUid: string, followingUid: string): Promise<boolean> {
  if (!followerUid || !followingUid) return false;
  try {
    const snap = await getDoc(doc(db, 'follows', followDocId(followerUid, followingUid)));
    return snap.exists();
  } catch (error) {
    console.warn('Failed to check follow status:', error);
    return false;
  }
}

export async function isMutualFollow(uidA: string, uidB: string): Promise<boolean> {
  const [a, b] = await Promise.all([isFollowing(uidA, uidB), isFollowing(uidB, uidA)]);
  return a && b;
}

export async function followUser(followerUid: string, followingUid: string): Promise<void> {
  if (!followerUid || !followingUid || followerUid === followingUid) return;
  const docRef = doc(db, 'follows', followDocId(followerUid, followingUid));
  await setDoc(docRef, {
    followerUid,
    followingUid,
    createdAt: new Date().toISOString(),
  });
}

export async function unfollowUser(followerUid: string, followingUid: string): Promise<void> {
  if (!followerUid || !followingUid) return;
  await deleteDoc(doc(db, 'follows', followDocId(followerUid, followingUid)));
}

export async function getFollowerCount(uid: string): Promise<number> {
  if (!uid) return 0;
  try {
    const q = query(collection(db, 'follows'), where('followingUid', '==', uid));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (error) {
    console.warn('Failed to count followers:', error);
    return 0;
  }
}

export async function getFollowingCount(uid: string): Promise<number> {
  if (!uid) return 0;
  try {
    const q = query(collection(db, 'follows'), where('followerUid', '==', uid));
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (error) {
    console.warn('Failed to count following:', error);
    return 0;
  }
}

async function resolveFollowUsers(uids: string[]): Promise<FollowUser[]> {
  const profiles = await Promise.all(
    uids.map(async (uid): Promise<FollowUser | null> => {
      const profile = await getPublicUserProfile(uid);
      if (!profile?.username) return null;
      return { uid, username: profile.username, photoURL: profile.photoURL };
    })
  );
  return profiles.filter((p): p is FollowUser => Boolean(p));
}

export async function getFollowers(uid: string): Promise<FollowUser[]> {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'follows'), where('followingUid', '==', uid));
    const snap = await getDocs(q);
    return resolveFollowUsers(snap.docs.map((d) => d.data().followerUid));
  } catch (error) {
    console.warn('Failed to fetch followers:', error);
    return [];
  }
}

export async function getFollowing(uid: string): Promise<FollowUser[]> {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'follows'), where('followerUid', '==', uid));
    const snap = await getDocs(q);
    return resolveFollowUsers(snap.docs.map((d) => d.data().followingUid));
  } catch (error) {
    console.warn('Failed to fetch following:', error);
    return [];
  }
}
