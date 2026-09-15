# CommunicationAI — Real-Time AI Communication, Storytelling & Public Speaking Coach

CommunicationAI is a production-quality, real-time AI speech and communication training system built around Google's Gemini models and modern web capabilities.

Unlike simple grammar checkers, CommunicationAI answers the core question:
> **"Did you communicate the idea clearly, naturally, memorably, and engagingly?"**

---

## 🌟 Key Features

### 1. Real-Time Live Coaching Studio
- **Microphone & Speech Audio Waveform**: Real-time canvas audio visualizer with dynamic frequency pulsating.
- **Continuous Speech Transcription**: Real-time speech recognition with interim highlighting and auto-scroll.
- **Live Cadence & Filler Tracking**: Live WPM (words-per-minute) gauge and real-time amber highlighting for filler words (`basically`, `actually`, `you know`, `literally`, `like`).
- **Non-Intrusive Live Coaching Signals**: Gentle, non-disruptive toast alerts (e.g., *"Good narrative hook!"*, *"Filler word noticed — pause silently"*, *"Pacing: 145 WPM (Optimal)"*).
- **AI Coach Spoken Voice (TTS)**: The AI Coach speaks out loud to narrate feedback, witty summaries, and interview follow-ups using Web Speech Synthesis. Includes an instant `Voice: ON/OFF` toggle.
- **Interactive Conversational Turn-Taking (Interview Mode)**: In Interview mode, the AI interviewer speaks realistic pushback questions aloud, waits for your spoken answer, and pushes back with challenging follow-ups.
- **Session Audio Recording & Timestamped Playback**: Records speech locally via `MediaRecorder` so you can replay your full session audio or click to replay specific moments (*"Best Moment"* and *"Weakest Moment"*).
- **8-Dimension SVG Radar Skill Chart**: Beautiful cybernetic spider/radar polygon visualizing Clarity, Storytelling, Wit, Engagement, Phrasing, Delivery, and Public Speaking.
- **Camera Presence HUD**: Strictly non-appearance eye-contact orientation reticle and head stability guide. (No appearance or attractiveness judgments, purely communication performance).
- **Privacy Controls**: Audio and video processed client-side. Dedicated camera and microphone mute controls; raw video is never stored.

### 2. Specialized Practice Modes
1. **Storytelling Coach (Signature)**:
   - Evaluates narrative hooks, curiosity, tension, stakes, turning points, and memorability: *"What will the listener remember tomorrow?"*
   - Step-by-step roadmap: `Hook → Context → Problem → Tension → Turning Point → Resolution → Meaning`.
2. **Technical Communication (ECE / Engineering)**:
   - Designed specifically for engineers explaining complex concepts (Embedded systems, IoT, VLSI, 6T SRAM).
   - Evaluates explanations across 3 audience tiers:
     - **Level 1 (Child / 10-year-old)**: Real-world analogies.
     - **Level 2 (Non-Technical Executive / Investor)**: Business value & zero-jargon.
     - **Level 3 (Senior Engineering Peer)**: Architecture, trade-offs, and metrics.
3. **Interview & Pressure Response**:
   - STAR framework training (`Situation, Task, Action, Result`).
   - Handles interviewer pushback and skepticism (*"I don't think your design is realistic. Why should we believe you?"*).
   - Training for admitting unknown questions without bluffing.
4. **Public Speaking Arena**:
   - Timed keynote presentations (1 min elevator pitch, 3 min keynote, 5 min technical showcase).
   - Cadence control and slide-free engagement.
5. **"Make It Memorable" Iterative Gauntlet**:
   - Level 1: Normal explanation.
   - Level 2: Add striking contrast.
   - Level 3: Strict 30-second sprint.
   - Level 4: Everyday analogy.
   - Level 5: Micro-story with stakes.
   - Level 6: Tasteful, situational wit.
6. **Free Speech Coach**:
   - Holistic open sandbox for spontaneous practice.

### 3. Comprehensive Post-Session Evaluation Report
- **8 Core Dimensions**: Communication, Clarity, Storytelling, Wit, Audience Engagement, English/Phrasing, Delivery, Response Quality.
- **Feedback Priority System**: Level 1 (Major problems), Level 2 (Repeated patterns), Level 3 (Grammar), Level 4 (Polish).
- **Strongest vs Weakest Moments**: Quotes exact speech phrases and explains why they succeeded or fell flat.
- **Natural Phrasing Table**: Replaces ESL / regional idioms with natural conversational expressions (e.g., *"I am having one doubt"* ➔ *"I have a question"*).
- **Coach Personality**: Direct, encouraging, honest, with tasteful wit (*"Good information. Weak delivery."*).
- **Before / After Retry Engine**: One-click *"Attempt 2"* button that compares your second attempt against your first to prove tangible learning.

### 4. Long-Term Progress & Streaks
- **Personal Communication Profile**: Persistent database tracking score evolution, speaking time, and streak days.
- **Pattern Detector**: Automatically detects recurring crutches over multiple sessions.
- **7-Day Adaptive Daily Challenges**: Progressive daily challenges with completion badges.

### 5. Intelligent Offline Fallback Mode
- If no Gemini API key is configured or network is unavailable, the application runs seamlessly using its built-in **Heuristic Coaching Engine**, guaranteeing that practice is never blocked.

---

## 🏗️ Architecture

```
communicationai/
├── public/
│   ├── css/
│   │   └── style.css            # Ultra-premium dark theme design system
│   ├── js/
│   │   ├── app.js               # Main application orchestrator & state manager
│   │   ├── speech.js            # Web Speech API recognition & filler analyzer
│   │   ├── vision.js            # Camera HUD, reticle & privacy controls
│   │   ├── audioVisualizer.js   # Canvas real-time audio waveform visualizer
│   │   └── dashboard.js         # Progress analytics, history & challenge views
│   └── index.html               # Semantic HTML5 Single Page Application
├── routes/
│   └── api.js                   # REST API routes (sessions, analysis, profile, topics)
├── services/
│   ├── dbService.js             # Atomic JSON file database (data/db.json)
│   └── geminiService.js         # Gemini API integration & heuristic fallback
├── tests/
│   └── app.test.js              # Automated unit and integration test suite
├── .env.example                 # Environment configuration template
├── package.json                 # Project dependencies and scripts
└── server.js                    # Express application entrypoint
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- Modern web browser (Chrome, Edge, Safari) with microphone access

### 2. Installation
```powershell
npm.cmd install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Add your Gemini API Key in `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
*(Note: If you leave `GEMINI_API_KEY` blank, the app will run in Offline Heuristic Coach Mode).*

### 4. Run the Application
```powershell
npm.cmd start
```
Open your browser at **[http://localhost:3000](http://localhost:3000)**.

### 5. Run Automated Tests
```powershell
npm.cmd test
```

---

## 🔒 Privacy & Security

1. **API Keys Protected**: `GEMINI_API_KEY` is loaded exclusively server-side via `dotenv` and is never sent to or visible in client JavaScript.
2. **Camera & Audio Privacy**:
   - Camera video stream is processed entirely client-side via HTML5 Canvas.
   - Raw video is never stored or transmitted over the network.
   - You can stop the camera or mute the microphone at any time using the on-screen toggle buttons.

---

## 🧪 Testing in Quiet Environments
In the Live Studio, you can either speak into the microphone or use the **Quick Simulator Bar** at the bottom of the transcript panel. Click on presets like **"Story Preset"**, **"ECE SRAM"**, or **"STAR Preset"** to immediately test the transcription, filler analysis, and report generation engines.
