export interface ParsedImportRow {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  dateAdded?: string;
}

/**
 * Parses full CSV text into rows of cells per RFC 4180 (quoted fields can
 * contain commas/newlines, "" is an escaped literal quote). Written by
 * hand rather than adding a dependency - the app has no CSV library yet
 * and this format is simple enough not to need one.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip - the following \n (if any) ends the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Different export tools (Exportify, TuneMyMusic, Soundiiz, ...) name
// columns differently, so headers are matched against a list of known
// aliases rather than assuming one fixed schema.
const HEADER_ALIASES: Record<string, string[]> = {
  title: ['track name', 'title', 'song', 'track title', 'name', 'track'],
  artist: ['artist name(s)', 'artist name', 'artist', 'artists'],
  album: ['album name', 'album'],
  coverUrl: ['album image url', 'cover', 'artwork', 'image', 'cover url', 'image url'],
  dateAdded: ['added at', 'date added', 'created at', 'date'],
};

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses a CSV export from Exportify / TuneMyMusic / Soundiiz / etc into a
 * normalized row shape, auto-detecting which columns are which.
 */
export function parseImportCsv(text: string): ParsedImportRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const titleIdx = findColumnIndex(headers, HEADER_ALIASES.title);
  const artistIdx = findColumnIndex(headers, HEADER_ALIASES.artist);
  const albumIdx = findColumnIndex(headers, HEADER_ALIASES.album);
  const coverIdx = findColumnIndex(headers, HEADER_ALIASES.coverUrl);
  const dateIdx = findColumnIndex(headers, HEADER_ALIASES.dateAdded);

  if (titleIdx === -1 || artistIdx === -1) {
    throw new Error(
      "Couldn't find track/artist columns in this file. Make sure it's a CSV export of your liked songs from Spotify (Exportify), YouTube Music, Deezer, or SoundCloud."
    );
  }

  const result: ParsedImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const title = cells[titleIdx]?.trim();
    // Multiple artists are sometimes joined in one field (e.g. Exportify's
    // "Artist Name(s)" is comma-separated) - the first is the primary.
    const artistRaw = cells[artistIdx]?.trim();
    const artist = artistRaw?.split(',')[0]?.trim();
    if (!title || !artist) continue;

    result.push({
      title,
      artist,
      album: albumIdx !== -1 ? cells[albumIdx]?.trim() || undefined : undefined,
      coverUrl: coverIdx !== -1 ? cells[coverIdx]?.trim() || undefined : undefined,
      dateAdded: dateIdx !== -1 ? cells[dateIdx]?.trim() || undefined : undefined,
    });
  }

  return result;
}
