import { createBars } from './bars.js';
import { createWave } from './wave.js';
import { createRadial } from './radial.js';
import { createParticles } from './particles.js';
import { createMirrorBars } from './mirror.js';
import { createSpectrogram } from './spectrogram.js';
import { createBlob } from './blob.js';
import { createBars3D } from './bars3d.js';

/** Ordered registry of available visualizers. */
export const visualizers = [
  createBars(),
  createBars3D(),
  createWave(),
  createRadial(),
  createParticles(),
  createMirrorBars(),
  createSpectrogram(),
  createBlob()
];

export function getVisualizer(id) {
  return visualizers.find((v) => v.id === id) || visualizers[0];
}
