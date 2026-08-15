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
    return res.status(400).json({ error: 'Artist parameter is required', events: [] });
  }

  const appId = process.env.BANDSINTOWN_APP_ID;
  if (!appId) {
    console.error('BANDSINTOWN_APP_ID is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', events: [] });
  }

  try {
    const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(
      artist.trim()
    )}/events?app_id=${encodeURIComponent(appId)}&date=upcoming`;

    const response = await fetch(url);
    // Bandsintown returns 200 with {message: "..."} for an artist it
    // doesn't recognize, rather than a 404 - either way, no events.
    if (!response.ok) {
      return res.status(200).json({ events: [] });
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return res.status(200).json({ events: [] });
    }

    const events = data
      .map((event: any) => ({
        id: event.id,
        date: event.datetime,
        venueName: event.venue?.name || '',
        city: event.venue?.city || '',
        region: event.venue?.region || '',
        country: event.venue?.country || '',
        ticketUrl: event.url || event.offers?.[0]?.url || '',
      }))
      .filter((e) => e.id && e.date);

    return res.status(200).json({ events });
  } catch (error: any) {
    console.error('Serverless Bandsintown events error:', error);
    return res.status(500).json({ error: 'Failed to fetch artist events', events: [] });
  }
}
