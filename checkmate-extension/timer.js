class Timer {
  constructor() {
    this.minutes = 25;
    this.seconds = 0;
    this.isRunning = false;
    this.isBreakTime = false;
    this.originalTime = 25;
    this.breakStartTime = 0;
    
    this.minutesDisplay = document.getElementById('minutes');
    this.secondsDisplay = document.getElementById('seconds');
    this.timerCircle = document.getElementById('timerCircle');
    this.stopBreakBtn = document.getElementById('stopBreak');
    this.stopRestBtn = document.getElementById('stopRest');
    this.normalControls = document.querySelector('.normal-controls');
    this.timerSection = document.querySelector('.timer-section');
    
    this.initializeEventListeners();
    this.initializeMessageListener();
    this.syncWithBackground();
  }

  initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'TIME_UPDATED') {
        if (this.isBreakTime && message.isRunning) {
          // During break, calculate elapsed minutes
          const elapsedMinutes = Math.floor((Date.now() - this.breakStartTime) / 60000);
          this.minutes = elapsedMinutes;
          this.seconds = Math.floor(((Date.now() - this.breakStartTime) % 60000) / 1000);
        } else {
          this.minutes = message.minutes;
          this.seconds = message.seconds;
        }
        this.isRunning = message.isRunning;
        this.isBreakTime = message.isBreakTime;
        this.updateDisplay();
        this.updateTimerState();
      } else if (message.action === 'SHOW_BREAK_SELECTION') {
        this.showBreakSelection(message.suggestedBreak);
      }
    });
  }

  showBreakSelection(suggestedBreak) {
    this.isBreakTime = true;
    this.minutes = 0;
    this.seconds = 0;
    this.breakStartTime = Date.now();
    this.updateDisplay();
    
    // Show break time UI
    document.querySelector('.timer-section').classList.add('break-time');
    document.querySelector('h1').textContent = 'Break Time!';
    this.normalControls.style.display = 'none';
    this.stopBreakBtn.style.display = 'block';
    this.timerCircle.setAttribute('data-running', 'true');
    
    // Start break timer
    chrome.runtime.sendMessage({
      action: 'START_BREAK',
      startTime: this.breakStartTime
    });
  }

  updateTimerState() {
    this.timerCircle.setAttribute('data-running', this.isRunning.toString());
    this.timerSection.setAttribute('data-running', this.isRunning.toString());
    
    // Update completion state
    if (this.minutes === 0 && this.seconds === 0 && !this.isRunning) {
      this.timerCircle.setAttribute('data-completed', 'true');
      this.stopRestBtn.style.display = 'block';
    } else {
      this.timerCircle.removeAttribute('data-completed');
      this.stopRestBtn.style.display = 'none';
    }
  }

  async syncWithBackground() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_TIME' });
      if (response) {
        this.minutes = response.minutes;
        this.seconds = response.seconds;
        this.isRunning = response.isRunning;
        this.isBreakTime = response.isBreakTime;
        this.updateDisplay();
        this.updateTimerState();
        
        // Update header based on break time
        document.querySelector('h1').textContent = this.isBreakTime ? 'Break Time!' : 'Focus';
        if (this.isBreakTime) {
          document.querySelector('.timer-section').classList.add('break-time');
        }
      }
    } catch (error) {
      console.log('Initial sync error:', error);
    }
  }

  initializeEventListeners() {
    this.timerCircle.addEventListener('click', () => {
      if (!this.isBreakTime && !this.timerCircle.hasAttribute('data-completed')) {
        this.toggleTimer();
      }
    });
    
    this.stopBreakBtn.addEventListener('click', () => {
      this.resetTimer();
      chrome.runtime.sendMessage({ action: 'STOP_BREAK' });
    });

    this.stopRestBtn.addEventListener('click', () => {
      this.resetTimer();
      chrome.runtime.sendMessage({ action: 'STOP_BREAK' });
    });
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = parseInt(btn.dataset.time);
        this.setTime(time);
      });
    });

    document.getElementById('customTimeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const customTimeInput = document.getElementById('customTime');
      const time = parseInt(customTimeInput.value);
      
      if (time && time > 0 && time <= 120) {
        this.setTime(time);
        customTimeInput.value = ''; // Clear the input after setting
      }
    });
  }

  setTime(minutes) {
    this.minutes = minutes;
    this.originalTime = minutes;
    this.seconds = 0;
    this.updateDisplay();
    
    // If timer is running, stop it when selecting new time
    if (this.isRunning) {
      this.toggleTimer();
    }
  }

  toggleTimer() {
    if (this.isRunning) {
      chrome.runtime.sendMessage({ action: 'STOP_TIMER' });
    } else {
      chrome.runtime.sendMessage({
        action: 'START_TIMER',
        minutes: this.minutes,
        seconds: this.seconds
      });
    }
  }

  resetTimer() {
    chrome.runtime.sendMessage({ action: 'RESET_TIMER' });
    // Reset local state
    this.minutes = 25; // Default to 25 minutes
    this.seconds = 0;
    this.isRunning = false;
    this.isBreakTime = false;
    this.updateDisplay();
    this.updateTimerState();
    
    // Reset UI
    document.querySelector('.timer-section').classList.remove('break-time');
    document.querySelector('h1').textContent = 'Focus';
    this.normalControls.style.display = 'block';
    this.stopBreakBtn.style.display = 'none';
    this.stopRestBtn.style.display = 'none';
    
    // Reset any custom time input
    const customTimeInput = document.getElementById('customTime');
    if (customTimeInput) {
      customTimeInput.value = '';
    }
  }

  updateDisplay() {
    if (this.isBreakTime) {
      // For break time, always show positive numbers
      this.minutesDisplay.textContent = String(Math.abs(this.minutes)).padStart(2, '0');
      this.secondsDisplay.textContent = String(Math.abs(this.seconds)).padStart(2, '0');
    } else {
      // For focus time
      this.minutesDisplay.textContent = String(Math.max(0, this.minutes)).padStart(2, '0');
      this.secondsDisplay.textContent = String(Math.max(0, this.seconds)).padStart(2, '0');
    }
  }
}

// Initialize timer when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const timer = new Timer();
}); 