/** No official TypeScript types are published for these packages - loosely
 *  typed just enough to cover the API surface MilkdropCanvas.tsx uses. */
declare module 'butterchurn' {
  export interface ButterchurnVisualizer {
    connectAudio(node: AudioNode): void;
    disconnectAudio(node: AudioNode): void;
    loadPreset(preset: unknown, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
  }

  interface Butterchurn {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      opts: { width: number; height: number; pixelRatio?: number; textureRatio?: number }
    ): ButterchurnVisualizer;
  }

  const butterchurn: Butterchurn;
  export default butterchurn;
}

declare module 'butterchurn-presets' {
  interface ButterchurnPresets {
    getPresets(): Record<string, unknown>;
  }
  const presets: ButterchurnPresets;
  export default presets;
}
