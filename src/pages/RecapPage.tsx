import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { auth, signInWithGoogle } from '@/lib/firebase';
import { subscribeUserCollections } from '@/services/collectionService';
import type { Album } from '@/types/album';
import { Disc3, Loader2, Mic2, Tag, Sparkles } from 'lucide-react';

type Period = 'week' | 'month' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'THIS WEEK' },
  { value: 'month', label: 'THIS MONTH' },
  { value: 'all', label: 'ALL TIME' },
];

function periodStartMs(period: Period): number {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start.getTime();
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start.getTime();
  }
  return 0;
}

function topCounts(values: string[], limit: number): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export const RecapPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [likedAlbums, setLikedAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    let unsubCollections: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user || user.isAnonymous) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setIsAuthenticated(true);
      unsubCollections = subscribeUserCollections(user.uid, (state) => {
        setLikedAlbums(state.likedAlbums);
        setIsLoading(false);
      });
    });
    return () => {
      unsubAuth();
      if (unsubCollections) unsubCollections();
    };
  }, []);

  const stats = useMemo(() => {
    const start = periodStartMs(period);
    const inPeriod = likedAlbums.filter((a) => {
      if (!a.dateAdded) return period === 'all';
      const t = new Date(a.dateAdded).getTime();
      return Number.isFinite(t) && t >= start;
    });

    const topArtists = topCounts(inPeriod.map((a) => a.artist).filter(Boolean), 5);
    const topGenres = topCounts(
      inPeriod.map((a) => a.genre).filter((g): g is string => Boolean(g)),
      5
    );

    const dayCounts = new Map<string, number>();
    for (const a of inPeriod) {
      if (!a.dateAdded) continue;
      const day = new Date(a.dateAdded).toISOString().slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    let busiestDay: { day: string; count: number } | null = null;
    for (const [day, count] of dayCounts) {
      if (!busiestDay || count > busiestDay.count) busiestDay = { day, count };
    }

    return { total: inPeriod.length, topArtists, topGenres, busiestDay };
  }, [likedAlbums, period]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <div>
        <Header />
        <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-black">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-header text-3xl font-extrabold uppercase text-black">YOUR RECAP</h1>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                WHAT YOU'VE BEEN INTO LATELY
              </p>
            </div>
          </div>

          {isAuthenticated === false ? (
            <div className="border-2 border-black bg-white p-8 text-center hard-shadow">
              <h2 className="font-header text-xl font-extrabold uppercase text-black mb-2">SIGN IN TO SEE YOUR RECAP</h2>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                IT'S BUILT FROM YOUR OWN LIKED ALBUMS.
              </p>
              <button
                onClick={() => void signInWithGoogle()}
                className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
              >
                SIGN IN
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">LOADING...</span>
            </div>
          ) : (
            <>
              <div className="flex border-2 border-black bg-white hard-shadow-sm mb-8 w-fit">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeriod(p.value)}
                    className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                      period === p.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {stats.total === 0 ? (
                <div className="border-2 border-black bg-white p-8 text-center hard-shadow">
                  <Disc3 className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
                  <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                    NOTHING LIKED IN THIS PERIOD YET. GO FIND SOMETHING.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <section className="border-2 border-black bg-white p-6 hard-shadow md:col-span-2">
                    <p className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      ALBUMS &amp; TRACKS LIKED
                    </p>
                    <p className="font-header text-5xl font-extrabold text-black">{stats.total}</p>
                    {stats.busiestDay && stats.busiestDay.count > 1 && (
                      <p className="mt-2 font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
                        BUSIEST DAY: {new Date(stats.busiestDay.day).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        }).toUpperCase()} — {stats.busiestDay.count} LIKES
                      </p>
                    )}
                  </section>

                  <section className="border-2 border-black bg-white p-6 hard-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <Mic2 className="h-4 w-4 text-black" />
                      <h3 className="font-header text-lg font-extrabold uppercase text-black">TOP ARTISTS</h3>
                    </div>
                    {stats.topArtists.length === 0 ? (
                      <p className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">NO DATA YET.</p>
                    ) : (
                      <ol className="space-y-2">
                        {stats.topArtists.map((a, i) => (
                          <li key={a.value} className="flex items-center justify-between gap-2 font-mono text-xs">
                            <span className="truncate text-black">
                              <span className="text-neutral-400">{i + 1}.</span> {a.value}
                            </span>
                            <span className="shrink-0 border border-black bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold">
                              {a.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="border-2 border-black bg-white p-6 hard-shadow">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-black" />
                      <h3 className="font-header text-lg font-extrabold uppercase text-black">TOP GENRES</h3>
                    </div>
                    {stats.topGenres.length === 0 ? (
                      <p className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                        NO GENRE DATA FOR THESE.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {stats.topGenres.map((g, i) => (
                          <li key={g.value} className="flex items-center justify-between gap-2 font-mono text-xs">
                            <span className="truncate text-black">
                              <span className="text-neutral-400">{i + 1}.</span> {g.value}
                            </span>
                            <span className="shrink-0 border border-black bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold">
                              {g.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              )}

              <button
                onClick={() => navigate('/')}
                className="mt-8 inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all"
              >
                BACK TO DISCOVER
              </button>
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};
