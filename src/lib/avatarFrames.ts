import type { AvatarFrame } from '@/types/profile';

export const AVATAR_FRAME_VALUES: AvatarFrame[] = ['none', 'bronze', 'silver', 'gold', 'diamond', 'neon', 'rainbow', 'fire'];

export const AVATAR_FRAMES: { value: AvatarFrame; label: string }[] = [
  { value: 'none', label: 'NONE' },
  { value: 'bronze', label: 'BRONZE' },
  { value: 'silver', label: 'SILVER' },
  { value: 'gold', label: 'GOLD' },
  { value: 'diamond', label: 'DIAMOND' },
  { value: 'neon', label: 'NEON' },
  { value: 'rainbow', label: 'RAINBOW' },
  { value: 'fire', label: 'FIRE' },
];

export function sanitizeAvatarFrame(value: unknown): AvatarFrame {
  return AVATAR_FRAME_VALUES.includes(value as AvatarFrame) ? (value as AvatarFrame) : 'none';
}

/** Classes for the OUTER avatar wrapper (not the clipped inner box - the
 *  rainbow frame needs a ::before ring that would get clipped by the
 *  inner box's overflow-hidden). */
export function avatarFrameWrapperClassName(frame: AvatarFrame | undefined): string {
  if (!frame || frame === 'none') return '';
  return `p-1 border-2 avatar-frame-${frame}`;
}
