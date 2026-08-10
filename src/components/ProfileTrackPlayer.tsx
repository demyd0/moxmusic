import React, { useEffect, useRef } from 'react';
import type { ProfileTrack } from '@/types/profile';
import { buildYoutubeEmbedUrl } from '@/lib/youtubeEmbed';
import { useAudioEngine } from '@/contexts/AudioEngineContext';
import { Music } from 'lucide-react';

interface ProfileTrackPlayerProps {
  track: ProfileTrack;
  accentColor: string;
}

/** Starts playing as soon as the profile loads, like the visitor already
 *  hit play - browsers may still block autoplay-with-sound without a prior
 *  gesture, in which case the native <audio>/YouTube controls fall back to
 *  a normal paused state the visitor can tap. */
export const ProfileTrackPlayer: React.FC<ProfileTrackPlayerProps> = ({ track, accentColor }) => {
  const { volume, setActiveElement } = useAudioEngine();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (track.type !== 'upload') return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume, track.type]);

  useEffect(() => {
    if (track.type !== 'upload') return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.play().catch(() => {
      // Autoplay-with-sound blocked by the browser - the visible native
      // controls let the visitor start it manually instead.
    });
    return () => setActiveElement(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.type, track.value]);

  if (track.type === 'upload') {
    return (
      <div className="flex items-center gap-2.5 border-2 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 hard-shadow-sm" style={{ borderColor: accentColor }}>
        <Music className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
        <audio
          ref={audioRef}
          controls
          src={track.value}
          className="h-8 flex-1 min-w-0"
          onPlay={(e) => setActiveElement(e.currentTarget)}
          onPause={() => setActiveElement(null)}
          onEnded={() => setActiveElement(null)}
        />
      </div>
    );
  }

  return (
    <div className="border-2 overflow-hidden hard-shadow-sm" style={{ borderColor: accentColor }}>
      <iframe
        width="100%"
        height="80"
        src={`${buildYoutubeEmbedUrl(track.value)}?autoplay=1`}
        title="Profile track"
        allow="autoplay; encrypted-media"
        className="block"
      />
    </div>
  );
};
