export interface BandcampLinkResult {
  found: boolean;
  url?: string;
}

export interface BandcampLookupResponse {
  artist: BandcampLinkResult;
  album: BandcampLinkResult | null;
}

/**
 * Looks up whether an artist (and optionally a specific album) exists on
 * Bandcamp, via the serverless proxy in api/bandcamp-lookup.ts.
 */
export async function fetchBandcampLinks(artist: string, album?: string): Promise<BandcampLookupResponse> {
  const fallback: BandcampLookupResponse = { artist: { found: false }, album: album ? { found: false } : null };
  if (!artist.trim()) return fallback;

  try {
    const params = new URLSearchParams({ artist: artist.trim() });
    if (album?.trim()) params.set('album', album.trim());

    const res = await fetch(`/api/bandcamp-lookup?${params.toString()}`);
    if (!res.ok) return fallback;

    const data = await res.json();
    return {
      artist: data?.artist || { found: false },
      album: data?.album ?? (album ? { found: false } : null),
    };
  } catch (error) {
    console.error('Bandcamp lookup failed:', error);
    return fallback;
  }
}
