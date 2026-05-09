// Minimal mutable singleton for cross-component access to the player's
// position in the active scene. Used by HUD widgets (minimap, compass).
let px = 0;
let pz = 0;

export function setPlayerPos(x: number, z: number): void {
  px = x; pz = z;
}

export function getPlayerPos(): { x: number; z: number } {
  return { x: px, z: pz };
}
