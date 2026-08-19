import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Album } from '@/types/album';
import { Disc3, Heart, Headphones, MoreVertical } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  isLiked?: boolean;
  isToListen?: boolean;
  onToggleLike?: (album: Album) => void;
  onToggleToListen?: (album: Album) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  isLiked = false,
  isToListen = false,
  onToggleLike,
  onToggleToListen,
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const handleCardClick = () => {
    navigate(`/album/${album.id}`);
  };

  const artistTargetUrl = `/artist/${encodeURIComponent(album.artistId || album.artist)}?name=${encodeURIComponent(album.artist)}`;

  return (
    <div className="group relative flex flex-col border-2 border-black bg-white p-3.5 hard-shadow transition-all duration-150 hover:-translate-y-0.5">
      {/* 100% Clean Cover Image Container */}
      <div 
        onClick={handleCardClick}
        className="relative aspect-square w-full border border-black bg-neutral-100 cursor-pointer overflow-hidden"
      >
        {/* Tap-to-reveal trigger for the action overlay below - see
            CollectionAlbumCard.tsx / index.css's .card-action-overlay for
            the full reasoning (mobile has no reliable :hover, so the
            overlay used to just sit permanently on top of the art). */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActionsOpen((v) => !v);
          }}
          title="Album actions"
          className="absolute right-1.5 top-1.5 z-30 flex h-6 w-6 items-center justify-center border border-black bg-white/90 text-black transition-colors hover:bg-white"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>

        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && album.coverUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 animate-pulse">
            <Disc3 className="h-8 w-8 text-neutral-400 animate-spin" />
          </div>
        )}

        {/* Pure Clean Cover Image */}
        {album.coverUrl && !imageError ? (
          <img
            src={album.coverUrl}
            alt={`${album.title} by ${album.artist}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        ) : (
          /* Brutalist Fallback Placeholder */
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-100 p-4 text-center">
            <Disc3 className="h-8 w-8 text-black mb-2" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600">NO COVER</span>
          </div>
        )}

        {/* Action Overlay with LIKE & LISTEN Buttons. See .card-action-overlay
            in index.css for why this isn't plain Tailwind opacity classes. */}
        <div className={`card-action-overlay absolute inset-0 z-20 flex flex-col justify-end p-2.5 transition-opacity bg-black/60 backdrop-blur-none ${actionsOpen ? 'is-open' : ''}`}>
          <div
            className="grid grid-cols-2 gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setActionsOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => onToggleLike?.(album)}
              className={`inline-flex items-center justify-center gap-1 border border-black px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                isLiked
                  ? 'bg-black text-white border-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-white text-white' : 'text-black'}`} />
              <span>{isLiked ? 'LIKED' : 'LIKE'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleToListen?.(album)}
              className={`inline-flex items-center justify-center gap-1 border border-black px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                isToListen
                  ? 'bg-black text-white border-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Headphones className="h-3 w-3" />
              <span>{isToListen ? 'QUEUED' : 'LISTEN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Album Info Below Cover */}
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          <h4 
            onClick={handleCardClick}
            className="font-header text-base font-extrabold text-black line-clamp-1 cursor-pointer hover:underline"
          >
            {album.title}
          </h4>
          <Link
            to={artistTargetUrl}
            className="mt-0.5 block text-xs text-neutral-700 font-normal line-clamp-1 hover:underline hover:text-black"
          >
            {album.artist}
          </Link>
        </div>

        {/* Metadata Footer: Release Year in Bottom-Left */}
        <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2 text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          <span>{album.releaseYear || 'N/A'}</span>
          {album.trackCount && <span>{album.trackCount} TRACKS</span>}
        </div>
      </div>
    </div>
  );
};
