const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dbService = require('../services/dbService');
const geminiService = require('../services/geminiService');

const PRACTICE_TOPICS = {
  storytelling: [
    {
      id: 'story-1',
      title: "The Time You Failed",
      prompt: "Tell a 90-second story about a time you failed at something, how it felt in that exact moment, and the turning point that changed how you think today.",
      targetStructure: "Hook → Context → Problem → Tension → Turning Point → Resolution → Meaning"
    },
    {
      id: 'story-2',
      title: "The Unexpected College Turn",
      prompt: "Describe the most surprising or unexpected event that happened to you in college or lab, without using generic filler phrases.",
      targetStructure: "Curiosity opening → Vivid moment → Surprise → What you learned"
    },
    {
      id: 'story-3',
      title: "Everyday Event, High Drama",
      prompt: "Take a completely mundane daily event (like waiting for code to compile, or missing a bus) and narrate it with genuine suspense.",
      targetStructure: "Stakes → Micro-tension → Surprising detail → Clean punchline"
    },
    {
      id: 'story-4',
      title: "Tech Concept as a Story",
      prompt: "Explain how memory or a sensor works by anthropomorphizing it into characters with an urgent mission.",
      targetStructure: "Characters → Conflict → Climax → Reality translation"
    }
  ],
  technical_ece: [
    {
      id: 'ece-1',
      topic: "Embedded Systems & Microcontrollers",
      levels: {
        level1_child: "Explain what a microcontroller is to a 10-year-old child using a kitchen or brain analogy.",
        level2_layman: "Explain how an embedded system controls a smart thermostat to a business investor.",
        level3_engineer: "Explain interrupt latency and register configuration to an embedded firmware engineer."
      }
    },
    {
      id: 'ece-2',
      topic: "VLSI & SRAM Memory Cell",
      levels: {
        level1_child: "Explain why computer chips have memory using lockers or toy boxes as an analogy.",
        level2_layman: "Explain why fast chip memory (SRAM) is more expensive than regular hard drives to a non-tech buyer.",
        level3_engineer: "Explain 6T SRAM read/write stability margins and leakage dissipation to a VLSI designer."
      }
    },
    {
      id: 'ece-3',
      topic: "IoT & Wireless Sensor Networks",
      levels: {
        level1_child: "Explain how smart streetlights talk to each other without wires.",
        level2_layman: "Explain the business benefits of low-power IoT monitoring for factory machinery.",
        level3_engineer: "Discuss trade-offs between LoRaWAN, BLE, and Zigbee for dense battery-operated sensor networks."
      }
    }
  ],
  interview: [
    {
      id: 'int-1',
      type: "Self-Introduction & Hook",
      question: "Tell me about yourself and what drives your engineering curiosity.",
      coachTip: "Avoid reciting your resume line-by-line. Give a memorable hook, your primary engineering passion, and a recent breakthrough."
    },
    {
      id: 'int-2',
      type: "STAR Behavioral",
      question: "Describe a high-stakes project where things went completely wrong. What did you personally do?",
      coachTip: "Use STAR (Situation, Task, Action, Result). Spend 70% of your time on Action and Result."
    },
    {
      id: 'int-3',
      type: "Pushback / Pressure Question",
      question: "Frankly, I don't think your proposed architecture is realistic or cost-effective. Why should we believe you?",
      coachTip: "Don't get defensive. Acknowledge their concern with confidence, cite one data point or prototype evidence, and restate the trade-off."
    },
    {
      id: 'int-4',
      type: "Unknown Question / Intellectual Honesty",
      question: "How would you implement quantum-safe encryption on a resource-constrained 8-bit MCU?",
      coachTip: "Do not bluff. Demonstrate how you think: acknowledge constraints, reason from first principles, and explain how you would research it."
    }
  ],
  public_speaking: [
    { id: 'ps-1', duration: 60, title: "1-Minute Elevator Pitch", prompt: "Pitch your favorite engineering project or idea in 60 seconds with a hook and call to action." },
    { id: 'ps-2', duration: 180, title: "3-Minute Keynote", prompt: "Present on 'Why Artificial Intelligence Needs Better Hardware Engineers'." },
    { id: 'ps-3', duration: 300, title: "5-Minute Tech Showcase", prompt: "Deliver a 5-minute technical presentation explaining a complex system to a mixed audience." }
  ],
  make_it_memorable: [
    { step: 1, prompt: "State your idea or project in your normal speaking voice." },
    { step: 2, prompt: "Now make that memorable: Add an unexpected contrast or vivid hook." },
    { step: 3, prompt: "Now explain it in strictly under 30 seconds." },
    { step: 4, prompt: "Now explain it using a memorable real-world analogy." },
    { step: 5, prompt: "Now tell it as a 45-second micro-story with stakes." },
    { step: 6, prompt: "Now add one tasteful, light witty observation." }
  ]
};

// Health Check
router.get('/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ok',
    app: 'CommunicationAI',
    geminiConfigured: hasKey,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    mode: hasKey ? 'live_ai' : 'heuristic_offline'
  });
});

// Profile & Progress
router.get('/profile', (req, res) => {
  try {
    const profile = dbService.getProfile();
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sessions List
router.get('/sessions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const sessions = dbService.getSessions(limit);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Session
router.get('/sessions/:id', (req, res) => {
  try {
    const session = dbService.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Practice Modes & Topics
router.get('/modes/topics', (req, res) => {
  res.json({ success: true, topics: PRACTICE_TOPICS });
});

// Start Session
router.post('/sessions/start', (req, res) => {
  const { mode = 'free_speech', topic = 'Open Practice', duration = 180 } = req.body;
  const sessionId = uuidv4();
  res.json({
    success: true,
    sessionId,
    mode,
    topic,
    targetDuration: duration,
    startedAt: new Date().toISOString()
  });
});

// Real-time Interim Coaching Signal (Non-intrusive)
router.post('/sessions/signal', (req, res) => {
  const { snippet, stats = {} } = req.body;
  const signal = geminiService.generateLiveSignal(snippet, stats);
  res.json({ success: true, signal });
});

// Interactive Conversational Interview Turn (AI speaks follow-up / pushback)
router.post('/sessions/interview-turn', async (req, res) => {
  try {
    const { topic = 'Engineering Interview', userSpeech = '', turnHistory = [] } = req.body;
    const turnResult = await geminiService.generateInterviewTurn({ topic, userSpeech, turnHistory });
    res.json({ success: true, turn: turnResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Analyze Session (Post-Session Comprehensive Evaluation)
router.post('/sessions/analyze', async (req, res) => {
  try {
    const {
      id = uuidv4(),
      transcript = '',
      mode = 'free_speech',
      topic = 'Open Practice',
      durationSeconds = 60,
      cameraMetrics = {}
    } = req.body;

    const profile = dbService.getProfile();
    const previousWeaknesses = profile.weaknesses || [];

    const evaluation = await geminiService.analyzeSession({
      transcript,
      mode,
      topic,
      durationSeconds,
      metrics: cameraMetrics,
      previousWeaknesses
    });

    // Update Profile scores & history
    const updatedProfile = dbService.updateProfileScores(
      evaluation.scores || {},
      durationSeconds,
      evaluation.metrics?.fillersUsed || []
    );

    const sessionRecord = {
      id,
      mode,
      topic,
      durationSeconds,
      transcript,
      cameraMetrics,
      evaluation,
      createdAt: new Date().toISOString()
    };

    dbService.saveSession(sessionRecord);

    res.json({
      success: true,
      session: sessionRecord,
      profile: updatedProfile
    });
  } catch (err) {
    console.error("Error in /api/sessions/analyze:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Before/After Retry Comparison
router.post('/sessions/retry', async (req, res) => {
  try {
    const { attempt1, attempt2, mode, topic } = req.body;
    if (!attempt1 || !attempt2) {
      return res.status(400).json({ success: false, error: "Both attempt1 and attempt2 are required." });
    }

    const comparison = await geminiService.compareAttempts({ attempt1, attempt2, mode, topic });
    const retryRecord = {
      id: uuidv4(),
      mode,
      topic,
      attempt1,
      attempt2,
      comparison,
      createdAt: new Date().toISOString()
    };
    dbService.saveRetry(retryRecord);

    res.json({ success: true, retry: retryRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Daily Challenges
router.get('/challenges', (req, res) => {
  try {
    const challenges = dbService.getChallenges();
    res.json({ success: true, challenges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/challenges/:id/complete', (req, res) => {
  try {
    const ch = dbService.completeChallenge(req.params.id);
    res.json({ success: true, challenge: ch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
