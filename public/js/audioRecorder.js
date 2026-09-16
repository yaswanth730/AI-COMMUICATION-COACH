/**
 * AudioRecorder — Captures local session audio for playback and snippet review
 */
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioPlayer = new Audio();
    this.isRecording = false;
  }

  start(mediaStream) {
    if (!mediaStream) return;
    this.audioChunks = [];
    this.audioBlob = null;
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    try {
      const options = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? { mimeType: 'audio/ogg' }
          : {};

      this.mediaRecorder = new MediaRecorder(mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // collect 250ms chunks
      this.isRecording = true;
    } catch (err) {
      console.warn("MediaRecorder start failed:", err);
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.audioChunks.length > 0) {
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.audioUrl = URL.createObjectURL(this.audioBlob);
          this.audioPlayer.src = this.audioUrl;
          resolve({ blob: this.audioBlob, url: this.audioUrl });
        } else {
          resolve(null);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.isRecording = false;
        resolve(null);
      }
    });
  }

  play() {
    if (this.audioUrl) {
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.play().catch(e => console.warn("Audio play error:", e));
    }
  }

  pause() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
  }

  playSnippet(startSeconds = 0, durationSeconds = 6) {
    if (!this.audioUrl) return;

    this.audioPlayer.currentTime = Math.max(0, startSeconds);
    this.audioPlayer.play().catch(e => console.warn("Snippet play error:", e));

    setTimeout(() => {
      this.audioPlayer.pause();
    }, durationSeconds * 1000);
  }
}

window.AudioRecorder = AudioRecorder;
