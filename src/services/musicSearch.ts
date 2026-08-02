import type { Album, SearchOptions, Track } from '@/types/album';
import { getSmartRecommendations } from '@/services/recommendations';

// Rate Limiter state for MusicBrainz (strict 1 req/sec max)
let lastMbCallTimestamp = 0;
const MIN_MB_CALL_INTERVAL_MS = 850;

/**
 * Ensures MusicBrainz calls are spaced out by at least 850ms
 */
async function enforceMbRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastMbCallTimestamp;
  
  if (timeSinceLastCall < MIN_MB_CALL_INTERVAL_MS) {
    const waitTime = MIN_MB_CALL_INTERVAL_MS - timeSinceLastCall;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  
  lastMbCallTimestamp = Date.now();
}

/**
 * Search Level 1: iTunes Search API
 */
export async function searchiTunes(query: string): Promise<Album[]> {
  if (!query.trim()) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&entity=album&limit=24`;
    const response = await fetch(url);
    
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => {
      const coverUrl = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x600bb')
        : undefined;

      return {
        id: `itunes-${item.collectionId}`,
        title: item.collectionName || 'Untitled Album',
        artist: item.artistName || 'Unknown Artist',
        artistId: item.artistId ? `itunes-${item.artistId}` : undefined,
        coverUrl,
        releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
        source: 'itunes',
        genre: item.primaryGenreName,
        trackCount: item.trackCount,
      };
    });
  } catch (error) {
    console.error('Error fetching from iTunes API:', error);
    return [];
  }
}

/**
 * Search Level 2: MusicBrainz API + Cover Art Archive
 */
export async function searchMusicBrainz(query: string): Promise<Album[]> {
  if (!query.trim()) return [];

  await enforceMbRateLimit();

  try {
    const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query.trim())}&fmt=json&limit=16`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MusicTracker/1.0 (personal non-commercial project - contact@mviewie.app)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.releases || !Array.isArray(data.releases)) return [];

    return data.releases.map((release: any) => {
      let artistName = 'Unknown Artist';
      let artistMbid: string | undefined = undefined;

      if (release['artist-credit'] && Array.isArray(release['artist-credit']) && release['artist-credit'].length > 0) {
        artistName = release['artist-credit'].map((ac: any) => ac.name || ac.artist?.name || '').filter(Boolean).join(' & ') || artistName;
        artistMbid = release['artist-credit'][0]?.artist?.id;
      }

      const coverUrl = `https://coverartarchive.org/release/${release.id}/front`;

      return {
        id: `mb-${release.id}`,
        mbid: release.id,
        title: release.title || 'Untitled Release',
        artist: artistName,
        artistId: artistMbid ? `mb-${artistMbid}` : undefined,
        coverUrl,
        releaseYear: release.date ? release.date.substring(0, 4) : undefined,
        source: 'musicbrainz',
        trackCount: release['track-count'],
      };
    });
  } catch (error) {
    console.error('Error fetching from MusicBrainz API:', error);
    return [];
  }
}

/**
 * Unified Two-Tier Album Search API
 */
export async function searchAlbums(
  query: string,
  options: SearchOptions = {}
): Promise<{ results: Album[]; searchedMb: boolean }> {
  if (!query.trim()) {
    return { results: [], searchedMb: false };
  }

  const itunesResults = await searchiTunes(query);

  let mbResults: Album[] = [];
  let searchedMb = false;

  const shouldSearchMb = options.enableBroadSearch || itunesResults.length < 4;

  if (shouldSearchMb) {
    searchedMb = true;
    mbResults = await searchMusicBrainz(query);
  }

  const seenKeys = new Set<string>();
  const combinedResults: Album[] = [];

  for (const album of itunesResults) {
    const key = `${album.artist.toLowerCase().trim()}_${album.title.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combinedResults.push(album);
    }
  }

  for (const album of mbResults) {
    const key = `${album.artist.toLowerCase().trim()}_${album.title.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combinedResults.push(album);
    }
  }

  return {
    results: combinedResults,
    searchedMb,
  };
}

/**
 * Fetch Single Album by ID directly (iTunes Lookup or MusicBrainz Release API)
 */
export async function fetchAlbumById(id: string): Promise<Album | null> {
  if (!id) return null;

  // iTunes Direct Lookup
  if (id.startsWith('itunes-')) {
    const cleanId = id.replace('itunes-', '');
    try {
      const url = `https://itunes.apple.com/lookup?id=${cleanId}&entity=album`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const item = data.results?.find((r: any) => r.wrapperType === 'collection' || r.collectionId);
        if (item) {
          return {
            id: `itunes-${item.collectionId}`,
            title: item.collectionName || 'Untitled Album',
            artist: item.artistName || 'Unknown Artist',
            artistId: item.artistId ? `itunes-${item.artistId}` : undefined,
            coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
            releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
            source: 'itunes',
            genre: item.primaryGenreName,
            trackCount: item.trackCount,
          };
        }
      }
    } catch (err) {
      console.error('iTunes album lookup error:', err);
    }
  }

  // MusicBrainz Direct Lookup
  if (id.startsWith('mb-')) {
    const cleanMbid = id.replace('mb-', '');
    await enforceMbRateLimit();
    try {
      const url = `https://musicbrainz.org/ws/2/release/${cleanMbid}?fmt=json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MusicTracker/1.0 (personal non-commercial project - contact@mviewie.app)',
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const release = await res.json();
        let artistName = 'Unknown Artist';
        let artistMbid: string | undefined = undefined;
        if (release['artist-credit'] && Array.isArray(release['artist-credit']) && release['artist-credit'].length > 0) {
          artistName = release['artist-credit'].map((ac: any) => ac.name || ac.artist?.name || '').filter(Boolean).join(' & ') || artistName;
          artistMbid = release['artist-credit'][0]?.artist?.id;
        }
        return {
          id: `mb-${release.id}`,
          mbid: release.id,
          title: release.title || 'Untitled Release',
          artist: artistName,
          artistId: artistMbid ? `mb-${artistMbid}` : undefined,
          coverUrl: `https://coverartarchive.org/release/${release.id}/front`,
          releaseYear: release.date ? release.date.substring(0, 4) : undefined,
          source: 'musicbrainz',
          trackCount: release['media']?.[0]?.['track-count'],
        };
      }
    } catch (err) {
      console.error('MusicBrainz release lookup error:', err);
    }
  }

  return null;
}

/**
 * Fetch Album Tracklist by Album ID
 */
export async function fetchAlbumTracklist(albumId: string): Promise<Track[]> {
  if (!albumId) return [];

  // iTunes Album Lookup
  if (albumId.startsWith('itunes-')) {
    const cleanId = albumId.replace('itunes-', '');
    try {
      const url = `https://itunes.apple.com/lookup?id=${cleanId}&entity=song`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      const tracks: Track[] = data.results
        .filter((item: any) => item.wrapperType === 'track')
        .map((item: any) => ({
          trackNumber: item.trackNumber || 1,
          title: item.trackName || 'Untitled Track',
          durationMs: item.trackTimeMillis,
        }))
        .sort((a: Track, b: Track) => a.trackNumber - b.trackNumber);

      return tracks;
    } catch (err) {
      console.error('iTunes tracklist lookup failed:', err);
      return [];
    }
  }

  // MusicBrainz Album Lookup
  if (albumId.startsWith('mb-')) {
    const cleanMbid = albumId.replace('mb-', '');
    await enforceMbRateLimit();
    try {
      const url = `https://musicbrainz.org/ws/2/release/${cleanMbid}?inc=recordings&fmt=json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MusicTracker/1.0 (personal non-commercial project - contact@mviewie.app)',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const media = data.media?.[0];
      if (!media || !media.tracks || !Array.isArray(media.tracks)) return [];

      return media.tracks.map((t: any, index: number) => ({
        trackNumber: t.position || index + 1,
        title: t.title || t.recording?.title || 'Untitled Track',
        durationMs: t.length || t.recording?.length,
      }));
    } catch (err) {
      console.error('MusicBrainz tracklist lookup failed:', err);
      return [];
    }
  }

  return [];
}

/**
 * Fetch Artist Discography by Artist Query or ID
 */
export async function fetchArtistDiscography(
  artistIdOrName: string,
  artistNameHint?: string
): Promise<{ artistName: string; albums: Album[] }> {
  if (!artistIdOrName) return { artistName: 'Unknown Artist', albums: [] };

  // 1. iTunes Artist Discography Lookup
  if (artistIdOrName.startsWith('itunes-')) {
    const cleanId = artistIdOrName.replace('itunes-', '');
    try {
      const url = `https://itunes.apple.com/lookup?id=${cleanId}&entity=album&limit=50`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const artistObj = data.results.find((item: any) => item.wrapperType === 'artist');
          const artistName = artistObj?.artistName || artistNameHint || 'Artist Discography';

          const albums: Album[] = data.results
            .filter((item: any) => item.wrapperType === 'collection')
            .map((item: any) => ({
              id: `itunes-${item.collectionId}`,
              title: item.collectionName || 'Untitled Album',
              artist: item.artistName || artistName,
              artistId: artistIdOrName,
              coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
              releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
              source: 'itunes',
              genre: item.primaryGenreName,
              trackCount: item.trackCount,
            }));

          if (albums.length > 0) {
            return { artistName, albums };
          }
        }
      }
    } catch (err) {
      console.error('iTunes discography lookup failed:', err);
    }
  }

  // 2. MusicBrainz Release-Group Discography Lookup
  if (artistIdOrName.startsWith('mb-')) {
    const cleanMbid = artistIdOrName.replace('mb-', '');
    await enforceMbRateLimit();
    try {
      const url = `https://musicbrainz.org/ws/2/release-group?artist=${cleanMbid}&type=album&fmt=json&limit=50`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MusicTracker/1.0 (personal non-commercial project - contact@mviewie.app)',
          'Accept': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const releaseGroups = data['release-groups'];
        if (Array.isArray(releaseGroups) && releaseGroups.length > 0) {
          const artistName = releaseGroups[0]?.['artist-credit']?.[0]?.name || artistNameHint || 'Artist Discography';
          const albums: Album[] = releaseGroups.map((rg: any) => ({
            id: `mb-${rg.id}`,
            mbid: rg.id,
            title: rg.title || 'Untitled Album',
            artist: artistName,
            artistId: artistIdOrName,
            coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front`,
            releaseYear: rg['first-release-date'] ? rg['first-release-date'].substring(0, 4) : undefined,
            source: 'musicbrainz',
          }));

          return { artistName, albums };
        }
      }
    } catch (err) {
      console.error('MusicBrainz release-group lookup failed:', err);
    }
  }

  // 3. Fallback by Search Query if Plain Text Artist Name
  const queryName = artistNameHint || artistIdOrName.replace(/^(itunes|mb)-/, '');
  const searchResults = await searchAlbums(queryName, { enableBroadSearch: true });
  const filteredAlbums = searchResults.results.filter(
    (a) => a.artist.toLowerCase().includes(queryName.toLowerCase()) || queryName.toLowerCase().includes(a.artist.toLowerCase())
  );

  return {
    artistName: queryName,
    albums: filteredAlbums.length > 0 ? filteredAlbums : searchResults.results,
  };
}

/**
 * Smart Recommendations wrapper delegating to recommendations service
 */
export async function fetchRecommendations(
  likedAlbums: Album[],
  toListenAlbums: Album[] = [],
  forceRefresh = false
): Promise<{ artistName: string; albums: Album[]; isFallback: boolean }> {
  return getSmartRecommendations(likedAlbums, toListenAlbums, forceRefresh);
}
