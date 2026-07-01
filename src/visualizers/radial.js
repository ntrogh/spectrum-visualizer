/**
 * Circular spectrum: frequency magnitudes radiate outward from the center
 * as spokes around a pulsing ring.
 */
export function createRadial() {
  let rotation = 0;

  return {
    id: 'radial',
    name: 'Radial',

    reset() {
      rotation = 0;
    },

    draw(ctx, { width, height }, { freq, gain, audio = {} }, theme, dt) {
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);

      const beat = audio.beatEnergy || 0;
      const level = audio.level || 0;

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.18;
      const maxLen = Math.min(width, height) * 0.32;

      rotation += dt * 0.00008 * (1 + level * 1.5);

      const bins = freq.length;
      const usable = Math.floor(bins * 0.6);
      const spokes = 120;
      const step = usable / spokes;

      // Bass-driven pulse of the inner ring, kicked further on each beat.
      let bass = 0;
      for (let i = 0; i < 16; i++) bass += freq[i];
      bass = (bass / 16 / 255) * gain;
      const ringRadius = baseRadius * (1 + bass * 0.25 + beat * 0.2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      for (let i = 0; i < spokes; i++) {
        const idx = Math.floor(i * step);
        const magnitude = Math.min(1, (freq[idx] / 255) * gain);
        const len = magnitude * maxLen;

        // Mirror across the circle for symmetry.
        const angle = (i / spokes) * Math.PI * 2;
        const x0 = Math.cos(angle) * ringRadius;
        const y0 = Math.sin(angle) * ringRadius;
        const x1 = Math.cos(angle) * (ringRadius + len);
        const y1 = Math.sin(angle) * (ringRadius + len);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = theme.sample(magnitude);
        ctx.globalAlpha = 0.55 + magnitude * 0.45;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Inner ring outline.
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.sample(0.5, 0.6 + bass * 0.4);
      ctx.shadowBlur = 20;
      ctx.shadowColor = theme.sample(0.5, 0.8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  };
}
