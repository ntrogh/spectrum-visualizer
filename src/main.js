import './styles.css';
import { AudioCapture, AudioCaptureError } from './audio/capture.js';
import { AudioAnalysis } from './audio/analysis.js';
import { getVisualizer } from './visualizers/index.js';
import { getTheme } from './themes.js';
import { setupControls } from './ui/controls.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const startMicBtn = document.getElementById('start-mic-btn');
const startError = document.getElementById('start-error');
const controlsEl = document.getElementById('controls');
const bpmReadout = document.getElementById('bpm-readout');

const capture = new AudioCapture({ fftSize: 2048, smoothing: 0.82 });
const analysis = new AudioAnalysis();

const state = {
  visualizer: null,
  theme: null,
  gain: 1,
  smoothing: 0.82,
  trail: 0.65,
  autoGain: false,
  logScale: false,
  running: false,
  lastTime: 0
};

let processedFreq = null;
let agcGain = 1;
let bpmTextTimer = 0;

/* ---- Canvas sizing (hi-DPI aware) ---- */
let dpr = 1;
function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { innerWidth: w, innerHeight: h } = window;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ---- Controls ---- */
const controls = setupControls({
  onVisualizer: (id) => {
    state.visualizer = getVisualizer(id);
    state.visualizer.reset?.();
    clearStage();
  },
  onTheme: (id) => {
    state.theme = getTheme(id);
    clearStage();
  },
  onGain: (value) => {
    state.gain = value;
  },
  onSmoothing: (value) => {
    state.smoothing = value;
    capture.setSmoothing(value);
  },
  onTrail: (value) => {
    state.trail = value;
  },
  onAutoGain: (value) => {
    state.autoGain = value;
  },
  onLogScale: (value) => {
    state.logScale = value;
    state.visualizer.reset?.();
    clearStage();
  },
  onStop: () => stop()
});

const initial = controls.getState();
state.visualizer = getVisualizer(initial.visualizer);
state.theme = getTheme(initial.theme);
state.gain = initial.gain;
state.smoothing = initial.smoothing;
state.trail = initial.trail;
state.autoGain = initial.autoGain;
state.logScale = initial.logScale;
capture.setSmoothing(state.smoothing);

function dims() {
  return { width: window.innerWidth, height: window.innerHeight, dpr };
}

function clearStage() {
  const { width, height } = dims();
  ctx.fillStyle = state.theme.background;
  ctx.fillRect(0, 0, width, height);
}

/* ---- Signal processing ---- */

/** Smoothly normalize gain so the loudest bin approaches full scale. */
function computeAutoGain(freq) {
  const usable = Math.floor(freq.length * 0.85);
  let max = 0;
  for (let i = 0; i < usable; i++) {
    if (freq[i] > max) max = freq[i];
  }
  if (max > 4) {
    const desired = Math.max(0.8, Math.min(8, 235 / max));
    // Rise quickly, fall slowly to avoid pumping.
    const rate = desired > agcGain ? 0.2 : 0.04;
    agcGain += (desired - agcGain) * rate;
  }
  return agcGain;
}

/** Remap a linear-frequency array onto a logarithmic axis in place. */
function logRemap(src, dst) {
  const n = dst.length;
  const srcN = src.length;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const idx = Math.min(srcN - 1, Math.max(0, Math.round(Math.pow(srcN, p)) - 1));
    dst[i] = src[idx];
  }
}

/* ---- Render loop ---- */
function loop(now) {
  if (!state.running) return;
  const dt = state.lastTime ? Math.min(now - state.lastTime, 50) : 16.67;
  state.lastTime = now;

  const data = capture.update();
  if (data) {
    const effGain = state.autoGain ? computeAutoGain(data.freq) : state.gain;

    // Musical analysis (band energies + beat) on the raw spectrum.
    const audio = analysis.process(data.freq, dt, effGain);
    updateBpm(audio.bpm, dt);

    let freq = data.freq;
    if (state.logScale) {
      if (!processedFreq || processedFreq.length !== data.freq.length) {
        processedFreq = new Uint8Array(data.freq.length);
      }
      logRemap(data.freq, processedFreq);
      freq = processedFreq;
    }

    const fade = 0.6 - state.trail * 0.55;

    state.visualizer.draw(
      ctx,
      dims(),
      { freq, time: data.time, gain: effGain, fade, audio },
      state.theme,
      dt
    );
  }
  requestAnimationFrame(loop);
}

function updateBpm(bpm, dt) {
  // Refresh the readout a few times per second to avoid flicker.
  bpmTextTimer -= dt;
  if (bpmTextTimer <= 0) {
    bpmTextTimer = 400;
    bpmReadout.textContent = bpm >= 60 ? `${Math.round(bpm)} BPM` : '— BPM';
  }
}

/* ---- Auto-hide UI ---- */
let hideTimer = null;
function showUI() {
  document.body.classList.remove('ui-hidden');
  clearTimeout(hideTimer);
  if (state.running) {
    hideTimer = setTimeout(() => document.body.classList.add('ui-hidden'), 3000);
  }
}
['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach((evt) =>
  window.addEventListener(evt, showUI)
);

/* ---- Keyboard shortcuts ---- */
window.addEventListener('keydown', (e) => {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case 'ArrowRight':
      controls.nextVisualizer();
      break;
    case 'ArrowLeft':
      controls.prevVisualizer();
      break;
    case 'ArrowUp':
      e.preventDefault();
      controls.prevTheme();
      break;
    case 'ArrowDown':
      e.preventDefault();
      controls.nextTheme();
      break;
    case 'f':
    case 'F':
      controls.toggleFullscreen();
      break;
    case 'a':
    case 'A':
      controls.toggleAutoGain();
      break;
    case 'l':
    case 'L':
      controls.toggleLogScale();
      break;
    case ' ':
      e.preventDefault();
      if (state.running) stop();
      else start();
      break;
    default:
      if (e.key >= '1' && e.key <= '9') {
        controls.setVisualizerByIndex(parseInt(e.key, 10) - 1);
      }
  }
});

/* ---- Screen Wake Lock ---- */
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    /* wake lock unavailable (e.g. not visible) */
  }
}
function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.running && !wakeLock) {
    requestWakeLock();
  }
});

/* ---- Start / stop ---- */
async function start(source = 'display') {
  startError.hidden = true;
  startBtn.disabled = true;
  startMicBtn.disabled = true;
  const activeBtn = source === 'mic' ? startMicBtn : startBtn;
  const label = activeBtn.textContent;
  activeBtn.textContent = source === 'mic' ? 'Requesting mic…' : 'Requesting audio…';
  try {
    await capture.start(source);
    capture.onEnded = () => stop();

    state.running = true;
    state.lastTime = 0;
    agcGain = 1;
    analysis.reset();
    state.visualizer.reset?.();

    startScreen.hidden = true;
    controlsEl.hidden = false;
    bpmReadout.hidden = false;
    requestWakeLock();
    showUI();
    requestAnimationFrame(loop);
  } catch (err) {
    if (err instanceof AudioCaptureError && err.code === 'cancelled') {
      // User dismissed the picker; stay silent on the start screen.
    } else {
      startError.textContent =
        err instanceof Error ? err.message : 'Something went wrong.';
      startError.hidden = false;
    }
  } finally {
    startBtn.disabled = false;
    startMicBtn.disabled = false;
    activeBtn.textContent = label;
  }
}

function stop() {
  state.running = false;
  capture.stop();
  releaseWakeLock();
  controlsEl.hidden = true;
  startScreen.hidden = false;
  bpmReadout.hidden = true;
  clearTimeout(hideTimer);
  document.body.classList.remove('ui-hidden');
  clearStage();
}

startBtn.addEventListener('click', () => start('display'));
startMicBtn.addEventListener('click', () => start('mic'));

clearStage();
