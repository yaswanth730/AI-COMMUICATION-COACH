/**
 * CommunicationAI — Main Frontend Application Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentMode: 'free_speech',
    currentTopic: 'General Speech & Communication',
    targetDuration: 180,
    activePromptText: 'Speak naturally on any topic. The coach will evaluate clarity, storytelling, and delivery.',
    sessionRunning: false,
    sessionStartTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
    audioStream: null,
    lastSession: null,
    retryAttempt1: null,
    isRetryMode: false
  };

  // DOM Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewSections = document.querySelectorAll('.view-section');
  const btnStartSession = document.getElementById('btn-start-session');
  const btnPauseSession = document.getElementById('btn-pause-session');
  const sessionTimerEl = document.getElementById('session-timer');
  const liveWpmEl = document.getElementById('live-wpm-val');
  const liveFillersEl = document.getElementById('live-fillers-val');
  const transcriptBox = document.getElementById('transcript-stream');
  const signalContainer = document.getElementById('signals-stream');
  const activeModeBadge = document.getElementById('active-mode-badge');
  const activeTopicTitle = document.getElementById('active-topic-title');
  const roadmapStepsContainer = document.getElementById('roadmap-steps-preview');

  // Device controls
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const btnToggleMic = document.getElementById('btn-toggle-mic');
  const videoEl = document.getElementById('camera-feed');
  const visionCanvas = document.getElementById('vision-overlay-canvas');
  const waveCanvas = document.getElementById('audio-wave-canvas');

  // Report modal
  const reportModal = document.getElementById('report-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalCloseAction = document.getElementById('btn-modal-close-action');
  const btnModalRetry = document.getElementById('btn-modal-retry');

  // Simulation controls
  const simInput = document.getElementById('sim-input');
  const btnSimSend = document.getElementById('btn-sim-send');
  const simPresetBtns = document.querySelectorAll('.sim-preset-btn');

  // New Voice, Audio & Turn-Taking Systems
  const coachVoice = new CoachVoice();
  const audioRecorder = new AudioRecorder();
  const btnToggleVoice = document.getElementById('btn-toggle-voice');
  const voiceToggleText = document.getElementById('voice-toggle-text');
  const voiceDropdown = document.getElementById('voice-dropdown');
  const btnPreviewVoice = document.getElementById('btn-preview-voice');

  const interviewTurnBar = document.getElementById('interview-turn-bar');
  const turnStatusText = document.getElementById('turn-status-text');
  const btnDoneTurn = document.getElementById('btn-done-turn');

  // Visuals elements
  const gaugeNeedle = document.getElementById('gauge-needle');
  const pacingStatusPill = document.getElementById('pacing-status-pill');
  const coachPulseRing = document.getElementById('coach-pulse-ring');
  const coachStatusText = document.getElementById('coach-status-text');
  const coachSpeechBubble = document.getElementById('coach-speech-bubble');
  const reactionAnchor = document.getElementById('audience-reaction-anchor');

  let interviewTurnHistory = [];
  let lastTurnTranscriptLength = 0;

  // Floating Audience Reaction Trigger
  function triggerFloatingReaction(emoji, label) {
    if (!reactionAnchor) return;
    const badge = document.createElement('div');
    badge.className = 'floating-reaction-badge';
    badge.innerHTML = `<span>${emoji}</span><span>${escapeHtml(label)}</span>`;
    reactionAnchor.appendChild(badge);
    setTimeout(() => {
      try { badge.remove(); } catch (e) {}
    }, 3500);
  }

  // Dynamic Speedometer Needle Update
  function updateSpeedometer(wpm) {
    if (!gaugeNeedle) return;
    let angle = -90;
    if (wpm > 0) {
      angle = Math.min(90, Math.max(-90, ((wpm - 140) / 90) * 90));
    }
    gaugeNeedle.style.transform = `rotate(${angle}deg)`;

    if (pacingStatusPill) {
      if (wpm === 0) {
        pacingStatusPill.textContent = 'Ready';
        pacingStatusPill.className = 'pacing-status-pill';
      } else if (wpm < 110) {
        pacingStatusPill.textContent = 'Hesitant';
        pacingStatusPill.className = 'pacing-status-pill slow';
      } else if (wpm <= 165) {
        pacingStatusPill.textContent = 'Optimal Cadence';
        pacingStatusPill.className = 'pacing-status-pill optimal';
      } else {
        pacingStatusPill.textContent = 'Fast Cadence';
        pacingStatusPill.className = 'pacing-status-pill fast';
      }
    }
  }

  // Populate Natural Voice Selector
  function populateVoiceDropdown(voices, selected) {
    if (!voiceDropdown) return;
    voiceDropdown.innerHTML = voices.map(v => {
      const cleanName = v.name
        .replace(/(Microsoft|Google|Desktop|English|\(United States\)|\(United Kingdom\))/gi, '')
        .trim() || v.name;
      return `<option value="${v.voiceURI}" ${selected && selected.voiceURI === v.voiceURI ? 'selected' : ''}>
        ${escapeHtml(cleanName)} (${v.lang})
      </option>`;
    }).join('');
  }

  coachVoice.onVoicesReady = populateVoiceDropdown;
  if (coachVoice.availableVoices && coachVoice.availableVoices.length > 0) {
    populateVoiceDropdown(coachVoice.availableVoices, coachVoice.selectedVoice);
  }

  if (voiceDropdown) {
    voiceDropdown.addEventListener('change', () => {
      coachVoice.setVoiceByURI(voiceDropdown.value);
      coachVoice.preview("Voice selected. How does this natural tone sound to you?");
    });
  }

  if (btnPreviewVoice) {
    btnPreviewVoice.addEventListener('click', () => {
      coachVoice.preview();
    });
  }

  // Initialize Subsystems
  const audioVisualizer = new AudioVisualizer(waveCanvas);
  const visionManager = new VisionManager(videoEl, visionCanvas);

  const speechManager = new SpeechManager({
    onTranscriptUpdate: (full, interim) => {
      renderTranscript(full, interim);
      const wpm = speechManager.wpm || 0;
      liveWpmEl.textContent = wpm;
      liveFillersEl.textContent = speechManager.fillersFound.length || 0;
      updateSpeedometer(wpm);

      if (coachStatusText && state.sessionRunning) {
        coachStatusText.textContent = "Analyzing Speech Flow & Hooks";
        coachPulseRing.classList.remove('violet-speaking');
      }
    },
    onLiveSignalRequest: async (snippet, stats) => {
      try {
        const res = await fetch('/api/sessions/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snippet, stats })
        }).then(r => r.json());

        if (res.success && res.signal) {
          showCoachSignal(res.signal);
          if (res.signal.type === 'positive') {
            triggerFloatingReaction('💡', 'Great Point!');
          } else if (res.signal.type === 'warning') {
            triggerFloatingReaction('⚡', 'Filler Alert');
          }
        }
      } catch (e) {
        console.warn("Signal request failed:", e);
      }
    },
    onFillerDetected: (filler) => {
      showCoachSignal({
        type: 'warning',
        icon: '⚡',
        text: `Filler word noticed: "${filler}". Try pausing silently.`
      });
      triggerFloatingReaction('⚡', `Filler: "${filler}"`);
    }
  });

  const dashboardManager = new DashboardManager({
    onOpenSessionReport: (evaluation, session) => {
      renderPostSessionReport(evaluation, session);
    }
  });

  // Check Backend Health
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      const statusText = document.getElementById('nav-ai-status-text');
      if (statusText) {
        statusText.textContent = data.geminiConfigured
          ? `Gemini AI Online (${data.model})`
          : `Heuristic Coach Mode (Offline Ready)`;
      }
    })
    .catch(() => {
      const statusText = document.getElementById('nav-ai-status-text');
      if (statusText) statusText.textContent = "Offline Mode";
    });

  // Navigation Routing
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      navTabs.forEach(t => t.classList.remove('active'));
      viewSections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');
      const targetSec = document.getElementById(`view-${targetView}`);
      if (targetSec) targetSec.classList.add('active');

      if (targetView === 'analytics' || targetView === 'challenges') {
        dashboardManager.loadDashboard();
      }
    });
  });

  // Voice Toggle Listener
  if (btnToggleVoice) {
    btnToggleVoice.addEventListener('click', () => {
      const isVoiceOn = coachVoice.toggle();
      if (isVoiceOn) {
        btnToggleVoice.classList.add('voice-active');
        voiceToggleText.textContent = 'Voice: ON';
        coachVoice.speak("AI coach voice is now enabled.");
      } else {
        btnToggleVoice.classList.remove('voice-active');
        voiceToggleText.textContent = 'Voice: OFF';
      }
    });
  }

  // Conversational Interview Turn Handler
  if (btnDoneTurn) {
    btnDoneTurn.addEventListener('click', async () => {
      const fullText = speechManager.fullTranscript;
      const currentAnswer = fullText.slice(lastTurnTranscriptLength).trim() || fullText.trim();
      lastTurnTranscriptLength = fullText.length;

      turnStatusText.textContent = "🤖 Interviewer is thinking...";
      turnStatusText.parentElement.classList.add('speaking');

      try {
        const res = await fetch('/api/sessions/interview-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: state.currentTopic,
            userSpeech: currentAnswer,
            turnHistory: interviewTurnHistory
          })
        }).then(r => r.json());

        if (res.success && res.turn) {
          const { responseText, nextQuestion, coachInsight } = res.turn;
          interviewTurnHistory.push({ user: currentAnswer, interviewer: responseText });

          // Render interviewer bubble into transcript
          const bubble = document.createElement('div');
          bubble.style.cssText = "margin: 12px 0; padding: 12px 16px; background: rgba(139, 92, 246, 0.14); border-left: 3px solid var(--accent-violet); border-radius: 8px; font-size: 0.95rem; color: #fff;";
          bubble.innerHTML = `
            <div style="font-weight:700; color:var(--accent-violet); margin-bottom:4px;">🤖 Interviewer Follow-Up:</div>
            <div>${escapeHtml(responseText)}</div>
            <div style="margin-top:6px; color:var(--accent-cyan); font-weight:600;">"${escapeHtml(nextQuestion)}"</div>
            ${coachInsight ? `<div style="margin-top:4px; font-size:0.78rem; color:var(--text-muted); font-style:italic;">💡 Tip: ${escapeHtml(coachInsight)}</div>` : ''}
          `;
          transcriptBox.appendChild(bubble);
          transcriptBox.scrollTop = transcriptBox.scrollHeight;

          // Speak interviewer response aloud
          coachVoice.speak(`${responseText}. ${nextQuestion}`, () => {
            turnStatusText.textContent = "🎙️ Your Turn: Answer the Question";
            turnStatusText.parentElement.classList.remove('speaking');
          });
        }
      } catch (err) {
        console.warn("Turn request error:", err);
        turnStatusText.textContent = "🎙️ Your Turn: Answer the Question";
      }
    });
  }

  // Device Button Listeners
  btnToggleCamera.addEventListener('click', async () => {
    if (visionManager.isActive) {
      visionManager.stop();
      btnToggleCamera.classList.add('disabled-state');
    } else {
      const ok = await visionManager.start();
      if (ok) btnToggleCamera.classList.remove('disabled-state');
    }
  });

  btnToggleMic.addEventListener('click', () => {
    if (speechManager.isListening) {
      speechManager.stop();
      audioVisualizer.stop();
      btnToggleMic.classList.add('disabled-state');
    } else {
      speechManager.start();
      if (state.audioStream) audioVisualizer.start(state.audioStream);
      btnToggleMic.classList.remove('disabled-state');
    }
  });

  // Session Start / End Flow
  btnStartSession.addEventListener('click', async () => {
    if (!state.sessionRunning) {
      await startSession();
    } else {
      await endSession();
    }
  });

  async function startSession() {
    state.sessionRunning = true;
    state.sessionStartTime = Date.now();
    state.elapsedSeconds = 0;
    interviewTurnHistory = [];
    lastTurnTranscriptLength = 0;

    transcriptBox.innerHTML = '';
    liveWpmEl.textContent = '0';
    liveFillersEl.textContent = '0';

    btnStartSession.innerHTML = '<span>■</span> End & Analyze Session';
    btnStartSession.classList.add('recording');

    // Start Audio Stream & Audio Recorder
    try {
      state.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioVisualizer.start(state.audioStream);
      audioRecorder.start(state.audioStream);
    } catch (err) {
      console.warn("Microphone stream unavailable for visualizer/recorder:", err);
    }

    // Interview mode indicator & spoken opening prompt
    if (state.currentMode === 'interview') {
      interviewTurnBar.classList.add('active');
      turnStatusText.textContent = "Your Turn: Answer the Question";
      coachVoice.speak("Interview mode active. Speak your answer, and click Done Answering when ready for the next question.");
    } else {
      interviewTurnBar.classList.remove('active');
    }

    // Start Vision if enabled
    if (!visionManager.isActive && !btnToggleCamera.classList.contains('disabled-state')) {
      await visionManager.start();
    }

    // Start Speech Recognition
    speechManager.start();

    // Start Timer
    state.timerInterval = setInterval(() => {
      state.elapsedSeconds++;
      const mins = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(state.elapsedSeconds % 60).padStart(2, '0');
      sessionTimerEl.textContent = `${mins}:${secs}`;
    }, 1000);

    showCoachSignal({
      type: 'info',
      icon: '🎙️',
      text: 'Session started! Speak naturally — the coach will analyze your delivery.'
    });
  }

  async function endSession() {
    state.sessionRunning = false;
    clearInterval(state.timerInterval);
    btnStartSession.innerHTML = '<span>▶</span> Start Session';
    btnStartSession.classList.remove('recording');

    speechManager.stop();
    audioVisualizer.stop();
    await audioRecorder.stop();

    if (state.audioStream) {
      state.audioStream.getTracks().forEach(t => t.stop());
      state.audioStream = null;
    }

    interviewTurnBar.classList.remove('active');

    showCoachSignal({
      type: 'info',
      icon: '⏳',
      text: 'Analyzing session across communication, storytelling, and delivery...'
    });

    // Call Backend Evaluation
    const speechMetrics = speechManager.getMetrics();
    const cameraMetrics = visionManager.getMetrics();

    try {
      const response = await fetch('/api/sessions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: speechMetrics.transcript,
          mode: state.currentMode,
          topic: state.currentTopic,
          durationSeconds: Math.max(state.elapsedSeconds, 15),
          cameraMetrics
        })
      }).then(r => r.json());

      if (response.success) {
        state.lastSession = response.session;
        renderPostSessionReport(response.session.evaluation, response.session);
      } else {
        alert("Evaluation error: " + response.error);
      }
    } catch (err) {
      console.error("Analysis request failed:", err);
      alert("Failed to analyze session. Check server connectivity.");
    }
  }

  // Render Transcript Stream with Filler Highlights
  function renderTranscript(full, interim) {
    if (!full && !interim) {
      transcriptBox.innerHTML = `<div class="transcript-placeholder">
        <p>Live speech transcription will appear here as you speak...</p>
        <span style="font-size:0.8rem; color:var(--text-muted);">(You can also use the test simulator input below)</span>
      </div>`;
      return;
    }

    const formattedFull = speechManager.highlightFillers(escapeHtml(full));
    const formattedInterim = interim ? `<span class="transcript-interim">${escapeHtml(interim)}</span>` : '';

    transcriptBox.innerHTML = `<div>${formattedFull} ${formattedInterim}</div>`;
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
  }

  // Display Non-Intrusive Coach Signals
  function showCoachSignal({ type = 'info', icon = '💡', text = '' }) {
    signalContainer.innerHTML = `
      <div class="signal-toast ${type}">
        <span>${icon}</span>
        <span>${escapeHtml(text)}</span>
      </div>
    `;

    setTimeout(() => {
      if (signalContainer.innerText.includes(text)) {
        signalContainer.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Coach monitoring speech flow...</div>`;
      }
    }, 6000);
  }

  // Render Post-Session Modal Report
  function renderPostSessionReport(evalData, session) {
    if (!evalData) return;

    const scores = evalData.scores || {};
    document.getElementById('rep-overall-score').textContent = scores.communication_score || 70;
    document.getElementById('rep-summary-text').textContent = evalData.summary || "Solid practice session.";

    // Quick stats
    document.getElementById('rep-stat-words').textContent = evalData.metrics?.words || 0;
    document.getElementById('rep-stat-wpm').textContent = `${evalData.metrics?.wpm || 0} WPM`;
    document.getElementById('rep-stat-fillers').textContent = evalData.metrics?.fillerCount || 0;

    // Dimension cards
    const dimContainer = document.getElementById('rep-dimensions-grid');
    const dims = [
      { k: 'clarity_score', l: 'Clarity' },
      { k: 'storytelling_score', l: 'Storytelling' },
      { k: 'wit_score', l: 'Wit / Humor' },
      { k: 'audience_engagement_score', l: 'Engagement' },
      { k: 'grammar_score', l: 'English / Phrasing' },
      { k: 'delivery_score', l: 'Vocal Delivery' }
    ];

    dimContainer.innerHTML = dims.map(d => `
      <div class="dim-card">
        <span class="dim-card-title">${d.l}</span>
        <span class="dim-card-score">${scores[d.k] || 70}</span>
        <div class="dim-progress-bar">
          <div class="dim-progress-fill" style="width: ${scores[d.k] || 70}%;"></div>
        </div>
      </div>
    `).join('');

    // Render SVG Radar Chart
    const radarContainer = document.getElementById('rep-radar-container');
    if (radarContainer && window.RadarChart) {
      RadarChart.render(radarContainer, scores, state.retryAttempt1?.scores || null);
    }

    // Audio Player Setup
    const btnReplay = document.getElementById('btn-replay-audio');
    const audioMeta = document.getElementById('rep-audio-meta');
    if (btnReplay) {
      btnReplay.textContent = '▶';
      if (audioRecorder.audioUrl) {
        audioMeta.textContent = `Recorded Session Audio (${Math.round(state.elapsedSeconds || 15)}s) ready for playback`;
        btnReplay.onclick = () => {
          if (btnReplay.textContent === '▶') {
            audioRecorder.play();
            btnReplay.textContent = '⏸';
            audioRecorder.audioPlayer.onended = () => { btnReplay.textContent = '▶'; };
          } else {
            audioRecorder.pause();
            btnReplay.textContent = '▶';
          }
        };
      } else {
        audioMeta.textContent = "Audio review (Practice in microphone mode to capture recording)";
        btnReplay.onclick = null;
      }
    }

    window._replayAudioSnippet = (start, dur) => {
      audioRecorder.playSnippet(start, dur);
    };

    // What you did well
    const wellList = document.getElementById('rep-well-list');
    wellList.innerHTML = (evalData.what_you_did_well || [
      "Good continuous delivery", "Stayed on topic"
    ]).map(w => `<li class="positive">${escapeHtml(w)}</li>`).join('');

    // Biggest problems
    const problemsContainer = document.getElementById('rep-problems-container');
    problemsContainer.innerHTML = (evalData.biggest_problems || []).map(p => `
      <div class="problem-card-item">
        <div class="problem-badge">${p.priority || 'Issue'}</div>
        <div class="problem-text">${escapeHtml(p.issue)}</div>
        <div class="problem-action"><strong>Fix:</strong> ${escapeHtml(p.actionable_fix)}</div>
      </div>
    `).join('') || `<p style="color:var(--text-muted); font-size:0.86rem;">No major problems detected!</p>`;

    // Best & Weakest moments
    const bestBox = document.getElementById('rep-best-moment-box');
    if (evalData.best_moment) {
      bestBox.innerHTML = `
        <div class="quote-highlight-box">"${escapeHtml(evalData.best_moment.quote_or_moment || '')}"</div>
        <p style="font-size:0.84rem; color:var(--text-secondary);">${escapeHtml(evalData.best_moment.why_it_worked || '')}</p>
        ${audioRecorder.audioUrl ? `<button class="btn-snippet-replay" onclick="window._replayAudioSnippet(5, 6)">🔊 Replay Clip</button>` : ''}
      `;
    }

    const weakBox = document.getElementById('rep-weak-moment-box');
    if (evalData.weakest_moment) {
      weakBox.innerHTML = `
        <div class="quote-critique-box">"${escapeHtml(evalData.weakest_moment.quote_or_moment || '')}"</div>
        <p style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:6px;">${escapeHtml(evalData.weakest_moment.critique || '')}</p>
        <p style="font-size:0.84rem; color:var(--accent-cyan);"><strong>Better:</strong> "${escapeHtml(evalData.weakest_moment.better_alternative || '')}"</p>
        ${audioRecorder.audioUrl ? `<button class="btn-snippet-replay" onclick="window._replayAudioSnippet(0, 6)">🔊 Replay Clip</button>` : ''}
      `;
    }

    // Storytelling & Wit takes
    const storyBox = document.getElementById('rep-storytelling-box');
    if (evalData.storytelling_analysis) {
      storyBox.innerHTML = `
        <p style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:8px;"><strong>Hook:</strong> ${escapeHtml(evalData.storytelling_analysis.hook_evaluation || 'N/A')}</p>
        <p style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:8px;"><strong>Tension:</strong> ${escapeHtml(evalData.storytelling_analysis.stakes_and_tension || 'N/A')}</p>
        <p style="font-size:0.86rem; color:var(--accent-violet);"><strong>Memorability:</strong> ${escapeHtml(evalData.storytelling_analysis.memorability_verdict || 'N/A')}</p>
      `;
    }

    const witBox = document.getElementById('rep-wit-box');
    if (evalData.wit_and_energy) {
      witBox.innerHTML = `
        <p style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(evalData.wit_and_energy.wit_assessment || '')}</p>
        <div class="quote-highlight-box" style="border-color:var(--accent-violet);">
          <strong>Coach Take:</strong> "${escapeHtml(evalData.wit_and_energy.coach_witty_take || '')}"
        </div>
      `;
    }

    // Natural Phrasing Table
    const phrasingTbody = document.getElementById('rep-phrasing-tbody');
    if (evalData.important_corrections && evalData.important_corrections.length > 0) {
      phrasingTbody.innerHTML = evalData.important_corrections.map(c => `
        <tr>
          <td class="phrasing-spoken">${escapeHtml(c.spoken)}</td>
          <td class="phrasing-better">${escapeHtml(c.better)}</td>
          <td style="color:var(--text-muted);">${escapeHtml(c.reason || '')}</td>
        </tr>
      `).join('');
    } else {
      phrasingTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:12px;">Phrasing was natural and clear!</td></tr>`;
    }

    // Next Exercise
    const exBox = document.getElementById('rep-next-exercise-container');
    if (evalData.next_exercise) {
      exBox.innerHTML = `
        <h4 class="next-exercise-title">🎯 ${escapeHtml(evalData.next_exercise.title)}</h4>
        <p class="next-exercise-desc">${escapeHtml(evalData.next_exercise.instruction)}</p>
        <div class="next-exercise-prompt">"${escapeHtml(evalData.next_exercise.example_prompt)}"</div>
      `;
    }

    reportModal.classList.add('open');

    // Speak evaluation out loud if Coach Voice is enabled
    if (coachVoice.isEnabled) {
      const wittyTake = evalData.wit_and_energy?.coach_witty_take || "";
      coachVoice.speak(`${evalData.summary}. ${wittyTake}`);
    }
  }

  // Modal Closers
  btnCloseModal.addEventListener('click', () => reportModal.classList.remove('open'));
  btnModalCloseAction.addEventListener('click', () => reportModal.classList.remove('open'));

  // Retry Attempt 2 Button (Before / After Comparison)
  btnModalRetry.addEventListener('click', () => {
    reportModal.classList.remove('open');
    state.retryAttempt1 = {
      transcript: state.lastSession?.transcript || speechManager.fullTranscript,
      fillerCount: state.lastSession?.evaluation?.metrics?.fillerCount || 0,
      wpm: state.lastSession?.evaluation?.metrics?.wpm || 0
    };
    state.isRetryMode = true;

    // Switch to studio and prompt user
    document.querySelector('.nav-tab[data-view="studio"]').click();
    showCoachSignal({
      type: 'positive',
      icon: '🔄',
      text: 'Retry Mode (Attempt 2) Active! Apply your feedback and beat Attempt 1.'
    });
  });

  // Practice Modes Selection
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const modeKey = card.getAttribute('data-mode');
      selectPracticeMode(modeKey);
    });
  });

  function selectPracticeMode(modeKey) {
    state.currentMode = modeKey;

    if (modeKey === 'storytelling') {
      state.currentTopic = "The Time You Failed (Turning Point)";
      state.activePromptText = "Hook → Context → Problem → Tension → Turning Point → Resolution → Meaning";
      renderRoadmap(["Hook", "Context", "Problem", "Tension", "Turning Point", "Resolution", "Meaning"]);
    } else if (modeKey === 'technical_ece') {
      state.currentTopic = "VLSI & 6T SRAM Memory Cell (Level 2: Non-Technical Audience)";
      state.activePromptText = "Explain SRAM memory to an investor using a filing cabinet analogy. No jargon.";
      renderRoadmap(["Core Idea", "Real-World Analogy", "Everyday Example", "Why It Matters"]);
    } else if (modeKey === 'interview') {
      state.currentTopic = "Pressure Question: Handling Skepticism";
      state.activePromptText = "Interviewer: 'I don't think your design is scalable. Why should we believe you?'";
      renderRoadmap(["Acknowledge Concern", "Evidence / Metric", "Trade-Off Balance", "Confident Close"]);
    } else if (modeKey === 'public_speaking') {
      state.currentTopic = "3-Minute Keynote: Hardware in the AI Era";
      state.activePromptText = "Deliver a 3-minute presentation without filler words. Keep pacing at 140 WPM.";
      renderRoadmap(["Opening Hook", "The Core Tension", "2 Supporting Pillars", "Memorable Takeaway"]);
    } else if (modeKey === 'make_it_memorable') {
      state.currentTopic = "Make It Memorable: Step 2 (Vivid Contrast)";
      state.activePromptText = "Take an everyday explanation and add a striking contrast or memorable quote.";
      renderRoadmap(["Plain Statement", "Vivid Contrast", "30-Sec Sprint", "Analogy", "Tasteful Wit"]);
    } else {
      state.currentTopic = "General Communication & Fluency";
      state.activePromptText = "Speak freely on any topic with active coaching cues.";
      renderRoadmap(["Clear Opening", "Organized Flow", "Strong Conclusion"]);
    }

    activeModeBadge.textContent = modeKey.replace(/_/g, ' ');
    activeTopicTitle.textContent = state.currentTopic;

    // Navigate to studio
    document.querySelector('.nav-tab[data-view="studio"]').click();
  }

  function renderRoadmap(steps) {
    roadmapStepsContainer.innerHTML = steps.map(s => `<span class="roadmap-step-pill">${escapeHtml(s)}</span>`).join(' → ');
  }

  // Simulation / Fallback Presets
  btnSimSend.addEventListener('click', () => {
    const text = simInput.value.trim();
    if (text) {
      speechManager.addSimulatedSpeech(text);
      simInput.value = '';
    }
  });

  simInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnSimSend.click();
    }
  });

  simPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetType = btn.getAttribute('data-preset');
      let sampleText = "";

      if (presetType === 'story') {
        sampleText = "Basically, what happened was during my second year in college, I stayed up all night debugging a microcontroller firmware code. You know, it was literally 4 AM, and the sensor output was completely flatlined. I actually thought the hardware was fried. But then, unexpected turning point: I noticed a tiny cold solder joint on pin 7. In that moment, I realized that 90% of engineering bugs are simple assumptions you refused to double-check.";
      } else if (presetType === 'ece') {
        sampleText = "I am having one doubt about how SRAM works. Basically, think of SRAM like a collection of tiny, hyper-fast flip-flops on the chip. Unlike regular flash storage, it doesn't need to spin or refresh constantly. Actually, it uses six transistors per bit, which makes it expensive, but it delivers data in less than a nanosecond.";
      } else if (presetType === 'interview') {
        sampleText = "To be honest, when our project lead questioned our team's circuit design, I didn't get defensive. Instead, basically, I ran a transient power simulation and demonstrated that our peak leakage was within 12 milliwatts. The result was that we passed thermal qualification on the first pass.";
      }

      speechManager.addSimulatedSpeech(sampleText);
    });
  });

  // Daily Challenge Start Buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-start-challenge')) {
      const title = e.target.getAttribute('data-challenge-title');
      const prompt = e.target.getAttribute('data-challenge-prompt');

      state.currentMode = 'daily_challenge';
      state.currentTopic = title;
      state.activePromptText = prompt;

      activeModeBadge.textContent = 'Daily Challenge';
      activeTopicTitle.textContent = title;
      renderRoadmap(["Understand Prompt", "Think Structure", "Speak with Energy", "Complete Goal"]);

      document.querySelector('.nav-tab[data-view="studio"]').click();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial roadmap
  renderRoadmap(["Hook", "Context", "Problem", "Tension", "Turning Point", "Resolution", "Meaning"]);
});
