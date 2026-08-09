import React, { useState } from 'react';
import { TEXT_FONTS, TEXT_EFFECTS, isValidHexColor, textStyleToCss } from '@/lib/profileValidation';
import type { TextStyle } from '@/types/profile';
import { X } from 'lucide-react';

interface StyledTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  style: TextStyle;
  onStyleChange: (style: TextStyle) => void;
  accentColor: string;
  placeholder?: string;
  rows?: number;
  maxLength: number;
}

/**
 * A textarea that reveals a small formatting toolbar (font/color/effect)
 * while it - or the toolbar - has focus. Every option is a fixed preset
 * from profileValidation.ts, never free text, so this can't turn into a
 * raw-HTML/CSS injection surface.
 */
export const StyledTextField: React.FC<StyledTextFieldProps> = ({
  value,
  onChange,
  style,
  onStyleChange,
  accentColor,
  placeholder,
  rows = 3,
  maxLength,
}) => {
  const [isActive, setIsActive] = useState(false);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsActive(false);
    }
  };

  return (
    <div onFocus={() => setIsActive(true)} onBlur={handleBlur} className="relative">
      {isActive && (
        <div className="mb-2 flex flex-wrap items-center gap-3 border-2 border-black bg-neutral-50 p-2.5">
          <div className="flex items-center gap-1">
            {TEXT_FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onStyleChange({ ...style, font: f.value })}
                className={`border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                  style.font === f.value
                    ? 'border-black bg-black text-white'
                    : 'border-black/20 text-neutral-500 hover:border-black/50 hover:text-black'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-black/15" />

          <div className="flex items-center gap-1">
            {TEXT_EFFECTS.map((eff) => (
              <button
                key={eff.value}
                type="button"
                onClick={() => onStyleChange({ ...style, effect: eff.value })}
                className={`border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                  style.effect === eff.value
                    ? 'border-black bg-black text-white'
                    : 'border-black/20 text-neutral-500 hover:border-black/50 hover:text-black'
                }`}
              >
                {eff.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-black/15" />

          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={isValidHexColor(style.color) ? style.color : accentColor}
              onChange={(e) => onStyleChange({ ...style, color: e.target.value })}
              className="h-7 w-9 border-2 border-black cursor-pointer"
              title="TEXT COLOR"
            />
            {style.color && (
              <button
                type="button"
                onClick={() => onStyleChange({ ...style, color: '' })}
                title="RESET COLOR"
                className="flex h-7 w-7 items-center justify-center border-2 border-black/20 text-neutral-500 hover:border-black hover:text-black transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        style={textStyleToCss(style, accentColor)}
        className="w-full border-2 border-black bg-white px-3.5 py-2.5 text-sm placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none resize-none"
      />
    </div>
  );
};
