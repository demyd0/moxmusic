import type { Album, SearchOptions, Track } from '@/types/album';
import { getSmartRecommendations, getGenreRecommendations } from '@/services/recommendations';

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

const MB_REQUEST_TIMEOUT_MS = 6000;

/**
 * Fetches JSON from MusicBrainz with the required User-Agent header, rate
 * limiting, a hard per-attempt timeout, and a couple of retries on a 503
 * or timeout. MusicBrainz's servers return "The MusicBrainz web server is
 * currently busy. Please try again later." fairly often even well under
 * the request-rate limit - in testing, a retry a second or two later
 * almost always succeeds. Without the timeout, a request that just hangs
 * (rather than cleanly erroring) had no bound at all - the browser's own
 * default is minutes, which is what "loads forever and never opens" was:
 * not a crash, just a fetch() nobody ever gave up on.
 */
async function fetchMusicBrainzJson(url: string, retries = 2): Promise<any | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await enforceMbRateLimit();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MB_REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MusicTracker/1.0 (personal non-commercial project - contact@mviewie.app)',
          'Accept': 'application/json',
        },
      });
      if (res.ok) return await res.json();
      if (res.status === 503 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      return null;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      console.error('MusicBrainz request failed after retries:', err);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return null;
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

  try {
    const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query.trim())}&fmt=json&limit=16`;
    const data = await fetchMusicBrainzJson(url);

    if (!data?.releases || !Array.isArray(data.releases)) return [];

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
      // No `entity=album` here on purpose: for some collectionIds iTunes's
      // lookup endpoint fails the CORS preflight / returns no ACAO header
      // specifically for that combination, so fetch() throws "Failed to
      // fetch". A plain id lookup is unambiguous for a collectionId and
      // returns the same collection object without that failure mode.
      const url = `https://itunes.apple.com/lookup?id=${cleanId}`;
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
    try {
      // inc=artist-credits is required here - unlike the search endpoint,
      // MusicBrainz's single-release lookup omits artist-credit entirely
      // by default, which is why this was falling back to "Unknown Artist"
      // for every release opened from search (the artist name showed up
      // fine in the results grid, which uses the search endpoint, but not
      // once you clicked into the album).
      const url = `https://musicbrainz.org/ws/2/release/${cleanMbid}?fmt=json&inc=artist-credits`;
      const release = await fetchMusicBrainzJson(url);
      if (release) {
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
          id: item.trackId ? `itunes-track-${item.trackId}` : undefined,
          trackNumber: item.trackNumber || 1,
          title: item.trackName || 'Untitled Track',
          durationMs: item.trackTimeMillis,
          previewUrl: item.previewUrl || undefined,
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
    try {
      const url = `https://musicbrainz.org/ws/2/release/${cleanMbid}?inc=recordings&fmt=json`;
      const data = await fetchMusicBrainzJson(url);
      const media = data?.media?.[0];
      if (!media || !media.tracks || !Array.isArray(media.tracks)) return [];

      return media.tracks.map((t: any, index: number) => ({
        id: t.recording?.id ? `mb-track-${t.recording.id}` : undefined,
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
 * Fetch an album and its tracklist together. For MusicBrainz this is ONE
 * network request (inc=artist-credits+recordings) instead of the two
 * fetchAlbumById + fetchAlbumTracklist calls the album details page used
 * to make separately - each MusicBrainz request costs at least the 850ms
 * rate-limit spacing plus whatever retry backoff it needs, so halving the
 * request count roughly halves both the typical wait and the odds of the
 * page hitting a 503 at all. iTunes doesn't have this reliability problem
 * (it's fast and rarely errors), so it keeps making its own two
 * lightweight calls in parallel rather than needing this treatment.
 */
export async function fetchAlbumWithTracklist(id: string): Promise<{ album: Album | null; tracks: Track[] }> {
  if (!id) return { album: null, tracks: [] };

  if (id.startsWith('mb-')) {
    const cleanMbid = id.replace('mb-', '');
    try {
      const url = `https://musicbrainz.org/ws/2/release/${cleanMbid}?fmt=json&inc=artist-credits+recordings`;
      const release = await fetchMusicBrainzJson(url);
      if (!release) return { album: null, tracks: [] };

      let artistName = 'Unknown Artist';
      let artistMbid: string | undefined = undefined;
      if (release['artist-credit'] && Array.isArray(release['artist-credit']) && release['artist-credit'].length > 0) {
        artistName = release['artist-credit'].map((ac: any) => ac.name || ac.artist?.name || '').filter(Boolean).join(' & ') || artistName;
        artistMbid = release['artist-credit'][0]?.artist?.id;
      }

      const album: Album = {
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

      const media = release.media?.[0];
      const tracks: Track[] =
        media?.tracks && Array.isArray(media.tracks)
          ? media.tracks.map((t: any, index: number) => ({
              id: t.recording?.id ? `mb-track-${t.recording.id}` : undefined,
              trackNumber: t.position || index + 1,
              title: t.title || t.recording?.title || 'Untitled Track',
              durationMs: t.length || t.recording?.length,
            }))
          : [];

      return { album, tracks };
    } catch (err) {
      console.error('MusicBrainz combined release lookup failed:', err);
      return { album: null, tracks: [] };
    }
  }

  // iTunes: two fast, reliable calls in parallel - no reliability problem
  // to work around here.
  const [album, tracks] = await Promise.all([fetchAlbumById(id), fetchAlbumTracklist(id)]);
  return { album, tracks };
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
    try {
      const url = `https://musicbrainz.org/ws/2/release-group?artist=${cleanMbid}&type=album&fmt=json&limit=50`;
      const data = await fetchMusicBrainzJson(url);
      const releaseGroups = data?.['release-groups'];
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

/**
 * Genre/tag-targeted recommendations wrapper - see getGenreRecommendations
 * in recommendations.ts.
 */
export async function fetchGenreRecommendations(
  genre: string,
  likedAlbums: Album[] = [],
  toListenAlbums: Album[] = []
): Promise<{ artistName: string; albums: Album[]; isFallback: boolean }> {
  return getGenreRecommendations(genre, likedAlbums, toListenAlbums);
}
