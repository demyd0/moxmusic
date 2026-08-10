import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { omitUndefined } from '@/lib/utils';
import type { ChatMessage, ChatParticipantInfo, Conversation, SharedAlbumRef } from '@/types/chat';
import { MAX_MESSAGE_LENGTH } from '@/types/chat';

/** Deterministic id: sorted so there's exactly one conversation doc per
 *  pair, and firestore.rules can validate it against participants without
 *  trusting the client's ordering. */
export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

/**
 * Creates the conversation doc if it doesn't exist yet (idempotent - safe
 * to call every time a chat is opened). firestore.rules is the real
 * enforcement of "mutual follows only"; this will reject with
 * permission-denied if that's not the case, which the caller should catch.
 */
export async function ensureConversation(
  myUid: string,
  myInfo: ChatParticipantInfo,
  otherUid: string,
  otherInfo: ChatParticipantInfo
): Promise<string> {
  const conversationId = getConversationId(myUid, otherUid);
  const [uid1, uid2] = [myUid, otherUid].sort();
  const info1 = uid1 === myUid ? myInfo : otherInfo;
  const info2 = uid2 === myUid ? myInfo : otherInfo;

  await setDoc(
    doc(db, 'conversations', conversationId),
    omitUndefined({
      participants: [uid1, uid2],
      participantInfo: { [uid1]: info1, [uid2]: info2 },
      lastMessageText: '',
      lastMessageSenderId: '',
      lastMessageAt: Date.now(),
      lastRead: {},
    }),
    { merge: true }
  );

  return conversationId;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: { text?: string; album?: SharedAlbumRef }
): Promise<void> {
  const text = content.text?.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text && !content.album) return;

  const now = Date.now();
  await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    omitUndefined({ senderId, text: text || undefined, album: content.album, createdAt: now })
  );

  const preview = text || (content.album ? `SHARED: ${content.album.title}` : '');
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessageText: preview.slice(0, 120),
    lastMessageSenderId: senderId,
    lastMessageAt: now,
    [`lastRead.${senderId}`]: now,
  });
}

/** Sets, changes, or clears (by passing the same emoji again) the caller's
 *  single reaction on a message. firestore.rules restricts each caller to
 *  only ever touching their own key in the map. */
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  uid: string,
  emoji: string,
  currentReaction: string | undefined
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    [`reactions.${uid}`]: currentReaction === emoji ? deleteField() : emoji,
  });
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`lastRead.${uid}`]: Date.now(),
    });
  } catch (error) {
    console.warn('Failed to mark conversation read:', error);
  }
}

export function subscribeToConversations(uid: string, callback: (conversations: Conversation[]) => void): () => void {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const conversations = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participants: data.participants,
            participantInfo: data.participantInfo || {},
            lastMessageText: data.lastMessageText || '',
            lastMessageSenderId: data.lastMessageSenderId || '',
            lastMessageAt: toMillis(data.lastMessageAt),
            lastRead: Object.fromEntries(
              Object.entries(data.lastRead || {}).map(([k, v]) => [k, toMillis(v)])
            ),
          } as Conversation;
        })
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      callback(conversations);
    },
    (error) => console.warn('Conversations subscription error:', error)
  );
}

const MAX_MESSAGES_LOADED = 200;

export function subscribeToMessages(conversationId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(MAX_MESSAGES_LOADED)
  );
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            text: data.text,
            album: data.album,
            createdAt: toMillis(data.createdAt),
            reactions: data.reactions,
          } as ChatMessage;
        })
        .sort((a, b) => a.createdAt - b.createdAt);
      callback(messages);
    },
    (error) => console.warn('Messages subscription error:', error)
  );
}

