import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CollectionAlbumCard } from '@/components/CollectionAlbumCard';
import { fetchArtistDiscography } from '@/services/musicSearch';
import { getOrCreateUserId } from '@/lib/firebase';
import { 
  subscribeUserCollections, 
  toggleLikeAlbum,
  toggleToListenAlbum,
  type UserCollectionsState 
} from '@/services/collectionService';
import type { Album } from '@/types/album';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Disc3, 
  Loader2 
} from 'lucide-react';

export const ArtistDiscographyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const nameHint = searchParams.get('name') || undefined;
  const navigate = useNavigate();

  const [artistName, setArtistName] = useState<string>(nameHint?.toUpperCase() || 'ARTIST DISCOGRAPHY');
  const [albums, setAlbums] = useState<Album[]>([]);
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

  // Fetch Artist Discography
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadDiscography() {
      setIsLoading(true);
      try {
        const decodedId = decodeURIComponent(id!);
        const res = await fetchArtistDiscography(decodedId, nameHint);
        if (isMounted) {
          setArtistName(res.artistName.toUpperCase());
          setAlbums(res.albums);
        }
      } catch (err) {
        console.error('Discography load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDiscography();

    return () => {
      isMounted = false;
    };
  }, [id, nameHint]);

  const handleToggleLike = async (album: Album) => {
    if (!userId) return;
    const isLiked = userCollections.likedIds.has(album.id);
    await toggleLikeAlbum(userId, album, isLiked);
  };

  const handleToggleToListen = async (album: Album) => {
    if (!userId) return;
    const isToListen = userCollections.toListenIds.has(album.id);
    await toggleToListenAlbum(userId, album, isToListen);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fafafa] text-[#0a0a0a]">
      <div>
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

          {/* Artist Title Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-black">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
                <UserIcon className="h-7 w-7" />
              </div>
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                  ARTIST DISCOGRAPHY
                </div>
                <h1 className="font-header text-4xl sm:text-5xl font-extrabold tracking-tight text-black uppercase">
                  {artistName}
                </h1>
              </div>
            </div>

            <span className="border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm">
              {albums.length} ALBUMS
            </span>
          </div>

          {/* 4-Column Discography Album Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                LOADING DISCOGRAPHY...
              </span>
            </div>
          ) : albums.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {albums.map((album) => (
                <CollectionAlbumCard
                  key={album.id}
                  album={album}
                  isLiked={userCollections.likedIds.has(album.id)}
                  isToListen={userCollections.toListenIds.has(album.id)}
                  onToggleLike={handleToggleLike}
                  onToggleToListen={handleToggleToListen}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
              <Disc3 className="h-10 w-10 text-black mb-3" />
              <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">
                DISCOGRAPHY EMPTY
              </h4>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                NO ALBUMS FOUND FOR THIS ARTIST.
              </p>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};
