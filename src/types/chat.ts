/** Lightweight album reference for a shared-in-chat message - just the
 *  display fields, not the full Album shape, so messages stay small.
 *  coverUrl points at the same external (iTunes/Cover Art Archive) URLs
 *  used everywhere else in the app - never re-hosted, no Storage needed. */
export interface SharedAlbumRef {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  /** 'track' for an individually-shared song rather than a whole album -
   *  mirrors Album.kind so the same "no real album page, search instead"
   *  handling applies when the recipient clicks it. */
  kind?: 'album' | 'track';
  /** Only set when kind === 'track'. */
  albumTitle?: string;
}

export interface ChatParticipantInfo {
  username: string;
  photoURL?: string;
}

/** Fixed, curated reaction set - same reasoning as everywhere else this
 *  app takes user "input" via a preset list rather than free text. */
export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😮', '👍', '💀'];

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  album?: SharedAlbumRef;
  createdAt: number;
  /** uid -> the single emoji they reacted with. */
  reactions?: Record<string, string>;
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
