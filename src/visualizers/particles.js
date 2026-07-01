/**
 * Audio-reactive particle field. Particles drift outward from the center and
 * receive bursts of energy driven by the overall audio level, with bass
 * controlling spawn intensity.
 */
export function createParticles() {
  let particles = [];
  let width = 0;
  let height = 0;

  function spawn(cx, cy, energy, theme) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 3 * (0.4 + energy);
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.004 + Math.random() * 0.012,
      size: 1 + Math.random() * 3 * (0.5 + energy),
      tone: Math.random()
    };
  }

  return {
    id: 'particles',
    name: 'Particles',

    reset() {
      particles = [];
    },

    draw(ctx, dims, { freq, gain, fade = 0.18, audio = {} }, theme, dt) {
      width = dims.width;
      height = dims.height;
      const cx = width / 2;
      const cy = height / 2;

      // Motion trails: fade previous frame instead of hard clear.
      ctx.globalAlpha = fade;
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      // Compute energy bands.
      let bass = 0;
      for (let i = 0; i < 16; i++) bass += freq[i];
      bass = (bass / 16 / 255) * gain;

      let overall = 0;
      const usable = Math.floor(freq.length * 0.7);
      for (let i = 0; i < usable; i++) overall += freq[i];
      overall = (overall / usable / 255) * gain;

      // Spawn proportional to bass energy, with an extra burst on each beat.
      const spawnCount = Math.floor(bass * 26);
      for (let i = 0; i < spawnCount && particles.length < 1400; i++) {
        particles.push(spawn(cx, cy, overall, theme));
      }
      if (audio.beat) {
        const burst = Math.floor(40 + (audio.level || 0) * 80);
        for (let i = 0; i < burst && particles.length < 1600; i++) {
          particles.push(spawn(cx, cy, 1, theme));
        }
      }

      const frameScale = dt / 16.67;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * frameScale * (1 + overall);
        p.y += p.vy * frameScale * (1 + overall);
        p.life -= p.decay * frameScale;

        if (
          p.life <= 0 ||
          p.x < -20 ||
          p.x > width + 20 ||
          p.y < -20 ||
          p.y > height + 20
        ) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = theme.sample(p.tone, p.life);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}
