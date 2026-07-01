/**
 * Symmetric frequency bars that grow outward from a horizontal center line,
 * mirrored top and bottom.
 */
export function createMirrorBars() {
  return {
    id: 'mirror',
    name: 'Mirror Bars',

    reset() {},

    draw(ctx, { width, height }, { freq, gain, audio = {} }, theme) {
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);

      const beat = audio.beatEnergy || 0;

      const bins = freq.length;
      const usable = Math.floor(bins * 0.72);
      const barCount = Math.min(120, usable);
      const step = usable / barCount;
      const gap = Math.max(1, (width / barCount) * 0.16);
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const mid = height / 2;
      const maxHalf = height * 0.46 * (1 + beat * 0.12);

      for (let i = 0; i < barCount; i++) {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        let sum = 0;
        for (let j = start; j < end; j++) sum += freq[j];
        const avg = sum / Math.max(1, end - start);

        const magnitude = Math.min(1, (avg / 255) * gain);
        const half = magnitude * maxHalf;
        const x = i * (barWidth + gap);

        ctx.fillStyle = theme.sample(i / barCount, 0.95);
        ctx.shadowBlur = 12 + beat * 18;
        ctx.shadowColor = theme.sample(i / barCount, 0.6);
        ctx.fillRect(x, mid - half, barWidth, half * 2);
      }
      ctx.shadowBlur = 0;

      // Center line.
      ctx.strokeStyle = theme.sample(0.5, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
    }
  };
}
