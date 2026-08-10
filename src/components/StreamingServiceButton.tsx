import React, { useEffect, useRef, useState } from 'react';
import { STREAMING_SERVICES, getPreferredService, setPreferredService, type StreamingService } from '@/lib/streamingServices';
import { ExternalLink, ChevronDown, Check } from 'lucide-react';

interface StreamingServiceButtonProps {
  artist: string;
  title: string;
  isAlbum: boolean;
  className?: string;
  /** Notified when the user picks a new preferred service, so other
   *  service-aware links on the same page (e.g. per-track buttons) can
   *  stay in sync without a reload. */
  onServiceChange?: (service: StreamingService) => void;
}

/**
 * A "listen on X" link button where X is whichever service the user last
 * picked (persisted in localStorage, see streamingServices.ts) - not
 * everyone uses YouTube Music. The dropdown next to it changes the
 * preference for every album page going forward, not just this one.
 */
export const StreamingServiceButton: React.FC<StreamingServiceButtonProps> = ({ artist, title, isAlbum, className, onServiceChange }) => {
  const [service, setService] = useState(getPreferredService);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div ref={wrapperRef} className={`relative flex w-full ${className || ''}`}>
      <a
        href={service.buildSearchUrl(artist, title, isAlbum)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-black px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hard-shadow-sm min-w-0"
        style={{ backgroundColor: service.color }}
      >
        <ExternalLink className="h-4 w-4 shrink-0" />
        <span className="truncate">{service.label}</span>
      </a>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        title="Change preferred music service"
        className="shrink-0 border-2 border-l-0 border-black bg-white px-2 text-black hover:bg-neutral-100 transition-all"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 border-2 border-black bg-white hard-shadow-sm">
          <div className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b-2 border-black">
            PREFERRED SERVICE
          </div>
          {STREAMING_SERVICES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setPreferredService(s.id);
                setService(s);
                onServiceChange?.(s);
                setMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                s.id === service.id ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <span>{s.label}</span>
              {s.id === service.id && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
