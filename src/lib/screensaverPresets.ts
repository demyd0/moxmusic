import butterchurnPresets from 'butterchurn-presets';

/** Real Milkdrop presets via Butterchurn (a WebGL port of the actual
 *  Milkdrop engine) - preset names are whatever the .milk-derived preset
 *  pack ships with, so this list is read from the package rather than
 *  hand-typed. */
const presets = butterchurnPresets.getPresets();

export type ScreensaverPreset = string;

export const SCREENSAVER_PRESET_NAMES: string[] = Object.keys(presets).sort((a, b) => a.localeCompare(b));

export const DEFAULT_SCREENSAVER_PRESET: string = SCREENSAVER_PRESET_NAMES[0] || '';

export function getPresetByName(name: string): unknown {
  return presets[name];
}

export function getRandomPresetName(excluding?: string): string {
  if (SCREENSAVER_PRESET_NAMES.length <= 1) return SCREENSAVER_PRESET_NAMES[0] || '';
  let name = excluding;
  while (!name || name === excluding) {
    name = SCREENSAVER_PRESET_NAMES[Math.floor(Math.random() * SCREENSAVER_PRESET_NAMES.length)];
  }
  return name;
}
