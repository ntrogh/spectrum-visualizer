/**
 * Frequency-driven "blob": the spectrum is wrapped symmetrically around a
 * circle to form a smooth, organic shape that morphs with the music.
 *
 * Versus a raw-waveform circle, this reads far better for real music because:
 *  - radii come from the frequency spectrum (beat/energy reactive),
 *  - values are smoothed across neighbors AND over time (organic motion),
 *  - the outline is drawn as a fluid closed curve (quadratic), not jagged lines,
 *  - bass pulses the whole shape and a slow rotation keeps it alive.
 */
export function createBlob() {
  const POINTS = 140;
  let radii = null;
  let rotation = 0;

  return {
    id: 'blob',
    name: 'Blob',

    reset() {
      radii = null;
      rotation = 0;
    },

    draw(ctx, { width, height }, { freq, gain, fade = 0.22 }, theme, dt) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const baseRadius = minDim * 0.16;
      const reach = minDim * 0.2;

      rotation += dt * 0.00005;

      // Bass pulse.
      let bass = 0;
      for (let i = 0; i < 14; i++) bass += freq[i];
      bass = (bass / 14 / 255) * gain;
      const ring = baseRadius * (1 + bass * 0.35);

      if (!radii || radii.length !== POINTS) {
        radii = new Float32Array(POINTS);
      }

      // Build symmetric target radii from the spectrum, then ease toward them.
      const half = POINTS / 2;
      const usable = Math.floor(freq.length * 0.5);
      for (let i = 0; i <= half; i++) {
        const p = i / half;
        // Average a small neighborhood of bins for spatial smoothing.
        const center = Math.floor(p * usable);
        let sum = 0;
        let count = 0;
        for (let j = center - 1; j <= center + 1; j++) {
          if (j >= 0 && j < usable) {
            sum += freq[j];
            count++;
          }
        }
        const mag = Math.min(1, (sum / Math.max(1, count) / 255) * gain);
        const target = ring + Math.pow(mag, 1.15) * reach;

        // Temporal smoothing for organic motion.
        const a = i % POINTS;
        const b = (POINTS - i) % POINTS;
        radii[a] += (target - radii[a]) * 0.3;
        radii[b] += (target - radii[b]) * 0.3;
      }

      // Convert to points.
      const pts = new Array(POINTS);
      for (let i = 0; i < POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2;
        pts[i] = {
          x: Math.cos(angle) * radii[i],
          y: Math.sin(angle) * radii[i]
        };
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Smooth closed curve through the points using midpoint quadratics.
      ctx.beginPath();
      const first = pts[0];
      const last = pts[POINTS - 1];
      ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
      for (let i = 0; i < POINTS; i++) {
        const cur = pts[i];
        const next = pts[(i + 1) % POINTS];
        ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2);
      }
      ctx.closePath();

      const fill = theme.gradient(ctx, -reach * 2, -reach * 2, reach * 2, reach * 2);
      ctx.globalAlpha = 0.2 + bass * 0.3;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.lineWidth = 2.5 + bass * 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = fill;
      ctx.shadowBlur = 18 + bass * 24;
      ctx.shadowColor = theme.sample(0.5, 0.85);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner core glow.
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.4 * (1 + bass * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = theme.sample(0.5, 0.12 + bass * 0.18);
      ctx.fill();

      ctx.restore();
    }
  };
}
