import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const PICKER_WIDTH = 230;
const PICKER_HEIGHT = 44;

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
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToAlbumReactions(albumId, setReactions);
    return () => unsub();
  }, [albumId]);

  // Rendered via a portal to <body> (see below) instead of a plain
  // absolutely-positioned child, so it can't get clipped by an ancestor's
  // overflow:auto/hidden - the tracklist table's horizontal-scroll wrapper
  // on AlbumDetailsPage was cutting this popup off for rows near the edges
  // of that container, most visibly the very first track (it always opened
  // upward and had nowhere to go). Flips to open downward when there isn't
  // room above the trigger, and closes on scroll/outside click since a
  // portaled popup no longer moves with its trigger.
  useEffect(() => {
    if (!pickerOpen) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const opensUp = rect.top > PICKER_HEIGHT + 12;
      setPickerPos({
        top: opensUp ? rect.top - PICKER_HEIGHT - 4 : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 8)),
      });
    }

    const closeOnScroll = () => setPickerOpen(false);
    const closeOnOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    window.addEventListener('scroll', closeOnScroll, true);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('scroll', closeOnScroll, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [pickerOpen]);

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
        ref={triggerRef}
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        title="React"
        className="flex h-6 w-6 shrink-0 items-center justify-center border border-black/20 text-neutral-400 hover:border-black hover:text-black transition-colors"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>
      {pickerOpen && pickerPos && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 border-2 border-black bg-white p-1 hard-shadow-sm"
          style={{ top: pickerPos.top, left: pickerPos.left }}
        >
          <ReactionBar reactions={reactions} currentUserId={currentUserId} onReact={handleReact} />
        </div>,
        document.body
      )}
    </div>
  );
};
