export type ProfileBackgroundType = 'color' | 'gradient' | 'image';

export interface ProfileBackground {
  type: ProfileBackgroundType;
  /** 'color': a hex string. 'gradient': "colorA|colorB|angleDeg".
   *  'image': an https:// URL (a .gif URL animates on its own - no
   *  separate "gif" type needed). */
  value: string;
}

export interface ProfileShowcase {
  id: string;
  title: string;
  albumIds: string[];
}

export interface ProfileCustomization {
  background: ProfileBackground;
  accentColor: string;
  bio: string;
  showcases: ProfileShowcase[];
}

export const DEFAULT_PROFILE_CUSTOMIZATION: ProfileCustomization = {
  background: { type: 'color', value: '#fafafa' },
  accentColor: '#000000',
  bio: '',
  showcases: [],
};

// Sanity limits so one profile can't bloat its Firestore doc or turn
// into an infinite-scroll wall for visitors.
export const MAX_BIO_LENGTH = 280;
export const MAX_SHOWCASES = 6;
export const MAX_ALBUMS_PER_SHOWCASE = 12;
