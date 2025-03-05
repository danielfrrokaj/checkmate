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
    this.checkFirstTime();
    
    // Create a separate alarm for badge updates with higher frequency
    chrome.alarms.create('badgeUpdate', {
      periodInMinutes: 1/60  // Update every second
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

  async checkFirstTime() {
    const result = await chrome.storage.local.get(['hasSeenInstructions']);
    if (!result.hasSeenInstructions) {
      // Show welcome notification with instructions
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: 'Welcome to Focus!',
        message: 'Click on the timer circle to start your first focus session. You can set custom times or use presets.',
        priority: 2
      });

      // Mark instructions as seen
      await chrome.storage.local.set({ hasSeenInstructions: true });
    }
  }

  updateBadge() {
    if (this.isBreakTime) {
      // For break time, show "rest"
      chrome.action.setBadgeText({ text: 'rest' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
    } else if (this.isRunning) {
      // For focus time, show remaining minutes
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const remainingSeconds = this.totalSeconds - elapsedSeconds;
      const minutes = Math.max(0, Math.floor(remainingSeconds / 60));
      chrome.action.setBadgeText({ text: minutes.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    } else if (this.totalSeconds > 0) {
      // When paused, show "pause"
      chrome.action.setBadgeText({ text: 'pause' });
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    } else {
      // When reset, show "0"
      chrome.action.setBadgeText({ text: '0' });
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    }
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
          this.isRunning = true;
          // Create alarm for break time updates
          chrome.alarms.create('timer', {
            periodInMinutes: 1/60
          });
          this.updateBadge();
          break;
        case 'STOP_BREAK':
          this.isBreakTime = false;
          this.breakStartTime = null;
          this.isRunning = false;
          chrome.alarms.clear('timer');
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
    if (!this.isRunning && !this.isBreakTime) return;

    if (this.isBreakTime) {
      this.broadcastTime();
      this.updateBadge();
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const remainingSeconds = this.totalSeconds - elapsedSeconds;
    
    if (remainingSeconds <= 0) {
      this.timerComplete();
    } else {
      this.broadcastTime();
      this.updateBadge();
    }
  }

  broadcastTime() {
    const time = this.getCurrentTime();
    if (time) {
      // Wrap the sendMessage in a try-catch to handle cases where popup is not open
      try {
        chrome.runtime.sendMessage({
          action: 'TIME_UPDATED',
          ...time
        });
      } catch (error) {
        // Silently handle the error - popup is not open
        console.debug('Popup not open, skipping message broadcast');
      }
      this.updateBadge(); // Update badge with each time broadcast
    }
  }

  getCurrentTime() {
    if (!this.isRunning && !this.startTime && !this.isBreakTime) return null;
    
    if (this.isBreakTime) {
      return {
        minutes: 0,
        seconds: 0,
        isRunning: true,
        isBreakTime: true
      };
    }
    
    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const remainingSeconds = this.totalSeconds - elapsedSeconds;
    
    return {
      minutes: Math.max(0, Math.floor(remainingSeconds / 60)),
      seconds: Math.max(0, remainingSeconds % 60),
      isRunning: this.isRunning,
      isBreakTime: this.isBreakTime
    };
  }

  getBreakTime(focusTime) {
    // Calculate break time based on focus time
    if (focusTime <= 25) return 5;
    if (focusTime <= 45) return 10;
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
      
      // Save focus session
      await this.saveFocusSession(this.originalTime);
      
      // Create notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Time\'s up!',
        message: `Great work! Suggested break time: ${suggestedBreak} minutes. Set your break time in the timer.`,
        priority: 2
      });

      // Send message to popup to show break time selection
      try {
        chrome.runtime.sendMessage({
          action: 'SHOW_BREAK_SELECTION',
          suggestedBreak,
          isBreakTime: true
        });
      } catch (error) {
        // Silently handle the error - popup is not open
        console.debug('Popup not open, skipping break selection message');
      }
    } else {
      this.resetTimer();
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Break time\'s over!',
        message: 'Ready to start another focus session?',
        priority: 2
      });
    }
  }

  async saveFocusSession(duration) {
    const stats = await chrome.storage.local.get(['focusSessions']);
    const sessions = stats.focusSessions || [];
    
    // Create a new session with proper date formatting
    const newSession = {
      date: new Date().toISOString(),
      duration: parseInt(duration) || 0
    };
    
    sessions.push(newSession);

    // Keep only last 30 days of sessions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filteredSessions = sessions.filter(session => 
      new Date(session.date) >= thirtyDaysAgo
    );

    await chrome.storage.local.set({ focusSessions: filteredSessions });
    
    // Log for debugging
    console.log('Saved focus session:', newSession);
    console.log('Total sessions:', filteredSessions.length);
  }
}

// Initialize background timer
const backgroundTimer = new BackgroundTimer(); 