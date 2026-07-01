/**
 * Scrolling spectrogram: frequency intensity is drawn as a vertical column on
 * the right edge each frame, and the existing image scrolls left over time.
 * Low frequencies are at the bottom, high frequencies at the top.
 */
export function createSpectrogram() {
  let needsClear = true;

  return {
    id: 'spectrogram',
    name: 'Spectrogram',

    reset() {
      needsClear = true;
    },

    draw(ctx, { width, height, dpr = 1 }, { freq, gain }, theme) {
      const canvas = ctx.canvas;
      const W = canvas.width;
      const H = canvas.height;

      // Work in raw device pixels so the scroll copy is exact.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (needsClear) {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, W, H);
        needsClear = false;
      }

      const speed = Math.max(1, Math.round(2 * dpr));

      // Scroll everything left by `speed` device pixels.
      ctx.drawImage(canvas, speed, 0, W - speed, H, 0, 0, W - speed, H);

      // Draw the new column on the right edge.
      const colX = W - speed;
      const usable = Math.floor(freq.length * 0.85);
      for (let y = 0; y < H; y++) {
        // Map y (top=high freq) to a frequency bin.
        const f = 1 - y / H;
        const idx = Math.min(usable - 1, Math.floor(f * usable));
        const magnitude = Math.min(1, (freq[idx] / 255) * gain);
        ctx.fillStyle = theme.sample(magnitude, Math.max(0.04, magnitude));
        ctx.fillRect(colX, y, speed, 1);
      }

      ctx.restore();
    }
  };
}
