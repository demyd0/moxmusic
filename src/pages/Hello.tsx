import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import { AlbumCard } from '@/components/AlbumCard';
import { CollectionAlbumCard } from '@/components/CollectionAlbumCard';
import { ManualAlbumModal } from '@/components/ManualAlbumModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { searchAlbums, fetchRecommendations } from '@/services/musicSearch';
import { getOrCreateUserId, auth, signInWithGoogle } from '@/lib/firebase';
import { 
  subscribeUserCollections, 
  toggleLikeAlbum, 
  toggleToListenAlbum,
  migrateGuestDataToUserAccount
} from '@/services/collectionService';
import type { UserCollectionsState } from '@/services/collectionService';
import type { Album } from '@/types/album';
import { 
  Disc3, 
  SearchX, 
  Heart,
  Headphones,
  Plus,
  Sparkles,
  Loader2,
  TrendingUp,
  RefreshCw,
  Share2,
  Check
} from 'lucide-react';

export const HelloPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Navigation tab state: 'search' | 'liked' | 'toListen'
  const [activeTab, setActiveTab] = useState<'search' | 'liked' | 'toListen'>('search');

  // Synchronize activeTab with URL query param ?tab=
  useEffect(() => {
    if (urlTab === 'liked' || urlTab === 'toListen' || urlTab === 'search') {
      setActiveTab(urlTab);
    } else if (!urlTab) {
      setActiveTab('search');
    }
  }, [urlTab]);

  const handleSetActiveTab = (tab: 'search' | 'liked' | 'toListen') => {
    setActiveTab(tab);
    if (tab === 'search') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Search state — Default query is EMPTY
  const [query, setQuery] = useState('');
  const [enableBroadSearch, setEnableBroadSearch] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [manualAlbums, setManualAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedMb, setSearchedMb] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<{
    artistName: string;
    albums: Album[];
    isFallback: boolean;
  }>({
    artistName: 'RECOMMENDED FOR YOU',
    albums: [],
    isFallback: false,
  });
  const [isRecsLoading, setIsRecsLoading] = useState(true);

  // Firestore User Collections State
  const [userId, setUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCollections, setUserCollections] = useState<UserCollectionsState>({
    likedIds: new Set(),
    toListenIds: new Set(),
    likedAlbums: [],
    toListenAlbums: [],
  });

  // 1. Dynamic User Subscriptions & Account Data Migration
  useEffect(() => {
    let unsubCollections: (() => void) | undefined;

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (unsubCollections) unsubCollections();

      if (user && !user.isAnonymous) {
        // User logged in via Google Auth -> Bind directly to user.uid
        const activeUid = user.uid;
        setUserId(activeUid);
        setIsAuthenticated(true);

        // Auto-migrate any local guest data to Google account
        await migrateGuestDataToUserAccount(activeUid);

        // Subscribe to Google account Firestore collections
        unsubCollections = subscribeUserCollections(activeUid, (state) => {
          setUserCollections(state);
        });
      } else {
        // Guest user -> Bind to local storage ID
        setIsAuthenticated(false);
        const guestUid = await getOrCreateUserId();
        setUserId(guestUid);

        unsubCollections = subscribeUserCollections(guestUid, (state) => {
          setUserCollections(state);
        });
      }
    });

    return () => {
      if (unsubCollections) unsubCollections();
      unsubAuth();
    };
  }, []);

  // 2. Fetch Recommendations on initial load or when liked collection updates
  useEffect(() => {
    let isMounted = true;
    async function loadRecs() {
      setIsRecsLoading(true);
      try {
        const recData = await fetchRecommendations(
          userCollections.likedAlbums,
          userCollections.toListenAlbums
        );
        if (isMounted) {
          setRecommendations(recData);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        if (isMounted) setIsRecsLoading(false);
      }
    }

    loadRecs();

    return () => {
      isMounted = false;
    };
  }, [userCollections.likedAlbums, userCollections.toListenAlbums]);

  // Force Refresh Recommendations
  const handleRefreshRecs = async () => {
    setIsRecsLoading(true);
    try {
      const recData = await fetchRecommendations(
        userCollections.likedAlbums,
        userCollections.toListenAlbums,
        true // forceRefresh
      );
      setRecommendations(recData);
    } catch (err) {
      console.error('Error refreshing recommendations:', err);
    } finally {
      setIsRecsLoading(false);
    }
  };

  // 3. Share Public Liked Link Handler
  const handleShareLikedCollection = () => {
    if (!userId) return;
    const shareUrl = `${window.location.origin}/share/${userId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  };

  // 4. Debounced Live Autocomplete Search Handler (400ms)
  const performSearch = useCallback(async (searchQuery: string, isBroad: boolean) => {
    if (!searchQuery.trim()) {
      setAlbums([]);
      setSearchedMb(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { results, searchedMb: mbUsed } = await searchAlbums(searchQuery, {
        enableBroadSearch: isBroad,
      });
      setAlbums(results);
      setSearchedMb(mbUsed);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search effect (400ms)
  useEffect(() => {
    if (!query.trim()) {
      setAlbums([]);
      setSearchedMb(false);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query, enableBroadSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, enableBroadSearch, performSearch]);

  // 5. Collection Toggle Handlers — Intercepts unauthenticated guests
  const handleToggleLike = async (album: Album) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    const isLiked = userCollections.likedIds.has(album.id);
    await toggleLikeAlbum(userId, album, isLiked);
  };

  const handleToggleToListen = async (album: Album) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    const isToListen = userCollections.toListenIds.has(album.id);
    await toggleToListenAlbum(userId, album, isToListen);
  };

  const handleAddManualAlbum = (newAlbum: Album) => {
    setManualAlbums((prev) => [newAlbum, ...prev]);
  };

  // Combine manual albums and API search results
  const allSearchResults = [...manualAlbums, ...albums];

  // Count source breakdown
  const itunesCount = albums.filter((a) => a.source === 'itunes').length;
  const mbCount = albums.filter((a) => a.source === 'musicbrainz').length;
  const manualCount = manualAlbums.length;

  const isSearching = query.trim().length > 0;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fafafa] text-[#0a0a0a]">
      <div>
        {/* Main Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          likedCount={userCollections.likedAlbums.length}
          toListenCount={userCollections.toListenAlbums.length}
        />

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          {/* VIEW 1: SEARCH TAB */}
          {activeTab === 'search' && (
            <>
              {/* Search Hero Section */}
              <section className="mb-8 text-center md:text-left">
                <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-black hard-shadow-sm mb-4">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>MUSIC DISCOVERY PLATFORM</span>
                </div>

                <h1 className="font-header text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-black mb-6 leading-tight">
                  FIND YOUR MUSIC
                </h1>

                {/* Search Bar Component */}
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  enableBroadSearch={enableBroadSearch}
                  setEnableBroadSearch={setEnableBroadSearch}
                  isLoading={isLoading}
                  onOpenManualModal={() => setIsManualModalOpen(true)}
                />
              </section>

              {/* LIVE AUTOCOMPLETE DROPDOWN RESULTS (When User Types) */}
              {isSearching ? (
                <section className="mt-4 border-2 border-black bg-white p-6 hard-shadow animate-fadeIn">
                  {/* Results Header & Breakdown Bar */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-black text-white">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Disc3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-header text-sm font-extrabold uppercase text-black">LIVE AUTOCOMPLETE RESULTS</h3>
                          <span className="border border-black bg-black px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                            {allSearchResults.length}
                          </span>
                        </div>
                        {searchedMb && (
                          <p className="text-[11px] font-mono font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                            • MUSICBRAINZ LEVEL 2 UNLOCKED
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Pills */}
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {itunesCount > 0 && (
                        <span className="border border-black bg-white px-2.5 py-1 text-black">
                          ITUNES: {itunesCount}
                        </span>
                      )}
                      {mbCount > 0 && (
                        <span className="border border-black bg-black px-2.5 py-1 text-white">
                          MUSICBRAINZ: {mbCount}
                        </span>
                      )}
                      {manualCount > 0 && (
                        <span className="border border-black bg-neutral-200 px-2.5 py-1 text-black">
                          MANUAL: {manualCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Results Grid */}
                  {isLoading && allSearchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                        SEARCHING RELEASES...
                      </span>
                    </div>
                  ) : allSearchResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {allSearchResults.map((album) => (
                        <AlbumCard
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
                    /* Autocomplete Empty State */
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-neutral-100 text-black mb-3">
                        <SearchX className="h-6 w-6" />
                      </div>
                      <h4 className="font-header text-lg font-extrabold uppercase text-black mb-1">NO RESULTS FOUND</h4>
                      <p className="max-w-md font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">
                        NO ALBUMS MATCHED "{query.toUpperCase()}".
                      </p>
                      <div className="flex items-center gap-3">
                        {!enableBroadSearch && (
                          <button
                            onClick={() => setEnableBroadSearch(true)}
                            className="border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all"
                          >
                            ENABLE MUSICBRAINZ
                          </button>
                        )}
                        <button
                          onClick={() => setIsManualModalOpen(true)}
                          className="inline-flex items-center gap-1.5 border-2 border-black bg-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>ADD MANUALLY</span>
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                /* DEFAULT SCREEN: SMART RECOMMENDATIONS OR ITUNES TOP CHARTS FALLBACK */
                <section className="mt-4 border-2 border-black bg-white p-4 sm:p-6 hard-shadow">
                  {/* Recommendations Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white shrink-0">
                        {recommendations.isFallback ? (
                          <TrendingUp className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-header text-xl sm:text-2xl font-extrabold uppercase text-black">
                          {recommendations.isFallback ? 'TOP CHARTS RECOMMENDATIONS' : 'RECOMMENDED FOR YOU'}
                        </h3>
                        <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                          {recommendations.isFallback
                            ? 'TRENDING TOP ALBUMS ON ITUNES CHARTS'
                            : 'SMART PROFILE RECOMMENDATIONS POWERED BY LAST.FM'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleRefreshRecs}
                      className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all hard-shadow-sm shrink-0"
                      title="Recalculate recommendations"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRecsLoading ? 'animate-spin' : ''}`} />
                      <span>REFRESH</span>
                    </button>
                  </div>

                  {isRecsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                        ANALYZING RECOMMENDATIONS...
                      </span>
                    </div>
                  ) : recommendations.albums.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {recommendations.albums.map((album) => (
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
                    <div className="py-12 text-center font-mono text-xs text-neutral-500 uppercase tracking-wider">
                      NO RECOMMENDATIONS FOUND AT THIS MOMENT.
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* VIEW 2 & 3: LIKED / TO LISTEN COLLECTION SCREENS */}
          {(activeTab === 'liked' || activeTab === 'toListen') && (
            <section>
              {/* Top Sub-Header & Tab Toggle Switch */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-black">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
                    {activeTab === 'liked' ? (
                      <Heart className="h-6 w-6 fill-white" />
                    ) : (
                      <Headphones className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-header text-4xl font-extrabold text-black uppercase tracking-tight">
                      {activeTab === 'liked' ? 'LIKED ALBUMS' : 'TO LISTEN QUEUE'}
                    </h2>
                    <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                      {activeTab === 'liked'
                        ? 'SAVED FAVORITE ALBUMS'
                        : 'QUEUED ALBUMS TO LISTEN'}
                    </p>
                  </div>
                </div>

                {/* Sub Switcher Pills & Share Action */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'liked' && userCollections.likedAlbums.length > 0 && (
                    <button
                      type="button"
                      onClick={handleShareLikedCollection}
                      className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all hard-shadow-sm"
                      title="Share public link to your liked collection"
                    >
                      {copyToast ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">LINK COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          <span>SHARE</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSetActiveTab('liked')}
                    className={`flex items-center gap-2 border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                      activeTab === 'liked'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${activeTab === 'liked' ? 'fill-white' : ''}`} />
                    <span>LIKED ({userCollections.likedAlbums.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetActiveTab('toListen')}
                    className={`flex items-center gap-2 border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                      activeTab === 'toListen'
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    <Headphones className="h-4 w-4" />
                    <span>TO LISTEN ({userCollections.toListenAlbums.length})</span>
                  </button>
                </div>
              </div>

              {/* Collection Grid — Exactly 4 Columns on Desktop (2 on Mobile) */}
              {activeTab === 'liked' && (
                userCollections.likedAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {userCollections.likedAlbums.map((album) => (
                      <CollectionAlbumCard
                        key={album.id}
                        album={album}
                        type="liked"
                        isToListen={userCollections.toListenIds.has(album.id)}
                        onToggleToListen={handleToggleToListen}
                        onRemove={handleToggleLike}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
                    <div className="flex h-14 w-14 items-center justify-center border-2 border-black bg-neutral-100 text-black mb-4">
                      <Heart className="h-7 w-7" />
                    </div>
                    <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">LIKED COLLECTION IS EMPTY</h4>
                    <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                      CLICK "LIKE" ON ANY ALBUM CARD IN SEARCH TO SAVE IT HERE.
                    </p>
                    <button
                      onClick={() => handleSetActiveTab('search')}
                      className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
                    >
                      GO TO SEARCH
                    </button>
                  </div>
                )
              )}

              {activeTab === 'toListen' && (
                userCollections.toListenAlbums.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {userCollections.toListenAlbums.map((album) => (
                      <CollectionAlbumCard
                        key={album.id}
                        album={album}
                        type="toListen"
                        isLiked={userCollections.likedIds.has(album.id)}
                        onToggleLike={handleToggleLike}
                        onRemove={handleToggleToListen}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
                    <div className="flex h-14 w-14 items-center justify-center border-2 border-black bg-neutral-100 text-black mb-4">
                      <Headphones className="h-7 w-7" />
                    </div>
                    <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">TO LISTEN QUEUE IS EMPTY</h4>
                    <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                      CLICK "LISTEN" ON ANY ALBUM CARD TO ADD IT HERE.
                    </p>
                    <button
                      onClick={() => handleSetActiveTab('search')}
                      className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
                    >
                      GO TO SEARCH
                    </button>
                  </div>
                )
              )}
            </section>
          )}
        </main>
      </div>

      {/* Footer Attributions */}
      <Footer />

      {/* Manual Album Modal Form */}
      <ManualAlbumModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddManualAlbum={handleAddManualAlbum}
      />

      {/* Auth Interceptor Prompt Modal for Guests */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        onSignIn={signInWithGoogle}
      />
    </div>
  );
};
