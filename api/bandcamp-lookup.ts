import type { VercelRequest, VercelResponse } from '@vercel/node';

interface BandcampSearchResult {
  type: string;
  name: string;
  band_name?: string;
  item_url_root?: string;
  item_url_path?: string;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  // Deliberately exact-only (post-normalization), not a substring/fuzzy
  // match: Bandcamp is an open platform where anyone can name their page
  // "Taylor Swift Band" or similar, and a loose substring match was
  // surfacing those impersonators/cover acts as if they were the real
  // artist. Exact match still isn't proof of an official account, but it
  // cuts out the obvious false positives - a false "not found" is a much
  // smaller problem than linking to the wrong artist's page.
  return !!na && !!nb && na === nb;
}

async function bandcampSearch(query: string): Promise<BandcampSearchResult[]> {
  const response = await fetch('https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_text: query, search_filter: '', full_page: false, fan_id: null }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data?.auto?.results || [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Vercel Serverless Function (public read-only endpoint)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const artist = ((req.query.artist as string) || '').trim();
  const album = ((req.query.album as string) || '').trim();

  if (!artist) {
    return res.status(400).json({ error: 'artist parameter is required' });
  }

  try {
    // Bandcamp has no official public API for "does this exist" lookups.
    // This uses their own site-search autocomplete endpoint (the same one
    // powering the search box on bandcamp.com) and matches results by
    // normalized name rather than trusting relevance ranking alone, since
    // the query can surface similarly-named unrelated artists/albums.
    const artistResults = await bandcampSearch(artist);
    const bandMatch = artistResults.find((r) => r.type === 'b' && namesMatch(r.name, artist));

    const artistPayload = bandMatch
      ? { found: true, url: bandMatch.item_url_root }
      : { found: false as const };

    let albumPayload: { found: boolean; url?: string } | null = null;

    if (album) {
      const albumResults = await bandcampSearch(`${artist} ${album}`);
      const albumMatch = albumResults.find(
        (r) => r.type === 'a' && namesMatch(r.name, album) && r.band_name && namesMatch(r.band_name, artist)
      );
      albumPayload = albumMatch ? { found: true, url: albumMatch.item_url_path } : { found: false };
    }

    return res.status(200).json({ artist: artistPayload, album: albumPayload });
  } catch (error) {
    console.error('Bandcamp lookup error:', error);
    return res.status(500).json({
      error: 'Bandcamp lookup failed',
      artist: { found: false },
      album: album ? { found: false } : null,
    });
  }
}
