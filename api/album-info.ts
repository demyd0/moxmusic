import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Same boilerplate-stripping as api/artist-info.ts - Last.fm album wikis
 *  use the same "Read more on Last.fm" HTML link trailer. */
function cleanWiki(html: string): string {
  return html
    .replace(/<a[^>]*>.*?<\/a>\.?/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const artist = req.query.artist as string;
  const album = req.query.album as string;
  if (!artist?.trim() || !album?.trim()) {
    return res.status(400).json({ error: 'artist and album parameters are required', summary: '' });
  }

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.error('LASTFM_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', summary: '' });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${encodeURIComponent(
      artist.trim()
    )}&album=${encodeURIComponent(album.trim())}&api_key=${apiKey}&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(200).json({ summary: '' });
    }

    const data = await response.json();
    // Last.fm's album wiki coverage is spotty - most non-mainstream
    // releases simply have no wiki object at all, which is fine, the
    // client just shows nothing rather than an error.
    const rawSummary = data?.album?.wiki?.summary;
    const summary = typeof rawSummary === 'string' ? cleanWiki(rawSummary) : '';

    return res.status(200).json({ summary });
  } catch (error: any) {
    console.error('Serverless Last.fm album.getinfo error:', error);
    return res.status(500).json({ error: 'Failed to fetch album info', summary: '' });
  }
}
