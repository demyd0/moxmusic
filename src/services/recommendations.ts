import type { Album } from '@/types/album';

const CACHE_KEY = 'mviewie_recs_cache_v2';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachePayload {
  timestamp: number;
  likedSignature: string;
  artistName: string;
  albums: Album[];
  isFallback: boolean;
}

/**
 * Fetch iTunes Top 25 Albums RSS Feed (Fallback for empty collections)
 */
export async function fetchiTunesTopAlbumsFallback(): Promise<{ artistName: string; albums: Album[]; isFallback: boolean }> {
  try {
    const url = 'https://itunes.apple.com/us/rss/topalbums/limit=25/json';
    const response = await fetch(url);
    if (!response.ok) return { artistName: 'TOP CHARTS', albums: [], isFallback: true };

    const data = await response.json();
    const entries = data?.feed?.entry;

    if (!Array.isArray(entries)) return { artistName: 'TOP CHARTS', albums: [], isFallback: true };

    const albums: Album[] = entries.map((entry: any) => {
      const albumId = entry.id?.attributes?.['im:id'];
      const title = entry['im:name']?.label || 'Untitled Album';
      const artist = entry['im:artist']?.label || 'Unknown Artist';
      const releaseYear = entry['im:releaseDate']?.attributes?.label
        ? entry['im:releaseDate'].attributes.label.substring(0, 4)
        : undefined;

      const coverImages = entry['im:image'];
      const coverUrl = Array.isArray(coverImages) && coverImages.length > 0
        ? coverImages[coverImages.length - 1].label.replace('170x170bb', '600x600bb')
        : undefined;

      return {
        id: `itunes-${albumId || Math.random()}`,
        title,
        artist,
        coverUrl,
        releaseYear,
        source: 'itunes',
      };
    });

    return {
      artistName: 'TOP CHARTS',
      albums,
      isFallback: true,
    };
  } catch (error) {
    console.error('Error fetching iTunes Top Albums RSS:', error);
    return { artistName: 'TOP CHARTS', albums: [], isFallback: true };
  }
}

/**
 * Fetch Last.fm Similar Artists via Vercel Serverless Function (or client fallback)
 */
async function fetchLastFmSimilar(artistName: string): Promise<{ name: string; match: number }[]> {
  try {
    // Always go through the Vercel Serverless Function - it keeps the Last.fm API key
    // server-side only. There must be no client-side fallback that embeds the key in
    // the browser bundle, since that would leak it to anyone reading the page source.
    const proxyUrl = `/api/similar-artists?artist=${encodeURIComponent(artistName.trim())}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) return [];

    const data = await proxyRes.json();
    if (!Array.isArray(data?.similarArtists)) return [];

    return data.similarArtists;
  } catch (error) {
    console.error(`fetchLastFmSimilar failed for "${artistName}":`, error);
    return [];
  }
}

/**
 * Fetch top artists tagged with a given genre via Last.fm's tag.gettopartists,
 * proxied through the same Vercel function pattern as fetchLastFmSimilar (the
 * API key never reaches the browser).
 */
async function fetchLastFmTagTopArtists(tag: string): Promise<string[]> {
  try {
    const proxyUrl = `/api/genre-artists?tag=${encodeURIComponent(tag.trim())}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) return [];

    const data = await proxyRes.json();
    if (!Array.isArray(data?.artists)) return [];

    return data.artists.map((a: { name: string }) => a.name).filter(Boolean);
  } catch (error) {
    console.error(`fetchLastFmTagTopArtists failed for "${tag}":`, error);
    return [];
  }
}

/**
 * Fetch an artist's top Last.fm tags, proxied through the same
 * key-hiding Vercel function pattern as the other Last.fm calls here.
 */
async function fetchLastFmArtistTags(artistName: string): Promise<string[]> {
  try {
    const proxyUrl = `/api/artist-tags?artist=${encodeURIComponent(artistName.trim())}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) return [];
    const data = await proxyRes.json();
    if (!Array.isArray(data?.tags)) return [];
    return data.tags;
  } catch (error) {
    console.error(`fetchLastFmArtistTags failed for "${artistName}":`, error);
    return [];
  }
}

function tagMatchesGenre(tags: string[], genreLower: string): boolean {
  return tags.some((t) => t === genreLower || t.includes(genreLower) || genreLower.includes(t));
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Genre/tag-targeted recommendations - e.g. "ambient". Actually reasons
 * from the user's own taste instead of just returning Last.fm's global
 * top artists for the tag:
 *
 *  1. Check which of the user's LIKED artists are themselves tagged with
 *     this genre - if any are, use those as the seed for similar-artist
 *     expansion (so "ambient" recommendations come from the ambient
 *     artists you already like, not a generic chart).
 *  2. If none of your liked artists match this genre (cold start within
 *     it), fall back to your WHOLE liked catalog as the seed - still
 *     reasoning from your actual taste - but then verify each candidate
 *     is actually tagged with the genre before keeping it, so the result
 *     stays genre-relevant instead of turning into "more of everything".
 *  3. Only if that still comes up empty (obscure/misspelled tag, or a
 *     brand new account with nothing liked) fall back to Last.fm's
 *     global top artists for the tag, so the feature never dead-ends.
 */
export async function getGenreRecommendations(
  genre: string,
  likedAlbums: Album[] = [],
  toListenAlbums: Album[] = []
): Promise<{ artistName: string; albums: Album[]; isFallback: boolean }> {
  const trimmed = genre.trim();
  const genreLower = trimmed.toLowerCase();
  if (!trimmed) return { artistName: trimmed, albums: [], isFallback: false };

  const likedArtistNames = Array.from(new Set(likedAlbums.map((a) => a.artist.trim()).filter(Boolean))).slice(0, 60);
  const likedArtistSet = new Set(likedArtistNames.map((a) => a.toLowerCase()));
  const toListenArtistSet = new Set(toListenAlbums.map((a) => a.artist.trim().toLowerCase()).filter(Boolean));
  const seenAlbumKeys = new Set<string>(
    [...likedAlbums, ...toListenAlbums].map(
      (a) => `${a.artist.toLowerCase().trim()}_${a.title.toLowerCase().trim()}`
    )
  );

  // Step 1: which liked artists are actually tagged with this genre?
  let genreSeedArtists: string[] = [];
  if (likedArtistNames.length > 0) {
    const tagResults = await Promise.allSettled(likedArtistNames.map((name) => fetchLastFmArtistTags(name)));
    genreSeedArtists = likedArtistNames.filter((_, i) => {
      const res = tagResults[i];
      return res.status === 'fulfilled' && tagMatchesGenre(res.value, genreLower);
    });
  }

  const usedWholeCatalogFallback = genreSeedArtists.length === 0;
  const seedArtists = genreSeedArtists.length > 0 ? genreSeedArtists : likedArtistNames;

  const candidateFrequencyMap = new Map<string, number>();
  const candidateMatchSumMap = new Map<string, number>();

  if (seedArtists.length > 0) {
    const similarResults = await Promise.allSettled(seedArtists.map((artist) => fetchLastFmSimilar(artist)));
    for (const result of similarResults) {
      if (result.status !== 'fulfilled') continue;
      for (const sim of result.value) {
        const simLower = sim.name.toLowerCase();
        if (likedArtistSet.has(simLower) || toListenArtistSet.has(simLower)) continue;
        candidateFrequencyMap.set(sim.name, (candidateFrequencyMap.get(sim.name) || 0) + 1);
        candidateMatchSumMap.set(sim.name, (candidateMatchSumMap.get(sim.name) || 0) + sim.match);
      }
    }
  }

  const rankedCandidates = [...candidateFrequencyMap.entries()]
    .map(([name, freq]) => ({ name, freq, avgMatch: (candidateMatchSumMap.get(name) || 0) / freq }))
    .sort((a, b) => (b.freq !== a.freq ? b.freq - a.freq : b.avgMatch - a.avgMatch));

  let finalArtists: string[] = [];
  if (!usedWholeCatalogFallback) {
    // Seed was already genre-matched, so its similar artists should be too.
    finalArtists = rankedCandidates.slice(0, 16).map((c) => c.name);
  } else {
    // Seed was the whole catalog (cold start in this genre) - verify each
    // candidate is actually tagged with the genre before trusting it.
    const toCheck = rankedCandidates.slice(0, 40);
    const tagCheckResults = await Promise.allSettled(toCheck.map((c) => fetchLastFmArtistTags(c.name)));
    finalArtists = toCheck
      .filter((_, i) => {
        const res = tagCheckResults[i];
        return res.status === 'fulfilled' && tagMatchesGenre(res.value, genreLower);
      })
      .slice(0, 16)
      .map((c) => c.name);
  }

  // Last resort: global top artists for the tag, unfiltered by taste.
  if (finalArtists.length === 0) {
    const tagArtists = await fetchLastFmTagTopArtists(trimmed);
    finalArtists = shuffle(
      tagArtists.filter((name) => {
        const lower = name.toLowerCase();
        return !likedArtistSet.has(lower) && !toListenArtistSet.has(lower);
      })
    ).slice(0, 16);
  }

  if (finalArtists.length === 0) {
    return { artistName: trimmed, albums: [], isFallback: false };
  }

  const albumFetchResults = await Promise.allSettled(finalArtists.map((name) => fetchTopAlbumsForArtist(name)));

  const albums: Album[] = [];
  for (const res of albumFetchResults) {
    if (res.status === 'fulfilled') {
      for (const album of res.value) {
        const key = `${album.artist.toLowerCase().trim()}_${album.title.toLowerCase().trim()}`;
        if (!seenAlbumKeys.has(key)) {
          seenAlbumKeys.add(key);
          albums.push(album);
        }
      }
    }
    if (albums.length >= 16) break;
  }

  return { artistName: trimmed, albums, isFallback: false };
}

/**
 * Fetch 1-2 top albums for a candidate artist from iTunes API
 */
async function fetchTopAlbumsForArtist(artistName: string): Promise<Album[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      artistName
    )}&entity=album&limit=4`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    // Filter albums where artist matches candidate artist
    const matchingAlbums = data.results.filter(
      (item: any) =>
        item.wrapperType === 'collection' &&
        item.artistName.toLowerCase().includes(artistName.toLowerCase())
    );

    const targetList = matchingAlbums.length > 0 ? matchingAlbums : data.results.slice(0, 2);

    return targetList.slice(0, 2).map((item: any) => ({
      id: `itunes-${item.collectionId}`,
      title: item.collectionName || 'Untitled Album',
      artist: item.artistName || artistName,
      artistId: item.artistId ? `itunes-${item.artistId}` : undefined,
      coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined,
      releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : undefined,
      source: 'itunes',
      genre: item.primaryGenreName,
      trackCount: item.trackCount,
    }));
  } catch (error) {
    console.error(`Failed to fetch albums for candidate artist "${artistName}":`, error);
    return [];
  }
}

/**
 * Smart Recommendation Engine
 * Analyzes entire Liked profile via Last.fm, ranks candidates, applies 24-hr caching, and falls back to iTunes RSS.
 */
export async function getSmartRecommendations(
  likedAlbums: Album[],
  toListenAlbums: Album[] = [],
  forceRefresh = false
): Promise<{ artistName: string; albums: Album[]; isFallback: boolean }> {
  // If Liked list is empty $\rightarrow$ Immediate iTunes RSS Top Charts Fallback
  if (likedAlbums.length === 0) {
    return fetchiTunesTopAlbumsFallback();
  }

  // Generate signature based on current liked albums
  const likedSignature = likedAlbums
    .map((a) => a.id)
    .sort()
    .join(',');

  // Check 24-Hour Client-Side localStorage Cache unless forceRefresh is true
  if (!forceRefresh) {
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      if (rawCache) {
        const cache: CachePayload = JSON.parse(rawCache);
        const isExpired = Date.now() - cache.timestamp > CACHE_DURATION_MS;
        const signatureMatches = cache.likedSignature === likedSignature;

        if (!isExpired && signatureMatches && cache.albums.length > 0 && !cache.isFallback) {
          return {
            artistName: cache.artistName,
            albums: cache.albums,
            isFallback: false,
          };
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }

  // Step 1: Collect unique artists from user's Liked profile
  const likedArtistNames = Array.from(
    new Set(likedAlbums.map((a) => a.artist.trim()).filter(Boolean))
  );

  const likedArtistSet = new Set(likedArtistNames.map((a) => a.toLowerCase()));
  const toListenArtistSet = new Set(
    toListenAlbums.map((a) => a.artist.trim().toLowerCase()).filter(Boolean)
  );

  // Step 2 & 3: Query Last.fm artist.getSimilar for each liked artist IN PARALLEL via Promise.allSettled
  const candidateFrequencyMap = new Map<string, number>();
  const candidateMatchSumMap = new Map<string, number>();

  const similarResults = await Promise.allSettled(
    likedArtistNames.map((artist) => fetchLastFmSimilar(artist))
  );

  for (const result of similarResults) {
    if (result.status === 'fulfilled') {
      for (const sim of result.value) {
        const simNameLower = sim.name.toLowerCase();

        // Exclude artists already in Liked or To Listen
        if (likedArtistSet.has(simNameLower) || toListenArtistSet.has(simNameLower)) {
          continue;
        }

        const currentFreq = candidateFrequencyMap.get(sim.name) || 0;
        const currentMatchSum = candidateMatchSumMap.get(sim.name) || 0;

        candidateFrequencyMap.set(sim.name, currentFreq + 1);
        candidateMatchSumMap.set(sim.name, currentMatchSum + sim.match);
      }
    }
  }

  // Step 4: Rank candidates by frequency count (descending) then avg match score (descending)
  const candidateArray: { name: string; frequency: number; avgMatch: number }[] = [];

  candidateFrequencyMap.forEach((freq, name) => {
    const matchSum = candidateMatchSumMap.get(name) || 0;
    candidateArray.push({
      name,
      frequency: freq,
      avgMatch: matchSum / freq,
    });
  });

  candidateArray.sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency; // Rank by frequency first
    }
    return b.avgMatch - a.avgMatch; // Rank by average match score second
  });

  // On a plain load, the best-ranked candidates give the strongest first
  // impression. On an explicit refresh, that top-15 is 100% deterministic
  // for a given liked collection (same Last.fm data in, same ranking out),
  // which is why refreshing looked like it did nothing - so instead pull a
  // shuffled slice from a wider qualified pool, still ranked-relevant, just
  // not the exact same 15 every time.
  const topCandidates = forceRefresh
    ? shuffle(candidateArray.slice(0, 30)).slice(0, 15)
    : candidateArray.slice(0, 15);

  // Step 5: Fetch 1-2 albums per candidate artist via iTunes lookup in parallel
  const albumFetchResults = await Promise.allSettled(
    topCandidates.map((cand) => fetchTopAlbumsForArtist(cand.name))
  );

  const recommendedAlbums: Album[] = [];
  const seenAlbumKeys = new Set<string>(
    [...likedAlbums, ...toListenAlbums].map(
      (a) => `${a.artist.toLowerCase().trim()}_${a.title.toLowerCase().trim()}`
    )
  );

  for (const res of albumFetchResults) {
    if (res.status === 'fulfilled') {
      for (const album of res.value) {
        const key = `${album.artist.toLowerCase().trim()}_${album.title.toLowerCase().trim()}`;
        if (!seenAlbumKeys.has(key)) {
          seenAlbumKeys.add(key);
          recommendedAlbums.push(album);
        }
      }
    }
    if (recommendedAlbums.length >= 16) break;
  }

  // Fallback to iTunes Top Charts if algorithm produced no albums
  if (recommendedAlbums.length === 0) {
    return fetchiTunesTopAlbumsFallback();
  }

  const resultPayload = {
    artistName: 'RECOMMENDED FOR YOU',
    albums: recommendedAlbums,
    isFallback: false,
  };

  // Write payload to 24-Hour localStorage Cache
  try {
    const cacheData: CachePayload = {
      timestamp: Date.now(),
      likedSignature,
      artistName: resultPayload.artistName,
      albums: resultPayload.albums,
      isFallback: false,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Cache write error:', e);
  }

  return resultPayload;
}
