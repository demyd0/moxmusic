import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ResolvedVideo {
  videoId: string;
  title: string;
  channelTitle: string;
}

export interface TrackVideoResolution {
  videoId: string | null;
  alternates: ResolvedVideo[];
}

/** artist+title normalized into a stable cache key - dedupes the same
 *  recording across different album API sources (iTunes/MusicBrainz), not
 *  just per our own track id. */
function matchKey(artist: string, title: string): string {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  return encodeURIComponent(`${norm(artist)}|${norm(title)}`);
}

export async function setCachedTrackVideo(artist: string, title: string, videoId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'trackVideoMatches', matchKey(artist, title)), {
      videoId,
      artist,
      title,
      resolvedAt: Date.now(),
    });
  } catch (error) {
    console.warn('Failed to cache track video match:', error);
  }
}

/**
 * Resolves a track to a playable YouTube video id - checks the shared
 * Firestore cache first (so a given recording is only ever searched once,
 * by anyone, ever), and only falls back to the serverless YouTube search
 * on a cache miss. A resolved match is cached for next time; a cache miss
 * with no match found is NOT cached, so it gets retried later rather than
 * permanently stuck.
 */
export async function resolveTrackVideo(artist: string, title: string, durationMs?: number): Promise<TrackVideoResolution> {
  const key = matchKey(artist, title);
  try {
    const cached = await getDoc(doc(db, 'trackVideoMatches', key));
    if (cached.exists()) {
      const data = cached.data();
      if (data?.videoId) return { videoId: data.videoId, alternates: [] };
    }
  } catch (error) {
    console.warn('Failed to read cached track video match:', error);
  }

  try {
    const params = new URLSearchParams({ artist, title });
    if (durationMs) params.set('durationMs', String(durationMs));
    const res = await fetch(`/api/resolve-track-video?${params.toString()}`);
    const data = await res.json();
    const match: ResolvedVideo | null = data?.match || null;
    const alternates: ResolvedVideo[] = Array.isArray(data?.alternates) ? data.alternates : [];
    if (match) {
      void setCachedTrackVideo(artist, title, match.videoId);
    }
    return { videoId: match?.videoId || null, alternates };
  } catch (error) {
    console.warn('Failed to resolve track video:', error);
    return { videoId: null, alternates: [] };
  }
}
