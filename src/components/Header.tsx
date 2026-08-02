import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle, signOutUser } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Layers, Search, Heart, Headphones, LogIn, LogOut, User as UserIcon, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab?: 'search' | 'liked' | 'toListen';
  setActiveTab?: (tab: 'search' | 'liked' | 'toListen') => void;
  likedCount?: number;
  toListenCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'search',
  setActiveTab,
  likedCount = 0,
  toListenCount = 0,
}) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Subscribe to persistent Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Ignore anonymous users for Google profile badge
      if (user && !user.isAnonymous) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const msg = err?.message || '';
      // Ignore internal IndexedDB closing/hidden browser warnings
      if (msg.includes('closing') || msg.includes('hidden')) {
        return;
      }

      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('Domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized Domains.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-In popup was closed before completing.');
      } else {
        setAuthError(err?.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  const handleTabClick = (tab: 'search' | 'liked' | 'toListen') => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    if (tab === 'search') {
      navigate('/');
    } else {
      navigate(`/?tab=${tab}`);
    }
  };

  const handleLogoClick = () => {
    if (setActiveTab) {
      setActiveTab('search');
    }
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand Logo - Navigates to Main Page */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none hover:opacity-80 transition-opacity" 
          onClick={handleLogoClick}
          title="Go to main page"
        >
          <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <span className="font-header text-2xl font-extrabold tracking-tight text-black">
            mox music <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase ml-1">[v0.2]</span>
          </span>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabClick('search')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'search'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('liked')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'liked'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${activeTab === 'liked' ? 'fill-white' : ''}`} />
            <span>Liked</span>
            {likedCount > 0 && (
              <span className={`ml-1 font-mono text-[10px] px-1.5 py-0.2 border border-current ${
                activeTab === 'liked' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {likedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('toListen')}
            className={`flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all hard-shadow-sm ${
              activeTab === 'toListen'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>To Listen</span>
            {toListenCount > 0 && (
              <span className={`ml-1 font-mono text-[10px] px-1.5 py-0.2 border border-current ${
                activeTab === 'toListen' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {toListenCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right User Authentication Section */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            /* User Authenticated Profile Pill */
            <div className="flex items-center gap-2 border-2 border-black bg-white p-1 pr-2.5 text-xs font-mono hard-shadow-sm">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="h-7 w-7 border border-black object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center border border-black bg-black text-white">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
              <span className="hidden md:inline font-bold text-black max-w-[140px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 flex h-6 w-6 items-center justify-center border border-black bg-neutral-100 text-black hover:bg-black hover:text-white transition-all"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Google Sign In Trigger Button */
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              className="inline-flex items-center gap-2 border-2 border-black bg-black px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white hard-shadow-sm hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isAuthLoading ? 'LOGGING IN...' : 'SIGN IN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-amber-500 text-black border-t-2 border-black px-6 py-2 font-mono text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-black" />
            <span>AUTH ERROR: {authError}</span>
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="border border-black bg-black text-white px-2 py-0.5 uppercase tracking-wider text-[10px]"
          >
            DISMISS
          </button>
        </div>
      )}
    </header>
  );
};
