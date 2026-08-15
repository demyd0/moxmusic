export interface ArtistInfo {
  summary: string;
  listeners: number;
}

export interface ArtistEvent {
  id: string;
  date: string;
  venueName: string;
  city: string;
  region: string;
  country: string;
  ticketUrl: string;
}

/** Bio + listener count from Last.fm, proxied server-side so the API key
 *  never reaches the browser (same pattern as similar-artists/artist-tags). */
export async function fetchArtistInfo(artistName: string): Promise<ArtistInfo> {
  try {
    const res = await fetch(`/api/artist-info?artist=${encodeURIComponent(artistName.trim())}`);
    if (!res.ok) return { summary: '', listeners: 0 };
    const data = await res.json();
    return { summary: data?.summary || '', listeners: Number(data?.listeners) || 0 };
  } catch (error) {
    console.warn(`fetchArtistInfo failed for "${artistName}":`, error);
    return { summary: '', listeners: 0 };
  }
}

/** Album wiki summary from Last.fm - coverage is spotty for anything
 *  outside well-known mainstream releases, so an empty string is a normal,
 *  expected result, not an error. */
export async function fetchAlbumInfo(artistName: string, albumTitle: string): Promise<string> {
  try {
    const res = await fetch(
      `/api/album-info?artist=${encodeURIComponent(artistName.trim())}&album=${encodeURIComponent(albumTitle.trim())}`
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data?.summary || '';
  } catch (error) {
    console.warn(`fetchAlbumInfo failed for "${artistName} - ${albumTitle}":`, error);
    return '';
  }
}

/** Upcoming concert dates from Bandsintown. */
export async function fetchArtistEvents(artistName: string): Promise<ArtistEvent[]> {
  try {
    const res = await fetch(`/api/artist-events?artist=${encodeURIComponent(artistName.trim())}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch (error) {
    console.warn(`fetchArtistEvents failed for "${artistName}":`, error);
    return [];
  }
}
