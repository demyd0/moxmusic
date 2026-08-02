import React, { useState } from 'react';
import type { Album } from '@/types/album';
import { X, Plus, Disc3 } from 'lucide-react';

interface ManualAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddManualAlbum: (album: Album) => void;
}

export const ManualAlbumModal: React.FC<ManualAlbumModalProps> = ({
  isOpen,
  onClose,
  onAddManualAlbum,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    const newAlbum: Album = {
      id: `manual-${Date.now()}`,
      title: title.trim(),
      artist: artist.trim(),
      releaseYear: releaseYear.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      source: 'manual',
    };

    onAddManualAlbum(newAlbum);
    // Reset form
    setTitle('');
    setArtist('');
    setReleaseYear('');
    setCoverUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-fadeIn">
      <div className="relative w-full max-w-lg border-2 border-black bg-white p-6 hard-shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-header text-2xl font-extrabold text-black">ADD MANUAL ALBUM</h3>
              <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">FOR UNDERGROUND & RARE RELEASES</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form & Live Preview Grid */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-black mb-1.5">
              ALBUM TITLE *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G. 'UNTRUE'"
              className="w-full border-2 border-black bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-black mb-1.5">
              ARTIST *
            </label>
            <input
              type="text"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="E.G. 'BURIAL'"
              className="w-full border-2 border-black bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                RELEASE YEAR
              </label>
              <input
                type="text"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2007"
                maxLength={4}
                className="w-full border-2 border-black bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                COVER URL
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="HTTPS://..."
                className="w-full border-2 border-black bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Preview */}
          <div className="mt-4 border-2 border-black bg-neutral-50 p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">PREVIEW</span>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 border border-black bg-white overflow-hidden flex items-center justify-center shrink-0">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Disc3 className="h-5 w-5 text-black" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-header text-sm font-bold text-black truncate">
                  {title || 'Album Title'}
                </div>
                <div className="text-xs text-neutral-600 truncate">
                  {artist || 'Artist Name'} {releaseYear ? `(${releaseYear})` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-black bg-white px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={!title.trim() || !artist.trim()}
              className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              CREATE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
