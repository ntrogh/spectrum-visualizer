/**
 * Lightweight musical analysis of the frequency spectrum.
 *
 * Each frame it computes:
 *  - bass / mid / treble band energies (0..1)
 *  - overall level (0..1)
 *  - beat: a boolean onset flag (bass energy spiking above its running average)
 *  - beatEnergy: a 0..1 envelope that snaps to 1 on a beat and decays smoothly,
 *    ideal for driving pulses/flashes in visualizers.
 */
export class AudioAnalysis {
  constructor() {
    this.reset();
  }

  reset() {
    this.bassAvg = 0;
    this.beatEnergy = 0;
    this.lastBeat = 0;
    this.bpm = 0;
    this.clock = 0;
    this._beatTimes = [];
  }

  process(freq, dt, gain = 1) {
    this.clock += dt;
    const n = freq.length;
    const bassEnd = Math.max(1, Math.floor(n * 0.08));
    const midEnd = Math.floor(n * 0.4);
    const trebEnd = Math.floor(n * 0.85);

    let bass = 0;
    let mid = 0;
    let treb = 0;
    for (let i = 0; i < bassEnd; i++) bass += freq[i];
    for (let i = bassEnd; i < midEnd; i++) mid += freq[i];
    for (let i = midEnd; i < trebEnd; i++) treb += freq[i];

    bass = Math.min(1, (bass / (bassEnd * 255)) * gain);
    mid = Math.min(1, (mid / ((midEnd - bassEnd) * 255)) * gain);
    treb = Math.min(1, (treb / ((trebEnd - midEnd) * 255)) * gain);
    const level = Math.min(1, (bass * 0.5 + mid * 0.35 + treb * 0.15) * 1.2);

    // Bass-onset beat detection against a slow running average.
    this.bassAvg = this.bassAvg * 0.92 + bass * 0.08;
    const now = this.clock;
    let beat = false;
    if (bass > this.bassAvg * 1.35 && bass > 0.22 && now - this.lastBeat > 240) {
      beat = true;
      this._registerBeat(now);
      this.lastBeat = now;
      this.beatEnergy = 1;
    }

    // Decay envelope (~260ms to zero).
    this.beatEnergy = Math.max(0, this.beatEnergy - dt * 0.0038);

    return {
      bass,
      mid,
      treble: treb,
      level,
      beat,
      beatEnergy: this.beatEnergy,
      bpm: this.bpm
    };
  }

  _registerBeat(now) {
    this._beatTimes.push(now);
    if (this._beatTimes.length > 8) this._beatTimes.shift();
    if (this._beatTimes.length >= 3) {
      let sum = 0;
      for (let i = 1; i < this._beatTimes.length; i++) {
        sum += this._beatTimes[i] - this._beatTimes[i - 1];
      }
      const avgInterval = sum / (this._beatTimes.length - 1);
      if (avgInterval > 0) {
        const bpm = 60000 / avgInterval;
        // Smooth and keep within a plausible musical range.
        if (bpm >= 60 && bpm <= 200) {
          this.bpm = this.bpm ? this.bpm * 0.7 + bpm * 0.3 : bpm;
        }
      }
    }
  }
}
