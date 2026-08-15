import React from 'react';
import { MILESTONES, getMilestoneProgress, type UserStats, type Milestone, type BadgeIconKey } from '@/lib/milestones';
import { AVATAR_FRAMES } from '@/lib/avatarFrames';
import { BACKGROUND_EFFECTS } from '@/lib/profileValidation';
import { NAME_EFFECTS } from '@/lib/nameEffects';
import { BADGE_ICONS, BADGE_TIER_STYLE } from '@/lib/badgeIcons';
import { Trophy, Lock, Palette, Sparkle, Type as TypeIcon } from 'lucide-react';

function rewardLabel(reward: Milestone['reward']): string {
  if (reward.type === 'avatarFrame') {
    const frame = AVATAR_FRAMES.find((f) => f.value === reward.value);
    return `${frame?.label || reward.value} FRAME`;
  }
  if (reward.type === 'backgroundEffect') {
    const effect = BACKGROUND_EFFECTS.find((e) => e.value === reward.value);
    return `${effect?.label || reward.value} EFFECT`;
  }
  if (reward.type === 'nameEffect') {
    const effect = NAME_EFFECTS.find((e) => e.value === reward.value);
    return `${effect?.label || reward.value} NAME STYLE`;
  }
  return 'BADGE';
}

const CATEGORY_LABELS: Record<keyof UserStats, string> = {
  likedCount: 'LIKES',
  followerCount: 'FOLLOWERS',
  followingCount: 'FOLLOWING',
  showcaseCount: 'SHOWCASES',
  bioLength: 'BIO',
  followedArtistsCount: 'ARTISTS FOLLOWED',
  toListenCount: 'LISTEN QUEUE',
  viewCount: 'PROFILE VIEWS',
};

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

// Milestones are already declared grouped by statKey (see milestones.ts) -
// group them here in that same order rather than iterating a fixed
// category list, so a new statKey added there shows up automatically.
function groupByCategory(): { statKey: keyof UserStats; milestones: Milestone[] }[] {
  const groups: { statKey: keyof UserStats; milestones: Milestone[] }[] = [];
  for (const m of MILESTONES) {
    const last = groups[groups.length - 1];
    if (last && last.statKey === m.statKey) {
      last.milestones.push(m);
    } else {
      groups.push({ statKey: m.statKey, milestones: [m] });
    }
  }
  return groups;
}

const CATEGORIES = groupByCategory();

/**
 * Spells out the whole milestone system in one place: what each
 * achievement requires, how close you are, and exactly what it unlocks.
 * Rendered full-width, grouped by category, with no internal scroll region
 * - the page itself scrolls, so all 46+ achievements are reachable without
 * hunting through a cramped fixed-height box.
 */
export const AchievementsPanel: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const unlockedCount = MILESTONES.filter((m) => stats[m.statKey] >= m.target).length;

  return (
    <section className="border-2 border-black bg-white p-5 sm:p-6 hard-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="font-header text-lg font-extrabold uppercase text-black flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span>ACHIEVEMENTS</span>
        </h2>
        <span className="font-mono text-[11px] font-bold text-neutral-500">
          {unlockedCount}/{MILESTONES.length} UNLOCKED
        </span>
      </div>

      <div className="mt-4 space-y-5">
        {CATEGORIES.map(({ statKey, milestones }) => (
          <div key={statKey}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {CATEGORY_LABELS[statKey]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {milestones.map((m) => {
                const { current, target } = getMilestoneProgress(m, stats);
                const isUnlocked = current >= target;
                const pct = Math.min(100, Math.round((current / target) * 100));
                const BadgeIcon = m.reward.type === 'badge' ? BADGE_ICONS[m.reward.icon as BadgeIconKey] : null;
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
                        {m.reward.type === 'avatarFrame' ? (
                          <Sparkle className="h-2.5 w-2.5" />
                        ) : m.reward.type === 'nameEffect' ? (
                          <TypeIcon className="h-2.5 w-2.5" />
                        ) : (
                          <Palette className="h-2.5 w-2.5" />
                        )}
                        <span>{rewardLabel(m.reward)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 pt-4 border-t-2 border-black/10 font-mono text-[9px] text-neutral-400 uppercase tracking-wider">
        PROGRESS COUNTS: {Object.values(STAT_LABELS).join(', ')}.
      </p>
    </section>
  );
};
