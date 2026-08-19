import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/services/userService';
import { ensureConversation, subscribeToConversations } from '@/services/chatService';
import { playNotificationSound } from '@/lib/notificationSound';
import type { ChatParticipantInfo, Conversation } from '@/types/chat';

interface ChatContextValue {
  currentUserId: string | null;
  isOpen: boolean;
  view: 'list' | 'thread';
  activeConversationId: string | null;
  conversations: Conversation[];
  unreadCount: number;
  error: string | null;
  openList: () => void;
  openConversationWith: (uid: string, info: ChatParticipantInfo) => Promise<void>;
  openConversation: (conversationId: string) => void;
  close: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/** Mounted once at the app root (see App.tsx) so the panel and its unread
 *  badge persist across page navigation instead of remounting per-page
 *  the way Header.tsx does. */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<ChatParticipantInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (!user || user.isAnonymous) {
        setCurrentUserId(null);
        setCurrentUserInfo(null);
        setConversations([]);
        return;
      }
      setCurrentUserId(user.uid);
      const profile = await getUserProfile(user.uid);
      if (profile?.username) {
        setCurrentUserInfo({ username: profile.username, photoURL: profile.photoURL });
      }
    });
    return () => unsubAuth();
  }, []);

  // Tracks the last-seen lastMessageAt per conversation so a real new
  // incoming message can be told apart from "the subscription just fired
  // again" (re-sorted order, your own sent message updating the same doc,
  // a reconnect replaying the current snapshot, etc). The very first
  // snapshot after (re)subscribing is the existing state, not new
  // activity, so it's recorded silently without a sound.
  const lastMessageTimestamps = useRef<Map<string, number>>(new Map());
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;
    hasLoadedOnce.current = false;
    lastMessageTimestamps.current = new Map();
    const unsub = subscribeToConversations(currentUserId, (convos) => {
      if (hasLoadedOnce.current) {
        const hasNewIncoming = convos.some((c) => {
          if (!c.lastMessageSenderId || c.lastMessageSenderId === currentUserId) return false;
          const prevSeen = lastMessageTimestamps.current.get(c.id) || 0;
          return c.lastMessageAt > prevSeen;
        });
        if (hasNewIncoming) playNotificationSound();
      }
      convos.forEach((c) => lastMessageTimestamps.current.set(c.id, c.lastMessageAt));
      hasLoadedOnce.current = true;
      setConversations(convos);
    });
    return () => unsub();
  }, [currentUserId]);

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0;
    return conversations.filter(
      (c) => c.lastMessageSenderId && c.lastMessageSenderId !== currentUserId && c.lastMessageAt > (c.lastRead[currentUserId] || 0)
    ).length;
  }, [conversations, currentUserId]);

  const openList = () => {
    setView('list');
    setIsOpen(true);
  };

  const openConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setView('thread');
    setIsOpen(true);
  };

  const openConversationWith = async (uid: string, info: ChatParticipantInfo) => {
    if (!currentUserId || !currentUserInfo) return;
    setError(null);
    try {
      const conversationId = await ensureConversation(currentUserId, currentUserInfo, uid, info);
      openConversation(conversationId);
    } catch (err) {
      console.error('Failed to open conversation:', err);
      setError("CAN'T MESSAGE THIS USER — YOU DON'T FOLLOW EACH OTHER");
    }
  };

  const close = () => setIsOpen(false);
  const clearError = () => setError(null);

  return (
    <ChatContext.Provider
      value={{
        currentUserId,
        isOpen,
        view,
        activeConversationId,
        conversations,
        unreadCount,
        error,
        openList,
        openConversationWith,
        openConversation,
        close,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
