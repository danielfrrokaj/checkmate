class BackgroundTimer {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.totalSeconds = 0;
    this.isBreakTime = false;
    this.originalTime = 25;
    
    this.initializeMessageListener();
    this.loadState();
    
    // Listen for alarm
    chrome.alarms.onAlarm.addListener(() => this.tick());
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
    }
  }

  stopTimer() {
    this.isRunning = false;
    chrome.alarms.clear('timer');
    this.saveState();
    this.broadcastTime();
  }

  resetTimer() {
    this.stopTimer();
    this.isBreakTime = false;
    this.startTime = null;
    this.totalSeconds = 0;
    this.saveState();
    this.broadcastTime();
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
      const breakMinutes = this.getBreakTime(this.originalTime);
      this.isBreakTime = true;
      this.totalSeconds = breakMinutes * 60;
      this.startTimer();
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Time\'s up!',
        message: `Great work! You can now take a ${breakMinutes}-minute break.`,
        priority: 2
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