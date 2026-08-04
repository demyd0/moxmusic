/**
 * Builds a YouTube Music search URL for an album or a single track.
 * There is no public API for exact YouTube Music album/track IDs, so this
 * deliberately links to a search results page rather than a specific watch
 * URL - it needs no API key, has no quota, and is correct often enough to
 * be a reliable "open in YouTube Music" action.
 */
export function buildYoutubeMusicSearchUrl(artist: string, title: string, isAlbum: boolean): string {
  const query = isAlbum ? `${artist} ${title} album` : `${artist} ${title}`;
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}
