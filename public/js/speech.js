/**
 * SpeechManager — Continuous Real-Time Speech Recognition & Filler Detection
 */
class SpeechManager {
  constructor({ onTranscriptUpdate, onInterimUpdate, onLiveSignalRequest, onFillerDetected }) {
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onInterimUpdate = onInterimUpdate;
    this.onLiveSignalRequest = onLiveSignalRequest;
    this.onFillerDetected = onFillerDetected;

    this.recognition = null;
    this.isListening = false;
    this.fullTranscript = '';
    this.interimTranscript = '';
    this.startTime = null;
    this.wordCount = 0;
    this.wpm = 0;
    this.fillersFound = [];

    this.fillerWords = [
      'basically', 'actually', 'literally', 'you know', 'like', 'sort of',
      'kind of', 'i mean', 'obviously', 'to be honest', 'honestly', 'right'
    ];

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API is not supported in this browser. Fallback input mode available.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + transcriptPart.trim();
          this.processFinalSnippet(transcriptPart);
        } else {
          interim += transcriptPart;
        }
      }

      this.interimTranscript = interim;
      this.updateStats();

      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(this.fullTranscript, this.interimTranscript);
      }

      if (this.onInterimUpdate && interim) {
        this.onInterimUpdate(interim);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        this.isListening = false;
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if session is still actively running
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };
  }

  start() {
    this.fullTranscript = '';
    this.interimTranscript = '';
    this.fillersFound = [];
    this.wordCount = 0;
    this.wpm = 0;
    this.startTime = Date.now();
    this.isListening = true;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn("Recognition already started or error:", err);
      }
    }
  }

  stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {}
    }
  }

  addSimulatedSpeech(text) {
    this.fullTranscript += (this.fullTranscript ? ' ' : '') + text.trim();
    this.processFinalSnippet(text);
    this.updateStats();
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(this.fullTranscript, '');
    }
  }

  processFinalSnippet(snippet) {
    const lower = snippet.toLowerCase();

    // Check fillers
    this.fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        matches.forEach(() => {
          this.fillersFound.push(filler);
          if (this.onFillerDetected) this.onFillerDetected(filler);
        });
      }
    });

    // Check live signal with backend (debounced / on sentence boundary)
    if (this.onLiveSignalRequest && snippet.trim().length > 8) {
      this.onLiveSignalRequest(snippet, {
        wpm: this.wpm,
        words: this.wordCount
      });
    }
  }

  updateStats() {
    const words = (this.fullTranscript + ' ' + this.interimTranscript).trim().split(/\s+/).filter(Boolean);
    this.wordCount = words.length;

    if (this.startTime) {
      const elapsedMins = (Date.now() - this.startTime) / 60000;
      if (elapsedMins > 0.05) {
        this.wpm = Math.round(this.wordCount / elapsedMins);
      } else {
        this.wpm = 0;
      }
    }
  }

  getMetrics() {
    return {
      transcript: this.fullTranscript,
      wordCount: this.wordCount,
      wpm: this.wpm,
      fillersCount: this.fillersFound.length,
      fillersUsed: this.fillersFound
    };
  }

  highlightFillers(htmlText) {
    if (!htmlText) return '';
    let result = htmlText;
    this.fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b(${filler})\\b`, 'gi');
      result = result.replace(regex, `<span class="filler-highlight" title="Filler word">$1</span>`);
    });
    return result;
  }
}

window.SpeechManager = SpeechManager;
