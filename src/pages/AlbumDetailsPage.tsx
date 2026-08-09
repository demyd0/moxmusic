import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { fetchAlbumById, fetchAlbumTracklist } from '@/services/musicSearch';
import { fetchBandcampLinks, type BandcampLookupResponse } from '@/services/bandcamp';
import { getOrCreateUserId, auth, signInWithGoogle } from '@/lib/firebase';
import { buildYoutubeMusicSearchUrl } from '@/lib/youtubeMusic';
import { buildGeniusSearchUrl } from '@/lib/genius';
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
  Clock,
  Music,
  Loader2,
  ExternalLink,
  Play,
  Pause,
  Ban,
} from 'lucide-react';

export const AlbumDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [userCollections, setUserCollections] = useState<UserCollectionsState>({
    likedIds: new Set(),
    toListenIds: new Set(),
    likedAlbums: [],
    toListenAlbums: [],
  });
  const [bandcamp, setBandcamp] = useState<BandcampLookupResponse | null>(null);
  const [isBandcampLoading, setIsBandcampLoading] = useState(true);

  // 30-second iTunes preview playback - one shared <audio> element, one track at a time
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackNumber, setPlayingTrackNumber] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handleTogglePreview = (track: Track) => {
    if (!track.previewUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (playingTrackNumber === track.trackNumber) {
      audio.pause();
      setPlayingTrackNumber(null);
      return;
    }

    audio.src = track.previewUrl;
    audio.currentTime = 0;
    audio.play().catch(() => setPlayingTrackNumber(null));
    setPlayingTrackNumber(track.trackNumber);
  };

  // 1. Initialize user & subscribe to collections
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initUser() {
      const uid = await getOrCreateUserId();
      setUserId(uid);
      unsubscribe = subscribeUserCollections(uid, (state) => setUserCollections(state));
    }
    initUser();

    const unsubAuth = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(Boolean(user && !user.isAnonymous));
    });

    return () => {
      if (unsubscribe) unsubscribe();
      unsubAuth();
    };
  }, []);

  // 2. Fetch Album details & tracklist
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadAlbumData() {
      setIsLoading(true);
      setIsBandcampLoading(true);
      try {
        const decodedId = decodeURIComponent(id!);
        const [albumData, tracklist] = await Promise.all([
          fetchAlbumById(decodedId),
          fetchAlbumTracklist(decodedId),
        ]);

        const resolvedAlbum = albumData || {
          id: decodedId,
          title: 'Unknown Album',
          artist: 'Unknown Artist',
          source: (decodedId.startsWith('mb-') ? 'musicbrainz' : 'itunes') as Album['source'],
        };

        if (isMounted) {
          audioRef.current?.pause();
          setPlayingTrackNumber(null);
          setAlbum(resolvedAlbum);
          setTracks(tracklist);
        }

        if (resolvedAlbum.artist !== 'Unknown Artist') {
          const bandcampResult = await fetchBandcampLinks(resolvedAlbum.artist, resolvedAlbum.title);
          if (isMounted) setBandcamp(bandcampResult);
        } else if (isMounted) {
          setBandcamp(null);
        }
      } catch (err) {
        console.error('Failed to load album details:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsBandcampLoading(false);
        }
      }
    }

    loadAlbumData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isLiked = album ? userCollections.likedIds.has(album.id) : false;
  const isToListen = album ? userCollections.toListenIds.has(album.id) : false;

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!userId || !album) return;
    await toggleLikeAlbum(userId, album, isLiked);
  };

  const handleToggleToListen = async () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!userId || !album) return;
    await toggleToListenAlbum(userId, album, isToListen);
  };

  const handleToggleTrackLike = async (track: Track) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!userId || !album || !track.id) return;

    const trackAsAlbum: Album = {
      id: track.id,
      title: track.title,
      artist: album.artist,
      coverUrl: album.coverUrl,
      source: album.source,
      kind: 'track',
      albumTitle: album.title,
    };

    const isTrackLiked = userCollections.likedIds.has(track.id);
    await toggleLikeAlbum(userId, trackAsAlbum, isTrackLiked);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const artistTargetUrl = album
    ? `/artist/${encodeURIComponent(album.artistId || album.artist)}?name=${encodeURIComponent(album.artist)}`
    : '#';

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <div>
        <Header
          likedCount={userCollections.likedAlbums.length}
          toListenCount={userCollections.toListenAlbums.length}
        />

        <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
          {/* Back Button */}
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
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                LOADING ALBUM DETAILS...
              </span>
            </div>
          ) : album ? (
            <div className="space-y-10">
              {/* Top Hero: Big Cover + Album Header Info */}
              <div className="flex flex-col md:flex-row items-start gap-8 border-2 border-black bg-white p-6 hard-shadow">
                {/* Clean Big Cover Art */}
                <div className="relative aspect-square w-full md:w-72 shrink-0 border-2 border-black bg-neutral-100 overflow-hidden hard-shadow-sm">
                  {album.coverUrl ? (
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                      <Disc3 className="h-12 w-12 text-black mb-2" />
                      <span className="font-mono text-xs font-bold uppercase text-neutral-500">NO COVER</span>
                    </div>
                  )}
                </div>

                {/* Album Header Info */}
                <div className="flex flex-1 flex-col justify-between self-stretch">
                  <div>
                    <div className="inline-flex items-center gap-2 border border-black bg-neutral-100 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-black mb-3">
                      <span>{album.source === 'musicbrainz' ? 'MUSICBRAINZ' : 'ITUNES'} RELEASE</span>
                      {album.releaseYear && <span>• {album.releaseYear}</span>}
                    </div>

                    <h1 className="font-header text-4xl sm:text-5xl font-extrabold tracking-tight text-black mb-2 leading-tight">
                      {album.title}
                    </h1>

                    <Link
                      to={artistTargetUrl}
                      className="font-header text-xl sm:text-2xl font-bold text-neutral-700 hover:text-black hover:underline block mb-4"
                    >
                      {album.artist}
                    </Link>

                    {album.genre && (
                      <span className="inline-block border border-black bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-6">
                        GENRE: {album.genre}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: two even rows instead of one ragged wrap */}
                  <div className="pt-4 border-t-2 border-black space-y-3">
                    {/* Row 1: primary actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleToggleLike}
                        className={`inline-flex w-full items-center justify-center gap-2 border-2 border-black px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                          isLiked ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-white text-white' : 'text-black'}`} />
                        <span>{isLiked ? 'LIKED' : 'LIKE'}</span>
                      </button>

                      <button
                        onClick={handleToggleToListen}
                        className={`inline-flex w-full items-center justify-center gap-2 border-2 border-black px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
                          isToListen ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Headphones className="h-4 w-4" />
                        <span>{isToListen ? 'IN QUEUE' : 'LISTEN'}</span>
                      </button>
                    </div>

                    {/* Row 2: listen/lyrics elsewhere - equal-width regardless of label length */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <a
                        href={buildYoutubeMusicSearchUrl(album.artist, album.title, true)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-red-600 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hard-shadow-sm hover:bg-red-700"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span>YOUTUBE MUSIC</span>
                      </a>

                      {isBandcampLoading ? (
                        <span className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-400 hard-shadow-sm">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          <span>BANDCAMP...</span>
                        </span>
                      ) : bandcamp?.album?.found && bandcamp.album.url ? (
                        <a
                          href={bandcamp.album.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-[#1da0c3] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hard-shadow-sm hover:bg-[#178aa8]"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span>BANDCAMP</span>
                        </a>
                      ) : bandcamp?.artist?.found && bandcamp.artist.url ? (
                        <a
                          href={bandcamp.artist.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-[#1da0c3] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hard-shadow-sm hover:bg-[#178aa8]"
                          title="This album isn't on Bandcamp, but the artist's page is"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span>BANDCAMP (ARTIST)</span>
                        </a>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-neutral-100 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-neutral-400 hard-shadow-sm cursor-not-allowed">
                          <Ban className="h-4 w-4 shrink-0" />
                          <span>NO BANDCAMP</span>
                        </span>
                      )}

                      <a
                        href={buildGeniusSearchUrl(album.artist, album.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 border-2 border-black bg-[#ffff64] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition-all hard-shadow-sm hover:bg-[#f2f200]"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span>LYRICS ON GENIUS</span>
                      </a>
                    </div>
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
                          <th className="py-3 px-4 w-24 text-right">LISTEN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10">
                        {tracks.map((track) => {
                          const isPlaying = playingTrackNumber === track.trackNumber;
                          return (
                            <tr key={track.trackNumber} className="hover:bg-neutral-50 font-medium">
                              <td className="py-3 px-4 font-bold text-neutral-400">{track.trackNumber}</td>
                              <td className="py-3 px-4 text-black font-bold">{track.title}</td>
                              <td className="py-3 px-4 text-right text-neutral-600">{formatDuration(track.durationMs)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  {track.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTrackLike(track)}
                                      title={userCollections.likedIds.has(track.id) ? 'Unlike this track' : 'Like this track'}
                                      className={`flex h-7 w-7 items-center justify-center border border-black transition-all ${
                                        userCollections.likedIds.has(track.id)
                                          ? 'bg-black text-white'
                                          : 'bg-white text-black hover:bg-neutral-100'
                                      }`}
                                    >
                                      <Heart
                                        className={`h-3.5 w-3.5 ${userCollections.likedIds.has(track.id) ? 'fill-white text-white' : 'text-black'}`}
                                      />
                                    </button>
                                  )}
                                  {track.previewUrl && (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePreview(track)}
                                      title={isPlaying ? 'Pause 30s preview' : 'Play 30s preview'}
                                      className={`flex h-7 w-7 items-center justify-center border border-black transition-all ${
                                        isPlaying ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                                      }`}
                                    >
                                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                    </button>
                                  )}
                                  <a
                                    href={buildYoutubeMusicSearchUrl(album.artist, track.title, false)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open this track in YouTube Music"
                                    className="flex h-7 w-7 items-center justify-center border border-black bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  <a
                                    href={buildGeniusSearchUrl(album.artist, track.title)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Find lyrics for this track on Genius"
                                    className="flex h-7 w-7 items-center justify-center border border-black bg-white text-black hover:bg-[#ffff64] transition-all"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center font-mono text-xs text-neutral-500 uppercase tracking-wider">
                    TRACKLIST NOT FOUND
                  </div>
                )}
                {tracks.some((t) => t.previewUrl) && (
                  <p className="mt-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                    30-second previews courtesy of iTunes. Full tracks open in YouTube Music.
                  </p>
                )}
              </section>

              {/* Hidden shared audio element driving the 30s preview player */}
              <audio
                ref={audioRef}
                onEnded={() => setPlayingTrackNumber(null)}
                className="hidden"
              />
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

      <Footer />

      {/* Auth Interceptor Prompt Modal for Guests */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        onSignIn={signInWithGoogle}
      />
    </div>
  );
};
