import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllPublicProfiles, type PublicProfileSummary } from '@/services/userService';
import { Loader2, UserIcon, Users } from 'lucide-react';

export const PeoplePage: React.FC = () => {
  const navigate = useNavigate();
  const [people, setPeople] = useState<PublicProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getAllPublicProfiles().then((list) => {
      if (isMounted) {
        setPeople(list);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <div>
        <Header />
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-black">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-header text-3xl font-extrabold uppercase text-black">FIND PEOPLE</h1>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                {people.length} REGISTERED PROFILE{people.length === 1 ? '' : 'S'} — NEWEST FIRST
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">LOADING...</span>
            </div>
          ) : people.length === 0 ? (
            <div className="border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">NO PROFILES FOUND YET.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {people.map((p) => (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => navigate(`/profile/${p.username}`)}
                  className="flex flex-col items-center gap-2.5 border-2 border-black bg-white p-4 hard-shadow-sm hover:bg-neutral-100 transition-all"
                >
                  <div className="flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white overflow-hidden">
                    {p.photoURL ? (
                      <img src={p.photoURL} alt={p.username} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-7 w-7" />
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold uppercase text-black truncate max-w-full">
                    @{p.username}
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
