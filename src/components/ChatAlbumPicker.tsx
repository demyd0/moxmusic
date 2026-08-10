import React from 'react';
import type { Album } from '@/types/album';
import { X, Disc3, Music2 } from 'lucide-react';

interface ChatAlbumPickerProps {
  albums: Album[];
  onPick: (album: Album) => void;
  onClose: () => void;
}

/** Small popover for attaching one of the sender's own liked albums to a
 *  chat message - covers overlap like records in a shop bin (see the
 *  .vinyl-stack/.vinyl-cover rules in index.css); hovering one pushes its
 *  neighbor aside to show it in full. Wheel-to-scroll horizontally so
 *  flipping through a big collection doesn't require the scrollbar. */
export const ChatAlbumPicker: React.FC<ChatAlbumPickerProps> = ({ albums, onPick, onClose }) => {
  // Converts normal vertical mouse-wheel motion into horizontal scroll,
  // so you can flip through the stack just by scrolling over it instead
  // of having to grab the scrollbar - same trick as flipping through
  // records by spinning past them.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.currentTarget.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 border-2 border-black bg-white hard-shadow-sm max-h-64 overflow-hidden flex flex-col z-10">
      <div className="flex items-center justify-between border-b-2 border-black px-3 py-2 shrink-0">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-black">SHARE AN ALBUM</span>
        <button type="button" onClick={onClose} className="text-neutral-400 hover:text-black transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      {albums.length === 0 ? (
        <p className="p-4 font-mono text-[11px] text-neutral-400 uppercase tracking-wider text-center">
          LIKE SOME ALBUMS FIRST TO SHARE THEM.
        </p>
      ) : (
        <div className="vinyl-stack overflow-x-auto overflow-y-hidden px-4 pt-8 pb-5" onWheel={handleWheel}>
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => onPick(album)}
              title={`${album.title} — ${album.artist}`}
              className="vinyl-cover relative h-20 w-20 border-2 border-black bg-white overflow-hidden"
            >
              {album.kind === 'track' && (
                <span className="absolute left-0.5 top-0.5 z-10 flex items-center justify-center border border-black bg-white p-0.5">
                  <Music2 className="h-2.5 w-2.5 text-black" />
                </span>
              )}
              {album.coverUrl ? (
                <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-neutral-100 flex items-center justify-center">
                  <Disc3 className="h-6 w-6 text-neutral-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
