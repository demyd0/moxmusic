import React, { useEffect, useState } from 'react';
import { getMutualFollows, type FollowUser } from '@/services/followService';
import { ensureConversation, sendMessage } from '@/services/chatService';
import { getUserProfile } from '@/services/userService';
import type { SharedAlbumRef } from '@/types/chat';
import { X, Check, Loader2, UserIcon } from 'lucide-react';

interface ShareTrackModalProps {
  currentUserId: string;
  track: SharedAlbumRef;
  onClose: () => void;
}

/** "Send to..." picker for sharing one specific track directly from the
 *  album page - lists mutual follows (the exact set chat DMs are already
 *  restricted to) as avatars; tapping one immediately sends the track,
 *  Instagram-share-sheet style, without leaving the album page. */
export const ShareTrackModal: React.FC<ShareTrackModalProps> = ({ currentUserId, track, onClose }) => {
  const [people, setPeople] = useState<FollowUser[] | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    getMutualFollows(currentUserId).then(setPeople);
  }, [currentUserId]);

  const handleSend = async (person: FollowUser) => {
    if (sentTo.has(person.uid) || sendingTo) return;
    setSendingTo(person.uid);
    try {
      const myProfile = await getUserProfile(currentUserId);
      if (!myProfile) return;
      const conversationId = await ensureConversation(
        currentUserId,
        { username: myProfile.username, photoURL: myProfile.photoURL },
        person.uid,
        { username: person.username, photoURL: person.photoURL }
      );
      await sendMessage(conversationId, currentUserId, { album: track });
      setSentTo((s) => new Set(s).add(person.uid));
    } catch (err) {
      console.error('Failed to share track:', err);
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col border-2 border-black bg-white hard-shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-black px-4 py-3 shrink-0">
          <div className="min-w-0">
            <span className="block font-mono text-[11px] font-bold uppercase tracking-wider text-black">SEND TO...</span>
            <span className="block truncate font-mono text-[10px] text-neutral-500">
              {track.title} — {track.artist}
            </span>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-neutral-400 hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {people === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
            </div>
          ) : people.length === 0 ? (
            <p className="py-8 text-center font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
              NO ONE TO SEND TO YET — YOU NEED A MUTUAL FOLLOW TO CHAT.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {people.map((p) => {
                const sent = sentTo.has(p.uid);
                const sending = sendingTo === p.uid;
                return (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => handleSend(p)}
                    disabled={sent || Boolean(sendingTo)}
                    className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                  >
                    <div
                      className={`relative flex h-14 w-14 items-center justify-center border-2 overflow-hidden transition-all ${
                        sent ? 'border-emerald-500' : 'border-black hover:opacity-80'
                      }`}
                    >
                      {p.photoURL ? (
                        <img src={p.photoURL} alt={p.username} className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-6 w-6 text-neutral-400" />
                      )}
                      {sent && (
                        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/80">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      )}
                      {sending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <span className="max-w-full truncate font-mono text-[10px] font-bold uppercase text-black">
                      @{p.username}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
