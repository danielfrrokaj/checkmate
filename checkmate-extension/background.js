class BackgroundTimer {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.totalSeconds = 0;
    this.isBreakTime = false;
    this.originalTime = 25;
    this.breakStartTime = null;
    
    this.initializeMessageListener();
    this.loadState();
    
    // Create a separate alarm for badge updates
    chrome.alarms.create('badgeUpdate', {
      periodInMinutes: 1
    });
    
    // Listen for alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'timer') {
        this.tick();
      } else if (alarm.name === 'badgeUpdate') {
        this.updateBadge();
      }
    });

    // Set initial badge
    this.updateBadge();
  }

  updateBadge() {
    let minutes;
    if (this.isBreakTime && this.isRunning) {
      // For break time, show elapsed minutes
      minutes = Math.floor((Date.now() - this.breakStartTime) / 60000);
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
    } else if (this.isRunning) {
      // For focus time, show remaining minutes
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const remainingSeconds = this.totalSeconds - elapsedSeconds;
      minutes = Math.max(0, Math.floor(remainingSeconds / 60));
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    } else {
      // When stopped, show current set minutes
      minutes = Math.floor(this.totalSeconds / 60);
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    }
    
    chrome.action.setBadgeText({ text: minutes.toString() });
  }

  async loadState() {
    const state = await chrome.storage.local.get([
      'isRunning',
      'startTime',
      'totalSeconds',
      'isBreakTime',
      'originalTime'
    ]);

    if (state.startTime) {
      this.isRunning = state.isRunning;
      this.startTime = state.startTime;
      this.totalSeconds = state.totalSeconds;
      this.isBreakTime = state.isBreakTime;
      this.originalTime = state.originalTime;

      if (this.isRunning) {
        this.startTimer();
      }
    }
  }

  initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'START_TIMER':
          this.startTimer(message.minutes, message.seconds);
          break;
        case 'STOP_TIMER':
          this.stopTimer();
          break;
        case 'RESET_TIMER':
          this.resetTimer();
          break;
        case 'GET_TIME':
          const time = this.getCurrentTime();
          sendResponse(time);
          break;
        case 'START_BREAK':
          this.breakStartTime = message.startTime;
          this.isBreakTime = true;
          this.updateBadge();
          break;
        case 'STOP_BREAK':
          this.isBreakTime = false;
          this.breakStartTime = null;
          this.updateBadge();
          break;
      }
      return true;
    });
  }

  startTimer(minutes, seconds) {
    if (!this.isRunning) {
      if (minutes !== undefined && seconds !== undefined) {
        this.totalSeconds = (minutes * 60) + seconds;
        this.originalTime = minutes;
      }
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      // Create alarm that fires every second
      chrome.alarms.create('timer', {
        periodInMinutes: 1/60
      });
      
      this.saveState();
      this.broadcastTime();
      this.updateBadge();
    }
  }

  stopTimer() {
    this.isRunning = false;
    chrome.alarms.clear('timer');
    this.saveState();
    this.broadcastTime();
    this.updateBadge();
  }

  resetTimer() {
    this.stopTimer();
    this.isBreakTime = false;
    this.startTime = null;
    this.breakStartTime = null;
    this.totalSeconds = 25 * 60; // Reset to 25 minutes
    this.isRunning = false;
    this.saveState();
    this.updateBadge();
    
    // Send a reset notification to update the UI
    chrome.runtime.sendMessage({
      action: 'TIME_UPDATED',
      minutes: 25,
      seconds: 0,
      isRunning: false,
      isBreakTime: false
    });
  }

  tick() {
    if (!this.isRunning) return;

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const remainingSeconds = this.totalSeconds - elapsedSeconds;
    
    if (remainingSeconds <= 0) {
      this.timerComplete();
    } else {
      this.broadcastTime();
    }
  }

  broadcastTime() {
    const time = this.getCurrentTime();
    if (time) {
      chrome.runtime.sendMessage({
        action: 'TIME_UPDATED',
        ...time
      });
    }
  }

  getCurrentTime() {
    if (!this.isRunning && !this.startTime) return null;
    
    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const remainingSeconds = this.totalSeconds - elapsedSeconds;
    
    return {
      minutes: Math.floor(remainingSeconds / 60),
      seconds: remainingSeconds % 60,
      isRunning: this.isRunning,
      isBreakTime: this.isBreakTime
    };
  }

  getBreakTime(focusMinutes) {
    if (focusMinutes <= 30) return 5;
    if (focusMinutes <= 60) return 10;
    return 15;
  }

  async saveState() {
    await chrome.storage.local.set({
      isRunning: this.isRunning,
      startTime: this.startTime,
      totalSeconds: this.totalSeconds,
      isBreakTime: this.isBreakTime,
      originalTime: this.originalTime
    });
  }

  async timerComplete() {
    this.stopTimer();
    
    if (!this.isBreakTime) {
      const suggestedBreak = this.getBreakTime(this.originalTime);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Time\'s up!',
        message: `Great work! Suggested break time: ${suggestedBreak} minutes. Set your break time in the timer.`,
        priority: 2
      });

      // Send message to popup to show break time selection
      chrome.runtime.sendMessage({
        action: 'SHOW_BREAK_SELECTION',
        suggestedBreak,
        isBreakTime: true
      });
    } else {
      this.resetTimer();
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Break time\'s over!',
        message: 'Ready to start another focus session?',
        priority: 2
      });
    }
  }
}

// Initialize background timer
const backgroundTimer = new BackgroundTimer(); 