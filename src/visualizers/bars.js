/**
 * Classic frequency bars rising from the bottom of the screen.
 */
export function createBars() {
  let peaks = null;

  return {
    id: 'bars',
    name: 'Bars',

    reset() {
      peaks = null;
    },

    draw(ctx, { width, height }, { freq, gain, audio = {} }, theme) {
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);

      const beat = audio.beatEnergy || 0;

      const bins = freq.length;
      // Use a perceptually useful slice (skip the very top, mostly silent bins).
      const usable = Math.floor(bins * 0.72);
      const barCount = Math.min(96, usable);
      const step = usable / barCount;
      const gap = Math.max(1, width / barCount * 0.18);
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      if (!peaks || peaks.length !== barCount) {
        peaks = new Float32Array(barCount);
      }

      for (let i = 0; i < barCount; i++) {
        // Average the bins that fall into this bar for smoother output.
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        let sum = 0;
        for (let j = start; j < end; j++) sum += freq[j];
        const avg = sum / Math.max(1, end - start);

        const magnitude = Math.min(1, (avg / 255) * gain);
        const barHeight = magnitude * height * 0.92 * (1 + beat * 0.1);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        ctx.fillStyle = theme.gradient(ctx, 0, height, 0, height * 0.1);
        ctx.fillRect(x, y, barWidth, barHeight);

        // Falling peak markers.
        const target = barHeight;
        if (target >= peaks[i]) {
          peaks[i] = target;
        } else {
          peaks[i] = Math.max(target, peaks[i] - height * 0.012);
        }
        ctx.fillStyle = theme.sample(i / barCount, 0.9);
        ctx.fillRect(x, height - peaks[i] - 3, barWidth, 3);
      }

      // Subtle full-scene flash on the beat.
      if (beat > 0.01) {
        ctx.fillStyle = theme.sample(0.5, beat * 0.06);
        ctx.fillRect(0, 0, width, height);
      }
    }
  };
}
