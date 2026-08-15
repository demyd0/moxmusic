import React, { useState } from 'react';
import { usePlayer, PLAYER_VIDEO_WIDTH, PLAYER_VIDEO_HEIGHT } from '@/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, X, ListMusic, Loader2, RefreshCw, Disc3 } from 'lucide-react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Persistent site-wide "now playing" bar, mounted once at the app root
 *  (see App.tsx) so playback survives page navigation. The small video
 *  area is deliberately real and visible, not hidden off-screen like
 *  ProfileTrackPlayer's - YouTube ads render inside that same iframe, and
 *  a hidden ad has no clickable "skip" button, which would trap the
 *  listener through the whole ad with no way out.
 *
 *  The video container div is ALWAYS rendered (never conditionally
 *  unmounted), even before anything has ever played - PlayerContext
 *  registers it via a ref the moment this component first mounts, so it's
 *  guaranteed ready before the very first playQueue() call tries to
 *  create the YT.Player against it. Only the surrounding bar chrome
 *  collapses to nothing when there's no current track. */
export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    alternates,
    hasNext,
    hasPrev,
    togglePlayPause,
    next,
    prev,
    jumpTo,
    seekTo,
    pickAlternate,
    closePlayer,
    registerVideoContainer,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  return (
    <>
      {showQueue && currentTrack && (
        <div className="fixed bottom-[68px] right-0 z-[81] max-h-80 w-full overflow-y-auto border-2 border-b-0 border-black bg-white hard-shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b-2 border-black px-3 py-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-black">UP NEXT</span>
            <button type="button" onClick={() => setShowQueue(false)} className="text-neutral-400 hover:text-black transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {queue.map((t, i) => (
            <button
              key={t.id + i}
              type="button"
              onClick={() => jumpTo(i)}
              className={`flex w-full items-center gap-2.5 border-b border-black/10 px-3 py-2 text-left transition-all ${
                i === currentIndex ? 'bg-black text-white' : 'hover:bg-neutral-50 text-black'
              }`}
            >
              {t.coverUrl ? (
                <img src={t.coverUrl} alt="" className="h-8 w-8 shrink-0 object-cover" />
              ) : (
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center ${i === currentIndex ? 'bg-white/10' : 'bg-neutral-100'}`}>
                  <Disc3 className="h-4 w-4 opacity-50" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[11px] font-bold">{t.title}</span>
                <span className="block truncate font-mono text-[10px] opacity-70">{t.artist}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-[80] border-t-2 border-black bg-white"
        style={currentTrack ? undefined : { height: 0, borderTopWidth: 0, overflow: 'hidden' }}
      >
        {currentTrack && (
          <div onClick={handleSeekClick} className="h-1.5 w-full cursor-pointer bg-neutral-200" title="Seek">
            <div className="h-full bg-black transition-[width]" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
          </div>
        )}

        <div
          className="mx-auto flex max-w-6xl items-center gap-3 px-3 sm:px-6"
          style={currentTrack ? { height: 60 } : { height: 0, padding: 0 }}
        >
          <div
            className="relative shrink-0 overflow-hidden border-2 border-black bg-black"
            style={{ width: PLAYER_VIDEO_WIDTH, height: PLAYER_VIDEO_HEIGHT, borderWidth: currentTrack ? 2 : 0 }}
          >
            {currentTrack?.coverUrl && (
              <img src={currentTrack.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {/* The IFrame API replaces this div with the real (visible,
                interactive) YouTube player, sized to match via
                PLAYER_VIDEO_WIDTH/HEIGHT passed into new YT.Player(...) -
                it doesn't inherit this div's CSS classes. Always mounted -
                see the component doc comment above. */}
            <div ref={registerVideoContainer} className="relative z-10 h-full w-full" />
            {isLoading && currentTrack && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>

          {currentTrack && (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs font-bold uppercase text-black">{currentTrack.title}</span>
                  {alternates.length > 0 && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAlternates((v) => !v)}
                        title="Not the right track? Pick another"
                        className="flex h-5 w-5 items-center justify-center text-neutral-400 hover:text-black transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      {showAlternates && (
                        <div className="absolute bottom-full left-0 z-10 mb-1 w-56 border-2 border-black bg-white hard-shadow-sm">
                          <p className="border-b border-black/10 px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            WRONG TRACK? PICK ANOTHER
                          </p>
                          {alternates.map((alt) => (
                            <button
                              key={alt.videoId}
                              type="button"
                              onClick={() => {
                                pickAlternate(alt);
                                setShowAlternates(false);
                              }}
                              className="block w-full truncate px-2 py-1.5 text-left font-mono text-[10px] text-black hover:bg-neutral-100 transition-all"
                            >
                              {alt.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-[11px] text-neutral-500">{currentTrack.artist}</span>
                  <span className="shrink-0 font-mono text-[10px] text-neutral-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={prev}
                  disabled={!hasPrev}
                  className="flex h-8 w-8 items-center justify-center text-black transition-opacity hover:opacity-70 disabled:opacity-30"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white transition-all hover:bg-neutral-800"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!hasNext}
                  className="flex h-8 w-8 items-center justify-center text-black transition-opacity hover:opacity-70 disabled:opacity-30"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQueue((v) => !v)}
                  title="Up next"
                  className={`ml-1 flex h-8 w-8 items-center justify-center border-2 transition-all ${
                    showQueue ? 'border-black bg-black text-white' : 'border-black/20 text-black hover:border-black'
                  }`}
                >
                  <ListMusic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closePlayer}
                  title="Close player"
                  className="flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-black transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
