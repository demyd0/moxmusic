import React, { useRef, useState } from 'react';
import { ScreensaverCanvas } from './ScreensaverCanvas';
import { SCREENSAVER_PRESETS, type ScreensaverPreset } from '@/lib/screensaverPresets';
import { X, Monitor } from 'lucide-react';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 260;

interface Rect { x: number; y: number; w: number; h: number; }

export const ScreensaverWindow: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rect, setRect] = useState<Rect>(() => ({
    x: Math.max(20, window.innerWidth / 2 - 260),
    y: Math.max(20, window.innerHeight / 2 - 220),
    w: 520,
    h: 400,
  }));
  const [preset, setPreset] = useState<ScreensaverPreset>('starfield');
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handleDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.x, origY: rect.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setRect((r) => ({
      ...r,
      x: Math.min(Math.max(0, dragRef.current!.origX + dx), window.innerWidth - 100),
      y: Math.min(Math.max(0, dragRef.current!.origY + dy), window.innerHeight - 40),
    }));
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: rect.w, origH: rect.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setRect((r) => ({
      ...r,
      w: Math.max(MIN_WIDTH, resizeRef.current!.origW + dx),
      h: Math.max(MIN_HEIGHT, resizeRef.current!.origH + dy),
    }));
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
  };

  return (
    <div
      className="fixed z-[100] flex flex-col border-2 border-black bg-white hard-shadow"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {/* Title bar - drag handle */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-2 cursor-move select-none touch-none"
      >
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white">
          <Monitor className="h-3.5 w-3.5" />
          <span>SCREENSAVER.EXE</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center border border-white/30 text-white hover:bg-white hover:text-black transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preset picker */}
      <div className="flex flex-wrap gap-1 border-b-2 border-black bg-neutral-100 p-1.5">
        {SCREENSAVER_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={`border border-black px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              preset === p.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Canvas body */}
      <div className="relative flex-1 overflow-hidden">
        <ScreensaverCanvas preset={preset} />
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
        style={{
          background: 'repeating-linear-gradient(135deg, #000 0px, #000 2px, transparent 2px, transparent 5px)',
        }}
      />
    </div>
  );
};
