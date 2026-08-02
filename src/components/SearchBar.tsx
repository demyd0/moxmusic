import React from 'react';
import { Search, X, Loader2, Plus } from 'lucide-react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  enableBroadSearch: boolean;
  setEnableBroadSearch: (val: boolean) => void;
  isLoading: boolean;
  onOpenManualModal: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  setQuery,
  enableBroadSearch,
  setEnableBroadSearch,
  isLoading,
  onOpenManualModal,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-4 flex items-center text-black">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-black" />
          ) : (
            <Search className="h-5 w-5 text-black" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH ALBUM OR ARTIST (E.G. 'BURIAL', 'RADIOHEAD')..."
          className="w-full border-2 border-black bg-white py-4 pl-12 pr-32 text-base font-mono font-medium text-black placeholder-neutral-400 hard-shadow focus:bg-neutral-50 focus:outline-none"
        />

        {/* Action Buttons inside Input */}
        <div className="absolute right-3 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
              title="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenManualModal}
            className="hidden sm:inline-flex items-center gap-1.5 border-2 border-black bg-black px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Manual</span>
          </button>
        </div>
      </div>

      {/* Controls & Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Broad Search Toggle */}
        <button
          type="button"
          onClick={() => setEnableBroadSearch(!enableBroadSearch)}
          className={`inline-flex items-center gap-2 border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
            enableBroadSearch
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${enableBroadSearch ? 'bg-emerald-400' : 'bg-neutral-400'}`} />
          <span>BROAD SEARCH (MUSICBRAINZ)</span>
        </button>

        {/* Mobile Manual Add Button */}
        <button
          type="button"
          onClick={onOpenManualModal}
          className="sm:hidden inline-flex items-center gap-1.5 border-2 border-black bg-black px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Manual</span>
        </button>

        {/* Search Hint */}
        <div className="hidden md:flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <span>TIER 1: ITUNES</span>
          <span>•</span>
          <span>TIER 2: MUSICBRAINZ</span>
        </div>
      </div>
    </div>
  );
};
