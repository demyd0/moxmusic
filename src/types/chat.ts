/** Lightweight album reference for a shared-in-chat message - just the
 *  display fields, not the full Album shape, so messages stay small.
 *  coverUrl points at the same external (iTunes/Cover Art Archive) URLs
 *  used everywhere else in the app - never re-hosted, no Storage needed. */
export interface SharedAlbumRef {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
}

export interface ChatParticipantInfo {
  username: string;
  photoURL?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  album?: SharedAlbumRef;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: [string, string];
  participantInfo: Record<string, ChatParticipantInfo>;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: number;
  /** Per-participant "last read" timestamp, used to compute unread state. */
  lastRead: Record<string, number>;
}

export const MAX_MESSAGE_LENGTH = 2000;
