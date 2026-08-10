import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const VOLUME_STORAGE_KEY = 'moxmusic_master_volume';
const DEFAULT_VOLUME = 0.8;

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    const parsed = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

interface AudioEngineContextValue {
  /** 0-1 master volume, applied by every playable <audio> element on the
   *  site (profile track uploads, 30s previews) directly via their native
   *  .volume property - simplest possible "site-wide volume", no Web Audio
   *  graph required just for this part. */
  volume: number;
  setVolume: (v: number) => void;
  /** Whichever <audio> element is the "currently playing" one site-wide -
   *  set by any component as it starts/stops playback. Purely for the
   *  Milkdrop screensaver to tap into for audio-reactive visuals; not
   *  required for volume control. */
  setActiveElement: (el: HTMLAudioElement | null) => void;
  /** Lazily builds (once) a shared AudioContext + wraps the currently
   *  active element into it, returning an AudioNode the screensaver can
   *  feed into Butterchurn's connectAudio(). Each HTMLMediaElement can only
   *  ever be wrapped by createMediaElementSource once in its lifetime, so
   *  wrapped nodes are cached and reused here rather than in the caller. */
  getVisualizerSource: () => { audioContext: AudioContext; node: AudioNode } | null;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolumeState] = useState<number>(readStoredVolume);
  const activeElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    } catch {}
  }, []);

  const setActiveElement = useCallback((el: HTMLAudioElement | null) => {
    activeElementRef.current = el;
  }, []);

  const getVisualizerSource = useCallback(() => {
    const el = activeElementRef.current;
    if (!el) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    let node = sourceNodesRef.current.get(el);
    if (!node) {
      // Wrapping an element into the graph intercepts its output - it must
      // be reconnected to destination or the element goes silent.
      node = audioContext.createMediaElementSource(el);
      node.connect(audioContext.destination);
      sourceNodesRef.current.set(el, node);
    }
    return { audioContext, node };
  }, []);

  const value = useMemo<AudioEngineContextValue>(
    () => ({ volume, setVolume, setActiveElement, getVisualizerSource }),
    [volume, setVolume, setActiveElement, getVisualizerSource]
  );

  return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
};

export function useAudioEngine(): AudioEngineContextValue {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error('useAudioEngine must be used within an AudioEngineProvider');
  return ctx;
}
