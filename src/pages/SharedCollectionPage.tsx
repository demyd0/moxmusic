import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CollectionAlbumCard } from '@/components/CollectionAlbumCard';
import { fetchSharedLikedCollection } from '@/services/collectionService';
import type { Album } from '@/types/album';
import { Heart, Disc3, Loader2, ArrowLeft } from 'lucide-react';

export const SharedCollectionPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let isMounted = true;

    async function loadSharedCollection() {
      setIsLoading(true);
      try {
        const sharedAlbums = await fetchSharedLikedCollection(uid!);
        if (isMounted) {
          setAlbums(sharedAlbums);
        }
      } catch (err) {
        console.error('Failed to load shared liked collection:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSharedCollection();

    return () => {
      isMounted = false;
    };
  }, [uid]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fafafa] text-[#0a0a0a]">
      <div>
        <Header />

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>DISCOVER MUSIC</span>
          </button>

          {/* Sub Header Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-black">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
                <Heart className="h-6 w-6 fill-white" />
              </div>
              <div>
                <h1 className="font-header text-3xl sm:text-4xl font-extrabold text-black uppercase tracking-tight">
                  SHARED LIKED ALBUMS
                </h1>
                <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                  PUBLIC READ-ONLY COLLECTION
                </p>
              </div>
            </div>

            <span className="border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm">
              {albums.length} ALBUMS
            </span>
          </div>

          {/* 4-Column Read-Only Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                LOADING SHARED COLLECTION...
              </span>
            </div>
          ) : albums.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {albums.map((album) => (
                <CollectionAlbumCard key={album.id} album={album} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
              <Disc3 className="h-10 w-10 text-black mb-3" />
              <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">
                SHARED COLLECTION IS EMPTY
              </h4>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                NO LIKED ALBUMS FOUND IN THIS PUBLIC PROFILE.
              </p>
              <button
                onClick={() => navigate('/')}
                className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
              >
                GO TO SEARCH
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};
