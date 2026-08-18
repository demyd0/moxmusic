import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'winamp' | 'aero';

const STORAGE_KEY = 'moxmusic_theme';
const WINAMP_UNLOCK_KEY = 'moxmusic_winamp_unlocked';
const AERO_UNLOCK_KEY = 'moxmusic_aero_unlocked';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'winamp' || stored === 'aero') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('winamp', theme === 'winamp');
  root.classList.toggle('aero', theme === 'aero');
}

/** 'winamp' and 'aero' are hidden easter-egg themes - only offered in the
 *  theme switcher once the user has found their respective secret unlock
 *  (see Header.tsx). Kept in localStorage so they stay unlocked across
 *  visits once found. */
export function isWinampThemeUnlocked(): boolean {
  try {
    return localStorage.getItem(WINAMP_UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function unlockWinampTheme(): void {
  try {
    localStorage.setItem(WINAMP_UNLOCK_KEY, 'true');
  } catch {}
}

export function isAeroThemeUnlocked(): boolean {
  try {
    return localStorage.getItem(AERO_UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function unlockAeroTheme(): void {
  try {
    localStorage.setItem(AERO_UNLOCK_KEY, 'true');
  } catch {}
}

/**
 * Module-level store (not a React Context) shared by every useTheme() call
 * site, via useSyncExternalStore - so a theme change made in one component
 * (e.g. Header's switcher/secret unlocks) is immediately reflected in any
 * other component reading theme (e.g. a full-page parallax background
 * mounted separately in App), without needing a Provider wrapping the app.
 * index.html has a tiny inline script that applies the same .dark/.winamp/
 * .aero class on <html> before React even mounts, to avoid a flash of the
 * wrong theme - this only needs to stay in sync with that, not duplicate it.
 */
let currentTheme: Theme = readStoredTheme();
applyThemeClass(currentTheme);
const listeners = new Set<() => void>();

function setGlobalTheme(next: Theme): void {
  currentTheme = next;
  applyThemeClass(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  return currentTheme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((next: Theme) => setGlobalTheme(next), []);
  const toggleTheme = useCallback(() => {
    setGlobalTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, setTheme, toggleTheme };
}
