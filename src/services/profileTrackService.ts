import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

export const MAX_PROFILE_TRACK_BYTES = 10 * 1024 * 1024; // 10MB, matches storage.rules
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac', 'audio/webm'];

export function isAllowedAudioFile(file: File): boolean {
  return ALLOWED_AUDIO_TYPES.includes(file.type) && file.size <= MAX_PROFILE_TRACK_BYTES;
}

/**
 * Uploads an audio file to profileTracks/{uid}/ and returns its public
 * download URL. Clears any previously uploaded track first so a user
 * swapping tracks doesn't silently accumulate orphaned files in Storage.
 */
export async function uploadProfileTrack(uid: string, file: File): Promise<string> {
  if (!isAllowedAudioFile(file)) {
    throw new Error('Unsupported audio file (must be under 10MB, common audio format)');
  }

  await clearProfileTrack(uid).catch(() => {});

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `profileTracks/${uid}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

export async function clearProfileTrack(uid: string): Promise<void> {
  const folderRef = ref(storage, `profileTracks/${uid}`);
  const list = await listAll(folderRef);
  await Promise.all(list.items.map((item) => deleteObject(item)));
}
