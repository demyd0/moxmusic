import React, { useEffect, useState } from 'react';
import { subscribeToAlbumReactions, setAlbumReaction, removeAlbumReaction } from '@/services/albumReactionService';
import { ReactionBar } from './ReactionBar';
import { SmilePlus } from 'lucide-react';

interface AlbumReactionWidgetProps {
  albumId: string;
  currentUserId: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  /** Compact renders only reactions that already have a count (plus a
   *  small "+" toggle for the full picker) - used for tight table rows. */
  compact?: boolean;
}

/** Global, public reactions on an album/track - self-contained: owns its
 *  own subscription so it can be dropped in wherever an album or track is
 *  shown (hero section, tracklist rows) without the parent managing state. */
export const AlbumReactionWidget: React.FC<AlbumReactionWidgetProps> = ({
  albumId,
  currentUserId,
  isAuthenticated,
  onRequireAuth,
  compact,
}) => {
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAlbumReactions(albumId, setReactions);
    return () => unsub();
  }, [albumId]);

  const handleReact = async (emoji: string) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setPickerOpen(false);
    const mine = reactions[currentUserId];
    if (mine === emoji) {
      await removeAlbumReaction(albumId, currentUserId);
    } else {
      await setAlbumReaction(albumId, currentUserId, emoji);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <ReactionBar reactions={reactions} currentUserId={currentUserId} onReact={handleReact} compact={compact} />
      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        title="React"
        className="flex h-6 w-6 shrink-0 items-center justify-center border border-black/20 text-neutral-400 hover:border-black hover:text-black transition-colors"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>
      {pickerOpen && (
        <div className="absolute bottom-full left-0 z-20 mb-1 border-2 border-black bg-white p-1 hard-shadow-sm">
          <ReactionBar reactions={reactions} currentUserId={currentUserId} onReact={handleReact} />
        </div>
      )}
    </div>
  );
};
