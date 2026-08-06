import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle, signOutUser } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  getUserProfile,
  saveUserProfile,
  recordUserConsent,
  exportUserData,
  deleteUserAccount,
  ensurePublicProfile,
  type UserProfile
} from '@/services/userService';
import { UsernameModal } from '@/components/UsernameModal';
import { GdprConsentModal } from '@/components/GdprConsentModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { useTheme } from '@/hooks/useTheme';
import {
  Search,
  Heart,
  Headphones,
  LogIn,
  LogOut,
  User as UserIcon,
  AlertTriangle,
  Download,
  Trash2,
  ChevronDown,
  Check,
  Edit3,
  Sun,
  Moon
} from 'lucide-react';

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
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Subscribe to persistent Firebase Auth state & fetch User Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user);
        // Make sure the ID token is actually attached before the first
        // Firestore read - see the retry logic in getUserProfile for why.
        try {
          await user.getIdToken();
        } catch {}
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setIsUsernameModalOpen(false);
          void ensurePublicProfile(profile);
          if (!profile.consentGiven) {
            setIsConsentModalOpen(true);
          } else {
            setIsConsentModalOpen(false);
          }
        } else {
          setIsUsernameModalOpen(true);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setIsUsernameModalOpen(false);
        setIsConsentModalOpen(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          setIsUsernameModalOpen(true);
        } else if (!profile.consentGiven) {
          setIsConsentModalOpen(true);
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
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

  const handleSaveUsername = async (username: string) => {
    if (!currentUser) return;
    const profile = await saveUserProfile(
      currentUser.uid,
      username,
      currentUser.email || undefined,
      currentUser.photoURL || undefined
    );
    setUserProfile(profile);
    setIsUsernameModalOpen(false);
    setNotificationToast(`USERNAME UPDATED TO @${profile.username.toUpperCase()}`);
    setTimeout(() => setNotificationToast(null), 3000);

    if (!profile.consentGiven) {
      setIsConsentModalOpen(true);
    }
  };

  const handleAcceptConsent = async () => {
    if (!currentUser) return;
    await recordUserConsent(currentUser.uid);
    if (userProfile) {
      setUserProfile({ ...userProfile, consentGiven: true });
    }
    setIsConsentModalOpen(false);
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    setIsProfileDropdownOpen(false);
    await exportUserData(currentUser.uid, userProfile?.username || 'user');
    setNotificationToast('DATA EXPORT COMPLETED.');
    setTimeout(() => setNotificationToast(null), 3000);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!currentUser) return;
    setIsDeleteModalOpen(false);
    setIsProfileDropdownOpen(false);
    const uid = currentUser.uid;
    await deleteUserAccount(uid);
    setCurrentUser(null);
    setUserProfile(null);
    setNotificationToast('ACCOUNT AND DATA PERMANENTLY DELETED.');
    setTimeout(() => setNotificationToast(null), 4000);
    navigate('/');
  };

  const handleLogout = async () => {
    setIsProfileDropdownOpen(false);
    await signOutUser();
    setCurrentUser(null);
    setUserProfile(null);
    setIsUsernameModalOpen(false);
    setIsConsentModalOpen(false);
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        {/* Minimalist Double MM Brand Logo ONLY (No text) */}
        <div 
          className="flex items-center cursor-pointer select-none hover:opacity-80 transition-opacity shrink-0" 
          onClick={handleLogoClick}
          title="mox music — Home"
        >
          <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white hard-shadow font-mono text-base font-extrabold tracking-tighter">
            MM
          </div>
        </div>

        {/* Center Navigation Segmented Control */}
        <nav className="flex items-center border-2 border-black bg-white hard-shadow-sm p-0.5 font-mono text-xs font-bold uppercase">
          <button
            type="button"
            onClick={() => handleTabClick('search')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 transition-all ${
              activeTab === 'search'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SEARCH</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('liked')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 border-l-2 border-black transition-all ${
              activeTab === 'liked'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="Liked collection"
          >
            <Heart className={`h-3.5 w-3.5 ${activeTab === 'liked' ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">LIKED</span>
            {likedCount > 0 && (
              <span className={`font-mono text-[10px] px-1 py-0.2 border border-current ${
                activeTab === 'liked' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {likedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('toListen')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 border-l-2 border-black transition-all ${
              activeTab === 'toListen'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            title="To Listen queue"
          >
            <Headphones className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">LISTEN</span>
            {toListenCount > 0 && (
              <span className={`font-mono text-[10px] px-1 py-0.2 border border-current ${
                activeTab === 'toListen' ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                {toListenCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right User Profile Dropdown Pill */}
        <div className="flex items-center gap-2 relative shrink-0">
          {currentUser ? (
            /* User Profile Button with High-Contrast Dropdown Menu */
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className="min-h-[40px] flex items-center gap-2 border-2 border-black bg-white px-2.5 py-1 text-xs font-mono hard-shadow hover:bg-neutral-100 transition-all select-none"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={userProfile?.username || 'User'}
                    className="h-6 w-6 border border-black object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center border border-black bg-black text-white">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="font-bold text-black max-w-[80px] sm:max-w-[120px] truncate">
                  @{userProfile?.username || 'user'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-black" />
              </button>

              {/* High-Contrast Prominent Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 border-2 border-black bg-white p-3 hard-shadow-lg z-50 font-mono text-xs animate-fadeIn">
                  <div className="border-b-2 border-black pb-2.5 mb-2.5 px-1">
                    <div className="font-extrabold text-black text-sm uppercase truncate">
                      @{userProfile?.username || 'user'}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">{currentUser.email}</div>
                  </div>

                  {/* Appearance: light/dark toggle */}
                  <div className="mb-2.5">
                    <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      APPEARANCE
                    </div>
                    <div className="flex items-stretch border border-black hard-shadow-sm">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex-1 min-h-[36px] flex items-center justify-center gap-1.5 py-2 font-bold uppercase transition-all ${
                          theme === 'light' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Sun className="h-3.5 w-3.5" />
                        <span>LIGHT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex-1 min-h-[36px] flex items-center justify-center gap-1.5 py-2 border-l border-black font-bold uppercase transition-all ${
                          theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Moon className="h-3.5 w-3.5" />
                        <span>DARK</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsUsernameModalOpen(true);
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>CHANGE USERNAME</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-neutral-100 transition-all mb-2 hard-shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>EXPORT MY DATA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-red-600 border border-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>DELETE MY ACCOUNT</span>
                  </button>

                  <div className="border-t-2 border-black pt-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full min-h-[40px] flex items-center justify-center gap-2 px-2.5 py-2 text-center font-bold uppercase text-white bg-black hover:bg-neutral-800 transition-all"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>SIGN OUT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Google Sign In Trigger Button */
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
              className="min-h-[40px] inline-flex items-center gap-1.5 border-2 border-black bg-black px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white hard-shadow hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isAuthLoading ? 'LOGGING IN...' : 'SIGN IN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {notificationToast && (
        <div className="bg-black text-white border-t-2 border-black px-6 py-2.5 font-mono text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{notificationToast}</span>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className="border border-white bg-white text-black px-2 py-0.5 uppercase tracking-wider text-[10px]"
          >
            DISMISS
          </button>
        </div>
      )}

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

      {/* Username Configuration Modal */}
      <UsernameModal
        isOpen={isUsernameModalOpen}
        currentUserEmail={currentUser?.email}
        initialUsername={userProfile?.username || ''}
        onClose={userProfile ? () => setIsUsernameModalOpen(false) : undefined}
        onSubmit={handleSaveUsername}
      />

      {/* GDPR First-Time Consent Modal */}
      <GdprConsentModal
        isOpen={isConsentModalOpen}
        onAccept={handleAcceptConsent}
      />

      {/* Delete Account Double-Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleDeleteAccountConfirm}
      />
    </header>
  );
};
