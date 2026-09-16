/**
 * CoachVoice — High-Fidelity AI Voice Speech Synthesis Engine
 * 
 * Specifically filters out muddy, robotic legacy desktop voices (e.g. Microsoft David)
 * and prioritizes natural, high-clarity neural English voices (Microsoft Natural, Google US/UK, Samantha).
 */
class CoachVoice {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.isEnabled = true;
    this.selectedVoice = null;
    this.availableVoices = [];
    
    // Crisp, natural speech modulation (avoiding heavy drone/bass)
    this.pitch = 1.06;
    this.rate = 1.02;
    this.volume = 1.0;

    this.onVoicesReady = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const load = () => {
      const allVoices = this.synth.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      // Filter for English voices, strictly blacklisting robotic low-quality legacy desktop voices
      const blacklistRobotic = [
        'david desktop',
        'mark desktop',
        'hazel desktop',
        'espeak',
        'sam desktop'
      ];

      const englishVoices = allVoices.filter(v => {
        const nameLower = v.name.toLowerCase();
        const isEnglish = v.lang.startsWith('en');
        const isBlacklisted = blacklistRobotic.some(bad => nameLower.includes(bad));
        return isEnglish && !isBlacklisted;
      });

      // Rank voices from most natural to standard
      this.availableVoices = (englishVoices.length > 0 ? englishVoices : allVoices).sort((a, b) => {
        const score = (v) => {
          const name = v.name.toLowerCase();
          // Top Tier: Online Natural Neural voices
          if (name.includes('online (natural)') || name.includes('natural')) return 100;
          if (name.includes('google us english') || name.includes('google uk english female')) return 90;
          if (name.includes('google')) return 80;
          if (name.includes('samantha') || name.includes('karen') || name.includes('victoria') || name.includes('serena')) return 70;
          if (name.includes('zira') || name.includes('aria') || name.includes('jenny')) return 60;
          return 10;
        };
        return score(b) - score(a);
      });

      // Load saved preference or select highest ranked natural voice
      const savedURI = localStorage.getItem('communicationai_voice_uri');
      if (savedURI) {
        this.selectedVoice = this.availableVoices.find(v => v.voiceURI === savedURI) || this.availableVoices[0];
      } else {
        this.selectedVoice = this.availableVoices[0];
      }

      if (this.onVoicesReady) {
        this.onVoicesReady(this.availableVoices, this.selectedVoice);
      }
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  setVoiceByURI(voiceURI) {
    const found = this.availableVoices.find(v => v.voiceURI === voiceURI);
    if (found) {
      this.selectedVoice = found;
      localStorage.setItem('communicationai_voice_uri', voiceURI);
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    return this.isEnabled;
  }

  preview(text = "Hello! I am your AI communication coach. How does this natural voice sound to you?") {
    if (!this.synth) return;
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;
    utterance.volume = this.volume;

    this.synth.speak(utterance);
  }

  speak(text, onEndCallback = null) {
    if (!this.synth || !this.isEnabled || !text) {
      if (onEndCallback) onEndCallback();
      return;
    }

    this.stop();

    // Clean text: strip markdown symbols, asterisks, formatting
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[Interviewer\]/gi, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;
    utterance.volume = this.volume;

    utterance.onend = () => {
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.warn("Coach voice synthesis warning:", e);
      if (onEndCallback) onEndCallback();
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  isSpeaking() {
    return Boolean(this.synth && this.synth.speaking);
  }
}

window.CoachVoice = CoachVoice;
