import React from 'react';
import { REACTION_EMOJIS } from '@/types/chat';

interface ReactionBarProps {
  /** uid -> the single emoji they reacted with. */
  reactions: Record<string, string>;
  currentUserId: string | null;
  onReact: (emoji: string) => void;
  /** Only render emojis that already have at least one reaction (plus
   *  your own, if set) - used for the always-visible summary row.
   *  Non-compact shows all curated emojis - used as the "add a reaction"
   *  picker. */
  compact?: boolean;
  className?: string;
}

/** Shared between chat message reactions and global album/track
 *  reactions - both are just a uid -> emoji map underneath. */
export const ReactionBar: React.FC<ReactionBarProps> = ({ reactions, currentUserId, onReact, compact, className }) => {
  const counts = new Map<string, number>();
  Object.values(reactions).forEach((e) => counts.set(e, (counts.get(e) || 0) + 1));
  const myReaction = currentUserId ? reactions[currentUserId] : undefined;

  const visibleEmojis = compact ? REACTION_EMOJIS.filter((e) => (counts.get(e) || 0) > 0 || e === myReaction) : REACTION_EMOJIS;

  if (compact && visibleEmojis.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className || ''}`}>
      {visibleEmojis.map((emoji) => {
        const count = counts.get(emoji) || 0;
        const mine = myReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReact(emoji);
            }}
            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs leading-none transition-all ${
              mine ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-black hover:border-black'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-mono text-[10px] font-bold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
