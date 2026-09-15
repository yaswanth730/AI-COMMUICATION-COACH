const test = require('node:test');
const assert = require('node:assert/strict');
const geminiService = require('../services/geminiService');
const dbService = require('../services/dbService');

test('geminiService: extractQuickMetrics correctly calculates words, wpm, and fillers', () => {
  const sample = "Basically what I am trying to say is that, actually, the circuit was designed with high efficiency. You know, it worked!";
  const metrics = geminiService.extractQuickMetrics(sample, 30); // 30 seconds = 0.5 min

  assert.ok(metrics.words >= 15, `Expected >= 15 words, got ${metrics.words}`);
  assert.ok(metrics.wpm >= 30, `Expected WPM >= 30, got ${metrics.wpm}`);
  assert.ok(metrics.fillerCount >= 3, `Expected at least 3 fillers, got ${metrics.fillerCount}`);
  assert.ok(metrics.detectedFillers.includes('basically'));
  assert.ok(metrics.detectedFillers.includes('actually'));
  assert.ok(metrics.detectedFillers.includes('you know'));
});

test('geminiService: generateLiveSignal triggers on filler word and hook', () => {
  const fillerSignal = geminiService.generateLiveSignal("and then basically", { wpm: 120 });
  assert.ok(fillerSignal !== null);
  assert.equal(fillerSignal.type, 'warning');
  assert.ok(fillerSignal.text.includes('basically'));

  const hookSignal = geminiService.generateLiveSignal("the unexpected turning point was this", { wpm: 120 });
  assert.ok(hookSignal !== null);
  assert.equal(hookSignal.type, 'positive');
  assert.ok(hookSignal.text.includes('hook') || hookSignal.text.includes('turning point'));
});

test('geminiService: generateHeuristicReport generates complete multi-dimensional analysis', () => {
  const transcript = "I am having one doubt about how SRAM works. Basically we store bits in flip flops. The unexpected thing was how fast it read data.";
  const quick = geminiService.extractQuickMetrics(transcript, 45);
  const report = geminiService.generateHeuristicReport({
    transcript,
    mode: 'technical_ece',
    topic: 'VLSI & SRAM',
    durationSeconds: 45,
    quickMetrics: quick,
    previousWeaknesses: []
  });

  assert.ok(report.scores.communication_score >= 40 && report.scores.communication_score <= 100);
  assert.ok(report.scores.clarity_score > 0);
  assert.ok(report.scores.storytelling_score > 0);
  assert.ok(Array.isArray(report.what_you_did_well));
  assert.ok(report.what_you_did_well.length >= 2);
  assert.ok(Array.isArray(report.biggest_problems));
  assert.ok(report.best_moment);
  assert.ok(report.next_exercise);
  assert.ok(report.important_corrections.length > 0);
  // Check natural phrasing catch: "I am having one doubt" -> "I have a question"
  const phrasing = report.important_corrections.find(c => c.spoken.includes('doubt'));
  assert.ok(phrasing, "Expected phrasing correction for 'I am having one doubt'");
});

test('dbService: profile reads and updates scores adaptively', () => {
  const initial = dbService.getProfile();
  assert.ok(initial.name);
  assert.ok(typeof initial.communication_score === 'number');

  const updated = dbService.updateProfileScores({
    communication_score: 85,
    clarity_score: 88,
    storytelling_score: 80
  }, 60, ['basically', 'actually']);

  assert.ok(updated.sessions_completed > 0);
  assert.ok(updated.total_speaking_seconds >= 60);
});

test('dbService: saves and retrieves sessions', () => {
  const testSession = {
    id: 'test-session-123',
    mode: 'storytelling',
    topic: 'A time you failed',
    durationSeconds: 65,
    transcript: 'Testing session storage.',
    evaluation: { scores: { communication_score: 80 } },
    createdAt: new Date().toISOString()
  };

  dbService.saveSession(testSession);
  const found = dbService.getSessionById('test-session-123');
  assert.ok(found);
  assert.equal(found.id, 'test-session-123');
  assert.equal(found.mode, 'storytelling');
});

test('geminiService: generateInterviewTurn generates realistic follow-up question', async () => {
  const turn = await geminiService.generateInterviewTurn({
    topic: 'Engineering Interview',
    userSpeech: 'We implemented a custom SRAM cache controller to minimize latency.',
    turnHistory: []
  });

  assert.ok(turn.responseText);
  assert.ok(turn.nextQuestion);
  assert.ok(turn.coachInsight);
});
