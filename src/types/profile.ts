export type ProfileBackgroundType = 'color' | 'gradient' | 'image';

/** Layered on top of the background color/gradient/image via a <canvas>
 *  overlay. A fixed preset list, same reasoning as TextEffect - no
 *  free-form canvas/JS input from the user, just a choice of animation.
 *  'none'/'snow'/'stars'/'smoke' are free; the rest are earned via
 *  activity milestones (see src/lib/milestones.ts). */
export type BackgroundEffectType = 'none' | 'snow' | 'stars' | 'smoke' | 'confetti' | 'fireflies' | 'bubbles';

export interface ProfileBackground {
  type: ProfileBackgroundType;
  /** 'color': a hex string. 'gradient': "colorA|colorB|angleDeg".
   *  'image': an https:// URL (a .gif URL animates on its own - no
   *  separate "gif" type needed). */
  value: string;
  effect?: BackgroundEffectType;
}

export type ShowcaseType = 'albums' | 'text' | 'mixed' | 'media';

/** How a 'media' showcase's image/gif fills its box - COVER crops to fill
 *  (can crop off the edges/subject), CONTAIN shows the whole image
 *  letterboxed if the aspect ratio doesn't match. */
export type MediaFit = 'cover' | 'contain';
/** Max-height preset for a 'media' showcase - a fixed set of sizes rather
 *  than a free-form pixel input, same reasoning as everywhere else this
 *  app offers a curated list instead of raw numeric/CSS input. */
export type MediaSize = 'small' | 'medium' | 'large' | 'full';

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
/** Showcase titles previously always rendered in the header font via a
 *  fixed className - default new titleStyle to match so existing
 *  showcases don't visually change when this field is introduced. */
export const DEFAULT_TITLE_STYLE: TextStyle = { font: 'header', color: '', effect: 'none' };

export interface ProfileShowcase {
  id: string;
  title: string;
  /** Missing on showcases created before this field existed - treat as 'albums'. */
  type?: ShowcaseType;
  albumIds: string[];
  /** Used when type is 'text' or 'mixed'. */
  text?: string;
  textStyle?: TextStyle;
  titleStyle?: TextStyle;
  /** Used when type is 'media': an https:// image or .gif URL, same
   *  validation as a profile background image - shown large, no album
   *  grid. */
  imageUrl?: string;
  /** Missing on media showcases created before these fields existed -
   *  treat as 'cover'/'large' so existing showcases render unchanged. */
  mediaFit?: MediaFit;
  mediaSize?: MediaSize;
}

export const DEFAULT_MEDIA_FIT: MediaFit = 'cover';
export const DEFAULT_MEDIA_SIZE: MediaSize = 'large';

/** Cosmetic ring around the avatar, earned by hitting an activity
 *  milestone (see src/lib/milestones.ts). Client-checked only - like the
 *  rest of this app there's no server-side enforcement, so this is a
 *  vanity reward, not an access-controlled asset. */
export type AvatarFrame = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'neon' | 'rainbow' | 'fire';

/** "value" is a YouTube video id for type 'youtube', or a Firebase Storage
 *  download URL for type 'upload'. Plays on the owner's public profile. */
export interface ProfileTrack {
  type: 'youtube' | 'upload';
  value: string;
  title?: string;
}

export interface ProfileCustomization {
  background: ProfileBackground;
  accentColor: string;
  bio: string;
  bioStyle: TextStyle;
  showcases: ProfileShowcase[];
  avatarFrame?: AvatarFrame;
  profileTrack?: ProfileTrack | null;
}

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
  background: { type: 'color', value: '#fafafa' },
  accentColor: '#000000',
  bio: '',
  bioStyle: DEFAULT_TEXT_STYLE,
  showcases: [],
  avatarFrame: 'none',
  profileTrack: null,
};

export const MAX_PROFILE_TRACK_TITLE_LENGTH = 60;

// Sanity limits so one profile can't bloat its Firestore doc or turn
// into an infinite-scroll wall for visitors.
export const MAX_BIO_LENGTH = 280;
export const MAX_SHOWCASES = 6;
export const MAX_ALBUMS_PER_SHOWCASE = 12;
export const MAX_SHOWCASE_TEXT_LENGTH = 300;
