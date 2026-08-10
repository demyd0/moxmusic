import React, { useState } from 'react';
import type { ProfileTrack } from '@/types/profile';
import { buildYoutubeEmbedUrl } from '@/lib/youtubeEmbed';
import { Music, Play } from 'lucide-react';

interface ProfileTrackPlayerProps {
  track: ProfileTrack;
  accentColor: string;
}

/** The YouTube embed only mounts once the visitor clicks play - avoids
 *  loading a third-party iframe (and its tracking) on every profile view,
 *  and sidesteps browser autoplay-with-sound restrictions entirely. */
export const ProfileTrackPlayer: React.FC<ProfileTrackPlayerProps> = ({ track, accentColor }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (track.type === 'upload') {
    return (
      <div className="flex items-center gap-2.5 border-2 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 hard-shadow-sm" style={{ borderColor: accentColor }}>
        <Music className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
        <audio controls src={track.value} className="h-8 flex-1 min-w-0" />
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <button
        type="button"
        onClick={() => setIsPlaying(true)}
        className="inline-flex items-center gap-2 border-2 bg-white/95 backdrop-blur-sm px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider hard-shadow-sm hover:bg-neutral-100 transition-all"
        style={{ borderColor: accentColor, color: accentColor }}
      >
        <Play className="h-4 w-4 fill-current" />
        <span>PLAY PROFILE TRACK</span>
      </button>
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
