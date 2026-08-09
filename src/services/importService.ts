import type { Album } from '@/types/album';
import type { ParsedImportRow } from '@/lib/csvImport';

/**
 * Deterministic id from artist+title so re-importing the same file (or
 * overlapping exports from two services) merges instead of duplicating -
 * bulkAddLikedItems writes with merge:true keyed on this id.
 */
function makeImportId(artist: string, title: string): string {
  const raw = `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(hash, 31) + raw.charCodeAt(i)) >>> 0;
  }
  return `import-${hash.toString(36)}`;
}

function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

/**
 * Builds liked-track Album records directly from parsed CSV rows, using
 * whatever metadata the export already had (title/artist/album/cover)
 * rather than re-resolving each one through iTunes: a bulk import can
 * easily be hundreds of tracks, and iTunes's search API is rate-limited
 * to roughly 20 requests/minute, which would make that both slow and
 * unreliable (and less accurate than the source service's own data for
 * tracks that aren't on iTunes at all).
 */
export function buildImportedTracks(rows: ParsedImportRow[]): Album[] {
  const seen = new Set<string>();
  const tracks: Album[] = [];

  for (const row of rows) {
    const id = makeImportId(row.artist, row.title);
    if (seen.has(id)) continue;
    seen.add(id);

    tracks.push({
      id,
      title: row.title,
      artist: row.artist,
      coverUrl: row.coverUrl,
      source: 'manual',
      kind: 'track',
      albumTitle: row.album,
      dateAdded: toIsoDate(row.dateAdded),
    });
  }

  return tracks;
}
