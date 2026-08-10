import React from 'react';
import { MILESTONES, getMilestoneProgress, type UserStats } from '@/lib/milestones';
import { AVATAR_FRAMES } from '@/lib/avatarFrames';
import { BACKGROUND_EFFECTS } from '@/lib/profileValidation';
import { Trophy, Lock, Palette, Sparkle } from 'lucide-react';

function rewardLabel(reward: { type: 'avatarFrame' | 'backgroundEffect'; value: string }): string {
  if (reward.type === 'avatarFrame') {
    const frame = AVATAR_FRAMES.find((f) => f.value === reward.value);
    return `${frame?.label || reward.value} AVATAR FRAME`;
  }
  const effect = BACKGROUND_EFFECTS.find((e) => e.value === reward.value);
  return `${effect?.label || reward.value} BACKGROUND EFFECT`;
}

const STAT_LABELS: Record<keyof UserStats, string> = {
  likedCount: 'liked albums/tracks',
  followerCount: 'followers',
  followingCount: 'people followed',
  showcaseCount: 'showcases created',
  bioLength: 'characters in your bio',
};

/**
 * Spells out the whole milestone system in one place: what each
 * achievement requires, how close you are, and exactly what it unlocks.
 * The avatar-frame/background-effect pickers only show a lock icon,
 * which wasn't enough for people to understand where the rewards come
 * from - this panel is the explanation.
 */
export const AchievementsPanel: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const unlockedCount = MILESTONES.filter((m) => stats[m.statKey] >= m.target).length;

  return (
    <section className="border-2 border-black bg-white p-6 hard-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="font-header text-lg font-extrabold uppercase text-black flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span>ACHIEVEMENTS</span>
        </h2>
        <span className="font-mono text-xs font-bold text-neutral-500">
          {unlockedCount}/{MILESTONES.length} UNLOCKED
        </span>
      </div>
      <p className="font-mono text-[11px] text-neutral-500 uppercase tracking-wider mb-4">
        USE THE SITE TO EARN AVATAR FRAMES AND BACKGROUND EFFECTS — SELECTABLE BELOW ONCE UNLOCKED.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {MILESTONES.map((m) => {
          const { current, target } = getMilestoneProgress(m, stats);
          const isUnlocked = current >= target;
          const pct = Math.min(100, Math.round((current / target) * 100));

          return (
            <div
              key={m.id}
              className={`border-2 p-3 transition-all ${isUnlocked ? 'border-black bg-white' : 'border-black/15 bg-neutral-50'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isUnlocked ? (
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  )}
                  <span className={`font-mono text-xs font-bold uppercase tracking-wider truncate ${isUnlocked ? 'text-black' : 'text-neutral-500'}`}>
                    {m.title}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-neutral-400 shrink-0">
                  {current}/{target}
                </span>
              </div>

              <p className="font-mono text-[11px] text-neutral-500 mb-2">{m.description}</p>

              <div className="h-1.5 w-full bg-neutral-200 mb-2">
                <div
                  className={`h-full ${isUnlocked ? 'bg-amber-500' : 'bg-black/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {m.reward.type === 'avatarFrame' ? <Sparkle className="h-3 w-3" /> : <Palette className="h-3 w-3" />}
                <span>{rewardLabel(m.reward)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
        PROGRESS COUNTS: {Object.values(STAT_LABELS).join(', ')}.
      </p>
    </section>
  );
};
