import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CollectionAlbumCard } from '@/components/CollectionAlbumCard';
import { fetchSharedLikedCollection } from '@/services/collectionService';
import { getPublicUserProfile, resolveUsernameToUid } from '@/services/userService';
import type { Album } from '@/types/album';
import { Heart, Disc3, Loader2, ArrowLeft, UserX } from 'lucide-react';

export const SharedCollectionPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [profile, setProfile] = useState<{ username: string; photoURL?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    let isMounted = true;

    async function loadSharedCollection() {
      setIsLoading(true);
      setNotFound(false);
      try {
        // /share/:username is the pretty URL. Older links shared before this
        // existed point straight at a raw Firebase uid, so fall back to
        // treating the param as a uid if it doesn't resolve as a username.
        const resolvedUid = (await resolveUsernameToUid(username!)) || username!;
        const [userProfile, sharedAlbums] = await Promise.all([
          getPublicUserProfile(resolvedUid),
          fetchSharedLikedCollection(resolvedUid),
        ]);

        // The publicProfiles mirror only gets created/backfilled the next
        // time that account signs in (see ensurePublicProfile in Header.tsx),
        // so an old link can resolve a real uid with real liked albums but
        // no profile doc yet. Only treat it as a dead link if we found
        // neither a profile nor any data - a genuinely empty collection
        // still falls through to the normal "collection is empty" state.
        if (!userProfile && sharedAlbums.length === 0) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (isMounted) {
          setAlbums(sharedAlbums);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Failed to load shared liked collection:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSharedCollection();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const displayHandle = profile?.username ? `@${profile.username.toUpperCase()}` : 'USER';

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
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
          {!notFound && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={displayHandle} className="h-full w-full object-cover" />
                  ) : (
                    <Heart className="h-7 w-7 fill-white" />
                  )}
                </div>
                <div>
                  <h1 className="font-header text-3xl sm:text-4xl font-extrabold text-black uppercase tracking-tight">
                    {displayHandle}'S LIKED ALBUMS
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
          )}

          {/* 4-Column Read-Only Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                LOADING SHARED COLLECTION...
              </span>
            </div>
          ) : notFound ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-black bg-neutral-100 text-black mb-4">
                <UserX className="h-7 w-7" />
              </div>
              <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">
                USER NOT FOUND
              </h4>
              <p className="max-w-md font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                NO PROFILE EXISTS AT @{(username || '').toUpperCase()}. CHECK THE LINK AND TRY AGAIN.
              </p>
              <button
                onClick={() => navigate('/')}
                className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
              >
                GO TO SEARCH
              </button>
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
