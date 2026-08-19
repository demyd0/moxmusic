import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { auth } from '@/lib/firebase';
import { getUserProfile, getPublicUserProfile, updateAvatarUrl } from '@/services/userService';
import { subscribeUserCollections } from '@/services/collectionService';
import { getProfileCustomization, saveProfileCustomization } from '@/services/profileService';
import { getFollowerCount, getFollowingCount } from '@/services/followService';
import { subscribeFollowedArtists } from '@/services/artistFollowService';
import {
  backgroundToCss,
  isValidHexColor,
  isValidBackgroundImageUrl,
  BACKGROUND_EFFECTS,
  MEDIA_FITS,
  MEDIA_SIZES,
  mediaSizeMaxHeightRem,
} from '@/lib/profileValidation';
import { AVATAR_FRAMES, avatarFrameWrapperClassName } from '@/lib/avatarFrames';
import { NAME_EFFECTS, nameEffectClassName } from '@/lib/nameEffects';
import {
  getUnlockedFrames,
  getUnlockedBackgroundEffects,
  getUnlockedNameEffects,
  getNewlyUnlocked,
  markMilestonesSeen,
  type Milestone,
  type UserStats,
} from '@/lib/milestones';
import { MilestoneRevealModal } from '@/components/MilestoneRevealModal';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { isAeroThemeUnlocked } from '@/hooks/useTheme';
import { extractYoutubeVideoId } from '@/lib/youtubeEmbed';
import {
  DEFAULT_PROFILE_CUSTOMIZATION,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TITLE_STYLE,
  MAX_ALBUMS_PER_SHOWCASE,
  MAX_BIO_LENGTH,
  MAX_SHOWCASES,
  MAX_SHOWCASE_TEXT_LENGTH,
  DEFAULT_MEDIA_FIT,
  DEFAULT_MEDIA_SIZE,
  type ProfileCustomization,
  type ProfileBackgroundType,
  type ShowcaseType,
  type TextStyle,
  type BackgroundEffectType,
  type MediaFit,
  type MediaSize,
} from '@/types/profile';
import type { Album } from '@/types/album';
import { StyledTextField } from '@/components/StyledTextField';
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Palette,
  Blend,
  Image as ImageIcon,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Check,
  UserCircle2,
  Type as TypeIcon,
  LayoutGrid,
  Rows3,
  Lock,
  Music,
} from 'lucide-react';

const BG_TYPES: { type: ProfileBackgroundType; label: string; icon: React.ReactNode }[] = [
  { type: 'color', label: 'COLOR', icon: <Palette className="h-3.5 w-3.5" /> },
  { type: 'gradient', label: 'GRADIENT', icon: <Blend className="h-3.5 w-3.5" /> },
  { type: 'image', label: 'IMAGE / GIF', icon: <ImageIcon className="h-3.5 w-3.5" /> },
];

const SHOWCASE_TYPES: { type: ShowcaseType; label: string; icon: React.ReactNode }[] = [
  { type: 'albums', label: 'ALBUMS', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { type: 'text', label: 'TEXT', icon: <TypeIcon className="h-3.5 w-3.5" /> },
  { type: 'mixed', label: 'MIXED', icon: <Rows3 className="h-3.5 w-3.5" /> },
  { type: 'media', label: 'IMAGE / GIF', icon: <ImageIcon className="h-3.5 w-3.5" /> },
];

export const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [likedAlbums, setLikedAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [customization, setCustomization] = useState<ProfileCustomization>(DEFAULT_PROFILE_CUSTOMIZATION);
  const [gradientA, setGradientA] = useState('#fafafa');
  const [gradientB, setGradientB] = useState('#000000');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [imageUrlError, setImageUrlError] = useState(false);

  const [avatarUrlDraft, setAvatarUrlDraft] = useState('');
  const [avatarUrlError, setAvatarUrlError] = useState(false);

  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState('');
  const [youtubeUrlError, setYoutubeUrlError] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  const [totalLikedCount, setTotalLikedCount] = useState(0);
  const [toListenCount, setToListenCount] = useState(0);
  const [likedCollectionsReady, setLikedCollectionsReady] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [followedArtistsCount, setFollowedArtistsCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Milestone[]>([]);
  const hasCheckedMilestonesRef = useRef(false);

  useEffect(() => {
    let unsubCollections: (() => void) | undefined;
    let unsubArtists: (() => void) | undefined;

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (!user || user.isAnonymous) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setIsAuthenticated(true);
      setUserId(user.uid);

      const profile = await getUserProfile(user.uid);
      setUsername(profile?.username || '');
      setAvatarUrlDraft(profile?.photoURL || '');

      const custom = await getProfileCustomization(user.uid);
      setCustomization(custom);
      if (custom.background.type === 'gradient') {
        const [a, b, angle] = custom.background.value.split('|');
        if (a) setGradientA(a);
        if (b) setGradientB(b);
        if (angle) setGradientAngle(Number(angle) || 135);
      } else if (custom.background.type === 'image') {
        setImageUrlDraft(custom.background.value);
      }
      if (custom.profileTrack?.type === 'youtube') {
        setYoutubeUrlDraft(`https://www.youtube.com/watch?v=${custom.profileTrack.value}`);
      }

      unsubCollections = subscribeUserCollections(user.uid, (state) => {
        setLikedAlbums(state.likedAlbums.filter((a) => a.kind !== 'track'));
        setTotalLikedCount(state.likedAlbums.length);
        setToListenCount(state.toListenAlbums.length);
        setLikedCollectionsReady(true);
      });

      unsubArtists = subscribeFollowedArtists(user.uid, (artists) => setFollowedArtistsCount(artists.length));

      const [followers, following, publicProfile] = await Promise.all([
        getFollowerCount(user.uid),
        getFollowingCount(user.uid),
        getPublicUserProfile(user.uid),
      ]);
      setFollowerCount(followers);
      setFollowingCount(following);
      setViewCount(publicProfile?.viewCount || 0);

      setIsLoading(false);
    });

    return () => {
      if (unsubCollections) unsubCollections();
      if (unsubArtists) unsubArtists();
      unsubAuth();
    };
  }, []);

  const stats: UserStats = {
    likedCount: totalLikedCount,
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
    showcaseCount: customization.showcases.length,
    bioLength: customization.bio.length,
    followedArtistsCount,
    toListenCount,
    viewCount,
    aeroThemeFound: isAeroThemeUnlocked() ? 1 : 0,
  };

  // Check for newly-earned milestones once we actually have real stats -
  // fires once per page visit so it can't spam the reveal modal.
  useEffect(() => {
    if (!userId || !likedCollectionsReady || followerCount === null || followingCount === null) return;
    if (hasCheckedMilestonesRef.current) return;
    hasCheckedMilestonesRef.current = true;
    setNewlyUnlocked(
      getNewlyUnlocked(
        {
          likedCount: totalLikedCount,
          followerCount,
          followingCount,
          showcaseCount: customization.showcases.length,
          bioLength: customization.bio.length,
          followedArtistsCount,
          toListenCount,
          viewCount,
          aeroThemeFound: isAeroThemeUnlocked() ? 1 : 0,
        },
        userId
      )
    );
  }, [
    userId,
    likedCollectionsReady,
    followerCount,
    followingCount,
    totalLikedCount,
    customization.showcases.length,
    customization.bio.length,
    followedArtistsCount,
    toListenCount,
    viewCount,
  ]);

  const dismissMilestoneReveal = () => {
    if (userId) markMilestonesSeen(userId, newlyUnlocked.map((m) => m.id));
    setNewlyUnlocked([]);
  };

  const unlockedFrames = getUnlockedFrames(stats);
  const unlockedBackgroundEffects = getUnlockedBackgroundEffects(stats);
  const unlockedNameEffects = getUnlockedNameEffects(stats);

  const setBackgroundType = (type: ProfileBackgroundType) => {
    if (type === 'color') {
      setCustomization((c) => ({ ...c, background: { ...c.background, type, value: isValidHexColor(c.background.value) ? c.background.value : '#fafafa' } }));
    } else if (type === 'gradient') {
      setCustomization((c) => ({ ...c, background: { ...c.background, type, value: `${gradientA}|${gradientB}|${gradientAngle}` } }));
    } else {
      setCustomization((c) => ({ ...c, background: { ...c.background, type, value: imageUrlDraft } }));
    }
  };

  const applyGradient = (a: string, b: string, angle: number) => {
    setGradientA(a);
    setGradientB(b);
    setGradientAngle(angle);
    setCustomization((c) => ({ ...c, background: { ...c.background, type: 'gradient', value: `${a}|${b}|${angle}` } }));
  };

  const applyImageUrl = (url: string) => {
    setImageUrlDraft(url);
    const valid = url.trim() === '' || isValidBackgroundImageUrl(url);
    setImageUrlError(!valid);
    if (valid && url.trim()) {
      setCustomization((c) => ({ ...c, background: { ...c.background, type: 'image', value: url.trim() } }));
    }
  };

  const setBackgroundEffect = (effect: BackgroundEffectType) => {
    setCustomization((c) => ({ ...c, background: { ...c.background, effect } }));
  };

  const applyAvatarUrl = (url: string) => {
    setAvatarUrlDraft(url);
    setAvatarUrlError(url.trim() !== '' && !isValidBackgroundImageUrl(url));
  };

  const applyYoutubeTrackUrl = (url: string) => {
    setYoutubeUrlDraft(url);
    setTrackError(null);
    if (!url.trim()) {
      setYoutubeUrlError(false);
      setCustomization((c) => ({ ...c, profileTrack: null }));
      return;
    }
    const videoId = extractYoutubeVideoId(url);
    setYoutubeUrlError(!videoId);
    if (videoId) {
      setCustomization((c) => ({ ...c, profileTrack: { type: 'youtube', value: videoId } }));
    }
  };

  const clearProfileTrackField = () => {
    setCustomization((c) => ({ ...c, profileTrack: null }));
    setYoutubeUrlDraft('');
    setYoutubeUrlError(false);
    setTrackError(null);
  };

  const addShowcase = (type: ShowcaseType) => {
    if (customization.showcases.length >= MAX_SHOWCASES) return;
    setCustomization((c) => ({
      ...c,
      showcases: [...c.showcases, { id: `showcase-${Date.now()}`, title: 'MY FAVORITES', type, albumIds: [], text: '', textStyle: DEFAULT_TEXT_STYLE, titleStyle: DEFAULT_TITLE_STYLE }],
    }));
  };

  const setShowcaseText = (id: string, text: string) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, text: text.slice(0, MAX_SHOWCASE_TEXT_LENGTH) } : s)),
    }));
  };

  const setShowcaseTextStyle = (id: string, textStyle: TextStyle) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, textStyle } : s)),
    }));
  };

  const setShowcaseTitleStyle = (id: string, titleStyle: TextStyle) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, titleStyle } : s)),
    }));
  };

  const setShowcaseImageUrl = (id: string, imageUrl: string) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, imageUrl } : s)),
    }));
  };

  const setShowcaseMediaFit = (id: string, mediaFit: MediaFit) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, mediaFit } : s)),
    }));
  };

  const setShowcaseMediaSize = (id: string, mediaSize: MediaSize) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, mediaSize } : s)),
    }));
  };

  const removeShowcase = (id: string) => {
    setCustomization((c) => ({ ...c, showcases: c.showcases.filter((s) => s.id !== id) }));
  };

  const renameShowcase = (id: string, title: string) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => (s.id === id ? { ...s, title } : s)),
    }));
  };

  const moveShowcase = (index: number, dir: -1 | 1) => {
    setCustomization((c) => {
      const next = [...c.showcases];
      const target = index + dir;
      if (target < 0 || target >= next.length) return c;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...c, showcases: next };
    });
  };

  const toggleAlbumInShowcase = (showcaseId: string, albumId: string) => {
    setCustomization((c) => ({
      ...c,
      showcases: c.showcases.map((s) => {
        if (s.id !== showcaseId) return s;
        const has = s.albumIds.includes(albumId);
        if (has) return { ...s, albumIds: s.albumIds.filter((id) => id !== albumId) };
        if (s.albumIds.length >= MAX_ALBUMS_PER_SHOWCASE) return s;
        return { ...s, albumIds: [...s.albumIds, albumId] };
      }),
    }));
  };

  const handleSave = async () => {
    if (!userId || avatarUrlError) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        saveProfileCustomization(userId, customization),
        updateAvatarUrl(userId, avatarUrlDraft.trim()),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const previewStyle = backgroundToCss(customization.background);

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
        <Header />
        <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-black" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
        <Header />
        <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">
          <div className="border-2 border-black bg-white p-8 text-center hard-shadow">
            <h1 className="font-header text-2xl font-extrabold uppercase text-black mb-2">SIGN IN REQUIRED</h1>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
              YOU NEED AN ACCOUNT TO CUSTOMIZE A PROFILE
            </p>
            <button
              onClick={() => navigate('/')}
              className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
            >
              GO HOME
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      <MilestoneRevealModal milestones={newlyUnlocked} onDone={dismissMilestoneReveal} />
      <div>
        <Header />

        <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>BACK</span>
          </button>

          <div className="border-2 border-black bg-white p-6 hard-shadow mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                MAKE IT YOURS
              </div>
              <h1 className="font-header text-3xl sm:text-4xl font-extrabold uppercase text-black">
                CUSTOMIZE PROFILE
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 border-2 border-black bg-black px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all hard-shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saved ? 'SAVED!' : 'SAVE PROFILE'}</span>
            </button>
          </div>

          {/* Achievements: full-width and immediately visible (no cramped
              sidebar, no nested scroll region) so it doesn't eat into the
              room the editor/preview columns below get. */}
          <div className="mb-6">
            <AchievementsPanel stats={stats} />
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Left: editor controls */}
            <div className="space-y-6">
              {/* Avatar */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">AVATAR</h2>
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 ${avatarFrameWrapperClassName(customization.avatarFrame)}`}>
                    <div className="flex h-28 w-28 items-center justify-center border-2 border-black bg-neutral-100 overflow-hidden">
                      {avatarUrlDraft.trim() && !avatarUrlError ? (
                        <img
                          src={avatarUrlDraft}
                          alt="Avatar preview"
                          className="h-full w-full object-cover"
                          onError={() => setAvatarUrlError(true)}
                        />
                      ) : (
                        <UserCircle2 className="h-8 w-8 text-neutral-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={avatarUrlDraft}
                      onChange={(e) => applyAvatarUrl(e.target.value)}
                      placeholder="HTTPS://... (LEAVE EMPTY FOR NO AVATAR)"
                      className={`w-full border-2 bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:outline-none ${
                        avatarUrlError ? 'border-red-600' : 'border-black focus:bg-neutral-50'
                      }`}
                    />
                    {avatarUrlError && (
                      <p className="mt-1.5 font-mono text-[11px] text-red-600 uppercase tracking-wider">
                        MUST BE A LINK STARTING WITH HTTPS://
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t-2 border-black/10">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
                    AVATAR FRAME — EARNED BY ACTIVITY MILESTONES
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_FRAMES.map((f) => {
                      const isUnlocked = unlockedFrames.includes(f.value);
                      const isSelected = (customization.avatarFrame || 'none') === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => setCustomization((c) => ({ ...c, avatarFrame: f.value }))}
                          title={isUnlocked ? f.label : 'LOCKED — SEE ACHIEVEMENTS ABOVE'}
                          className={`inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                            isSelected
                              ? 'bg-black text-white'
                              : isUnlocked
                                ? 'bg-white text-black hover:bg-neutral-100'
                                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          }`}
                        >
                          {!isUnlocked && <Lock className="h-3 w-3" />}
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Username Style */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">USERNAME STYLE</h2>
                <div
                  className={`mb-4 border-2 border-black bg-neutral-50 px-4 py-3 font-header text-2xl font-extrabold uppercase tracking-tight text-black truncate ${nameEffectClassName(customization.nameEffect)}`}
                  style={{ ['--name-accent' as string]: isValidHexColor(customization.accentColor) ? customization.accentColor : '#000000' }}
                >
                  @{username || 'YOU'}
                </div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
                  APPLIES TO YOUR PUBLIC PROFILE HANDLE — EARNED BY ACTIVITY MILESTONES
                </p>
                <div className="flex flex-wrap gap-2">
                  {NAME_EFFECTS.map((eff) => {
                    const isUnlocked = unlockedNameEffects.includes(eff.value);
                    const isSelected = (customization.nameEffect || 'none') === eff.value;
                    return (
                      <button
                        key={eff.value}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => setCustomization((c) => ({ ...c, nameEffect: eff.value }))}
                        title={isUnlocked ? eff.label : 'LOCKED — SEE ACHIEVEMENTS ABOVE'}
                        className={`inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                          isSelected
                            ? 'bg-black text-white'
                            : isUnlocked
                              ? 'bg-white text-black hover:bg-neutral-100'
                              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        {!isUnlocked && <Lock className="h-3 w-3" />}
                        <span>{eff.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Background */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">BACKGROUND</h2>

                <div className="flex items-center border-2 border-black hard-shadow-sm mb-4 w-fit">
                  {BG_TYPES.map((bt) => (
                    <button
                      key={bt.type}
                      type="button"
                      onClick={() => setBackgroundType(bt.type)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                        customization.background.type === bt.type
                          ? 'bg-black text-white'
                          : 'bg-white text-black hover:bg-neutral-100'
                      } ${bt.type !== 'color' ? 'border-l-2 border-black' : ''}`}
                    >
                      {bt.icon}
                      <span>{bt.label}</span>
                    </button>
                  ))}
                </div>

                {customization.background.type === 'color' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={isValidHexColor(customization.background.value) ? customization.background.value : '#fafafa'}
                      onChange={(e) => setCustomization((c) => ({ ...c, background: { ...c.background, type: 'color', value: e.target.value } }))}
                      className="h-11 w-16 border-2 border-black cursor-pointer"
                    />
                    <span className="font-mono text-xs text-neutral-600 uppercase">{customization.background.value}</span>
                  </div>
                )}

                {customization.background.type === 'gradient' && (
                  <div className="flex flex-wrap items-center gap-4">
                    <input type="color" value={gradientA} onChange={(e) => applyGradient(e.target.value, gradientB, gradientAngle)} className="h-11 w-16 border-2 border-black cursor-pointer" />
                    <input type="color" value={gradientB} onChange={(e) => applyGradient(gradientA, e.target.value, gradientAngle)} className="h-11 w-16 border-2 border-black cursor-pointer" />
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500 uppercase">ANGLE</span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={gradientAngle}
                        onChange={(e) => applyGradient(gradientA, gradientB, Number(e.target.value))}
                        className="w-32"
                      />
                      <span className="font-mono text-xs text-black">{gradientAngle}°</span>
                    </div>
                  </div>
                )}

                {customization.background.type === 'image' && (
                  <div>
                    <input
                      type="text"
                      value={imageUrlDraft}
                      onChange={(e) => applyImageUrl(e.target.value)}
                      placeholder="HTTPS://... (JPG, PNG, OR GIF LINK)"
                      className={`w-full border-2 bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:outline-none ${
                        imageUrlError ? 'border-red-600' : 'border-black focus:bg-neutral-50'
                      }`}
                    />
                    {imageUrlError && (
                      <p className="mt-1.5 font-mono text-[11px] text-red-600 uppercase tracking-wider">
                        MUST BE A LINK STARTING WITH HTTPS://
                      </p>
                    )}
                    <p className="mt-1.5 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                      PASTE A LINK FROM IMGUR, GIPHY, TENOR, OR ANYWHERE ELSE THAT HOSTS IMAGES
                    </p>
                  </div>
                )}

                <div className="mt-5 pt-5 border-t-2 border-black/10">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
                    PARTICLE EFFECT
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BACKGROUND_EFFECTS.map((eff) => {
                      const isUnlocked = unlockedBackgroundEffects.includes(eff.value);
                      const isSelected = (customization.background.effect || 'none') === eff.value;
                      return (
                        <button
                          key={eff.value}
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => setBackgroundEffect(eff.value)}
                          title={isUnlocked ? eff.label : 'LOCKED — EARNED VIA ACHIEVEMENTS BELOW'}
                          className={`inline-flex items-center gap-1.5 border-2 border-black px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                            isSelected
                              ? 'bg-black text-white'
                              : isUnlocked
                                ? 'bg-white text-black hover:bg-neutral-100'
                                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          }`}
                        >
                          {!isUnlocked && <Lock className="h-3 w-3" />}
                          <span>{eff.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Profile Track */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">PROFILE TRACK</h2>
                <p className="font-mono text-[11px] text-neutral-500 uppercase tracking-wider mb-4">
                  PLAYS A SONG ON YOUR PUBLIC PROFILE — PASTE A YOUTUBE LINK.
                  {/* File upload needs Firebase Storage, which needs the paid Blaze
                      plan (Google requires a refundable prepayment just to activate
                      it) - parked for now, YouTube-link is the free path. */}
                </p>

                <div>
                  <input
                    type="text"
                    value={youtubeUrlDraft}
                    onChange={(e) => applyYoutubeTrackUrl(e.target.value)}
                    placeholder="HTTPS://YOUTUBE.COM/WATCH?V=... OR MUSIC.YOUTUBE.COM LINK"
                    className={`w-full border-2 bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:outline-none ${
                      youtubeUrlError ? 'border-red-600' : 'border-black focus:bg-neutral-50'
                    }`}
                  />
                  {youtubeUrlError && (
                    <p className="mt-1.5 font-mono text-[11px] text-red-600 uppercase tracking-wider">
                      DOESN'T LOOK LIKE A VALID YOUTUBE LINK
                    </p>
                  )}
                </div>

                {trackError && (
                  <p className="mt-1.5 font-mono text-[11px] text-red-600 uppercase tracking-wider">{trackError}</p>
                )}

                {customization.profileTrack && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-2 border-black bg-neutral-50 px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black truncate">
                      <Music className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {customization.profileTrack.type === 'youtube'
                          ? 'YOUTUBE TRACK SET'
                          : customization.profileTrack.title || 'UPLOADED TRACK SET'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={clearProfileTrackField}
                      title="Remove profile track"
                      className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </section>

              {/* Accent color */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">ACCENT COLOR</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={isValidHexColor(customization.accentColor) ? customization.accentColor : '#000000'}
                    onChange={(e) => setCustomization((c) => ({ ...c, accentColor: e.target.value }))}
                    className="h-11 w-16 border-2 border-black cursor-pointer"
                  />
                  <span className="font-mono text-xs text-neutral-600 uppercase">{customization.accentColor}</span>
                </div>
              </section>

              {/* Bio */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-header text-lg font-extrabold uppercase text-black">BIO</h2>
                  <span className="font-mono text-[11px] text-neutral-400">
                    {customization.bio.length}/{MAX_BIO_LENGTH}
                  </span>
                </div>
                <StyledTextField
                  value={customization.bio}
                  onChange={(bio) => setCustomization((c) => ({ ...c, bio }))}
                  style={customization.bioStyle}
                  onStyleChange={(bioStyle) => setCustomization((c) => ({ ...c, bioStyle }))}
                  accentColor={customization.accentColor}
                  placeholder="SAY SOMETHING ABOUT YOUR TASTE..."
                  rows={3}
                  maxLength={MAX_BIO_LENGTH}
                />
              </section>

              {/* Showcases */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-header text-lg font-extrabold uppercase text-black">SHOWCASES</h2>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {customization.showcases.length}/{MAX_SHOWCASES}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {SHOWCASE_TYPES.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addShowcase(type)}
                        disabled={customization.showcases.length >= MAX_SHOWCASES}
                        className="flex flex-1 items-center justify-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {customization.showcases.length === 0 ? (
                  <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider py-6 text-center">
                    NO SHOWCASES YET — PIN ALBUMS OR WRITE A BLURB, LIKE A STEAM SHOWCASE.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {customization.showcases.map((showcase, index) => (
                      <div key={showcase.id} className="border-2 border-black p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="flex-1">
                            <StyledTextField
                              value={showcase.title}
                              onChange={(title) => renameShowcase(showcase.id, title)}
                              style={showcase.titleStyle || DEFAULT_TITLE_STYLE}
                              onStyleChange={(titleStyle) => setShowcaseTitleStyle(showcase.id, titleStyle)}
                              accentColor={customization.accentColor}
                              placeholder="TITLE (OPTIONAL — LEAVE BLANK TO HIDE)"
                              multiline={false}
                              maxLength={40}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => moveShowcase(index, -1)}
                            disabled={index === 0}
                            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 disabled:opacity-30 transition-all"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveShowcase(index, 1)}
                            disabled={index === customization.showcases.length - 1}
                            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-neutral-100 disabled:opacity-30 transition-all"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeShowcase(showcase.id)}
                            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex gap-1.5 mb-3">
                          {SHOWCASE_TYPES.map(({ type, label, icon }) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setCustomization((c) => ({
                                ...c,
                                showcases: c.showcases.map((s) => (s.id === showcase.id ? { ...s, type } : s)),
                              }))}
                              className={`inline-flex items-center gap-1 border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                                (showcase.type || 'albums') === type
                                  ? 'border-black bg-black text-white'
                                  : 'border-black/20 text-neutral-400 hover:border-black/50 hover:text-black'
                              }`}
                            >
                              {icon}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>

                        {(showcase.type === 'text' || showcase.type === 'mixed') && (
                          <div className="mb-3">
                            <StyledTextField
                              value={showcase.text || ''}
                              onChange={(text) => setShowcaseText(showcase.id, text)}
                              style={showcase.textStyle || DEFAULT_TEXT_STYLE}
                              onStyleChange={(textStyle) => setShowcaseTextStyle(showcase.id, textStyle)}
                              accentColor={customization.accentColor}
                              placeholder="WRITE SOMETHING FOR THIS SHOWCASE..."
                              rows={3}
                              maxLength={MAX_SHOWCASE_TEXT_LENGTH}
                            />
                          </div>
                        )}

                        {showcase.type === 'media' && (
                          <div className="mb-3">
                            <input
                              type="text"
                              value={showcase.imageUrl || ''}
                              onChange={(e) => setShowcaseImageUrl(showcase.id, e.target.value)}
                              placeholder="HTTPS://... IMAGE OR GIF URL"
                              className={`w-full border-2 bg-white px-3 py-2 font-mono text-xs text-black placeholder-neutral-400 focus:outline-none ${
                                showcase.imageUrl && !isValidBackgroundImageUrl(showcase.imageUrl)
                                  ? 'border-red-600'
                                  : 'border-black focus:bg-neutral-50'
                              }`}
                            />
                            {showcase.imageUrl && !isValidBackgroundImageUrl(showcase.imageUrl) && (
                              <p className="mt-1 font-mono text-[10px] text-red-600 uppercase tracking-wider">
                                MUST BE AN HTTPS:// URL
                              </p>
                            )}

                            <div className="mt-2.5 flex flex-wrap gap-3">
                              <div>
                                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">FIT</p>
                                <div className="flex gap-1.5">
                                  {MEDIA_FITS.map((f) => (
                                    <button
                                      key={f.value}
                                      type="button"
                                      onClick={() => setShowcaseMediaFit(showcase.id, f.value)}
                                      className={`border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        (showcase.mediaFit || DEFAULT_MEDIA_FIT) === f.value
                                          ? 'border-black bg-black text-white'
                                          : 'border-black/20 text-neutral-400 hover:border-black/50 hover:text-black'
                                      }`}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">SIZE</p>
                                <div className="flex gap-1.5">
                                  {MEDIA_SIZES.map((sz) => (
                                    <button
                                      key={sz.value}
                                      type="button"
                                      onClick={() => setShowcaseMediaSize(showcase.id, sz.value)}
                                      className={`border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        (showcase.mediaSize || DEFAULT_MEDIA_SIZE) === sz.value
                                          ? 'border-black bg-black text-white'
                                          : 'border-black/20 text-neutral-400 hover:border-black/50 hover:text-black'
                                      }`}
                                    >
                                      {sz.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {showcase.imageUrl && isValidBackgroundImageUrl(showcase.imageUrl) && (
                              <div
                                className="mt-2.5 overflow-hidden border-2 border-black bg-neutral-100"
                                style={{ maxHeight: `${mediaSizeMaxHeightRem(showcase.mediaSize)}rem` }}
                              >
                                <img
                                  src={showcase.imageUrl}
                                  alt=""
                                  className="w-full"
                                  style={{
                                    objectFit: (showcase.mediaFit || DEFAULT_MEDIA_FIT) === 'contain' ? 'contain' : 'cover',
                                    maxHeight: `${mediaSizeMaxHeightRem(showcase.mediaSize)}rem`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {(showcase.type || 'albums') === 'albums' || showcase.type === 'mixed' ? (
                          <>
                            <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mb-2">
                              {showcase.albumIds.length}/{MAX_ALBUMS_PER_SHOWCASE} ALBUMS — CLICK TO ADD/REMOVE FROM YOUR LIKED ALBUMS
                            </p>

                            {likedAlbums.length === 0 ? (
                              <p className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                                LIKE SOME ALBUMS FIRST TO PIN THEM HERE.
                              </p>
                            ) : (
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto">
                                {likedAlbums.map((album) => {
                                  const isPicked = showcase.albumIds.includes(album.id);
                                  return (
                                    <button
                                      key={album.id}
                                      type="button"
                                      onClick={() => toggleAlbumInShowcase(showcase.id, album.id)}
                                      title={`${album.title} — ${album.artist}`}
                                      className={`relative aspect-square border-2 overflow-hidden transition-all ${
                                        isPicked ? 'border-black' : 'border-black/20 opacity-60 hover:opacity-100'
                                      }`}
                                    >
                                      {album.coverUrl ? (
                                        <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full bg-neutral-100" />
                                      )}
                                      {isPicked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                          <Check className="h-4 w-4 text-white" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right: live preview */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="border-2 border-black bg-white p-4 hard-shadow">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-3">LIVE PREVIEW</p>
                <div
                  className="border-2 border-black p-5 min-h-[280px] flex flex-col justify-end"
                  style={previewStyle}
                >
                  <div
                    className="border-2 bg-white/95 backdrop-blur-sm p-3.5"
                    style={{ borderColor: isValidHexColor(customization.accentColor) ? customization.accentColor : '#000' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-neutral-100 overflow-hidden">
                        {avatarUrlDraft.trim() && !avatarUrlError ? (
                          <img src={avatarUrlDraft} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UserCircle2 className="h-5 w-5 text-neutral-400" />
                        )}
                      </div>
                      <div
                        className={`font-header text-lg font-extrabold uppercase text-black truncate ${nameEffectClassName(customization.nameEffect)}`}
                        style={{ ['--name-accent' as string]: isValidHexColor(customization.accentColor) ? customization.accentColor : '#000000' }}
                      >
                        @{username || 'YOU'}
                      </div>
                    </div>
                    {customization.bio && (
                      <p className="mt-1 font-mono text-[11px] text-neutral-700 line-clamp-3 whitespace-pre-wrap">
                        {customization.bio}
                      </p>
                    )}
                    {customization.showcases.length > 0 && (
                      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: customization.accentColor }}>
                        {customization.showcases.length} SHOWCASE{customization.showcases.length === 1 ? '' : 'S'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};
