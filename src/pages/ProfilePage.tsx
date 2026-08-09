import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CollectionAlbumCard } from '@/components/CollectionAlbumCard';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { FollowListModal } from '@/components/FollowListModal';
import { BackgroundEffectCanvas } from '@/components/BackgroundEffectCanvas';
import { fetchSharedLikedCollection } from '@/services/collectionService';
import { getPublicUserProfile, resolveUsernameToUid } from '@/services/userService';
import { getProfileCustomization } from '@/services/profileService';
import {
  isFollowing,
  followUser,
  unfollowUser,
  getFollowerCount,
  getFollowingCount,
  getFollowers,
  getFollowing,
  type FollowUser
} from '@/services/followService';
import { backgroundToCss, isValidHexColor, textStyleToCss } from '@/lib/profileValidation';
import { computeTopGenres } from '@/lib/genreBadges';
import { sortAlbums } from '@/lib/collectionSort';
import { auth, signInWithGoogle } from '@/lib/firebase';
import { DEFAULT_PROFILE_CUSTOMIZATION, DEFAULT_TEXT_STYLE, type ProfileCustomization } from '@/types/profile';
import type { Album } from '@/types/album';
import { Heart, Disc3, Loader2, ArrowLeft, UserX, Settings, UserPlus, UserCheck, Music } from 'lucide-react';

/**
 * The full customizable profile: background, accent color, bio, follow
 * graph, showcases. Deliberately a separate route/page from
 * /share/:username, which stays a lightweight "here's my liked albums"
 * link - the two are different intents even though they read a lot of the
 * same data.
 */
export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [profile, setProfile] = useState<{ username: string; photoURL?: string } | null>(null);
  const [customization, setCustomization] = useState<ProfileCustomization>(DEFAULT_PROFILE_CUSTOMIZATION);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resolvedUid, setResolvedUid] = useState('');
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

  // Follow state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [amFollowing, setAmFollowing] = useState(false);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [listModal, setListModal] = useState<'followers' | 'following' | null>(null);
  const [listUsers, setListUsers] = useState<FollowUser[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);

  const isOwnProfile = Boolean(currentUserUid && resolvedUid && currentUserUid === resolvedUid);

  // Track the viewer's own auth state separately from the profile being
  // viewed, so "is this my profile" / "am I following them" stay correct
  // even if auth resolves after the profile data already loaded.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserUid(user && !user.isAnonymous ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setNotFound(false);
      try {
        // /profile/:username is the pretty URL, resolved through the same
        // usernames registry as /share/:username; falls back to treating
        // the param as a raw uid for old links.
        const resolvedUid = (await resolveUsernameToUid(username!)) || username!;
        const [userProfile, sharedAlbums, profileCustomization, followers, following] = await Promise.all([
          getPublicUserProfile(resolvedUid),
          fetchSharedLikedCollection(resolvedUid),
          getProfileCustomization(resolvedUid),
          getFollowerCount(resolvedUid),
          getFollowingCount(resolvedUid),
        ]);

        // The publicProfiles mirror only gets created/backfilled the next
        // time that account signs in (see ensurePublicProfile in Header.tsx),
        // so an old link can resolve a real uid with real liked albums but
        // no profile doc yet. Only treat it as a dead link if we found
        // neither a profile nor any data - a genuinely empty collection
        // still falls through to the normal "collection is empty" state.
        if (!userProfile && sharedAlbums.length === 0) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (isMounted) {
          setAlbums(sharedAlbums);
          setProfile(userProfile);
          setCustomization(profileCustomization);
          setResolvedUid(resolvedUid);
          setFollowerCount(followers);
          setFollowingCount(following);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  // Check follow status once we know both who's viewing and who's being viewed
  useEffect(() => {
    if (!currentUserUid || !resolvedUid || currentUserUid === resolvedUid) {
      setAmFollowing(false);
      return;
    }
    let isMounted = true;
    isFollowing(currentUserUid, resolvedUid).then((result) => {
      if (isMounted) setAmFollowing(result);
    });
    return () => {
      isMounted = false;
    };
  }, [currentUserUid, resolvedUid]);

  const handleToggleFollow = async () => {
    if (!currentUserUid) {
      setIsAuthPromptOpen(true);
      return;
    }
    if (!resolvedUid || isFollowActionLoading) return;

    setIsFollowActionLoading(true);
    try {
      if (amFollowing) {
        await unfollowUser(currentUserUid, resolvedUid);
        setAmFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(currentUserUid, resolvedUid);
        setAmFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    } finally {
      setIsFollowActionLoading(false);
    }
  };

  const openFollowList = async (kind: 'followers' | 'following') => {
    setListModal(kind);
    setIsListLoading(true);
    try {
      const users = kind === 'followers' ? await getFollowers(resolvedUid) : await getFollowing(resolvedUid);
      setListUsers(users);
    } finally {
      setIsListLoading(false);
    }
  };

  const displayHandle = profile?.username ? `@${profile.username.toUpperCase()}` : 'USER';
  const accent = isValidHexColor(customization.accentColor) ? customization.accentColor : '#000000';
  const albumsById = new Map(albums.map((a) => [a.id, a]));
  const topGenres = computeTopGenres(albums);
  const latestAlbum = sortAlbums(albums, 'dateAddedDesc')[0];

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-[#0a0a0a]">
      {/* Custom profile background layer - sits behind everything, page's
          own grid/spotlight background (body::before/::after) still shows
          through where this doesn't cover since it's just a color/image,
          not opaque chrome. */}
      {!notFound && !isLoading && (
        <>
          <div className="fixed inset-0 -z-[1] pointer-events-none" style={backgroundToCss(customization.background)} />
          <BackgroundEffectCanvas effect={customization.background.effect || 'none'} />
        </>
      )}

      <div>
        <Header />

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm hover:bg-neutral-100 transition-all mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>DISCOVER MUSIC</span>
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <Loader2 className="h-10 w-10 animate-spin text-black mb-3" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                LOADING PROFILE...
              </span>
            </div>
          ) : notFound ? (
            <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-20 text-center hard-shadow">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-black bg-neutral-100 text-black mb-4">
                <UserX className="h-7 w-7" />
              </div>
              <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">
                USER NOT FOUND
              </h4>
              <p className="max-w-md font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                NO PROFILE EXISTS AT @{(username || '').toUpperCase()}. CHECK THE LINK AND TRY AGAIN.
              </p>
              <button
                onClick={() => navigate('/')}
                className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
              >
                GO TO SEARCH
              </button>
            </div>
          ) : (
            <>
              {/* Profile Header Card */}
              <div
                className="border-2 bg-white/95 backdrop-blur-sm p-6 hard-shadow mb-8"
                style={{ borderColor: accent }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-28 w-28 shrink-0 items-center justify-center border-2 border-black text-white hard-shadow-sm overflow-hidden"
                      style={{ backgroundColor: accent }}
                    >
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt={displayHandle} className="h-full w-full object-cover" />
                      ) : (
                        <Heart className="h-11 w-11 fill-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h1 className="font-header text-3xl sm:text-4xl font-extrabold text-black uppercase tracking-tight truncate">
                        {displayHandle}
                      </h1>
                      {customization.bio ? (
                        <p
                          className="text-xs mt-1 whitespace-pre-wrap max-w-xl"
                          style={textStyleToCss(customization.bioStyle, accent)}
                        >
                          {customization.bio}
                        </p>
                      ) : (
                        <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                          PUBLIC PROFILE
                        </p>
                      )}

                      {topGenres.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {topGenres.map((genre) => (
                            <span
                              key={genre}
                              className="border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                              style={{ borderColor: accent, color: accent }}
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}

                      {latestAlbum && (
                        <button
                          type="button"
                          onClick={() => navigate(`/album/${latestAlbum.id}`)}
                          className="inline-flex items-center gap-1.5 mt-2 max-w-full font-mono text-[11px] text-neutral-500 hover:text-black transition-colors"
                        >
                          <Music className="h-3 w-3 shrink-0" />
                          <span className="uppercase tracking-wider shrink-0">RECENTLY LIKED:</span>
                          <span className="truncate text-black font-bold">
                            {latestAlbum.title} — {latestAlbum.artist}
                          </span>
                        </button>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => openFollowList('followers')}
                          className="font-mono text-xs text-black hover:underline"
                        >
                          <strong>{followerCount}</strong>{' '}
                          <span className="text-neutral-500 uppercase tracking-wider">FOLLOWERS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openFollowList('following')}
                          className="font-mono text-xs text-black hover:underline"
                        >
                          <strong>{followingCount}</strong>{' '}
                          <span className="text-neutral-500 uppercase tracking-wider">FOLLOWING</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwnProfile ? (
                      <button
                        onClick={() => navigate('/profile/edit')}
                        className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-all hard-shadow-sm"
                      >
                        <Settings className="h-4 w-4" />
                        <span>EDIT PROFILE</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleToggleFollow}
                        disabled={isFollowActionLoading}
                        className={`inline-flex items-center gap-1.5 border-2 border-black px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all hard-shadow-sm disabled:opacity-50 ${
                          amFollowing ? 'bg-white text-black hover:bg-red-600 hover:text-white hover:border-red-600 group' : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                      >
                        {isFollowActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : amFollowing ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        <span>{amFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
                      </button>
                    )}
                    <span className="border-2 border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hard-shadow-sm">
                      {albums.length} ALBUMS
                    </span>
                  </div>
                </div>
              </div>

              {/* Showcases */}
              {customization.showcases.map((showcase) => {
                const type = showcase.type || 'albums';
                const showcaseAlbums = showcase.albumIds
                  .map((id) => albumsById.get(id))
                  .filter((a): a is Album => Boolean(a));
                const hasText = type !== 'albums' && Boolean(showcase.text?.trim());
                const hasAlbums = type !== 'text' && showcaseAlbums.length > 0;
                if (!hasText && !hasAlbums) return null;

                return (
                  <section
                    key={showcase.id}
                    className="border-2 bg-white/95 backdrop-blur-sm p-5 hard-shadow mb-6"
                    style={{ borderColor: accent }}
                  >
                    <h3
                      className="font-header text-lg font-extrabold uppercase mb-4"
                      style={{ color: accent }}
                    >
                      {showcase.title}
                    </h3>
                    {hasText && (
                      <p
                        className={`text-sm whitespace-pre-wrap ${hasAlbums ? 'mb-4' : ''}`}
                        style={textStyleToCss(showcase.textStyle || DEFAULT_TEXT_STYLE, accent)}
                      >
                        {showcase.text}
                      </p>
                    )}
                    {hasAlbums && (
                      <div className="flex gap-4 overflow-x-auto pb-1">
                        {showcaseAlbums.map((album) => (
                          <div key={album.id} className="w-36 shrink-0">
                            <CollectionAlbumCard album={album} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Full Liked Grid */}
              <div className="border-b-2 border-black pb-3 mb-6">
                <h2 className="font-header text-xl font-extrabold uppercase text-black">ALL LIKED ALBUMS</h2>
              </div>

              {albums.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {albums.map((album) => (
                    <CollectionAlbumCard key={album.id} album={album} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border-2 border-black bg-white px-6 py-16 text-center hard-shadow">
                  <Disc3 className="h-10 w-10 text-black mb-3" />
                  <h4 className="font-header text-xl font-extrabold uppercase text-black mb-1">
                    NO LIKED ALBUMS YET
                  </h4>
                  <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-6">
                    NOTHING IN THIS PUBLIC PROFILE'S LIKED COLLECTION.
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white"
                  >
                    GO TO SEARCH
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Footer />

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        onSignIn={signInWithGoogle}
      />

      {listModal && (
        <FollowListModal
          title={listModal === 'followers' ? 'FOLLOWERS' : 'FOLLOWING'}
          users={listUsers}
          isLoading={isListLoading}
          onClose={() => setListModal(null)}
        />
      )}
    </div>
  );
};
