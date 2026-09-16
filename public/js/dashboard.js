/**
 * DashboardManager — Analytics, Long-Term Profile, Streaks & Session History
 */
class DashboardManager {
  constructor({ onOpenSessionReport }) {
    this.onOpenSessionReport = onOpenSessionReport;
    this.profile = null;
    this.sessions = [];
    this.challenges = [];
  }

  async loadDashboard() {
    try {
      const [profileRes, sessionsRes, challengesRes] = await Promise.all([
        fetch('/api/profile').then(r => r.json()),
        fetch('/api/sessions').then(r => r.json()),
        fetch('/api/challenges').then(r => r.json())
      ]);

      if (profileRes.success) this.profile = profileRes.profile;
      if (sessionsRes.success) this.sessions = sessionsRes.sessions;
      if (challengesRes.success) this.challenges = challengesRes.challenges;

      this.render();
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }

  render() {
    if (!this.profile) return;

    // Stat numbers
    document.getElementById('dash-overall-score').textContent = this.profile.communication_score || 72;
    document.getElementById('dash-sessions-count').textContent = this.profile.sessions_completed || 0;
    document.getElementById('dash-streak-days').textContent = `${this.profile.streak_days || 1} 🔥`;
    document.getElementById('dash-top-filler').textContent = `"${this.profile.most_common_filler || 'basically'}"`;

    // Speaking time
    const totalMins = Math.round((this.profile.total_speaking_seconds || 0) / 60);
    document.getElementById('dash-speaking-time').textContent = `${totalMins}m`;

    // Training goal
    const goalEl = document.getElementById('dash-target-goal');
    if (goalEl) goalEl.textContent = this.profile.target_training_goal || "Reduce filler words and strengthen opening hooks";

    // Multi-dimensional breakdown
    this.renderDimensionBreakdown();

    // Session History Table
    this.renderSessionHistory();

    // Challenges
    this.renderChallenges();
  }

  renderDimensionBreakdown() {
    const container = document.getElementById('dash-dimensions-container');
    if (!container) return;

    const dimensions = [
      { key: 'clarity_score', label: 'Clarity' },
      { key: 'storytelling_score', label: 'Storytelling' },
      { key: 'wit_score', label: 'Natural Wit' },
      { key: 'audience_engagement_score', label: 'Engagement' },
      { key: 'grammar_score', label: 'English / Phrasing' },
      { key: 'delivery_score', label: 'Vocal Delivery' },
      { key: 'public_speaking_score', label: 'Public Speaking' },
      { key: 'response_quality_score', label: 'Response & STAR' }
    ];

    container.innerHTML = dimensions.map(d => {
      const val = this.profile[d.key] || 70;
      return `
        <div class="dim-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="dim-card-title">${d.label}</span>
            <span class="dim-card-score">${val}</span>
          </div>
          <div class="dim-progress-bar">
            <div class="dim-progress-fill" style="width: ${val}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSessionHistory() {
    const tbody = document.getElementById('dash-history-tbody');
    if (!tbody) return;

    if (!this.sessions || this.sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">No sessions recorded yet. Start your first practice session in the Live Studio!</td></tr>`;
      return;
    }

    tbody.innerHTML = this.sessions.map(s => {
      const date = new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const score = s.evaluation?.scores?.communication_score || 70;
      const scoreClass = score >= 75 ? 'high' : 'med';
      const duration = `${Math.round(s.durationSeconds || 0)}s`;

      return `
        <tr>
          <td><strong>${s.mode.replace(/_/g, ' ')}</strong></td>
          <td>${s.topic || 'Practice'}</td>
          <td>${duration}</td>
          <td><span class="badge-score-pill ${scoreClass}">${score}</span></td>
          <td>
            <button class="btn-pill-action" data-session-id="${s.id}">View Report</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-session-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-session-id');
        const session = this.sessions.find(x => x.id === id);
        if (session && this.onOpenSessionReport) {
          this.onOpenSessionReport(session.evaluation, session);
        }
      });
    });
  }

  renderChallenges() {
    const container = document.getElementById('daily-challenges-container');
    if (!container) return;

    container.innerHTML = this.challenges.map(c => `
      <div class="challenge-item-card ${c.completed ? 'completed' : ''}">
        <div class="challenge-item-header">
          <span class="day-badge">Day ${c.day} Challenge</span>
          <span>${c.completed ? '✅ Completed' : '🎯 Incomplete'}</span>
        </div>
        <h4 style="color:#fff; font-size:1.05rem;">${c.title}</h4>
        <p style="font-size:0.86rem; color:var(--text-secondary);">${c.prompt}</p>
        <div>
          <button class="btn-pill-action btn-start-challenge" data-challenge-id="${c.id}" data-challenge-title="${c.title}" data-challenge-prompt="${c.prompt}">
            ${c.completed ? 'Practice Again' : 'Start Today\'s Challenge'}
          </button>
        </div>
      </div>
    `).join('');
  }
}

window.DashboardManager = DashboardManager;
