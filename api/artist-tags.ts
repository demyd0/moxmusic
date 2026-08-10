import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    return res.status(400).json({ error: 'Artist parameter is required' });
  }

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.error('LASTFM_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', tags: [] });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(
      artist.trim()
    )}&api_key=${apiKey}&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ tags: [] });
    }

    const data = await response.json();
    const tagArray = data?.toptags?.tag;
    if (!Array.isArray(tagArray)) {
      return res.status(200).json({ tags: [] });
    }

    const tags = tagArray.map((t: any) => (t.name || '').toLowerCase()).filter(Boolean);
    return res.status(200).json({ tags });
  } catch (error: any) {
    console.error('Serverless Last.fm artist.gettoptags error:', error);
    return res.status(500).json({ error: 'Failed to fetch artist tags', tags: [] });
  }
}
