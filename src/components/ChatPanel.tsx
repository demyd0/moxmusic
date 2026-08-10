import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { subscribeToMessages, sendMessage, markConversationRead } from '@/services/chatService';
import { subscribeUserCollections } from '@/services/collectionService';
import type { ChatMessage } from '@/types/chat';
import type { Album } from '@/types/album';
import { ChatAlbumPicker } from './ChatAlbumPicker';
import { X, ArrowLeft, Send, Disc3, MessageCircle, ImagePlus } from 'lucide-react';

/** Slide-in DM panel - mounted once at the app root (App.tsx) via
 *  ChatProvider so it survives page navigation instead of remounting. */
export const ChatPanel: React.FC = () => {
  const { currentUserId, isOpen, view, activeConversationId, conversations, error, openList, openConversation, close, clearError } = useChat();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [likedAlbums, setLikedAlbums] = useState<Album[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeUserCollections(currentUserId, (state) => {
      setLikedAlbums(state.likedAlbums.filter((a) => a.kind !== 'track'));
    });
    return () => unsub();
  }, [currentUserId]);

  useEffect(() => {
    if (!activeConversationId || view !== 'thread') {
      setMessages([]);
      return;
    }
    const unsub = subscribeToMessages(activeConversationId, setMessages);
    return () => unsub();
  }, [activeConversationId, view]);

  useEffect(() => {
    if (view === 'thread' && activeConversationId && currentUserId && isOpen) {
      markConversationRead(activeConversationId, currentUserId);
    }
  }, [view, activeConversationId, currentUserId, isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!currentUserId) return null;

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const otherUid = activeConversation?.participants.find((p) => p !== currentUserId);
  const otherInfo = otherUid ? activeConversation?.participantInfo[otherUid] : null;

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeConversationId) return;
    const text = draft;
    setDraft('');
    await sendMessage(activeConversationId, currentUserId, { text });
  };

  const handlePickAlbum = async (album: Album) => {
    setShowAlbumPicker(false);
    if (!activeConversationId) return;
    await sendMessage(activeConversationId, currentUserId, {
      album: { id: album.id, title: album.title, artist: album.artist, coverUrl: album.coverUrl },
    });
  };

  const goToAlbum = (albumId: string) => {
    close();
    navigate(`/album/${albumId}`);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[90] bg-black/60" onClick={close} />}
      <div
        className={`fixed top-0 right-0 z-[95] h-full w-full sm:w-96 border-l-2 border-black bg-white flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 shrink-0">
          {view === 'thread' ? (
            <button
              type="button"
              onClick={openList}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{otherInfo?.username ? `@${otherInfo.username}` : 'CHAT'}</span>
            </button>
          ) : (
            <span className="font-mono text-sm font-extrabold uppercase tracking-wider text-black">MESSAGES</span>
          )}
          <button type="button" onClick={close} className="text-neutral-400 hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-2 border-b-2 border-red-600 bg-red-50 px-4 py-2 font-mono text-[11px] text-red-600 uppercase tracking-wider">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {view === 'list' ? (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="h-8 w-8 text-neutral-300 mb-3" />
                <p className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                  NO CONVERSATIONS YET. MESSAGE SOMEONE YOU FOLLOW (AND WHO FOLLOWS YOU BACK) FROM THEIR PROFILE.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const otherUidInList = c.participants.find((p) => p !== currentUserId) || '';
                const info = c.participantInfo[otherUidInList];
                const unread =
                  Boolean(c.lastMessageSenderId) &&
                  c.lastMessageSenderId !== currentUserId &&
                  c.lastMessageAt > (c.lastRead[currentUserId] || 0);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className="flex w-full items-center gap-3 border-b border-black/10 px-4 py-3 text-left hover:bg-neutral-50 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-black text-white overflow-hidden font-mono text-xs font-bold">
                      {info?.photoURL ? (
                        <img src={info.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        info?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-black truncate">
                          @{info?.username || 'user'}
                        </span>
                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </div>
                      <p className={`font-mono text-[11px] truncate ${unread ? 'text-black font-bold' : 'text-neutral-500'}`}>
                        {c.lastMessageText || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] border-2 border-black px-3 py-2 ${mine ? 'bg-black text-white' : 'bg-white text-black'}`}>
                      {m.album && (
                        <button
                          type="button"
                          onClick={() => goToAlbum(m.album!.id)}
                          className={`mb-1.5 flex w-full items-center gap-2 border-2 p-1.5 text-left transition-opacity hover:opacity-80 ${
                            mine ? 'border-white/30' : 'border-black/20'
                          }`}
                        >
                          {m.album.coverUrl ? (
                            <img src={m.album.coverUrl} alt="" className="h-9 w-9 shrink-0 object-cover" />
                          ) : (
                            <Disc3 className="h-9 w-9 shrink-0 opacity-50" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[11px] font-bold">{m.album.title}</span>
                            <span className="block truncate font-mono text-[10px] opacity-70">{m.album.artist}</span>
                          </span>
                        </button>
                      )}
                      {m.text && <p className="whitespace-pre-wrap break-words font-mono text-xs">{m.text}</p>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendText} className="relative shrink-0 border-t-2 border-black p-3">
              {showAlbumPicker && (
                <ChatAlbumPicker albums={likedAlbums} onPick={handlePickAlbum} onClose={() => setShowAlbumPicker(false)} />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAlbumPicker((v) => !v)}
                  title="Share an album"
                  className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 transition-all"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="MESSAGE..."
                  className="min-w-0 flex-1 border-2 border-black bg-white px-3 py-2 font-mono text-xs text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-black text-white transition-all hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
};
