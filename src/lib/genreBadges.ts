import type { Album } from '@/types/album';

export const MAX_GENRE_BADGES = 5;

/** Top genres among a user's liked albums, most-liked first. Purely
 *  derived from existing album data (iTunes' primaryGenreName) - no new
 *  input surface, no manual curation needed. */
export function computeTopGenres(albums: Album[], limit = MAX_GENRE_BADGES): string[] {
  const counts = new Map<string, number>();
  for (const album of albums) {
    const genre = album.genre?.trim();
    if (!genre) continue;
    counts.set(genre, (counts.get(genre) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}
