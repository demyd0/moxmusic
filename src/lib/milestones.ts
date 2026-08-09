import type { AvatarFrame } from '@/types/profile';

export interface UserStats {
  likedCount: number;
  followerCount: number;
  followingCount: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  frame: Exclude<AvatarFrame, 'none'>;
  check: (stats: UserStats) => boolean;
}

/** Fixed list, checked entirely client-side against the viewer's own
 *  stats - see the AvatarFrame doc comment for why that's an acceptable
 *  trust boundary here (cosmetic only, no access control implications). */
export const MILESTONES: Milestone[] = [
  {
    id: 'first-like',
    title: 'FIRST STEPS',
    description: 'Liked your first album or track.',
    frame: 'bronze',
    check: (s) => s.likedCount >= 1,
  },
  {
    id: 'collector',
    title: 'COLLECTOR',
    description: 'Liked 10 albums or tracks.',
    frame: 'silver',
    check: (s) => s.likedCount >= 10,
  },
  {
    id: 'curator',
    title: 'CURATOR',
    description: 'Liked 50 albums or tracks.',
    frame: 'gold',
    check: (s) => s.likedCount >= 50,
  },
  {
    id: 'connected',
    title: 'CONNECTED',
    description: 'Followed 5 other listeners.',
    frame: 'neon',
    check: (s) => s.followingCount >= 5,
  },
  {
    id: 'popular',
    title: 'POPULAR',
    description: 'Gained 5 followers.',
    frame: 'rainbow',
    check: (s) => s.followerCount >= 5,
  },
];

export function getUnlockedMilestones(stats: UserStats): Milestone[] {
  return MILESTONES.filter((m) => m.check(stats));
}

export function getUnlockedFrames(stats: UserStats): AvatarFrame[] {
  return ['none', ...getUnlockedMilestones(stats).map((m) => m.frame)];
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
