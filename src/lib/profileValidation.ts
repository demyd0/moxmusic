import type { CSSProperties } from 'react';
import type {
  ProfileBackground,
  ProfileCustomization,
  ProfileTrack,
  ShowcaseType,
  MediaFit,
  MediaSize,
  TextStyle,
  TextFont,
  TextEffect,
  BackgroundEffectType,
} from '@/types/profile';
import {
  DEFAULT_TEXT_STYLE,
  DEFAULT_MEDIA_FIT,
  DEFAULT_MEDIA_SIZE,
  MAX_ALBUMS_PER_SHOWCASE,
  MAX_BIO_LENGTH,
  MAX_PROFILE_TRACK_TITLE_LENGTH,
  MAX_SHOWCASES,
  MAX_SHOWCASE_TEXT_LENGTH,
} from '@/types/profile';
import { sanitizeAvatarFrame } from './avatarFrames';
import { sanitizeNameEffect } from './nameEffects';

const SHOWCASE_TYPES: ShowcaseType[] = ['albums', 'text', 'mixed', 'media'];

export const MEDIA_FITS: { value: MediaFit; label: string }[] = [
  { value: 'cover', label: 'FILL (CROP)' },
  { value: 'contain', label: 'FIT (NO CROP)' },
];

export const MEDIA_SIZES: { value: MediaSize; label: string; maxHeightRem: number }[] = [
  { value: 'small', label: 'SMALL', maxHeightRem: 12 },
  { value: 'medium', label: 'MEDIUM', maxHeightRem: 20 },
  { value: 'large', label: 'LARGE', maxHeightRem: 32 },
  { value: 'full', label: 'FULL', maxHeightRem: 48 },
];

const MEDIA_FIT_VALUES: MediaFit[] = MEDIA_FITS.map((f) => f.value);
const MEDIA_SIZE_VALUES: MediaSize[] = MEDIA_SIZES.map((s) => s.value);

export function sanitizeMediaFit(value: unknown): MediaFit {
  return MEDIA_FIT_VALUES.includes(value as MediaFit) ? (value as MediaFit) : DEFAULT_MEDIA_FIT;
}

export function sanitizeMediaSize(value: unknown): MediaSize {
  return MEDIA_SIZE_VALUES.includes(value as MediaSize) ? (value as MediaSize) : DEFAULT_MEDIA_SIZE;
}

export function mediaSizeMaxHeightRem(size: MediaSize | undefined): number {
  return MEDIA_SIZES.find((s) => s.value === (size || DEFAULT_MEDIA_SIZE))?.maxHeightRem ?? 32;
}

export const BACKGROUND_EFFECTS: { value: BackgroundEffectType; label: string }[] = [
  { value: 'none', label: 'NONE' },
  { value: 'snow', label: 'SNOW' },
  { value: 'stars', label: 'STARS' },
  { value: 'smoke', label: 'SMOKE' },
  { value: 'confetti', label: 'CONFETTI' },
  { value: 'fireflies', label: 'FIREFLIES' },
  { value: 'bubbles', label: 'BUBBLES' },
  { value: 'sparks', label: 'SPARKS' },
  { value: 'petals', label: 'PETALS' },
];

const BACKGROUND_EFFECT_VALUES: BackgroundEffectType[] = BACKGROUND_EFFECTS.map((e) => e.value);

export function sanitizeBackgroundEffect(value: unknown): BackgroundEffectType {
  return BACKGROUND_EFFECT_VALUES.includes(value as BackgroundEffectType) ? (value as BackgroundEffectType) : 'none';
}

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

const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * 'youtube': value must be a real 11-char video id (already extracted/
 * validated client-side before save, re-checked here defensively).
 * 'upload': value must be an https:// URL - in practice always our own
 * Firebase Storage download URL, but re-validated the same way as any
 * other user-supplied URL in this file.
 */
export function sanitizeProfileTrack(input: ProfileTrack | null | undefined): ProfileTrack | null {
  if (!input || !input.value) return null;
  // Firestore rejects `undefined` anywhere in a document, even nested -
  // omit the key entirely rather than setting it to undefined when there's
  // no title, or the whole customization write throws.
  const titleField = input.title ? { title: input.title.slice(0, MAX_PROFILE_TRACK_TITLE_LENGTH) } : {};

  if (input.type === 'youtube' && YOUTUBE_VIDEO_ID_RE.test(input.value)) {
    return { type: 'youtube', value: input.value, ...titleField };
  }
  if (input.type === 'upload' && isValidBackgroundImageUrl(input.value)) {
    return { type: 'upload', value: input.value, ...titleField };
  }
  return null;
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

// Curated preset lists for text styling. Deliberately fixed/small - the
// editor UI only ever offers one of these, and sanitizeTextStyle() rejects
// anything else, so a hand-crafted write can't smuggle in arbitrary CSS,
// an external font URL, or anything that could break page layout / track
// visitors via an off-site font fetch.
export const TEXT_FONTS: { value: TextFont; label: string }[] = [
  { value: 'sans', label: 'SANS' },
  { value: 'header', label: 'DISPLAY' },
  { value: 'mono', label: 'MONO' },
  { value: 'serif', label: 'SERIF' },
];

export const TEXT_EFFECTS: { value: TextEffect; label: string }[] = [
  { value: 'none', label: 'NONE' },
  { value: 'glow', label: 'GLOW' },
  { value: 'shadow', label: 'SHADOW' },
  { value: 'outline', label: 'OUTLINE' },
  { value: 'gradient', label: 'GRADIENT' },
];

const TEXT_FONT_VALUES: TextFont[] = TEXT_FONTS.map((f) => f.value);
const TEXT_EFFECT_VALUES: TextEffect[] = TEXT_EFFECTS.map((f) => f.value);

const FONT_FAMILY_MAP: Record<TextFont, string> = {
  sans: 'var(--font-sans)',
  header: 'var(--font-header)',
  mono: 'var(--font-mono)',
  serif: 'Georgia, "Times New Roman", serif',
};

export function sanitizeTextStyle(input: Partial<TextStyle> | undefined): TextStyle {
  const font = TEXT_FONT_VALUES.includes(input?.font as TextFont) ? (input!.font as TextFont) : DEFAULT_TEXT_STYLE.font;
  const color = input?.color && isValidHexColor(input.color) ? input.color : '';
  const effect = TEXT_EFFECT_VALUES.includes(input?.effect as TextEffect) ? (input!.effect as TextEffect) : DEFAULT_TEXT_STYLE.effect;
  return { font, color, effect };
}

/**
 * Converts a curated TextStyle into real CSS. The "gradient" effect pairs
 * the chosen color with the profile's accent color so it always looks
 * intentional rather than needing a second color picker.
 */
export function textStyleToCss(style: TextStyle, accentColor: string): CSSProperties {
  const family = FONT_FAMILY_MAP[style.font] || FONT_FAMILY_MAP.mono;
  const color = isValidHexColor(style.color) ? style.color : undefined;
  const accent = isValidHexColor(accentColor) ? accentColor : '#000000';
  const css: CSSProperties = { fontFamily: family };

  if (style.effect === 'gradient') {
    const from = color || accent;
    const to = from === accent ? '#000000' : accent;
    return {
      ...css,
      backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
    };
  }

  if (color) css.color = color;

  if (style.effect === 'glow') {
    const glow = color || accent;
    css.textShadow = `0 0 6px ${glow}, 0 0 14px ${glow}`;
  } else if (style.effect === 'shadow') {
    css.textShadow = '2px 2px 0 rgba(0,0,0,0.25)';
  } else if (style.effect === 'outline') {
    (css as CSSProperties & { WebkitTextStroke?: string }).WebkitTextStroke = `1px ${color || accent}`;
  }

  return css;
}

/**
 * Clamps/repairs a customization object before it's written to Firestore -
 * defends against a hand-crafted write (bypassing the editor UI) blowing
 * up the doc size or smuggling a bad URL scheme through.
 */
export function sanitizeCustomization(input: ProfileCustomization): ProfileCustomization {
  const background = {
    ...(isValidBackground(input.background) ? input.background : { type: 'color' as const, value: '#fafafa' }),
    effect: sanitizeBackgroundEffect(input.background?.effect),
  };

  const accentColor = isValidHexColor(input.accentColor) ? input.accentColor : '#000000';
  const bio = (input.bio || '').slice(0, MAX_BIO_LENGTH);
  const bioStyle = sanitizeTextStyle(input.bioStyle);

  const showcases = (input.showcases || [])
    .slice(0, MAX_SHOWCASES)
    .map((s) => {
      // Same "omit rather than undefined" rule as sanitizeProfileTrack -
      // Firestore rejects an explicit undefined field even nested inside
      // an array element.
      const imageUrlField = s.imageUrl && isValidBackgroundImageUrl(s.imageUrl) ? { imageUrl: s.imageUrl } : {};
      return {
        id: s.id,
        // Empty is allowed and intentional - lets a showcase render without
        // a title bar on the public profile instead of forcing a filler
        // "SHOWCASE" label.
        title: (s.title || '').slice(0, 40),
        type: SHOWCASE_TYPES.includes(s.type as ShowcaseType) ? (s.type as ShowcaseType) : 'albums',
        albumIds: (s.albumIds || []).slice(0, MAX_ALBUMS_PER_SHOWCASE),
        text: (s.text || '').slice(0, MAX_SHOWCASE_TEXT_LENGTH),
        textStyle: sanitizeTextStyle(s.textStyle),
        titleStyle: sanitizeTextStyle(s.titleStyle),
        mediaFit: sanitizeMediaFit(s.mediaFit),
        mediaSize: sanitizeMediaSize(s.mediaSize),
        ...imageUrlField,
      };
    });

  const avatarFrame = sanitizeAvatarFrame(input.avatarFrame);
  const nameEffect = sanitizeNameEffect(input.nameEffect);
  const profileTrack = sanitizeProfileTrack(input.profileTrack);

  return { background, accentColor, bio, bioStyle, showcases, avatarFrame, nameEffect, profileTrack };
}
