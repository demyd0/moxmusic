import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'winamp';

const STORAGE_KEY = 'moxmusic_theme';
const UNLOCK_KEY = 'moxmusic_winamp_unlocked';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'winamp') return stored;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 'winamp' is a hidden easter-egg theme - only offered in the theme
 *  switcher once the user has found the secret unlock (see Header.tsx's
 *  logo click-5-times handler). Kept in localStorage so it stays unlocked
 *  across visits once found. */
export function isWinampThemeUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function unlockWinampTheme(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, 'true');
  } catch {}
}

/**
 * Reads/writes the .dark or .winamp class on <html>. index.html has a tiny
 * inline script that applies the same class before React even mounts, so
 * this only needs to stay in sync with it - not avoid an initial flash itself.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('winamp', theme === 'winamp');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
