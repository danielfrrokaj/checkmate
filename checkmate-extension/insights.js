class InsightsManager {
  constructor() {
    this.initializeEventListeners();
    this.loadInsights();
  }

  initializeEventListeners() {
    document.getElementById('backButton').addEventListener('click', () => {
      window.location.href = 'popup.html';
    });
  }

  async loadInsights() {
    const stats = await this.getFocusStats();
    this.updateInsights(stats);
  }

  async getFocusStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await chrome.storage.local.get(['focusSessions']);
    const sessions = stats.focusSessions || [];

    // Filter sessions for different time periods
    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startOfDay;
    });

    const weekSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startOfWeek;
    });

    const monthSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startOfMonth;
    });

    // Calculate totals
    const todayTotal = this.calculateTotalMinutes(todaySessions);
    const weekTotal = this.calculateTotalMinutes(weekSessions);
    const monthTotal = this.calculateTotalMinutes(monthSessions);

    // Calculate averages
    const weekAverage = weekTotal / 7;
    const monthAverage = monthTotal / now.getDate();

    return {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      weekAverage: weekAverage,
      monthAverage: monthAverage
    };
  }

  calculateTotalMinutes(sessions) {
    return sessions.reduce((total, session) => {
      const duration = parseInt(session.duration) || 0;
      return total + duration;
    }, 0);
  }

  updateInsights(stats) {
    document.getElementById('todayFocus').textContent = `${Math.round(stats.today)} min`;
    document.getElementById('weekFocus').textContent = `${Math.round(stats.week)} min`;
    document.getElementById('monthFocus').textContent = `${Math.round(stats.month)} min`;
    document.getElementById('weekAverage').textContent = `${Math.round(stats.weekAverage)} min`;
    document.getElementById('monthAverage').textContent = `${Math.round(stats.monthAverage)} min`;
  }
}

// Initialize insights when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const insights = new InsightsManager();
}); 