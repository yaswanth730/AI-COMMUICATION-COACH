/**
 * AudioVisualizer — Real-Time HTML5 Canvas Audio Waveform
 */
class AudioVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.animationId = null;
    this.isRunning = false;
  }

  start(mediaStream) {
    if (!this.canvas || !mediaStream) return;
    this.stop();

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioCtx.createMediaStreamSource(mediaStream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.isRunning = true;
      this.draw();
    } catch (err) {
      console.warn("AudioVisualizer initialization error:", err);
    }
  }

  draw() {
    if (!this.isRunning || !this.ctx) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width = this.canvas.offsetWidth;
    const height = this.canvas.height = this.canvas.offsetHeight;

    this.analyser.getByteFrequencyData(this.dataArray);

    this.ctx.clearRect(0, 0, width, height);

    const barWidth = (width / this.dataArray.length) * 2.2;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height * 0.9;

      const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, 'rgba(0, 242, 254, 0.2)');
      gradient.addColorStop(0.7, 'rgba(0, 242, 254, 0.85)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.95)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
      if (x > width) break;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

window.AudioVisualizer = AudioVisualizer;
