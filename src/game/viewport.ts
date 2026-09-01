// The authored coordinate system for every Phaser scene. Browser and device
// sizes only change how this 16:9 surface is presented; they never resize the
// simulation world itself.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

export function gameScaleFor(viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
}

// Celular na vertical joga com a superfície girada 90° (paisagem forçada):
// o mundo 16:9 autorado nunca muda, só a apresentação.
export const FORCE_LANDSCAPE_QUERY = "(orientation: portrait) and (pointer: coarse)";

export function isForceLandscape(): boolean {
  return typeof window !== "undefined" && window.matchMedia(FORCE_LANDSCAPE_QUERY).matches;
}
