import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for Vercel Serverless Function (no credentials needed - public read-only endpoint)
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

  const tag = req.query.tag as string;
  if (!tag || !tag.trim()) {
    return res.status(400).json({ error: 'Tag parameter is required' });
  }

  // Read SECRET server-side environment variable (no VITE_ prefix!)
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.error('LASTFM_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', artists: [] });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(
      tag.trim()
    )}&api_key=${apiKey}&format=json&limit=30`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ artists: [] });
    }

    const data = await response.json();
    const artistArray = data?.topartists?.artist;

    if (!Array.isArray(artistArray)) {
      return res.status(200).json({ artists: [] });
    }

    const artists = artistArray.map((item: any) => ({ name: item.name }));

    return res.status(200).json({ artists });
  } catch (error: any) {
    console.error('Serverless Last.fm tag.gettopartists error:', error);
    return res.status(500).json({ error: 'Failed to fetch genre artists', artists: [] });
  }
}
