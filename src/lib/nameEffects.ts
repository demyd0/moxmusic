import type { NameEffectType } from '@/types/profile';

export const NAME_EFFECT_VALUES: NameEffectType[] = ['none', 'glow', 'gradient', 'holographic', 'shadow3d'];

export const NAME_EFFECTS: { value: NameEffectType; label: string }[] = [
  { value: 'none', label: 'NONE' },
  { value: 'glow', label: 'GLOW' },
  { value: 'gradient', label: 'GRADIENT' },
  { value: 'holographic', label: 'HOLOGRAPHIC' },
  { value: 'shadow3d', label: '3D SHADOW' },
];

export function sanitizeNameEffect(value: unknown): NameEffectType {
  return NAME_EFFECT_VALUES.includes(value as NameEffectType) ? (value as NameEffectType) : 'none';
}

/** className for the username text element - pairs with a --name-accent CSS
 *  var set inline on the same element (see ProfilePage/ProfileEditPage) so
 *  the glow/gradient effects use the profile's own accent color rather than
 *  a fixed one. */
export function nameEffectClassName(effect: NameEffectType | undefined): string {
  if (!effect || effect === 'none') return '';
  return `name-effect-${effect}`;
}
