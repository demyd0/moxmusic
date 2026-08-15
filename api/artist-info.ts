import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Last.fm bios end with a boilerplate "Read more on Last.fm" link and
 *  contain raw HTML - strip both so the client gets plain text safe to
 *  render directly. */
function cleanBio(html: string): string {
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
  if (!artist || !artist.trim()) {
    return res.status(400).json({ error: 'Artist parameter is required', summary: '', listeners: 0 });
  }

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.error('LASTFM_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', summary: '', listeners: 0 });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
      artist.trim()
    )}&api_key=${apiKey}&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(200).json({ summary: '', listeners: 0 });
    }

    const data = await response.json();
    const rawSummary = data?.artist?.bio?.summary;
    const summary = typeof rawSummary === 'string' ? cleanBio(rawSummary) : '';
    const listeners = Number(data?.artist?.stats?.listeners) || 0;

    return res.status(200).json({ summary, listeners });
  } catch (error: any) {
    console.error('Serverless Last.fm artist.getinfo error:', error);
    return res.status(500).json({ error: 'Failed to fetch artist info', summary: '', listeners: 0 });
  }
}
