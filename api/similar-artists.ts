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

  const artist = req.query.artist as string;
  if (!artist || !artist.trim()) {
    return res.status(400).json({ error: 'Artist parameter is required' });
  }

  // Read SECRET server-side environment variable (no VITE_ prefix!)
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.error('LASTFM_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', similarArtists: [] });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(
      artist.trim()
    )}&api_key=${apiKey}&format=json&limit=15`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ similarArtists: [] });
    }

    const data = await response.json();
    const similarArray = data?.similarartists?.artist;

    if (!Array.isArray(similarArray)) {
      return res.status(200).json({ similarArtists: [] });
    }

    const similarArtists = similarArray.map((item: any) => ({
      name: item.name,
      match: parseFloat(item.match) || 0.5,
    }));

    return res.status(200).json({ similarArtists });
  } catch (error: any) {
    console.error('Serverless Last.fm API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch similar artists', similarArtists: [] });
  }
}
