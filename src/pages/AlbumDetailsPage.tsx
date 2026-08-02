import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { fetchAlbumById, fetchAlbumTracklist } from '@/services/musicSearch';
import { getOrCreateUserId } from '@/lib/firebase';
import { 
  subscribeUserCollections, 
  toggleLikeAlbum, 
  toggleToListenAlbum,
  type UserCollectionsState 
} from '@/services/collectionService';
import type { Album, Track } from '@/types/album';
import { 
  ArrowLeft, 
  Disc3, 
  Heart, 
  Headphones, 
  Calendar, 
  Music, 
  Clock,
  Loader2
} from 'lucide-react';

export const AlbumDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userCollections, setUserCollections] = useState<UserCollectionsState>({
    likedIds: new Set(),
    toListenIds: new Set(),
    likedAlbums: [],
    toListenAlbums: [],
  });

  // Subscribe to user collections for Like / Listen states
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initUser() {
      const uid = await getOrCreateUserId();
      setUserId(uid);
      unsubscribe = subscribeUserCollections(uid, (state) => setUserCollections(state));
    }
    initUser();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch Album Info and Tracklist
  useEffect(() => {
    if (!id) return;
    const currentId = id;
    let isMounted = true;

    async function loadDetails() {
      setIsLoading(true);

      try {
        // 1. Check if album is in user's saved collections first
        const savedInLiked = userCollections.likedAlbums.find((a) => a.id === currentId);
        const savedInToListen = userCollections.toListenAlbums.find((a) => a.id === currentId);
        let targetAlbum: Album | null = savedInLiked || savedInToListen || null;

        // 2. Direct API Lookup by ID if not in local collections
        if (!targetAlbum) {
          targetAlbum = await fetchAlbumById(currentId);
        }

        if (isMounted && targetAlbum) {
          setAlbum(targetAlbum);
          const tracklist = await fetchAlbumTracklist(targetAlbum.id);
          if (isMounted) setTracks(tracklist);
        }
      } catch (err) {
        console.error('Error loading album details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [id, userCollections.likedAlbums, userCollections.toListenAlbums]);

  const isLiked = album ? userCollections.likedIds.has(album.id) : false;
  const isToListen = album ? userCollections.toListenIds.has(album.id) : false;

  const handleToggleLike = async () => {
    if (!userId || !album) return;
    await toggleLikeAlbum(userId, album, isLiked);
  };

  const handleToggleToListen = async () => {
    if (!userId || !album) return;
    await toggleToListenAlbum(userId, album, isToListen);
  };

  // Helper to format track duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] text-[#0a0a0a]">
      <Header
        likedCount={userCollections.likedAlbums.length}
        toListenCount={userCollections.toListenAlbums.length}
      />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Back Button - Fixed Single Arrow */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
            <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">LOADING ALBUM...</span>
          </div>
        ) : album ? (
          <div className="space-y-10">
            {/* Album Hero Details Container */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-2 border-black bg-white p-6 hard-shadow">
              {/* Large Cover Art */}
              <div className="md:col-span-5 aspect-square border-2 border-black bg-neutral-100 overflow-hidden relative">
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 p-6 text-center">
                    <Disc3 className="h-16 w-16 text-black mb-3" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-600">NO COVER</span>
                  </div>
                )}

                <div className="absolute top-3 right-3">
                  <span className="border border-black bg-black px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-white">
                    [{album.source.toUpperCase()}]
                  </span>
                </div>
              </div>

              {/* Album Text Information */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 border border-black bg-neutral-100 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-black mb-3">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>RELEASE YEAR: {album.releaseYear || 'N/A'}</span>
                    {album.genre && <span>• {album.genre.toUpperCase()}</span>}
                  </div>

                  <h1 className="font-header text-4xl sm:text-5xl font-extrabold tracking-tight text-black mb-2 leading-tight">
                    {album.title}
                  </h1>

                  {/* Clickable Artist Name with Name Hint */}
                  <Link
                    to={`/artist/${encodeURIComponent(album.artistId || album.artist)}?name=${encodeURIComponent(album.artist)}`}
                    className="inline-block font-header text-xl font-bold text-neutral-700 underline underline-offset-4 hover:text-black transition-colors"
                  >
                    {album.artist}
                  </Link>
                </div>

                {/* Binary Collection Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-black">
                  <button
                    onClick={handleToggleLike}
                    className={`inline-flex items-center justify-center gap-2 border-2 border-black px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                      isLiked ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-white text-white' : 'text-black'}`} />
                    <span>{isLiked ? 'LIKED' : 'LIKE'}</span>
                  </button>

                  <button
                    onClick={handleToggleToListen}
                    className={`inline-flex items-center justify-center gap-2 border-2 border-black px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                      isToListen ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    <Headphones className="h-4 w-4" />
                    <span>{isToListen ? 'IN QUEUE' : 'LISTEN'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tracklist Section */}
            <section className="border-2 border-black bg-white p-6 hard-shadow">
              <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white">
                    <Music className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-header text-2xl font-extrabold uppercase text-black">TRACKLIST</h3>
                    <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                      TOTAL TRACKS: {tracks.length || album.trackCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              {tracks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-neutral-100 text-black font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">TRACK TITLE</th>
                        <th className="py-3 px-4 w-24 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>DURATION</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10">
                      {tracks.map((track) => (
                        <tr key={track.trackNumber} className="hover:bg-neutral-50 font-medium">
                          <td className="py-3 px-4 font-bold text-neutral-400">{track.trackNumber}</td>
                          <td className="py-3 px-4 text-black font-bold">{track.title}</td>
                          <td className="py-3 px-4 text-right text-neutral-600">{formatDuration(track.durationMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center font-mono text-xs text-neutral-500 uppercase tracking-wider">
                  TRACKLIST NOT FOUND
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
            <h4 className="font-header text-xl font-extrabold uppercase text-black mb-2">ALBUM NOT FOUND</h4>
            <button
              onClick={() => navigate('/')}
              className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
            >
              RETURN TO SEARCH
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
