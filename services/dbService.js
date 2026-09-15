const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  profile: {
    name: "User",
    communication_score: 72,
    clarity_score: 70,
    grammar_score: 75,
    storytelling_score: 65,
    wit_score: 60,
    audience_engagement_score: 68,
    public_speaking_score: 70,
    conversation_score: 72,
    response_quality_score: 71,
    delivery_score: 73,
    sessions_completed: 0,
    total_speaking_seconds: 0,
    streak_days: 1,
    last_practice_date: new Date().toISOString().split('T')[0],
    most_common_filler: "basically",
    strengths: [
      "Good domain knowledge in technical and engineering topics",
      "Willingness to explain concepts with relatable everyday ideas"
    ],
    weaknesses: [
      "Relying on filler words ('basically', 'actually', 'you know')",
      "Taking too long to reach the main hook or punchline in stories"
    ],
    recurring_patterns: [
      { pattern: "Filler word crutch", description: "Frequently starts sentences with 'Basically' or 'You know'", frequency: 4 },
      { pattern: "Delayed point", description: "Provides background details before stating the core takeaway", frequency: 3 }
    ],
    target_training_goal: "Improve storytelling tension & reduce filler words by 50%"
  },
  sessions: [],
  retries: [],
  challenges: [
    { id: 1, day: 1, title: "Embarrassing Mistake", prompt: "Tell a 60-second story about an embarrassing mistake and what it taught you.", completed: false },
    { id: 2, day: 2, title: "Zero-Jargon Tech", prompt: "Explain how a microcontroller works without using any technical jargon.", completed: false },
    { id: 3, day: 3, title: "30-Second Pressure", prompt: "Answer 'Why should we believe your technical design will scale?' in under 30 seconds.", completed: false },
    { id: 4, day: 4, title: "Surprising Turn", prompt: "Tell a story where the listener expects one outcome, but something unexpected happens.", completed: false },
    { id: 5, day: 5, title: "Tasteful Wit", prompt: "Explain a frustrating technical bug with one moment of light situational humor.", completed: false },
    { id: 6, day: 6, title: "Disagreement Grace", prompt: "Respond constructively to a teammate who claims your approach will definitely fail.", completed: false },
    { id: 7, day: 7, title: "3-Minute Keynote", prompt: "Deliver a 3-minute presentation on why hardware/software co-design matters.", completed: false }
  ]
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, returning default:", err);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDb(data) {
  ensureDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("writeDb failed:", err.message);
  }
}

const dbService = {
  getProfile() {
    const db = readDb();
    return db.profile;
  },

  updateProfileScores(scores, sessionDurationSeconds = 0, fillersUsed = []) {
    const db = readDb();
    const p = db.profile;

    p.sessions_completed += 1;
    p.total_speaking_seconds += sessionDurationSeconds;

    // Check streak
    const today = new Date().toISOString().split('T')[0];
    if (p.last_practice_date !== today) {
      const last = new Date(p.last_practice_date);
      const curr = new Date(today);
      const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        p.streak_days += 1;
      } else if (diffDays > 1) {
        p.streak_days = 1;
      }
      p.last_practice_date = today;
    }

    // Adaptive moving average for scores
    const weight = 0.35; // 35% weight to newest session
    const scoreKeys = [
      'communication_score', 'clarity_score', 'grammar_score',
      'storytelling_score', 'wit_score', 'audience_engagement_score',
      'public_speaking_score', 'conversation_score', 'response_quality_score', 'delivery_score'
    ];

    scoreKeys.forEach(k => {
      if (scores[k] !== undefined && scores[k] !== null) {
        const oldVal = p[k] || 70;
        p[k] = Math.round(oldVal * (1 - weight) + scores[k] * weight);
      }
    });

    // Update top filler
    if (fillersUsed && fillersUsed.length > 0) {
      const counts = {};
      fillersUsed.forEach(f => {
        counts[f] = (counts[f] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) p.most_common_filler = top[0];
    }

    writeDb(db);
    return p;
  },

  saveSession(sessionData) {
    const db = readDb();
    db.sessions.unshift(sessionData);
    if (db.sessions.length > 100) {
      db.sessions = db.sessions.slice(0, 100);
    }
    writeDb(db);
    return sessionData;
  },

  getSessions(limit = 20) {
    const db = readDb();
    return db.sessions.slice(0, limit);
  },

  getSessionById(id) {
    const db = readDb();
    return db.sessions.find(s => s.id === id);
  },

  saveRetry(retryData) {
    const db = readDb();
    db.retries.unshift(retryData);
    writeDb(db);
    return retryData;
  },

  getChallenges() {
    const db = readDb();
    return db.challenges;
  },

  completeChallenge(id) {
    const db = readDb();
    const ch = db.challenges.find(c => c.id === parseInt(id, 10));
    if (ch) {
      ch.completed = true;
      writeDb(db);
    }
    return ch;
  }
};

module.exports = dbService;
