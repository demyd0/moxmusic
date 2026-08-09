import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { auth } from '@/lib/firebase';
import { getUserProfile, updateAvatarUrl } from '@/services/userService';
import { subscribeUserCollections } from '@/services/collectionService';
import { getProfileCustomization, saveProfileCustomization } from '@/services/profileService';
import { backgroundToCss, isValidHexColor, isValidBackgroundImageUrl } from '@/lib/profileValidation';
import {
  DEFAULT_PROFILE_CUSTOMIZATION,
  MAX_ALBUMS_PER_SHOWCASE,
  MAX_BIO_LENGTH,
  MAX_SHOWCASES,
  type ProfileCustomization,
  type ProfileBackgroundType,
} from '@/types/profile';
import type { Album } from '@/types/album';
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
} from 'lucide-react';

const BG_TYPES: { type: ProfileBackgroundType; label: string; icon: React.ReactNode }[] = [
  { type: 'color', label: 'COLOR', icon: <Palette className="h-3.5 w-3.5" /> },
  { type: 'gradient', label: 'GRADIENT', icon: <Blend className="h-3.5 w-3.5" /> },
  { type: 'image', label: 'IMAGE / GIF', icon: <ImageIcon className="h-3.5 w-3.5" /> },
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

  useEffect(() => {
    let unsubCollections: (() => void) | undefined;

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

      unsubCollections = subscribeUserCollections(user.uid, (state) => {
        setLikedAlbums(state.likedAlbums.filter((a) => a.kind !== 'track'));
      });

      setIsLoading(false);
    });

    return () => {
      if (unsubCollections) unsubCollections();
      unsubAuth();
    };
  }, []);

  const setBackgroundType = (type: ProfileBackgroundType) => {
    if (type === 'color') {
      setCustomization((c) => ({ ...c, background: { type, value: isValidHexColor(c.background.value) ? c.background.value : '#fafafa' } }));
    } else if (type === 'gradient') {
      setCustomization((c) => ({ ...c, background: { type, value: `${gradientA}|${gradientB}|${gradientAngle}` } }));
    } else {
      setCustomization((c) => ({ ...c, background: { type, value: imageUrlDraft } }));
    }
  };

  const applyGradient = (a: string, b: string, angle: number) => {
    setGradientA(a);
    setGradientB(b);
    setGradientAngle(angle);
    setCustomization((c) => ({ ...c, background: { type: 'gradient', value: `${a}|${b}|${angle}` } }));
  };

  const applyImageUrl = (url: string) => {
    setImageUrlDraft(url);
    const valid = url.trim() === '' || isValidBackgroundImageUrl(url);
    setImageUrlError(!valid);
    if (valid && url.trim()) {
      setCustomization((c) => ({ ...c, background: { type: 'image', value: url.trim() } }));
    }
  };

  const applyAvatarUrl = (url: string) => {
    setAvatarUrlDraft(url);
    setAvatarUrlError(url.trim() !== '' && !isValidBackgroundImageUrl(url));
  };

  const addShowcase = () => {
    if (customization.showcases.length >= MAX_SHOWCASES) return;
    setCustomization((c) => ({
      ...c,
      showcases: [...c.showcases, { id: `showcase-${Date.now()}`, title: 'MY FAVORITES', albumIds: [] }],
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

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Left: editor controls */}
            <div className="space-y-6">
              {/* Avatar */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <h2 className="font-header text-lg font-extrabold uppercase text-black mb-4">AVATAR</h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center border-2 border-black bg-neutral-100 overflow-hidden">
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
                      onChange={(e) => setCustomization((c) => ({ ...c, background: { type: 'color', value: e.target.value } }))}
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
                <textarea
                  value={customization.bio}
                  onChange={(e) => setCustomization((c) => ({ ...c, bio: e.target.value.slice(0, MAX_BIO_LENGTH) }))}
                  placeholder="SAY SOMETHING ABOUT YOUR TASTE..."
                  rows={3}
                  className="w-full border-2 border-black bg-white px-3.5 py-2.5 font-mono text-sm text-black placeholder-neutral-400 focus:bg-neutral-50 focus:outline-none resize-none"
                />
              </section>

              {/* Showcases */}
              <section className="border-2 border-black bg-white p-6 hard-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-header text-lg font-extrabold uppercase text-black">SHOWCASES</h2>
                  <button
                    type="button"
                    onClick={addShowcase}
                    disabled={customization.showcases.length >= MAX_SHOWCASES}
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>ADD SHOWCASE</span>
                  </button>
                </div>

                {customization.showcases.length === 0 ? (
                  <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider py-6 text-center">
                    NO SHOWCASES YET — PIN YOUR FAVORITE ALBUMS LIKE A STEAM SHOWCASE.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {customization.showcases.map((showcase, index) => (
                      <div key={showcase.id} className="border-2 border-black p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            value={showcase.title}
                            onChange={(e) => renameShowcase(showcase.id, e.target.value.slice(0, 40))}
                            className="flex-1 border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-bold uppercase text-black focus:outline-none focus:bg-neutral-50"
                          />
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
                      <div className="font-header text-lg font-extrabold uppercase text-black truncate">
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
