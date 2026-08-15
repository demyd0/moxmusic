import React from 'react';
import { MILESTONES, getMilestoneProgress, type UserStats, type BadgeIconKey } from '@/lib/milestones';
import { AVATAR_FRAMES } from '@/lib/avatarFrames';
import { BACKGROUND_EFFECTS } from '@/lib/profileValidation';
import { BADGE_ICONS, BADGE_TIER_STYLE } from '@/lib/badgeIcons';
import { Trophy, Lock, Palette, Sparkle } from 'lucide-react';

function rewardLabel(reward: { type: 'avatarFrame' | 'backgroundEffect' | 'badge'; value?: string; icon?: BadgeIconKey; tier?: number }): string {
  if (reward.type === 'avatarFrame') {
    const frame = AVATAR_FRAMES.find((f) => f.value === reward.value);
    return `${frame?.label || reward.value} FRAME`;
  }
  if (reward.type === 'backgroundEffect') {
    const effect = BACKGROUND_EFFECTS.find((e) => e.value === reward.value);
    return `${effect?.label || reward.value} EFFECT`;
  }
  return 'BADGE';
}

const STAT_LABELS: Record<keyof UserStats, string> = {
  likedCount: 'liked albums/tracks',
  followerCount: 'followers',
  followingCount: 'people followed',
  showcaseCount: 'showcases created',
  bioLength: 'characters in your bio',
  followedArtistsCount: 'artists followed',
  toListenCount: 'albums queued to listen',
  viewCount: 'profile views',
};

/**
 * Spells out the whole milestone system in one place: what each
 * achievement requires, how close you are, and exactly what it unlocks.
 * Built for a narrow sidebar column (see ProfileEditPage's layout) -
 * compact single-column rows with their own scroll region, since the list
 * has grown well past what fits on one screen.
 */
export const AchievementsPanel: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const unlockedCount = MILESTONES.filter((m) => stats[m.statKey] >= m.target).length;

  return (
    <section className="border-2 border-black bg-white p-5 hard-shadow flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <h2 className="font-header text-lg font-extrabold uppercase text-black flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span>ACHIEVEMENTS</span>
        </h2>
      </div>
      <p className="font-mono text-[11px] font-bold text-neutral-500 mb-4 shrink-0">
        {unlockedCount}/{MILESTONES.length} UNLOCKED
      </p>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {MILESTONES.map((m) => {
          const { current, target } = getMilestoneProgress(m, stats);
          const isUnlocked = current >= target;
          const pct = Math.min(100, Math.round((current / target) * 100));
          const BadgeIcon = m.reward.type === 'badge' ? BADGE_ICONS[m.reward.icon] : null;
          const tierStyle = m.reward.type === 'badge' ? BADGE_TIER_STYLE[m.reward.tier] : null;

          return (
            <div
              key={m.id}
              className={`border p-2.5 transition-all ${isUnlocked ? 'border-black bg-white' : 'border-black/15 bg-neutral-50'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isUnlocked ? (
                    <Trophy className="h-3 w-3 shrink-0 text-amber-500" />
                  ) : (
                    <Lock className="h-3 w-3 shrink-0 text-neutral-400" />
                  )}
                  <span className={`font-mono text-[10.5px] font-bold uppercase tracking-wider truncate ${isUnlocked ? 'text-black' : 'text-neutral-500'}`}>
                    {m.title}
                  </span>
                </div>
                <span className="font-mono text-[9px] font-bold text-neutral-400 shrink-0">
                  {current}/{target}
                </span>
              </div>

              <p className="font-mono text-[10px] text-neutral-500 mb-1.5 leading-snug">{m.description}</p>

              <div className="h-1 w-full bg-neutral-200 mb-1.5">
                <div className={`h-full ${isUnlocked ? 'bg-amber-500' : 'bg-black/40'}`} style={{ width: `${pct}%` }} />
              </div>

              {m.reward.type === 'badge' && BadgeIcon && tierStyle ? (
                <div
                  className="inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: tierStyle.bg, borderColor: tierStyle.border, color: tierStyle.text, boxShadow: tierStyle.glow }}
                >
                  <BadgeIcon className="h-2.5 w-2.5" />
                  <span>{m.title}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  {m.reward.type === 'avatarFrame' ? <Sparkle className="h-2.5 w-2.5" /> : <Palette className="h-2.5 w-2.5" />}
                  <span>{rewardLabel(m.reward)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[9px] text-neutral-400 uppercase tracking-wider shrink-0">
        PROGRESS COUNTS: {Object.values(STAT_LABELS).join(', ')}.
      </p>
    </section>
  );
};
