import type { AvatarFrame, BackgroundEffectType } from '@/types/profile';

export interface UserStats {
  likedCount: number;
  followerCount: number;
  followingCount: number;
  showcaseCount: number;
  bioLength: number;
  followedArtistsCount: number;
  toListenCount: number;
  viewCount: number;
}

/** Icon keys for 'badge' rewards - kept as plain strings here (not JSX)
 *  so this stays a pure logic file; AchievementsPanel.tsx maps each to an
 *  actual lucide-react icon. */
export type BadgeIconKey =
  | 'heart'
  | 'disc'
  | 'flame'
  | 'eye'
  | 'star'
  | 'userPlus'
  | 'users'
  | 'globe'
  | 'layoutGrid'
  | 'palette'
  | 'sparkles'
  | 'trophy'
  | 'pencil'
  | 'bookOpen'
  | 'feather'
  | 'mic'
  | 'radio'
  | 'music'
  | 'compass'
  | 'headphones'
  | 'listMusic'
  | 'clock'
  | 'trendingUp'
  | 'zap'
  | 'rocket'
  | 'crown';

/** Badge rarity, purely cosmetic - drives the chip's color/glow in
 *  AchievementsPanel (higher tier = louder treatment). Independent of
 *  avatarFrame/backgroundEffect rewards, which stay their own curated
 *  pools since they're selectable elsewhere (avatar picker, background
 *  effect picker) and need to stay small/stable lists. */
export type MilestoneReward =
  | { type: 'avatarFrame'; value: Exclude<AvatarFrame, 'none'> }
  | { type: 'backgroundEffect'; value: Exclude<BackgroundEffectType, 'none' | 'snow' | 'stars' | 'smoke'> }
  | { type: 'badge'; icon: BadgeIconKey; tier: 1 | 2 | 3 | 4 };

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
 *  achievements panel show a real progress bar for free.
 *
 *  Each avatarFrame/backgroundEffect value is used as a reward EXACTLY
 *  once across this whole list, on purpose - they're small curated pools
 *  shared with the avatar/background pickers, so duplicate rewards would
 *  just mean two different achievements unlock the same option. Badge
 *  rewards have no such pool limit, so most of the tiers in between use
 *  those instead. */
export const MILESTONES: Milestone[] = [
  // ---- likedCount ----
  {
    id: 'liked-1',
    title: 'FIRST STEPS',
    description: 'Like your first album or track.',
    reward: { type: 'avatarFrame', value: 'bronze' },
    statKey: 'likedCount',
    target: 1,
  },
  {
    id: 'liked-5',
    title: 'GETTING INTO IT',
    description: 'Like 5 albums or tracks.',
    reward: { type: 'badge', icon: 'heart', tier: 1 },
    statKey: 'likedCount',
    target: 5,
  },
  {
    id: 'liked-10',
    title: 'COLLECTOR',
    description: 'Like 10 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'silver' },
    statKey: 'likedCount',
    target: 10,
  },
  {
    id: 'liked-25',
    title: 'DEEP CUTS',
    description: 'Like 25 albums or tracks.',
    reward: { type: 'badge', icon: 'disc', tier: 2 },
    statKey: 'likedCount',
    target: 25,
  },
  {
    id: 'liked-50',
    title: 'CURATOR',
    description: 'Like 50 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'gold' },
    statKey: 'likedCount',
    target: 50,
  },
  {
    id: 'liked-100',
    title: 'CENTURY CLUB',
    description: 'Like 100 albums or tracks.',
    reward: { type: 'backgroundEffect', value: 'confetti' },
    statKey: 'likedCount',
    target: 100,
  },
  {
    id: 'liked-200',
    title: 'OBSESSED',
    description: 'Like 200 albums or tracks.',
    reward: { type: 'badge', icon: 'flame', tier: 3 },
    statKey: 'likedCount',
    target: 200,
  },
  {
    id: 'liked-500',
    title: 'ARCHIVIST',
    description: 'Like 500 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'diamond' },
    statKey: 'likedCount',
    target: 500,
  },
  {
    id: 'liked-1000',
    title: 'THE COLLECTION',
    description: 'Like 1000 albums or tracks.',
    reward: { type: 'avatarFrame', value: 'cosmic' },
    statKey: 'likedCount',
    target: 1000,
  },

  // ---- followerCount ----
  {
    id: 'follower-1',
    title: 'NOTICED',
    description: 'Gain your first follower.',
    reward: { type: 'badge', icon: 'eye', tier: 1 },
    statKey: 'followerCount',
    target: 1,
  },
  {
    id: 'follower-5',
    title: 'POPULAR',
    description: 'Gain 5 followers.',
    reward: { type: 'avatarFrame', value: 'rainbow' },
    statKey: 'followerCount',
    target: 5,
  },
  {
    id: 'follower-10',
    title: 'RISING STAR',
    description: 'Gain 10 followers.',
    reward: { type: 'badge', icon: 'star', tier: 2 },
    statKey: 'followerCount',
    target: 10,
  },
  {
    id: 'follower-25',
    title: 'TASTEMAKER',
    description: 'Gain 25 followers.',
    reward: { type: 'avatarFrame', value: 'fire' },
    statKey: 'followerCount',
    target: 25,
  },
  {
    id: 'follower-50',
    title: 'INFLUENCER',
    description: 'Gain 50 followers.',
    reward: { type: 'backgroundEffect', value: 'sparks' },
    statKey: 'followerCount',
    target: 50,
  },
  {
    id: 'follower-100',
    title: 'CELEBRITY',
    description: 'Gain 100 followers.',
    reward: { type: 'avatarFrame', value: 'platinum' },
    statKey: 'followerCount',
    target: 100,
  },
  {
    id: 'follower-250',
    title: 'ICON',
    description: 'Gain 250 followers.',
    reward: { type: 'badge', icon: 'crown', tier: 4 },
    statKey: 'followerCount',
    target: 250,
  },

  // ---- followingCount ----
  {
    id: 'following-1',
    title: 'FIRST FOLLOW',
    description: 'Follow another listener.',
    reward: { type: 'badge', icon: 'userPlus', tier: 1 },
    statKey: 'followingCount',
    target: 1,
  },
  {
    id: 'following-5',
    title: 'CONNECTED',
    description: 'Follow 5 other listeners.',
    reward: { type: 'avatarFrame', value: 'neon' },
    statKey: 'followingCount',
    target: 5,
  },
  {
    id: 'following-10',
    title: 'NETWORKER',
    description: 'Follow 10 other listeners.',
    reward: { type: 'badge', icon: 'users', tier: 2 },
    statKey: 'followingCount',
    target: 10,
  },
  {
    id: 'following-25',
    title: 'SOCIAL BUTTERFLY',
    description: 'Follow 25 other listeners.',
    reward: { type: 'backgroundEffect', value: 'bubbles' },
    statKey: 'followingCount',
    target: 25,
  },
  {
    id: 'following-50',
    title: 'WELL CONNECTED',
    description: 'Follow 50 other listeners.',
    reward: { type: 'badge', icon: 'globe', tier: 3 },
    statKey: 'followingCount',
    target: 50,
  },
  {
    id: 'following-100',
    title: 'COMMUNITY PILLAR',
    description: 'Follow 100 other listeners.',
    reward: { type: 'backgroundEffect', value: 'petals' },
    statKey: 'followingCount',
    target: 100,
  },

  // ---- showcaseCount ----
  {
    id: 'showcase-1',
    title: "CURATOR'S EYE",
    description: 'Create your first showcase.',
    reward: { type: 'backgroundEffect', value: 'fireflies' },
    statKey: 'showcaseCount',
    target: 1,
  },
  {
    id: 'showcase-2',
    title: 'SECOND SHOWCASE',
    description: 'Create 2 showcases.',
    reward: { type: 'badge', icon: 'layoutGrid', tier: 1 },
    statKey: 'showcaseCount',
    target: 2,
  },
  {
    id: 'showcase-3',
    title: 'GALLERY BUILDER',
    description: 'Create 3 showcases.',
    reward: { type: 'badge', icon: 'layoutGrid', tier: 2 },
    statKey: 'showcaseCount',
    target: 3,
  },
  {
    id: 'showcase-4',
    title: 'SHOWCASE STYLIST',
    description: 'Create 4 showcases.',
    reward: { type: 'badge', icon: 'palette', tier: 2 },
    statKey: 'showcaseCount',
    target: 4,
  },
  {
    id: 'showcase-5',
    title: 'SHOWCASE MASTER',
    description: 'Create 5 showcases.',
    reward: { type: 'badge', icon: 'sparkles', tier: 3 },
    statKey: 'showcaseCount',
    target: 5,
  },
  {
    id: 'showcase-6',
    title: 'FULL HOUSE',
    description: 'Fill all 6 showcase slots.',
    reward: { type: 'badge', icon: 'trophy', tier: 4 },
    statKey: 'showcaseCount',
    target: 6,
  },

  // ---- bioLength ----
  {
    id: 'bio-10',
    title: 'SAY SOMETHING',
    description: 'Write at least 10 characters in your bio.',
    reward: { type: 'badge', icon: 'pencil', tier: 1 },
    statKey: 'bioLength',
    target: 10,
  },
  {
    id: 'bio-40',
    title: 'STORYTELLER',
    description: 'Write a bio of at least 40 characters.',
    reward: { type: 'badge', icon: 'bookOpen', tier: 2 },
    statKey: 'bioLength',
    target: 40,
  },
  {
    id: 'bio-100',
    title: 'WELL WRITTEN',
    description: 'Write a bio of at least 100 characters.',
    reward: { type: 'badge', icon: 'bookOpen', tier: 3 },
    statKey: 'bioLength',
    target: 100,
  },
  {
    id: 'bio-200',
    title: 'NOVELIST',
    description: 'Write a bio of at least 200 characters.',
    reward: { type: 'badge', icon: 'feather', tier: 3 },
    statKey: 'bioLength',
    target: 200,
  },
  {
    id: 'bio-280',
    title: 'MAX CAPACITY',
    description: 'Fill your bio to the max length.',
    reward: { type: 'avatarFrame', value: 'emerald' },
    statKey: 'bioLength',
    target: 280,
  },

  // ---- followedArtistsCount ----
  {
    id: 'artists-1',
    title: 'FIRST FAN',
    description: 'Follow your first artist.',
    reward: { type: 'badge', icon: 'mic', tier: 1 },
    statKey: 'followedArtistsCount',
    target: 1,
  },
  {
    id: 'artists-5',
    title: 'GROUPIE',
    description: 'Follow 5 artists.',
    reward: { type: 'badge', icon: 'mic', tier: 2 },
    statKey: 'followedArtistsCount',
    target: 5,
  },
  {
    id: 'artists-10',
    title: 'SUPERFAN',
    description: 'Follow 10 artists.',
    reward: { type: 'badge', icon: 'radio', tier: 2 },
    statKey: 'followedArtistsCount',
    target: 10,
  },
  {
    id: 'artists-25',
    title: 'TALENT SCOUT',
    description: 'Follow 25 artists.',
    reward: { type: 'badge', icon: 'music', tier: 3 },
    statKey: 'followedArtistsCount',
    target: 25,
  },
  {
    id: 'artists-50',
    title: 'AVID FOLLOWER',
    description: 'Follow 50 artists.',
    reward: { type: 'badge', icon: 'compass', tier: 4 },
    statKey: 'followedArtistsCount',
    target: 50,
  },

  // ---- toListenCount ----
  {
    id: 'toListen-1',
    title: 'QUEUED UP',
    description: 'Add your first album to your to-listen queue.',
    reward: { type: 'badge', icon: 'headphones', tier: 1 },
    statKey: 'toListenCount',
    target: 1,
  },
  {
    id: 'toListen-5',
    title: 'STACKED QUEUE',
    description: 'Have 5 albums queued to listen.',
    reward: { type: 'badge', icon: 'headphones', tier: 2 },
    statKey: 'toListenCount',
    target: 5,
  },
  {
    id: 'toListen-15',
    title: 'BACKLOG',
    description: 'Have 15 albums queued to listen.',
    reward: { type: 'badge', icon: 'listMusic', tier: 3 },
    statKey: 'toListenCount',
    target: 15,
  },
  {
    id: 'toListen-30',
    title: 'NEVER ENOUGH TIME',
    description: 'Have 30 albums queued to listen.',
    reward: { type: 'badge', icon: 'clock', tier: 3 },
    statKey: 'toListenCount',
    target: 30,
  },

  // ---- viewCount (profile views) ----
  {
    id: 'views-10',
    title: 'GETTING SEEN',
    description: 'Reach 10 profile views.',
    reward: { type: 'badge', icon: 'eye', tier: 1 },
    statKey: 'viewCount',
    target: 10,
  },
  {
    id: 'views-50',
    title: 'ON THE RADAR',
    description: 'Reach 50 profile views.',
    reward: { type: 'badge', icon: 'trendingUp', tier: 2 },
    statKey: 'viewCount',
    target: 50,
  },
  {
    id: 'views-150',
    title: 'TRENDING',
    description: 'Reach 150 profile views.',
    reward: { type: 'badge', icon: 'zap', tier: 3 },
    statKey: 'viewCount',
    target: 150,
  },
  {
    id: 'views-500',
    title: 'VIRAL',
    description: 'Reach 500 profile views.',
    reward: { type: 'badge', icon: 'rocket', tier: 4 },
    statKey: 'viewCount',
    target: 500,
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
