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
  type UserProfile 
} from '@/services/userService';
import { UsernameModal } from '@/components/UsernameModal';
import { GdprConsentModal } from '@/components/GdprConsentModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
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
  Check 
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
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setIsUsernameModalOpen(false);
          // Check if user has recorded first-time GDPR consent
          if (!profile.consentGiven) {
            setIsConsentModalOpen(true);
          } else {
            setIsConsentModalOpen(false);
          }
        } else {
          // Open Username modal to configure handle
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Minimalist Double MM Brand Logo */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none hover:opacity-80 transition-opacity" 
          onClick={handleLogoClick}
          title="Go to main page"
        >
          <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-black text-white hard-shadow-sm font-mono text-sm font-extrabold tracking-tighter">
            MM
          </div>
          <span className="font-header text-2xl font-extrabold tracking-tight text-black">
            mox music <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase ml-0.5">[v0.2]</span>
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

        {/* Right User Authentication & Settings Section */}
        <div className="flex items-center gap-3 relative">
          {currentUser ? (
            /* User Profile Pill with Dropdown Menu */
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 border-2 border-black bg-white p-1 pr-2 text-xs font-mono hard-shadow-sm hover:bg-neutral-50 transition-all select-none"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={userProfile?.username || 'User'}
                    className="h-7 w-7 border border-black object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center border border-black bg-black text-white">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <span className="hidden md:inline font-bold text-black max-w-[120px] truncate">
                  @{userProfile?.username || 'user'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-black ml-0.5" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 border-2 border-black bg-white p-2 hard-shadow z-50 font-mono text-xs animate-fadeIn">
                  <div className="border-b border-black/10 pb-2 mb-2 px-2">
                    <div className="font-bold text-black truncate">@{userProfile?.username || 'user'}</div>
                    <div className="text-[10px] text-neutral-500 truncate">{currentUser.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left font-bold uppercase text-black hover:bg-neutral-100 transition-all mb-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>EXPORT MY DATA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left font-bold uppercase text-red-600 hover:bg-red-50 transition-all mb-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>DELETE MY ACCOUNT</span>
                  </button>

                  <div className="border-t border-black/10 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left font-bold uppercase text-neutral-700 hover:bg-neutral-100 transition-all"
                    >
                      <LogOut className="h-3.5 w-3.5" />
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
              className="inline-flex items-center gap-2 border-2 border-black bg-black px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white hard-shadow-sm hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{isAuthLoading ? 'LOGGING IN...' : 'SIGN IN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {notificationToast && (
        <div className="bg-black text-white border-t-2 border-black px-6 py-2 font-mono text-xs font-bold flex items-center justify-between animate-fadeIn">
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
