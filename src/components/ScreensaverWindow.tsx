import React, { useRef, useState } from 'react';
import { ScreensaverCanvas } from './ScreensaverCanvas';
import { SCREENSAVER_PRESETS, type ScreensaverPreset } from '@/lib/screensaverPresets';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 260;

interface Rect { x: number; y: number; w: number; h: number; }

const GRIP_PATTERN = 'repeating-linear-gradient(90deg, #7d92c2 0px, #7d92c2 1px, transparent 1px, transparent 3px)';

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
    // Can throw NotFoundError in rare edge cases (pointer already released,
    // etc.) - non-fatal either way, dragging still works via bubbling.
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    // Capture drag/resize into local consts rather than re-reading the ref
    // inside the setState updater: React can batch several pointer events
    // together, so by the time this updater actually runs, a later
    // pointerup in the same batch may have already nulled the ref out
    // from under it (that was crashing the whole app - see handleDragEnd).
    setRect((r) => ({
      ...r,
      x: Math.min(Math.max(0, drag.origX + dx), window.innerWidth - 100),
      y: Math.min(Math.max(0, drag.origY + dy), window.innerHeight - 40),
    }));
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: rect.w, origH: rect.h };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    const resize = resizeRef.current;
    if (!resize) return;
    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;
    setRect((r) => ({
      ...r,
      w: Math.max(MIN_WIDTH, resize.origW + dx),
      h: Math.max(MIN_HEIGHT, resize.origH + dy),
    }));
  };

  const handleResizeEnd = () => {
    resizeRef.current = null;
  };

  return (
    <div
      className="fixed z-[100] flex flex-col"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: 'linear-gradient(135deg, #d8d8d8, #9a9a9a)',
        border: '2px outset #cfcfcf',
        boxShadow: '3px 3px 10px rgba(0,0,0,0.6)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Title bar - drag handle, classic Winamp gradient + grip pattern */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        className="flex items-center gap-2 px-1.5 py-1 cursor-move select-none touch-none"
        style={{
          background: 'linear-gradient(180deg, #6377a8 0%, #33406b 50%, #1c2544 100%)',
          borderBottom: '1px solid #000',
        }}
      >
        <div className="h-3 flex-1" style={{ backgroundImage: GRIP_PATTERN }} />
        <span
          className="shrink-0 text-[10px] font-bold uppercase"
          style={{ color: '#dbe6ff', letterSpacing: '0.15em' }}
        >
          ▸ SCREENSAVER
        </span>
        <div className="h-3 flex-1" style={{ backgroundImage: GRIP_PATTERN }} />
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center justify-center text-[10px] font-bold leading-none text-black"
          style={{
            width: 15,
            height: 13,
            background: 'linear-gradient(180deg, #f0f0f0, #b0b0b0)',
            border: '1px outset #e0e0e0',
          }}
        >
          ×
        </button>
      </div>

      {/* Preset picker - LCD-green "pressed" style for the active one */}
      <div
        className="flex flex-wrap gap-1 p-1.5"
        style={{
          background: 'linear-gradient(180deg, #c4c4c4, #9c9c9c)',
          borderBottom: '1px solid #000',
          borderTop: '1px solid #ececec',
        }}
      >
        {SCREENSAVER_PRESETS.map((p) => {
          const active = preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{
                padding: '3px 7px',
                color: active ? '#4dff4d' : '#111',
                background: active ? 'linear-gradient(180deg, #0c2a0c, #041604)' : 'linear-gradient(180deg, #e0e0e0, #b0b0b0)',
                border: active ? '1px inset #333' : '1px outset #e6e6e6',
                textShadow: active ? '0 0 4px #4dff4d' : 'none',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Canvas body - inset bevel frame around the black display */}
      <div
        className="relative flex-1 overflow-hidden m-1"
        style={{ border: '2px inset #808080' }}
      >
        <ScreensaverCanvas preset={preset} />
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
        style={{
          background: 'repeating-linear-gradient(135deg, #6a6a6a 0px, #6a6a6a 1px, transparent 1px, transparent 3px)',
        }}
      />
    </div>
  );
};
