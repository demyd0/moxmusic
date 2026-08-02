import React, { useState } from 'react';
import { ShieldCheck, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GdprConsentModalProps {
  isOpen: boolean;
  onAccept: () => Promise<void>;
}

export const GdprConsentModal: React.FC<GdprConsentModalProps> = ({ isOpen, onAccept }) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) return;
    setIsSubmitting(true);
    try {
      await onAccept();
    } catch (err) {
      console.error('Consent error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-none p-4 animate-fadeIn">
      <div className="w-full max-w-md border-2 border-black bg-white p-6 hard-shadow">
        {/* Header */}
        <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-header text-xl font-extrabold uppercase text-black">
              PRIVACY CONSENT
            </h3>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
              FIRST-TIME SIGN-IN REQUIRED
            </p>
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-4 font-mono text-xs text-neutral-700 leading-relaxed mb-6">
          <p>
            Welcome to <strong>mox music</strong>. Before using your account, please review and accept our privacy policy regarding minimal data storage.
          </p>

          {/* Single Unchecked Checkbox */}
          <div className="border-2 border-black bg-neutral-50 p-3.5 hard-shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-none border-2 border-black accent-black cursor-pointer"
              />
              <span className="font-bold text-black uppercase leading-snug">
                I AGREE TO THE{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-neutral-600 inline-flex items-center gap-0.5"
                >
                  <span>PRIVACY POLICY</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </span>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={!isAgreed || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-black bg-black py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed hard-shadow-sm"
          >
            <Check className="h-4 w-4" />
            <span>{isSubmitting ? 'SAVING CONSENT...' : 'CONTINUE'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
