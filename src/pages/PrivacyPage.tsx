import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ShieldCheck, ArrowLeft, Lock, Database, EyeOff, Trash2, Download } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <Header />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12 w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        {/* Title Header */}
        <div className="border-2 border-black bg-white p-8 hard-shadow mb-8">
          <div className="flex items-center gap-4 border-b-2 border-black pb-6 mb-6">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                LEGAL & COMPLIANCE
              </div>
              <h1 className="font-header text-3xl sm:text-4xl font-extrabold uppercase text-black">
                PRIVACY POLICY
              </h1>
            </div>
          </div>

          {/* Privacy Statement Text */}
          <div className="space-y-6 text-sm text-neutral-800 leading-relaxed">
            <p className="font-semibold text-base text-black">
              mox music is a personal, non-commercial music discovery application.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 my-6">
              <div className="border-2 border-black bg-neutral-50 p-4 hard-shadow-sm">
                <Database className="h-5 w-5 mb-2 text-black" />
                <h4 className="font-mono text-xs font-bold uppercase text-black mb-1">DATA STORED</h4>
                <p className="font-mono text-[11px] text-neutral-600">
                  Minimal Google email address & saved Liked/To Listen album collections.
                </p>
              </div>

              <div className="border-2 border-black bg-neutral-50 p-4 hard-shadow-sm">
                <EyeOff className="h-5 w-5 mb-2 text-black" />
                <h4 className="font-mono text-xs font-bold uppercase text-black mb-1">NO TRACKING</h4>
                <p className="font-mono text-[11px] text-neutral-600">
                  We never sell, share, or monetize your personal listening preferences.
                </p>
              </div>

              <div className="border-2 border-black bg-neutral-50 p-4 hard-shadow-sm">
                <Lock className="h-5 w-5 mb-2 text-black" />
                <h4 className="font-mono text-xs font-bold uppercase text-black mb-1">USER CONTROL</h4>
                <p className="font-mono text-[11px] text-neutral-600">
                  Full control: sign out, export data, or delete your saved entries anytime.
                </p>
              </div>
            </div>

            {/* GDPR Specific Rights */}
            <div className="border-2 border-black bg-neutral-50 p-5 space-y-3 font-mono text-xs text-neutral-700 hard-shadow-sm">
              <div className="flex items-start gap-2.5">
                <Trash2 className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>
                  <strong>RIGHT TO BE FORGOTTEN:</strong> You can delete your account and all associated saved data at any time from your profile settings menu.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Download className="h-4 w-4 shrink-0 text-black mt-0.5" />
                <span>
                  <strong>RIGHT TO PORTABILITY:</strong> You can download a complete copy of all your saved data at any time from your profile settings menu.
                </span>
              </div>
            </div>

            <p className="font-mono text-xs text-neutral-600 uppercase tracking-wider border-t border-black/10 pt-4">
              We store minimal user data solely to synchronize your personal music profile across devices via Firebase Cloud Firestore. You may delete your saved data or sign out at any time.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
