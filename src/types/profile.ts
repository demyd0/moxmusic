export type ProfileBackgroundType = 'color' | 'gradient' | 'image';

/** Layered on top of the background color/gradient/image via a <canvas>
 *  overlay. A fixed preset list, same reasoning as TextEffect - no
 *  free-form canvas/JS input from the user, just a choice of animation. */
export type BackgroundEffectType = 'none' | 'snow' | 'stars' | 'smoke';

export interface ProfileBackground {
  type: ProfileBackgroundType;
  /** 'color': a hex string. 'gradient': "colorA|colorB|angleDeg".
   *  'image': an https:// URL (a .gif URL animates on its own - no
   *  separate "gif" type needed). */
  value: string;
  effect?: BackgroundEffectType;
}

export type ShowcaseType = 'albums' | 'text' | 'mixed';

/** Curated font/color/effect presets for bio & showcase text - deliberately
 *  NOT free-form CSS/HTML, so this can't become an XSS or layout-breaking
 *  vector the way a raw rich-text editor would. See sanitizeTextStyle(). */
export type TextFont = 'sans' | 'header' | 'mono' | 'serif';
export type TextEffect = 'none' | 'glow' | 'shadow' | 'outline' | 'gradient';

export interface TextStyle {
  font: TextFont;
  /** '' means "use default black/theme color". */
  color: string;
  effect: TextEffect;
}

export const DEFAULT_TEXT_STYLE: TextStyle = { font: 'mono', color: '', effect: 'none' };

export interface ProfileShowcase {
  id: string;
  title: string;
  /** Missing on showcases created before this field existed - treat as 'albums'. */
  type?: ShowcaseType;
  albumIds: string[];
  /** Used when type is 'text' or 'mixed'. */
  text?: string;
  textStyle?: TextStyle;
}

export interface ProfileCustomization {
  background: ProfileBackground;
  accentColor: string;
  bio: string;
  bioStyle: TextStyle;
  showcases: ProfileShowcase[];
}

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
  background: { type: 'color', value: '#fafafa' },
  accentColor: '#000000',
  bio: '',
  bioStyle: DEFAULT_TEXT_STYLE,
  showcases: [],
};

// Sanity limits so one profile can't bloat its Firestore doc or turn
// into an infinite-scroll wall for visitors.
export const MAX_BIO_LENGTH = 280;
export const MAX_SHOWCASES = 6;
export const MAX_ALBUMS_PER_SHOWCASE = 12;
export const MAX_SHOWCASE_TEXT_LENGTH = 300;
