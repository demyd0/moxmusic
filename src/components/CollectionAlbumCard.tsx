import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Album } from '@/types/album';
import { getPreferredService } from '@/lib/streamingServices';
import { Disc3, Heart, Headphones, Trash2, Music2, MoreVertical } from 'lucide-react';

interface CollectionAlbumCardProps {
  album: Album;
  type?: 'liked' | 'toListen';
  isLiked?: boolean;
  isToListen?: boolean;
  onToggleLike?: (album: Album) => void;
  onToggleToListen?: (album: Album) => void;
  onRemove?: (album: Album) => void;
}

export const CollectionAlbumCard: React.FC<CollectionAlbumCardProps> = ({
  album,
  type,
  isLiked = false,
  isToListen = false,
  onToggleLike,
  onToggleToListen,
  onRemove,
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Format dateAdded if available
  const formattedDate = album.dateAdded
    ? new Date(album.dateAdded).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const isTrack = album.kind === 'track';

  const handleCardClick = () => {
    if (isTrack) {
      // Imported tracks have no internal album page to resolve to (no
      // matching iTunes/MusicBrainz id) - send the click to a search on
      // whichever service the user prefers, instead of a dead
      // /album/import-xxxx route.
      window.open(getPreferredService().buildSearchUrl(album.artist, album.title, false), '_blank', 'noopener,noreferrer');
      return;
    }
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
        {/* Track badge - keeps individually-liked songs from reading as
            albums at a glance in a mixed grid */}
        {isTrack && (
          <div className="absolute left-1.5 top-1.5 z-30 flex items-center gap-1 border border-black bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black">
            <Music2 className="h-2.5 w-2.5" />
            <span>TRACK</span>
          </div>
        )}

        {/* Tap-to-reveal trigger for the action overlay below - the overlay
            itself defaults to hidden everywhere now (see .card-action-
            overlay in index.css), so touch devices (no reliable :hover)
            need an explicit way in that isn't a permanent dark panel
            sitting on top of the cover art. */}
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

        {/* Loading Spinner */}
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
            {isTrack ? (
              <Music2 className="h-8 w-8 text-black mb-2" />
            ) : (
              <Disc3 className="h-8 w-8 text-black mb-2" />
            )}
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600">NO COVER</span>
          </div>
        )}

        {/* Action Overlay. See .card-action-overlay in index.css for why this
            isn't plain Tailwind opacity classes. */}
        <div className={`card-action-overlay absolute inset-0 z-20 flex flex-col justify-end p-2.5 transition-opacity bg-black/60 backdrop-blur-none ${actionsOpen ? 'is-open' : ''}`}>
          <div
            className="flex items-center gap-2"
            onClick={(e) => {
              // Also closes the tap-opened overlay after any action button
              // click (bubbles up from the button after its own handler
              // runs) - hover-revealed on desktop doesn't need this since
              // moving the mouse away already closes it.
              e.stopPropagation();
              setActionsOpen(false);
            }}
          >
            {type === 'liked' && onToggleToListen ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => onToggleToListen(album)}
                  className={`inline-flex items-center justify-center gap-1 border border-black px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isToListen
                      ? 'bg-black text-white border-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <Headphones className="h-3 w-3" />
                  <span>{isToListen ? 'QUEUED' : 'LISTEN'}</span>
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(album)}
                    className="inline-flex items-center justify-center gap-1 border border-black bg-white px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>DELETE</span>
                  </button>
                )}
              </div>
            ) : type === 'toListen' && onToggleLike ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => onToggleLike(album)}
                  className={`inline-flex items-center justify-center gap-1 border border-black px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isLiked
                      ? 'bg-black text-white border-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <Heart className={`h-3 w-3 ${isLiked ? 'fill-white text-white' : 'text-black'}`} />
                  <span>{isLiked ? 'LIKED' : 'LIKE'}</span>
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(album)}
                    className="inline-flex items-center justify-center gap-1 border border-black bg-white px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>DELETE</span>
                  </button>
                )}
              </div>
            ) : onToggleLike && onToggleToListen ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => onToggleLike(album)}
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
                  onClick={() => onToggleToListen(album)}
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
            ) : onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(album)}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-black bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>DELETE</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Minimalist Info: Title + Artist */}
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          <h4 
            onClick={handleCardClick}
            className="font-header text-base font-extrabold text-black truncate cursor-pointer hover:underline"
          >
            {album.title}
          </h4>
          <Link
            to={artistTargetUrl}
            className="mt-0.5 block text-xs text-neutral-700 font-normal truncate hover:underline hover:text-black"
          >
            {album.artist}
          </Link>
        </div>

        {/* Bottom Metadata: album context or release year (left) & date added (right) */}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/10 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <span className="truncate">
            {isTrack ? (album.albumTitle ? `FROM ${album.albumTitle}` : 'SINGLE') : album.releaseYear || 'N/A'}
          </span>
          {formattedDate && <span className="shrink-0">ADDED: {formattedDate.toUpperCase()}</span>}
        </div>
      </div>
    </div>
  );
};
