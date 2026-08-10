export type StreamingServiceId =
  | 'youtubeMusic'
  | 'spotify'
  | 'appleMusic'
  | 'soundcloud'
  | 'deezer'
  | 'tidal';

export interface StreamingService {
  id: StreamingServiceId;
  label: string;
  /** Brand color for the button background. */
  color: string;
  buildSearchUrl: (artist: string, title: string, isAlbum: boolean) => string;
}

/**
 * Every entry links to a SEARCH results page, not an exact track/album URL -
 * none of these services expose a public no-key API for resolving that, so
 * search is the only option that needs no API key, has no quota, and works
 * for every service consistently (same pattern already used for YouTube
 * Music and Genius elsewhere in the app).
 */
export const STREAMING_SERVICES: StreamingService[] = [
  {
    id: 'youtubeMusic',
    label: 'YOUTUBE MUSIC',
    color: '#dc2626',
    buildSearchUrl: (artist, title, isAlbum) =>
      `https://music.youtube.com/search?q=${encodeURIComponent(isAlbum ? `${artist} ${title} album` : `${artist} ${title}`)}`,
  },
  {
    id: 'spotify',
    label: 'SPOTIFY',
    color: '#1db954',
    buildSearchUrl: (artist, title) =>
      `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`,
  },
  {
    id: 'appleMusic',
    label: 'APPLE MUSIC',
    color: '#fa243c',
    buildSearchUrl: (artist, title) =>
      `https://music.apple.com/us/search?term=${encodeURIComponent(`${artist} ${title}`)}`,
  },
  {
    id: 'soundcloud',
    label: 'SOUNDCLOUD',
    color: '#ff5500',
    buildSearchUrl: (artist, title) =>
      `https://soundcloud.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`,
  },
  {
    id: 'deezer',
    label: 'DEEZER',
    color: '#a238ff',
    buildSearchUrl: (artist, title) =>
      `https://www.deezer.com/search/${encodeURIComponent(`${artist} ${title}`)}`,
  },
  {
    id: 'tidal',
    label: 'TIDAL',
    color: '#000000',
    buildSearchUrl: (artist, title) =>
      `https://listen.tidal.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`,
  },
];

const DEFAULT_SERVICE_ID: StreamingServiceId = 'youtubeMusic';
const STORAGE_KEY = 'moxmusic_preferred_service';

export function getPreferredService(): StreamingService {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const found = STREAMING_SERVICES.find((s) => s.id === stored);
    if (found) return found;
  } catch {}
  return STREAMING_SERVICES.find((s) => s.id === DEFAULT_SERVICE_ID)!;
}

export function setPreferredService(id: StreamingServiceId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}
