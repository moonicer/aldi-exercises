/**
 * The only place colors are defined. Named by role, not by hue.
 * CSS uses the matching custom properties in src/index.css (`--color-<kebab-case role>`);
 * keep both in sync when a value changes.
 */
export const color = {
  // Page and surfaces
  background: '#FBF9F4',
  surface: '#FFF8F1',
  surfaceRaised: '#FFFFFF',
  track: '#E6DCCF',

  // Text and interactive
  text: '#2F6A96',
  primary: '#7A64B8',
  textOnPrimary: '#FFFFFF',
  focusRing: '#E9A07A',

  // 3D scenes
  sceneBackground: '#FBF9F4',
  hammockRelaxed: '#DCD0F5',
  hammockLifted: '#7A64B8',
  hammockOutline: '#1E5B57',
  pelvis: '#2F6A96',
  mannequin: '#A8C3A0',
  mat: '#EADCCB',
} as const;

export type ColorRole = keyof typeof color;
