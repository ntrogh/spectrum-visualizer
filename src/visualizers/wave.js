/**
 * Oscilloscope-style waveform from time-domain data.
 *
 * For real music the raw waveform jitters and looks noisy, so this:
 *  - locks the waveform horizontally with a zero-crossing trigger (sync),
 *  - lightly smooths the samples to remove fizz,
 *  - and makes line thickness + glow react to the signal's loudness (RMS).
 */
export function createWave() {
  return {
    id: 'wave',
    name: 'Wave',

    reset() {},

    draw(ctx, { width, height }, { time, gain, fade = 0.25 }, theme) {
      ctx.fillStyle = theme.background + '';
      ctx.globalAlpha = fade;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      const total = time.length;
      const mid = height / 2;
      const ampPx = height * 0.46;

      // --- Loudness (RMS) drives glow + thickness ---
      let sumSq = 0;
      for (let i = 0; i < total; i++) {
        const d = (time[i] - 128) / 128;
        sumSq += d * d;
      }
      const rms = Math.min(1, Math.sqrt(sumSq / total) * gain * 2.2);

      // --- Trigger: find a rising zero-crossing so the trace stays put ---
      const window = Math.floor(total / 2);
      let trigger = 0;
      for (let i = 1; i < window; i++) {
        if (time[i - 1] < 128 && time[i] >= 128) {
          trigger = i;
          break;
        }
      }
      const span = total - window; // samples we always have available

      // Smoothed sample read (3-tap) at trace position k (0..span-1).
      const sampleAt = (k) => {
        const idx = trigger + k;
        const a = time[Math.max(0, idx - 1)];
        const b = time[idx];
        const c = time[Math.min(total - 1, idx + 1)];
        const v = ((a + b + c) / 3 - 128) / 128;
        return Math.max(-1, Math.min(1, v * gain * 2.4));
      };

      const drawLine = (lineWidth, alpha) => {
        ctx.beginPath();
        for (let k = 0; k < span; k++) {
          const x = (k / (span - 1)) * width;
          const y = mid + sampleAt(k) * ampPx;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = theme.gradient(ctx, 0, 0, width, 0);
        ctx.globalAlpha = alpha;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // Glow pass (intensity follows loudness), then a crisp core line.
      ctx.shadowBlur = 14 + rms * 26;
      ctx.shadowColor = theme.sample(0.5, 0.85);
      drawLine(4 + rms * 6, 0.3 + rms * 0.3);
      ctx.shadowBlur = 0;
      drawLine(2 + rms * 1.5, 1);
    }
  };
}
