/**
 * Captures audio from a shared tab/screen via getDisplayMedia and exposes
 * analyser data for visualization.
 */

export class AudioCaptureError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AudioCaptureError';
    this.code = code;
  }
}

export class AudioCapture {
  constructor({ fftSize = 2048, smoothing = 0.8 } = {}) {
    this.fftSize = fftSize;
    this.smoothing = smoothing;

    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;

    this.freqData = null;
    this.timeData = null;

    /** Called when the user stops sharing from the browser's native UI. */
    this.onEnded = null;
  }

  get isActive() {
    return this.analyser !== null;
  }

  async start(source = 'display') {
    let stream;
    if (source === 'mic') {
      stream = await this._getMicStream();
    } else {
      stream = await this._getDisplayStream();
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new AudioCaptureError(
        source === 'mic'
          ? 'No microphone audio was captured.'
          : 'No audio was shared. Re-share and enable “Share tab audio” / “Share system audio”.',
        'no-audio'
      );
    }

    // We only need the audio; stop any video track to save resources.
    stream.getVideoTracks().forEach((track) => track.stop());

    this.stream = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const audioStream = new MediaStream(audioTracks);
    this.sourceNode = this.audioContext.createMediaStreamSource(audioStream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothing;

    this.sourceNode.connect(this.analyser);

    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    // Detect when capture ends (user stops sharing / device removed).
    audioTracks[0].addEventListener('ended', () => {
      this.stop();
      this.onEnded?.();
    });
  }

  async _getDisplayStream() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new AudioCaptureError(
        'Screen/tab audio capture is not supported in this browser. Try Chrome or Edge.',
        'unsupported'
      );
    }
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (err) {
      if (err && err.name === 'NotAllowedError') {
        throw new AudioCaptureError('Sharing was cancelled.', 'cancelled');
      }
      throw new AudioCaptureError(
        err?.message || 'Could not start screen capture.',
        'failed'
      );
    }
  }

  async _getMicStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new AudioCaptureError(
        'Microphone capture is not supported in this browser.',
        'unsupported'
      );
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (err) {
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        throw new AudioCaptureError('Microphone access was denied.', 'cancelled');
      }
      if (err && err.name === 'NotFoundError') {
        throw new AudioCaptureError('No microphone was found.', 'no-audio');
      }
      throw new AudioCaptureError(
        err?.message || 'Could not access the microphone.',
        'failed'
      );
    }
  }

  /** Refresh internal buffers with the latest analyser data. */
  update() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);
    return { freq: this.freqData, time: this.timeData };
  }

  setSmoothing(value) {
    this.smoothing = value;
    if (this.analyser) this.analyser.smoothingTimeConstant = value;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
