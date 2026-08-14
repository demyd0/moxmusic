import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { auth } from '@/lib/firebase';
import { subscribeFollowedArtists, type FollowedArtist } from '@/services/artistFollowService';
import { Loader2, Mic2, Users } from 'lucide-react';

export const FollowedArtistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      const authed = Boolean(user && !user.isAnonymous);
      setIsAuthenticated(authed);
      setUid(authed ? user!.uid : null);
      if (!authed) setIsLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeFollowedArtists(uid, (list) => {
      setArtists(list);
      setIsLoading(false);
    });
    return () => unsub();
  }, [uid]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <div>
        <Header />
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-black">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
              <Mic2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-header text-3xl font-extrabold uppercase text-black">FOLLOWED ARTISTS</h1>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                {artists.length} ARTIST{artists.length === 1 ? '' : 'S'} — NEWEST FIRST
              </p>
            </div>
          </div>

          {isAuthenticated === false ? (
            <div className="border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                SIGN IN TO FOLLOW ARTISTS.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">LOADING...</span>
            </div>
          ) : artists.length === 0 ? (
            <div className="border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
              <Users className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                NO FOLLOWED ARTISTS YET — HIT "FOLLOW ARTIST" ON ANY ARTIST PAGE.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {artists.map((a) => (
                <button
                  key={a.artistId}
                  type="button"
                  onClick={() => navigate(`/artist/${encodeURIComponent(a.artistId)}?name=${encodeURIComponent(a.artistName)}`)}
                  className="flex flex-col items-center gap-2.5 border-2 border-black bg-white p-4 hard-shadow-sm hover:bg-neutral-100 transition-all"
                >
                  <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white">
                    <Mic2 className="h-7 w-7" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-black truncate max-w-full">
                    {a.artistName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};
