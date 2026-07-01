/**
 * Pseudo-3D frequency bars drawn with oblique (cabinet) projection so each bar
 * looks like a solid box with a lit front, top, and side face. The whole row
 * pulses subtly on detected beats.
 */
export function createBars3D() {
  let peaks = null;

  function shade(color, factor) {
    // color is "rgb(r, g, b)"; scale brightness by factor.
    const m = color.match(/\d+/g);
    if (!m) return color;
    const r = Math.min(255, Math.round(m[0] * factor));
    const g = Math.min(255, Math.round(m[1] * factor));
    const b = Math.min(255, Math.round(m[2] * factor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  return {
    id: 'bars3d',
    name: '3D Bars',

    reset() {
      peaks = null;
    },

    draw(ctx, { width, height }, { freq, gain, audio = {} }, theme) {
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);

      const beat = audio.beatEnergy || 0;

      const bins = freq.length;
      const usable = Math.floor(bins * 0.7);
      const barCount = Math.min(64, usable);
      const step = usable / barCount;

      // Depth vector for the oblique projection (up-right).
      const depth = Math.min(width, height) * 0.12 * (1 + beat * 0.15);
      const ddx = depth * 0.7;
      const ddy = -depth * 0.5;

      // Lay the row out so the projected back edge still fits on screen.
      const marginX = width * 0.06;
      const usableW = width - marginX * 2 - ddx;
      const gap = (usableW / barCount) * 0.22;
      const barW = (usableW - gap * (barCount - 1)) / barCount;
      const baseY = height * 0.82;
      const maxH = height * 0.6;

      if (!peaks || peaks.length !== barCount) peaks = new Float32Array(barCount);

      for (let i = 0; i < barCount; i++) {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        let sum = 0;
        for (let j = start; j < end; j++) sum += freq[j];
        const avg = sum / Math.max(1, end - start);
        const magnitude = Math.min(1, (avg / 255) * gain);
        const h = magnitude * maxH * (1 + beat * 0.12);

        const x = marginX + i * (barW + gap);
        const topY = baseY - h;

        const base = theme.sample(i / barCount);
        const front = shade(base, 1);
        const top = shade(base, 1.25);
        const side = shade(base, 0.6);

        // Top face (parallelogram).
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x + barW, topY);
        ctx.lineTo(x + barW + ddx, topY + ddy);
        ctx.lineTo(x + ddx, topY + ddy);
        ctx.closePath();
        ctx.fill();

        // Right side face.
        ctx.fillStyle = side;
        ctx.beginPath();
        ctx.moveTo(x + barW, topY);
        ctx.lineTo(x + barW + ddx, topY + ddy);
        ctx.lineTo(x + barW + ddx, baseY + ddy);
        ctx.lineTo(x + barW, baseY);
        ctx.closePath();
        ctx.fill();

        // Front face.
        ctx.fillStyle = front;
        ctx.fillRect(x, topY, barW, h);

        // Falling peak cap on the top face.
        const target = h;
        if (target >= peaks[i]) peaks[i] = target;
        else peaks[i] = Math.max(target, peaks[i] - maxH * 0.012);
        const py = baseY - peaks[i];
        ctx.fillStyle = shade(base, 1.5);
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + barW, py);
        ctx.lineTo(x + barW + ddx, py + ddy);
        ctx.lineTo(x + ddx, py + ddy);
        ctx.closePath();
        ctx.fill();
      }
    }
  };
}
