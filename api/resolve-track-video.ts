import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Candidate {
  videoId: string;
  title: string;
  channelTitle: string;
  durationSec: number;
  score: number;
}

/** "PT3M45S" -> 225. YouTube's videos.list returns duration in ISO 8601. */
function parseIsoDuration(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const OFF_VERSION_WORDS = ['live', 'cover', 'remix', 'reaction', 'karaoke', 'instrumental', 'sped up', 'nightcore'];

function scoreCandidate(candidate: { title: string; channelTitle: string; durationSec: number }, artist: string, title: string, durationMs?: number): number {
  const normTitle = normalize(candidate.title);
  const normArtist = normalize(artist);
  const normTrack = normalize(title);
  const normChannel = candidate.channelTitle.toLowerCase();

  let score = 0;

  // YouTube auto-generates an official "{Artist} - Topic" channel per
  // artist from the labels' own Content ID audio - by far the strongest
  // signal that this is the real studio recording, not a fan upload.
  if (normChannel.endsWith('- topic') || normChannel.includes(`${normArtist} - topic`)) {
    score += 100;
  }

  if (normTitle.includes(normArtist)) score += 30;
  if (normTitle.includes(normTrack)) score += 40;

  for (const word of OFF_VERSION_WORDS) {
    const inCandidate = normTitle.includes(word);
    const inRequest = normTrack.includes(word);
    if (inCandidate && !inRequest) score -= 60;
  }

  if (durationMs && durationMs > 0 && candidate.durationSec > 0) {
    const diffSec = Math.abs(candidate.durationSec - durationMs / 1000);
    if (diffSec <= 5) score += 40;
    else if (diffSec <= 15) score += 15;
    else score -= Math.min(60, diffSec);
  }

  return score;
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

  const artist = (req.query.artist as string) || '';
  const title = (req.query.title as string) || '';
  const durationMs = req.query.durationMs ? Number(req.query.durationMs) : undefined;

  if (!artist.trim() || !title.trim()) {
    return res.status(400).json({ error: 'artist and title parameters are required', match: null, alternates: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY is not configured in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration', match: null, alternates: [] });
  }

  try {
    const query = `${artist} ${title}`;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=8&q=${encodeURIComponent(
      query
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      return res.status(200).json({ match: null, alternates: [] });
    }
    const searchData = await searchRes.json();
    const items: any[] = Array.isArray(searchData?.items) ? searchData.items : [];
    const videoIds = items.map((item) => item?.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) {
      return res.status(200).json({ match: null, alternates: [] });
    }

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(
      ','
    )}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      return res.status(200).json({ match: null, alternates: [] });
    }
    const detailsData = await detailsRes.json();
    const detailItems: any[] = Array.isArray(detailsData?.items) ? detailsData.items : [];

    const candidates: Candidate[] = detailItems.map((item) => {
      const base = {
        title: item?.snippet?.title || '',
        channelTitle: item?.snippet?.channelTitle || '',
        durationSec: parseIsoDuration(item?.contentDetails?.duration || ''),
      };
      return { videoId: item.id, ...base, score: scoreCandidate(base, artist, title, durationMs) };
    });

    candidates.sort((a, b) => b.score - a.score);

    const [match, ...alternates] = candidates;
    return res.status(200).json({
      match: match ? { videoId: match.videoId, title: match.title, channelTitle: match.channelTitle } : null,
      alternates: alternates.slice(0, 4).map((c) => ({ videoId: c.videoId, title: c.title, channelTitle: c.channelTitle })),
    });
  } catch (error: any) {
    console.error('Serverless YouTube resolve error:', error);
    return res.status(500).json({ error: 'Failed to resolve track video', match: null, alternates: [] });
  }
}
