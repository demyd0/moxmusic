import type { AvatarFrame, BackgroundEffectType } from '@/types/profile';

export interface UserStats {
  likedCount: number;
  followerCount: number;
  followingCount: number;
  showcaseCount: number;
  bioLength: number;
}

export type MilestoneReward =
  | { type: 'avatarFrame'; value: Exclude<AvatarFrame, 'none'> }
  | { type: 'backgroundEffect'; value: Exclude<BackgroundEffectType, 'none' | 'snow' | 'stars' | 'smoke'> };

export interface Milestone {
  id: string;
  title: string;
  description: string;
  reward: MilestoneReward;
  statKey: keyof UserStats;
  target: number;
}

/** Fixed list, checked entirely client-side against the viewer's own
 *  stats - see the AvatarFrame doc comment for why that's an acceptable
 *  trust boundary here (cosmetic only, no access control implications).
 *  statKey/target (rather than an opaque check function) lets the
 *  achievements panel show a real progress bar for free. */
export const MILESTONES: Milestone[] = [
  {
    id: 'first-like',
    title: 'FIRST STEPS',
    description: 'Like your first album or track.',
    reward: { type: 'avatarFrame', value: 'bronze' },
    statKey: 'likedCount',
    target: 1,
  },
  {
    id: 'collector',
    title: 'COLLECTOR',
    description: 'Like 10 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'silver' },
    statKey: 'likedCount',
    target: 10,
  },
  {
    id: 'curator',
    title: 'CURATOR',
    description: 'Like 50 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'gold' },
    statKey: 'likedCount',
    target: 50,
  },
  {
    id: 'archivist',
    title: 'ARCHIVIST',
    description: 'Like 150 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'diamond' },
    statKey: 'likedCount',
    target: 150,
  },
  {
    id: 'connected',
    title: 'CONNECTED',
    description: 'Follow 5 other listeners.',
    reward: { type: 'avatarFrame', value: 'neon' },
    statKey: 'followingCount',
    target: 5,
  },
  {
    id: 'social-butterfly',
    title: 'SOCIAL BUTTERFLY',
    description: 'Follow 25 other listeners.',
    reward: { type: 'backgroundEffect', value: 'bubbles' },
    statKey: 'followingCount',
    target: 25,
  },
  {
    id: 'popular',
    title: 'POPULAR',
    description: 'Gain 5 followers.',
    reward: { type: 'avatarFrame', value: 'rainbow' },
    statKey: 'followerCount',
    target: 5,
  },
  {
    id: 'tastemaker',
    title: 'TASTEMAKER',
    description: 'Gain 25 followers.',
    reward: { type: 'avatarFrame', value: 'fire' },
    statKey: 'followerCount',
    target: 25,
  },
  {
    id: 'storyteller',
    title: 'STORYTELLER',
    description: 'Write a bio of at least 40 characters.',
    reward: { type: 'backgroundEffect', value: 'fireflies' },
    statKey: 'bioLength',
    target: 40,
  },
  {
    id: 'curators-eye',
    title: "CURATOR'S EYE",
    description: 'Create your first showcase.',
    reward: { type: 'backgroundEffect', value: 'confetti' },
    statKey: 'showcaseCount',
    target: 1,
  },
];

function isMilestoneUnlocked(m: Milestone, stats: UserStats): boolean {
  return stats[m.statKey] >= m.target;
}

export function getUnlockedMilestones(stats: UserStats): Milestone[] {
  return MILESTONES.filter((m) => isMilestoneUnlocked(m, stats));
}

export function getUnlockedFrames(stats: UserStats): AvatarFrame[] {
  return [
    'none',
    ...getUnlockedMilestones(stats)
      .filter((m): m is Milestone & { reward: { type: 'avatarFrame'; value: Exclude<AvatarFrame, 'none'> } } => m.reward.type === 'avatarFrame')
      .map((m) => m.reward.value),
  ];
}

export function getUnlockedBackgroundEffects(stats: UserStats): BackgroundEffectType[] {
  return [
    'none',
    'snow',
    'stars',
    'smoke',
    ...getUnlockedMilestones(stats)
      .filter((m): m is Milestone & { reward: { type: 'backgroundEffect'; value: Exclude<BackgroundEffectType, 'none' | 'snow' | 'stars' | 'smoke'> } } => m.reward.type === 'backgroundEffect')
      .map((m) => m.reward.value),
  ];
}

/** For an achievements panel progress bar: how close is the viewer to
 *  earning this milestone right now. */
export function getMilestoneProgress(m: Milestone, stats: UserStats): { current: number; target: number } {
  return { current: Math.min(stats[m.statKey], m.target), target: m.target };
}

const SEEN_KEY_PREFIX = 'mox-seen-milestones-';

export function getSeenMilestoneIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY_PREFIX + uid);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markMilestonesSeen(uid: string, ids: string[]): void {
  try {
    const current = new Set(getSeenMilestoneIds(uid));
    ids.forEach((id) => current.add(id));
    localStorage.setItem(SEEN_KEY_PREFIX + uid, JSON.stringify([...current]));
  } catch {
    // localStorage unavailable (private browsing, etc.) - the reveal will
    // just show again next visit, which is harmless.
  }
}

/** Milestones the user has hit but hasn't seen the reveal for yet. */
export function getNewlyUnlocked(stats: UserStats, uid: string): Milestone[] {
  const seen = new Set(getSeenMilestoneIds(uid));
  return getUnlockedMilestones(stats).filter((m) => !seen.has(m.id));
}
