import React, { useState } from 'react';
import type { Milestone } from '@/lib/milestones';
import { avatarFrameWrapperClassName } from '@/lib/avatarFrames';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface MilestoneRevealModalProps {
  milestones: Milestone[];
  onDone: () => void;
}

/** A Spotify-Wrap-style slideshow shown once per new milestone unlock. */
export const MilestoneRevealModal: React.FC<MilestoneRevealModalProps> = ({ milestones, onDone }) => {
  const [index, setIndex] = useState(0);
  if (milestones.length === 0) return null;

  const milestone = milestones[index];
  const isLast = index === milestones.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="relative w-full max-w-sm border-2 border-black bg-white p-8 text-center hard-shadow">
        <button
          type="button"
          onClick={onDone}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-black transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 mb-6 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>NEW MILESTONE {index + 1}/{milestones.length}</span>
        </div>

        <div className="flex justify-center mb-6">
          <div className={`h-28 w-28 rounded-full ${avatarFrameWrapperClassName(milestone.frame)}`}>
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <h2 className="font-header text-2xl font-extrabold uppercase text-black mb-2">{milestone.title}</h2>
        <p className="font-mono text-xs text-neutral-500 mb-1">{milestone.description}</p>
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider mb-6" style={{ color: '#000' }}>
          UNLOCKED THE {milestone.frame.toUpperCase()} AVATAR FRAME
        </p>

        <button
          type="button"
          onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
          className="inline-flex items-center gap-2 border-2 border-black bg-black px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
        >
          <span>{isLast ? 'AWESOME' : 'NEXT'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
