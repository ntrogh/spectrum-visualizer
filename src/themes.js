/**
 * Color themes shared across all visualizers.
 *
 * Each theme exposes:
 *  - background: canvas clear color (with optional alpha for motion trails)
 *  - stops: array of {pos, color} used to build gradients / pick colors
 *  - sample(t): returns an interpolated color string for t in [0, 1]
 */

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v,
    16
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makeTheme({ id, name, background, stops }) {
  const rgbStops = stops.map((s) => ({ pos: s.pos, rgb: hexToRgb(s.color) }));

  const sample = (t, alpha = 1) => {
    const clamped = Math.max(0, Math.min(1, t));
    let lo = rgbStops[0];
    let hi = rgbStops[rgbStops.length - 1];
    for (let i = 0; i < rgbStops.length - 1; i++) {
      if (clamped >= rgbStops[i].pos && clamped <= rgbStops[i + 1].pos) {
        lo = rgbStops[i];
        hi = rgbStops[i + 1];
        break;
      }
    }
    const span = hi.pos - lo.pos || 1;
    const local = (clamped - lo.pos) / span;
    const r = Math.round(lerp(lo.rgb.r, hi.rgb.r, local));
    const g = Math.round(lerp(lo.rgb.g, hi.rgb.g, local));
    const b = Math.round(lerp(lo.rgb.b, hi.rgb.b, local));
    return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  /** Build a linear gradient spanning the supplied coordinates. */
  const gradient = (ctx, x0, y0, x1, y1) => {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) grad.addColorStop(s.pos, s.color);
    return grad;
  };

  return { id, name, background, stops, sample, gradient };
}

export const themes = [
  makeTheme({
    id: 'neon',
    name: 'Neon',
    background: '#07070f',
    stops: [
      { pos: 0, color: '#00e5ff' },
      { pos: 0.5, color: '#5b8cff' },
      { pos: 1, color: '#ff3df0' }
    ]
  }),
  makeTheme({
    id: 'sunset',
    name: 'Sunset',
    background: '#140a14',
    stops: [
      { pos: 0, color: '#ffd166' },
      { pos: 0.5, color: '#ff6b6b' },
      { pos: 1, color: '#9b3dff' }
    ]
  }),
  makeTheme({
    id: 'aurora',
    name: 'Aurora',
    background: '#04120e',
    stops: [
      { pos: 0, color: '#00ffa3' },
      { pos: 0.5, color: '#00d4ff' },
      { pos: 1, color: '#7a5cff' }
    ]
  }),
  makeTheme({
    id: 'mono',
    name: 'Mono',
    background: '#0a0a0a',
    stops: [
      { pos: 0, color: '#555555' },
      { pos: 0.6, color: '#bbbbbb' },
      { pos: 1, color: '#ffffff' }
    ]
  }),
  makeTheme({
    id: 'fire',
    name: 'Fire',
    background: '#140703',
    stops: [
      { pos: 0, color: '#ffe14d' },
      { pos: 0.5, color: '#ff7a18' },
      { pos: 1, color: '#d61f1f' }
    ]
  }),
  makeTheme({
    id: 'ice',
    name: 'Ice',
    background: '#040d14',
    stops: [
      { pos: 0, color: '#e0fbff' },
      { pos: 0.5, color: '#56ccf2' },
      { pos: 1, color: '#2a6df2' }
    ]
  }),
  makeTheme({
    id: 'vapor',
    name: 'Vaporwave',
    background: '#11061a',
    stops: [
      { pos: 0, color: '#36e2ec' },
      { pos: 0.5, color: '#ff6ad5' },
      { pos: 1, color: '#b072ff' }
    ]
  }),
  makeTheme({
    id: 'forest',
    name: 'Forest',
    background: '#04120a',
    stops: [
      { pos: 0, color: '#d8f56a' },
      { pos: 0.5, color: '#3ec46d' },
      { pos: 1, color: '#0a7d5a' }
    ]
  }),
  makeTheme({
    id: 'candy',
    name: 'Candy',
    background: '#160712',
    stops: [
      { pos: 0, color: '#ffd1f0' },
      { pos: 0.5, color: '#ff6bd6' },
      { pos: 1, color: '#7b5cff' }
    ]
  }),
  makeTheme({
    id: 'ocean',
    name: 'Ocean',
    background: '#03101a',
    stops: [
      { pos: 0, color: '#9af5e1' },
      { pos: 0.5, color: '#1fb6d6' },
      { pos: 1, color: '#1b3fa0' }
    ]
  }),
  makeTheme({
    id: 'gold',
    name: 'Gold',
    background: '#120e03',
    stops: [
      { pos: 0, color: '#fff3b0' },
      { pos: 0.5, color: '#ffcf40' },
      { pos: 1, color: '#c8861a' }
    ]
  }),
  makeTheme({
    id: 'rainbow',
    name: 'Rainbow',
    background: '#080810',
    stops: [
      { pos: 0, color: '#ff3b3b' },
      { pos: 0.25, color: '#ffd23b' },
      { pos: 0.5, color: '#3bff6b' },
      { pos: 0.75, color: '#3bd2ff' },
      { pos: 1, color: '#b03bff' }
    ]
  })
];

export function getTheme(id) {
  return themes.find((t) => t.id === id) || themes[0];
}
