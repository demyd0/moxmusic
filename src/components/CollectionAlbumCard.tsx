import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Album } from '@/types/album';
import { Disc3, Heart, Headphones, Trash2 } from 'lucide-react';

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

  // Format dateAdded if available
  const formattedDate = album.dateAdded
    ? new Date(album.dateAdded).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

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
            <Disc3 className="h-8 w-8 text-black mb-2" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600">NO COVER</span>
          </div>
        )}

        {/* Action Overlay. See .card-action-overlay in index.css for why this
            isn't plain Tailwind opacity classes. */}
        <div className="card-action-overlay absolute inset-0 z-20 flex flex-col justify-end p-2.5 transition-opacity bg-black/60 backdrop-blur-none">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

        {/* Bottom Metadata: Release Year (Bottom-Left) & Date Added (Right) */}
        <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <span>{album.releaseYear || 'N/A'}</span>
          {formattedDate && <span>ADDED: {formattedDate.toUpperCase()}</span>}
        </div>
      </div>
    </div>
  );
};
