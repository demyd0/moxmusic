/**
 * Genius has no public API for full lyrics text (their license with
 * publishers only allows showing lyrics on genius.com itself), so this
 * deliberately links to a Genius search rather than trying to fetch or
 * embed lyrics directly - same reasoning as the YouTube Music search link.
 */
export function buildGeniusSearchUrl(artist: string, title: string): string {
  return `https://genius.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
}
