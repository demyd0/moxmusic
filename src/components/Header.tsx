import React, { useState, useEffect, useRef } from 'react';
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
import { WinampUnlockOverlay } from '@/components/WinampUnlockOverlay';
import { useTheme, isWinampThemeUnlocked, unlockWinampTheme } from '@/hooks/useTheme';
import { useChat } from '@/contexts/ChatContext';
import { useAudioEngine } from '@/contexts/AudioEngineContext';
import { subscribeNotifications, markAllNotificationsRead, type NotificationEvent } from '@/services/notificationService';
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
  Moon,
  Upload,
  Palette,
  Radio,
  MessageCircle,
  Users,
  Volume2,
  Volume1,
  VolumeX,
  Mic2,
  Bell,
  UserPlus,
  Sparkles
} from 'lucide-react';

const LOGO_UNLOCK_CLICKS = 5;
const LOGO_UNLOCK_WINDOW_MS = 1500;

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
  const { openList, unreadCount } = useChat();
  const { volume, setVolume } = useAudioEngine();
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [winampUnlocked, setWinampUnlocked] = useState(() => isWinampThemeUnlocked());
  const [showWinampUnlockOverlay, setShowWinampUnlockOverlay] = useState(false);
  const logoClickCountRef = useRef(0);
  const logoClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const toggleNotifPanel = () => {
    setIsNotifOpen((open) => {
      const next = !open;
      if (next && currentUser && unreadNotifCount > 0) {
        void markAllNotificationsRead(currentUser.uid);
      }
      return next;
    });
  };

  function formatRelativeTime(ms: number): string {
    const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (diffSec < 60) return 'JUST NOW';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}M AGO`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}H AGO`;
    const diffDay = Math.round(diffHr / 24);
    return `${diffDay}D AGO`;
  }

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

    // Secret unlock: 5 clicks on the logo within a short window reveals
    // the hidden Winamp theme (see useTheme.ts). Doesn't interfere with
    // the normal single-click "go home" behavior above.
    logoClickCountRef.current += 1;
    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
    logoClickTimerRef.current = setTimeout(() => {
      logoClickCountRef.current = 0;
    }, LOGO_UNLOCK_WINDOW_MS);

    if (logoClickCountRef.current >= LOGO_UNLOCK_CLICKS) {
      logoClickCountRef.current = 0;
      if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
      unlockWinampTheme();
      setWinampUnlocked(true);
      setTheme('winamp');
      setShowWinampUnlockOverlay(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-black bg-white">
      {showWinampUnlockOverlay && (
        <WinampUnlockOverlay onDone={() => setShowWinampUnlockOverlay(false)} />
      )}
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

        {/* Decorative status LEDs - pure Winamp-skin flavor, only shown in
            that theme so the header has the same small-detail density as
            the rest of the skin (recommendations panel's icon badge etc). */}
        {theme === 'winamp' && (
          <div className="hidden sm:flex items-center gap-1.5 ml-3 shrink-0" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#4dff4d', boxShadow: '0 0 4px #4dff4d' }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#ffb300', boxShadow: '0 0 4px #ffb300' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
          </div>
        )}

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

          <button
            type="button"
            onClick={() => navigate('/import')}
            className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 border-l-2 border-black bg-white text-black hover:bg-neutral-100 transition-all"
            title="Import your library"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">IMPORT</span>
          </button>
        </nav>

        {/* Right User Profile Dropdown Pill */}
        <div className="flex items-center gap-2 relative shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsVolumeOpen((v) => !v)}
              title="Site volume"
              className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 transition-all hard-shadow"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            {isVolumeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsVolumeOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 border-2 border-black bg-white p-3 hard-shadow-lg z-50">
                  <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    SITE VOLUME
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(volume * 100)}
                      onChange={(e) => setVolume(Number(e.target.value) / 100)}
                      className="w-full accent-black"
                    />
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] font-bold text-black">
                      {Math.round(volume * 100)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          {currentUser && (
            <div className="relative">
              <button
                type="button"
                onClick={toggleNotifPanel}
                title="Activity"
                className="relative flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 transition-all hard-shadow"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center border border-black bg-red-600 px-0.5 font-mono text-[9px] font-bold text-white">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto border-2 border-black bg-white hard-shadow-lg z-50">
                    <div className="sticky top-0 border-b-2 border-black bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-black">
                      ACTIVITY
                    </div>
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                        NOTHING YET.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setIsNotifOpen(false);
                            navigate(`/profile/${n.fromUsername}`);
                          }}
                          className={`flex w-full items-center gap-2.5 border-b border-black/10 px-3 py-2.5 text-left transition-all hover:bg-neutral-50 ${
                            n.read ? '' : 'bg-neutral-50'
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-black text-white overflow-hidden">
                            {n.fromPhotoURL ? (
                              <img src={n.fromPhotoURL} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[11px] text-black">
                              <strong>@{n.fromUsername}</strong> STARTED FOLLOWING YOU
                            </span>
                            <span className="block font-mono text-[10px] text-neutral-400">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </span>
                          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {currentUser && (
            <button
              type="button"
              onClick={() => openList()}
              title="Messages"
              className="relative flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 transition-all hard-shadow"
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center border border-black bg-red-600 px-0.5 font-mono text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
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
                      {winampUnlocked && (
                        <button
                          type="button"
                          onClick={() => setTheme('winamp')}
                          title="A hidden theme you found - nice."
                          className={`flex-1 min-h-[36px] flex items-center justify-center gap-1.5 py-2 border-l border-black font-bold uppercase transition-all ${
                            theme === 'winamp' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                          }`}
                        >
                          <Radio className="h-3.5 w-3.5" />
                          <span>WINAMP</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate(`/profile/${userProfile?.username || ''}`);
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>MY PROFILE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/people');
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Users className="h-4 w-4" />
                    <span>FIND PEOPLE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/artists/following');
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Mic2 className="h-4 w-4" />
                    <span>FOLLOWED ARTISTS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/recap');
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>YOUR RECAP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/profile/edit');
                    }}
                    className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 text-left font-bold uppercase text-black border border-black bg-white hover:bg-black hover:text-white transition-all mb-2 hard-shadow-sm"
                  >
                    <Palette className="h-4 w-4" />
                    <span>CUSTOMIZE PROFILE</span>
                  </button>

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
                    <Upload className="h-4 w-4" />
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
