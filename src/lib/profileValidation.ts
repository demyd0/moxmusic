import type { CSSProperties } from 'react';
import type { ProfileBackground, ProfileCustomization } from '@/types/profile';
import { MAX_ALBUMS_PER_SHOWCASE, MAX_BIO_LENGTH, MAX_SHOWCASES } from '@/types/profile';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

/**
 * Only https:// image URLs are accepted as a profile background. This is
 * the actual security boundary for "any background image/gif" - it blocks
 * javascript:/data: URL schemes (script-executing or page-breaking) and
 * plain http:// (mixed-content, no encryption) while still allowing any
 * real image or GIF host (Imgur, Giphy, Tenor, a direct upload link, etc).
 */
export function isValidBackgroundImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidBackground(bg: ProfileBackground): boolean {
  if (bg.type === 'color') return isValidHexColor(bg.value);
  if (bg.type === 'gradient') {
    const [a, b] = bg.value.split('|');
    return isValidHexColor(a || '') && isValidHexColor(b || '');
  }
  if (bg.type === 'image') return isValidBackgroundImageUrl(bg.value);
  return false;
}

export function backgroundToCss(bg: ProfileBackground): CSSProperties {
  if (bg.type === 'color' && isValidHexColor(bg.value)) {
    return { backgroundColor: bg.value };
  }
  if (bg.type === 'gradient') {
    const [a, b, angle] = bg.value.split('|');
    if (isValidHexColor(a || '') && isValidHexColor(b || '')) {
      const deg = Number(angle) || 135;
      return { backgroundImage: `linear-gradient(${deg}deg, ${a}, ${b})` };
    }
  }
  if (bg.type === 'image' && isValidBackgroundImageUrl(bg.value)) {
    return {
      backgroundImage: `url("${bg.value.replace(/"/g, '%22')}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: '#fafafa' };
}

/**
 * Clamps/repairs a customization object before it's written to Firestore -
 * defends against a hand-crafted write (bypassing the editor UI) blowing
 * up the doc size or smuggling a bad URL scheme through.
 */
export function sanitizeCustomization(input: ProfileCustomization): ProfileCustomization {
  const background = isValidBackground(input.background)
    ? input.background
    : { type: 'color' as const, value: '#fafafa' };

  const accentColor = isValidHexColor(input.accentColor) ? input.accentColor : '#000000';
  const bio = (input.bio || '').slice(0, MAX_BIO_LENGTH);

  const showcases = (input.showcases || [])
    .slice(0, MAX_SHOWCASES)
    .map((s) => ({
      id: s.id,
      title: (s.title || 'SHOWCASE').slice(0, 40),
      albumIds: (s.albumIds || []).slice(0, MAX_ALBUMS_PER_SHOWCASE),
    }));

  return { background, accentColor, bio, showcases };
}
