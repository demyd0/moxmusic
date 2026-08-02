import React, { useState } from 'react';
import { User as UserIcon, Check, AlertCircle } from 'lucide-react';

interface UsernameModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => Promise<void>;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({ isOpen, onSubmit }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = username.trim();

    if (cleaned.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleaned)) {
      setError('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(cleaned);
    } catch (err: any) {
      setError(err?.message || 'Failed to save username.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-none p-4 animate-fadeIn">
      <div className="w-full max-w-md border-2 border-black bg-white p-6 hard-shadow">
        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-header text-xl font-extrabold uppercase text-black">
              CHOOSE YOUR USERNAME
            </h3>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
              MIN 3 CHARACTERS (LETTERS, NUMBERS, UNDERSCORE)
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block font-bold uppercase text-black mb-1">
              USERNAME:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="demyd"
                maxLength={20}
                required
                className="w-full border-2 border-black bg-white pl-8 pr-3 py-2 text-black font-bold uppercase placeholder:text-neutral-400 focus:outline-none focus:bg-neutral-50"
              />
            </div>
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="flex items-center gap-2 border border-red-600 bg-red-50 p-2.5 text-red-600 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 border-2 border-black bg-black py-2.5 font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all disabled:opacity-50 hard-shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'SAVING...' : 'SAVE USERNAME'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
