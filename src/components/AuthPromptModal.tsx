import React from 'react';
import { LogIn, Lock, X } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-none p-4 animate-fadeIn">
      <div className="w-full max-w-md border-2 border-black bg-white p-6 hard-shadow relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-header text-xl font-extrabold uppercase text-black">
              SIGN IN REQUIRED
            </h3>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
              AUTHENTICATE TO SAVE MUSIC
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 font-mono text-xs text-neutral-700 leading-relaxed mb-6">
          <p>
            Sign in with Google to save albums to your permanent <strong>Liked</strong> and <strong>To Listen</strong> collections.
          </p>
          <p className="text-neutral-500">
            Guest interactions are restricted to prevent accidental loss of saved albums across browser sessions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-black bg-black py-2.5 text-white hover:bg-neutral-800 transition-all hard-shadow-sm"
          >
            <LogIn className="h-4 w-4" />
            <span>SIGN IN WITH GOOGLE</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black bg-white px-4 py-2.5 text-black hover:bg-neutral-100 transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
