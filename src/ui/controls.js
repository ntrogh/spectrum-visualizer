import { visualizers } from '../visualizers/index.js';
import { themes } from '../themes.js';

const STORAGE_KEY = 'spectrum-visualizer:prefs';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode) */
  }
}

function clampNum(value, min, max, fallback) {
  return typeof value === 'number' && value >= min && value <= max ? value : fallback;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

/**
 * Wires up the control bar (style, theme, gain, smoothing, trails, toggles)
 * and the fullscreen button. Persists all preferences and exposes a small
 * programmatic API so keyboard shortcuts can drive the same logic.
 */
export function setupControls(cb) {
  const prefs = loadPrefs();

  const visualizerSelect = document.getElementById('visualizer-select');
  const themeSelect = document.getElementById('theme-select');
  const gainInput = document.getElementById('sensitivity');
  const gainGroup = document.getElementById('gain-group');
  const smoothingInput = document.getElementById('smoothing');
  const trailsInput = document.getElementById('trails');
  const autogainBtn = document.getElementById('autogain-toggle');
  const logscaleBtn = document.getElementById('logscale-toggle');
  const stopBtn = document.getElementById('stop-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  for (const v of visualizers) {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    visualizerSelect.appendChild(opt);
  }
  for (const t of themes) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  }

  const state = {
    visualizer: visualizers.some((v) => v.id === prefs.visualizer)
      ? prefs.visualizer
      : visualizers[0].id,
    theme: themes.some((t) => t.id === prefs.theme) ? prefs.theme : themes[0].id,
    gain: clampNum(prefs.gain, 0.5, 10, 1),
    smoothing: clampNum(prefs.smoothing, 0, 0.95, 0.82),
    trail: clampNum(prefs.trail, 0, 1, 0.65),
    autoGain: !!prefs.autoGain,
    logScale: !!prefs.logScale
  };

  visualizerSelect.value = state.visualizer;
  themeSelect.value = state.theme;
  gainInput.value = String(state.gain);
  smoothingInput.value = String(state.smoothing);
  trailsInput.value = String(state.trail);

  function persist() {
    savePrefs(state);
  }

  function reflectAutoGain() {
    autogainBtn.classList.toggle('active', state.autoGain);
    gainGroup.classList.toggle('disabled', state.autoGain);
    gainInput.disabled = state.autoGain;
  }

  function reflectLogScale() {
    logscaleBtn.classList.toggle('active', state.logScale);
  }

  /* --- Setters (used by both UI events and keyboard) --- */
  function setVisualizer(id) {
    if (!visualizers.some((v) => v.id === id)) return;
    state.visualizer = id;
    visualizerSelect.value = id;
    persist();
    cb.onVisualizer?.(id);
  }

  function setTheme(id) {
    if (!themes.some((t) => t.id === id)) return;
    state.theme = id;
    themeSelect.value = id;
    persist();
    cb.onTheme?.(id);
  }

  function setAutoGain(value) {
    state.autoGain = value;
    reflectAutoGain();
    persist();
    cb.onAutoGain?.(value);
  }

  function setLogScale(value) {
    state.logScale = value;
    reflectLogScale();
    persist();
    cb.onLogScale?.(value);
  }

  /* --- UI events --- */
  visualizerSelect.addEventListener('change', () => setVisualizer(visualizerSelect.value));
  themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

  gainInput.addEventListener('input', () => {
    state.gain = parseFloat(gainInput.value);
    persist();
    cb.onGain?.(state.gain);
  });

  smoothingInput.addEventListener('input', () => {
    state.smoothing = parseFloat(smoothingInput.value);
    persist();
    cb.onSmoothing?.(state.smoothing);
  });

  trailsInput.addEventListener('input', () => {
    state.trail = parseFloat(trailsInput.value);
    persist();
    cb.onTrail?.(state.trail);
  });

  autogainBtn.addEventListener('click', () => setAutoGain(!state.autoGain));
  logscaleBtn.addEventListener('click', () => setLogScale(!state.logScale));
  stopBtn.addEventListener('click', () => cb.onStop?.());
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  reflectAutoGain();
  reflectLogScale();

  /* --- Programmatic helpers for keyboard shortcuts --- */
  function cycle(list, currentId, dir) {
    const idx = list.findIndex((item) => item.id === currentId);
    const next = (idx + dir + list.length) % list.length;
    return list[next].id;
  }

  return {
    getState: () => ({ ...state }),
    setVisualizer,
    setTheme,
    nextVisualizer: () => setVisualizer(cycle(visualizers, state.visualizer, 1)),
    prevVisualizer: () => setVisualizer(cycle(visualizers, state.visualizer, -1)),
    nextTheme: () => setTheme(cycle(themes, state.theme, 1)),
    prevTheme: () => setTheme(cycle(themes, state.theme, -1)),
    setVisualizerByIndex: (i) => {
      if (i >= 0 && i < visualizers.length) setVisualizer(visualizers[i].id);
    },
    toggleAutoGain: () => setAutoGain(!state.autoGain),
    toggleLogScale: () => setLogScale(!state.logScale),
    toggleFullscreen
  };
}
