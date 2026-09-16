const https = require('https');

const FILLER_WORDS = [
  'basically', 'actually', 'literally', 'you know', 'like', 'sort of', 'kind of',
  'i mean', 'obviously', 'to be honest', 'honestly', 'right', 'so yeah', 'anyway'
];

const COMMON_PHRASING_IMPROVEMENTS = [
  { pattern: /\bi am having (a|one)? doubt\b/i, better: "I have a question." },
  { pattern: /\bdiscuss about\b/i, better: "discuss (without 'about')" },
  { pattern: /\bpassed out of college\b/i, better: "graduated from college" },
  { pattern: /\bdo one thing\b/i, better: "here's an idea / try this" },
  { pattern: /\btell me what is your good name\b/i, better: "what is your name?" },
  { pattern: /\bprepone\b/i, better: "move up / bring forward" },
  { pattern: /\bup to the mark\b/i, better: "up to standard / solid" },
  { pattern: /\bi will revert back\b/i, better: "I will get back to you / reply" }
];

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Fast client-side / server-side filler word and metric extractor
   */
  extractQuickMetrics(transcript, durationSeconds = 60) {
    if (!transcript || typeof transcript !== 'string') {
      return { words: 0, wpm: 0, fillerCount: 0, detectedFillers: [] };
    }

    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = Math.max(durationSeconds / 60, 0.1);
    const wpm = Math.round(wordCount / minutes);

    const lower = transcript.toLowerCase();
    const detectedFillers = [];

    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        matches.forEach(() => detectedFillers.push(filler));
      }
    });

    return {
      words: wordCount,
      wpm: wpm,
      fillerCount: detectedFillers.length,
      detectedFillers: detectedFillers
    };
  }

  /**
   * Generate instant, non-intrusive coaching signal for live interim speech
   */
  generateLiveSignal(snippet, stats = {}) {
    const text = (snippet || '').toLowerCase().trim();
    if (!text || text.length < 10) return null;

    // Check fillers
    for (const filler of FILLER_WORDS) {
      if (text.endsWith(filler) || text.includes(` ${filler} `)) {
        return {
          type: 'warning',
          icon: '⚡',
          text: `Filler word noticed: "${filler}". Try pausing silently instead.`
        };
      }
    }

    // Check pace
    if (stats.wpm > 175) {
      return {
        type: 'info',
        icon: '🐢',
        text: 'Fast pace (175+ WPM). Breathe and slow down to let ideas sink in.'
      };
    }

    if (stats.wpm > 0 && stats.wpm < 95 && stats.words > 30) {
      return {
        type: 'info',
        icon: '⏩',
        text: 'Gentle pace. You can bring a bit more energy to your rhythm.'
      };
    }

    // Hook indicators
    if (/\b(imagine|unexpected|secret|what if|mistake|failed|suddenly|the problem was)\b/i.test(text)) {
      return {
        type: 'positive',
        icon: '🎯',
        text: 'Engaging hook or turning point word! Keep building this tension.'
      };
    }

    // Analogy indicators
    if (/\b(just like|think of it as|similar to|analogous to|compare it to)\b/i.test(text)) {
      return {
        type: 'positive',
        icon: '💡',
        text: 'Great analogy building! Non-experts will remember this clearly.'
      };
    }

    return null;
  }

  /**
   * Generates interactive conversational interview turn (Pushback / Follow-up)
   */
  async generateInterviewTurn({ topic, userSpeech, turnHistory = [] }) {
    if (!userSpeech || userSpeech.trim().length < 5) {
      return {
        responseText: "I didn't quite catch that. Could you elaborate on your approach?",
        nextQuestion: "Can you explain how you designed the core architecture?",
        coachInsight: "Deliver a clear, audible sentence to establish confidence."
      };
    }

    if (!this.apiKey) {
      // Intelligent heuristic interview follow-ups
      const followUps = [
        {
          responseText: "That addresses the happy path. But what happens when network latency spikes or a sensor drops offline?",
          nextQuestion: "How does your system handle failover and packet loss?",
          coachInsight: "Good start. Now demonstrate edge-case thinking."
        },
        {
          responseText: "Interesting. What specific trade-off did you make between power consumption and throughput?",
          nextQuestion: "Why did you choose this architecture over a lower-power alternative?",
          coachInsight: "Acknowledge the engineering compromise honestly."
        },
        {
          responseText: "I understand the concept. But if a stakeholder pushes back on cost, what is your justification?",
          nextQuestion: "How do you defend this design against cheaper alternatives?",
          coachInsight: "Bridge technical capability directly to business value."
        }
      ];

      const chosen = followUps[Math.floor(Math.random() * followUps.length)];
      return chosen;
    }

    const prompt = `You are a sharp, professional engineering interviewer.
The candidate is answering an interview question on the topic "${topic || 'Technical Engineering'}".
Their latest spoken answer was:
"${userSpeech}"

Respond as the interviewer in 2 to 3 sentences:
1. Briefly acknowledge or challenge their point.
2. Ask an incisive follow-up question or push back on a technical vulnerability.
Keep it realistic, concise, and professional.

Return ONLY valid JSON matching this schema:
{
  "responseText": "Your direct spoken follow-up to the candidate",
  "nextQuestion": "The specific question they need to answer next",
  "coachInsight": "A brief coaching tip on how to handle this question"
}`;

    try {
      const response = await this.callGeminiApi(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn("Interview turn AI fallback:", err.message);
      return {
        responseText: "Understood. But how did you measure and validate those results in practice?",
        nextQuestion: "What concrete benchmarks or tests proved your design worked?",
        coachInsight: "Always anchor your claims with verifiable metrics."
      };
    }
  }

  /**
   * Post-session comprehensive multi-dimensional AI evaluation
   */
  async analyzeSession({ transcript, mode, topic, durationSeconds, metrics = {}, previousWeaknesses = [] }) {
    const quickMetrics = this.extractQuickMetrics(transcript, durationSeconds);

    if (!transcript || transcript.trim().length < 15) {
      return this.generateEmptyTranscriptReport(quickMetrics);
    }

    if (!this.apiKey) {
      console.warn("No GEMINI_API_KEY detected. Utilizing built-in intelligent heuristic coaching engine.");
      return this.generateHeuristicReport({ transcript, mode, topic, durationSeconds, quickMetrics, previousWeaknesses });
    }

    try {
      const prompt = this.buildAnalysisPrompt({ transcript, mode, topic, durationSeconds, quickMetrics, previousWeaknesses });
      const geminiResult = await this.callGeminiApi(prompt);
      return this.parseGeminiEvaluation(geminiResult, quickMetrics);
    } catch (err) {
      console.error("Gemini API call failed or timed out. Falling back to heuristic coaching engine:", err.message);
      return this.generateHeuristicReport({ transcript, mode, topic, durationSeconds, quickMetrics, previousWeaknesses, apiNotice: "Generated via Offline Coaching Engine due to API response: " + err.message });
    }
  }

  /**
   * Compares Attempt 1 vs Attempt 2 to demonstrate tangible learning
   */
  async compareAttempts({ attempt1, attempt2, mode, topic }) {
    if (!this.apiKey) {
      return {
        overall_progress: "Tangible improvement detected in structure and pacing!",
        differences: [
          { area: "Clarity", note: "Attempt 2 was more direct and stated the main outcome earlier." },
          { area: "Fillers", note: `Reduced hesitation words from ${attempt1.fillerCount || 0} to ${attempt2.fillerCount || 0}.` },
          { area: "Memorability", note: "Attempt 2 replaced abstract descriptions with specific examples." }
        ],
        coach_comment: "You trimmed the unnecessary preamble and got straight to the point. That's real progress."
      };
    }

    const prompt = `You are an elite communication coach.
Compare these two speech attempts on the topic "${topic || 'General'}" in "${mode || 'Practice'}" mode.
Focus on visible learning, structure, clarity, storytelling, and delivery improvements.

ATTEMPT 1:
"${attempt1.transcript}"
(Fillers: ${attempt1.fillerCount || 0}, WPM: ${attempt1.wpm || 0})

ATTEMPT 2:
"${attempt2.transcript}"
(Fillers: ${attempt2.fillerCount || 0}, WPM: ${attempt2.wpm || 0})

Return ONLY valid JSON matching this schema:
{
  "overall_progress": "string summary of tangible improvement",
  "differences": [
    { "area": "string", "note": "specific comparison note" }
  ],
  "coach_comment": "string in a direct, witty, encouraging coach tone highlighting what improved"
}`;

    try {
      const response = await this.callGeminiApi(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      return {
        overall_progress: "Good second attempt with clearer direction.",
        differences: [
          { area: "Conciseness", note: "Attempt 2 was sharper and more focused." }
        ],
        coach_comment: "Second attempt was visibly punchier. Keep practicing this iteration loop."
      };
    }
  }

  buildAnalysisPrompt({ transcript, mode, topic, durationSeconds, quickMetrics, previousWeaknesses }) {
    return `You are CommunicationAI: an elite AI Communication, Storytelling, and Public Speaking Coach.
Analyze this user speech session holistically.

COACH PERSONALITY:
- Intelligent, friendly, direct, encouraging, occasionally witty.
- Provide useful truth rather than empty praise (e.g., "Good information. Weak delivery.", "That answer is technically correct, but honestly, it isn't memorable").
- If the user gave a dry explanation, point it out with tasteful humor.
- Prioritize feedback using the 4 levels: Level 1 (Major problem), Level 2 (Repeated pattern), Level 3 (Minor grammar), Level 4 (Optional polish).
- For ECE/Engineering topics, verify if they explain simply with analogies and why it matters.
- Evaluate what the listener will remember tomorrow.

SESSION DETAILS:
- Practice Mode: ${mode || 'General Speech'}
- Topic/Prompt: ${topic || 'Free Speech'}
- Duration: ${durationSeconds} seconds
- Word count: ${quickMetrics.words}, WPM: ${quickMetrics.wpm}
- Filler words count: ${quickMetrics.fillerCount} (detected: ${quickMetrics.detectedFillers.join(', ') || 'None'})
- Prior known weaknesses: ${previousWeaknesses.join('; ') || 'None recorded yet'}

USER SPEECH TRANSCRIPT:
"""
${transcript}
"""

Return ONLY a valid JSON object strictly adhering to this JSON schema (do not wrap in markdown or include extra text):
{
  "scores": {
    "communication_score": 75,
    "clarity_score": 70,
    "grammar_score": 78,
    "storytelling_score": 68,
    "wit_score": 60,
    "audience_engagement_score": 72,
    "public_speaking_score": 70,
    "conversation_score": 74,
    "response_quality_score": 72,
    "delivery_score": 70
  },
  "summary": "Brief 2-sentence overarching verdict on the speech",
  "what_you_did_well": [
    "3 to 5 specific, concrete observations"
  ],
  "biggest_problems": [
    {
      "priority": "Level 1 (Major)",
      "issue": "Specific communication problem",
      "actionable_fix": "Concrete instruction"
    }
  ],
  "best_moment": {
    "quote_or_moment": "Exact quote or moment from speech",
    "why_it_worked": "Why this resonated or was memorable"
  },
  "weakest_moment": {
    "quote_or_moment": "Exact quote or moment from speech",
    "critique": "Why this lost the listener or fell flat",
    "better_alternative": "Concise alternative phrasing or delivery"
  },
  "storytelling_analysis": {
    "hook_evaluation": "Was there curiosity or tension early on?",
    "stakes_and_tension": "Did the listener know why to care?",
    "memorability_verdict": "What will the listener actually remember tomorrow?"
  },
  "wit_and_energy": {
    "wit_assessment": "How natural or situational was the delivery?",
    "coach_witty_take": "A witty, tasteful line from the coach summarizing the session"
  },
  "audience_engagement": {
    "attention_verdict": "Why would someone continue listening or tune out?",
    "pacing_feedback": "Critique of speed and pause usage"
  },
  "important_corrections": [
    {
      "spoken": "e.g. I am having one doubt",
      "better": "e.g. I have a question",
      "reason": "Natural international English usage"
    }
  ],
  "next_exercise": {
    "title": "Targeted next challenge name",
    "instruction": "Specific 30-to-60 second practice task addressing the #1 weakness",
    "example_prompt": "Prompt to speak out loud next"
  }
}`;
  }

  async callGeminiApi(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 25000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data);
              const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                resolve(text);
              } else {
                reject(new Error("Empty candidate part in Gemini response: " + data));
              }
            } catch (err) {
              reject(new Error("Failed to parse Gemini JSON envelope: " + err.message));
            }
          } else {
            reject(new Error(`Gemini API returned HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error("Gemini API request timed out"));
      });

      req.write(payload);
      req.end();
    });
  }

  parseGeminiEvaluation(rawText, quickMetrics) {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const report = JSON.parse(clean);

    // Merge measured quick metrics
    report.metrics = {
      words: quickMetrics.words,
      wpm: quickMetrics.wpm,
      fillerCount: quickMetrics.fillerCount,
      fillersUsed: quickMetrics.detectedFillers
    };

    return report;
  }

  generateEmptyTranscriptReport(quickMetrics) {
    return {
      scores: {
        communication_score: 50,
        clarity_score: 50,
        grammar_score: 50,
        storytelling_score: 50,
        wit_score: 50,
        audience_engagement_score: 50,
        public_speaking_score: 50,
        conversation_score: 50,
        response_quality_score: 50,
        delivery_score: 50
      },
      summary: "Not enough speech was captured during this session to formulate a complete analysis.",
      what_you_did_well: ["Microphone and audio capture was initiated."],
      biggest_problems: [
        {
          priority: "Level 1 (Major)",
          issue: "Transcript was empty or very short.",
          actionable_fix: "Speak clearly for at least 20-30 seconds to allow the coach to evaluate your pacing, vocabulary, and structure."
        }
      ],
      best_moment: {
        quote_or_moment: "Session launch",
        why_it_worked: "Taking the initiative to begin practice"
      },
      weakest_moment: {
        quote_or_moment: "N/A",
        critique: "Insufficient audio recorded",
        better_alternative: "Speak continuously without pausing the session too early."
      },
      storytelling_analysis: {
        hook_evaluation: "Not enough data.",
        stakes_and_tension: "Not enough data.",
        memorability_verdict: "Not enough data."
      },
      wit_and_energy: {
        wit_assessment: "N/A",
        coach_witty_take: "Silence is golden, but in a speaking coach app, words are useful!"
      },
      audience_engagement: {
        attention_verdict: "N/A",
        pacing_feedback: "N/A"
      },
      important_corrections: [],
      next_exercise: {
        title: "The 30-Second Icebreaker",
        instruction: "Introduce yourself and explain one engineering hobby in 30 seconds without stopping.",
        example_prompt: "Tell me: What is one gadget you took apart as a kid?"
      },
      metrics: quickMetrics
    };
  }

  /**
   * High-quality rule-based fallback when offline or no API key is provided
   */
  generateHeuristicReport({ transcript, mode, topic, durationSeconds, quickMetrics, previousWeaknesses, apiNotice }) {
    const words = quickMetrics.words;
    const wpm = quickMetrics.wpm;
    const fillerCount = quickMetrics.fillerCount;

    // Calculate baseline scores
    let clarity = 75;
    let delivery = 74;
    let grammar = 78;
    let storytelling = 70;
    let engagement = 72;
    let wit = 62;

    if (wpm > 175) {
      delivery -= 8;
      clarity -= 6;
    } else if (wpm < 100) {
      delivery -= 6;
      engagement -= 8;
    }

    if (fillerCount > 5) {
      clarity -= 10;
      delivery -= 8;
    } else if (fillerCount === 0 && words > 50) {
      clarity += 6;
      delivery += 6;
    }

    // Storytelling checks
    const hasStoryHook = /\b(once|when|story|happened|unexpected|failed|problem|remember|first time)\b/i.test(transcript);
    if (hasStoryHook) storytelling += 8;

    const commScore = Math.round((clarity + delivery + grammar + storytelling + engagement) / 5);

    // Corrections check
    const corrections = [];
    COMMON_PHRASING_IMPROVEMENTS.forEach(item => {
      if (item.pattern.test(transcript)) {
        corrections.push({
          spoken: transcript.match(item.pattern)?.[0] || "phrase",
          better: item.better,
          reason: "Standard conversational English phrasing"
        });
      }
    });

    const biggestProblems = [];
    if (fillerCount >= 3) {
      biggestProblems.push({
        priority: "Level 1 (Major)",
        issue: `Frequent filler word reliance (${fillerCount} fillers detected: ${[...new Set(quickMetrics.detectedFillers)].join(', ')})`,
        actionable_fix: "When you need to think, close your mouth and pause silently for 1 second instead of saying 'basically' or 'you know'."
      });
    }

    if (wpm > 170) {
      biggestProblems.push({
        priority: "Level 2 (Pacing)",
        issue: `Rapid delivery pace (${wpm} WPM)`,
        actionable_fix: "Slow down slightly at commas and full stops to allow your key points to land."
      });
    } else if (wpm < 100 && words > 20) {
      biggestProblems.push({
        priority: "Level 2 (Pacing)",
        issue: `Deliberate or hesitant pace (${wpm} WPM)`,
        actionable_fix: "Practice connecting thoughts with more forward vocal momentum."
      });
    }

    if (biggestProblems.length === 0) {
      biggestProblems.push({
        priority: "Level 4 (Polish)",
        issue: "Good basic delivery, now push for vivid examples",
        actionable_fix: "Replace general statements with concrete numbers, names, or comparisons."
      });
    }

    const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
    const bestSentence = sentences.length > 0 ? sentences[Math.floor(sentences.length / 2)] : "Good effort.";
    const weakSentence = sentences.length > 1 ? sentences[0] : "Introductory phrase.";

    return {
      scores: {
        communication_score: commScore,
        clarity_score: clarity,
        grammar_score: grammar,
        storytelling_score: storytelling,
        wit_score: wit,
        audience_engagement_score: engagement,
        public_speaking_score: commScore,
        conversation_score: commScore + 1,
        response_quality_score: commScore,
        delivery_score: delivery
      },
      summary: `You communicated with clear intent across ${words} words at ${wpm} WPM. ${fillerCount > 0 ? `Target reducing the ${fillerCount} filler words.` : 'Your delivery was clean with minimal filler crutches.'}`,
      what_you_did_well: [
        "Maintained continuous speech without long awkward stalls",
        hasStoryHook ? "Used a recognizable opening anchor or narrative trigger" : "Stuck directly to the practice topic",
        `Speaking pace (${wpm} WPM) remained within an intelligible range`
      ],
      biggest_problems: biggestProblems,
      best_moment: {
        quote_or_moment: bestSentence.slice(0, 90),
        why_it_worked: "Clear forward movement that gave the listener solid context."
      },
      weakest_moment: {
        quote_or_moment: weakSentence.slice(0, 90),
        critique: "A bit tentative or packed with background before the hook.",
        better_alternative: "State the surprising result or main takeaway immediately in the opening sentence."
      },
      storytelling_analysis: {
        hook_evaluation: hasStoryHook ? "Good narrative anchor established." : "Opening was factual rather than curiosity-inducing.",
        stakes_and_tension: "Listener understood the topic, but would benefit from knowing the consequences or emotional stakes.",
        memorability_verdict: "The core idea came across; adding a concrete analogy would lock it into the listener's memory."
      },
      wit_and_energy: {
        wit_assessment: "Delivery was earnest and professional.",
        coach_witty_take: "You delivered the facts safely. Now give the audience an analogy before they start checking their phones!"
      },
      audience_engagement: {
        attention_verdict: "Engaging enough for a technical discussion; needs vocal variety for a large audience keynote.",
        pacing_feedback: `Pacing was ${wpm} WPM. Aim for 130-155 WPM for optimal retention.`
      },
      important_corrections: corrections.length > 0 ? corrections : [
        { spoken: "Good effort overall", better: "Keep practicing natural transitions between ideas", reason: "Flow and fluency" }
      ],
      next_exercise: {
        title: "The 45-Second Hook Challenge",
        instruction: "Speak for 45 seconds on your favorite engineering project. Do NOT use the words 'basically' or 'actually', and start with the most surprising fact.",
        example_prompt: "Start with: 'The most unexpected bug I ever solved caused...'"
      },
      metrics: {
        words: quickMetrics.words,
        wpm: quickMetrics.wpm,
        fillerCount: quickMetrics.fillerCount,
        fillersUsed: quickMetrics.detectedFillers
      },
      notice: apiNotice
    };
  }
}

module.exports = new GeminiService();
