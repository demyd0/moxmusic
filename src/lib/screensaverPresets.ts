export type ScreensaverPreset =
  | 'starfield'
  | 'plasma'
  | 'pipes'
  | 'mystify'
  | 'bars'
  | 'matrix'
  | 'fireworks'
  | 'metaballs'
  | 'tunnel'
  | 'kaleidoscope';

export const SCREENSAVER_PRESETS: { value: ScreensaverPreset; label: string }[] = [
  { value: 'starfield', label: 'STARFIELD' },
  { value: 'plasma', label: 'PLASMA' },
  { value: 'pipes', label: 'PIPES' },
  { value: 'mystify', label: 'MYSTIFY' },
  { value: 'bars', label: 'BARS' },
  { value: 'matrix', label: 'MATRIX' },
  { value: 'fireworks', label: 'FIREWORKS' },
  { value: 'metaballs', label: 'METABALLS' },
  { value: 'tunnel', label: 'TUNNEL' },
  { value: 'kaleidoscope', label: 'KALEIDOSCOPE' },
];
