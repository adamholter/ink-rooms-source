import * as THREE from 'three';

// The floor module uses this for its top face, with no overlapping overlay.
export const iceSurface = new THREE.MeshBasicMaterial({ color: 0xd2e9ff });

export function setIceTheme(dark: boolean): void {
  iceSurface.color.setHex(dark ? 0x1b344c : 0xd2e9ff);
}
