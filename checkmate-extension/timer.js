class Timer {
  constructor() {
    this.minutes = 25;
    this.seconds = 0;
    this.isRunning = false;
    this.isBreakTime = false;
    this.originalTime = 25;
    
    this.minutesDisplay = document.getElementById('minutes');
    this.secondsDisplay = document.getElementById('seconds');
    this.startButton = document.getElementById('startTimer');
    this.resetButton = document.getElementById('resetTimer');
    this.customTimeInput = document.getElementById('customTime');
    this.customTimeBtn = document.getElementById('customTimeBtn');
    
    this.initializeEventListeners();
    this.initializeMessageListener();
    this.syncWithBackground();
  }

  initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'TIME_UPDATED') {
        this.minutes = message.minutes;
        this.seconds = message.seconds;
        this.isRunning = message.isRunning;
        this.isBreakTime = message.isBreakTime;
        this.updateDisplay();
        this.updateButtonState();
      }
    });
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
        this.updateButtonState();
      }
    } catch (error) {
      console.log('Initial sync error:', error);
    }
  }

  updateButtonState() {
    this.startButton.textContent = this.isRunning ? 'Pause' : 'Start';
  }

  initializeEventListeners() {
    this.startButton.addEventListener('click', () => this.toggleTimer());
    this.resetButton.addEventListener('click', () => this.resetTimer());
    this.customTimeInput.addEventListener('change', () => {
      this.minutes = parseInt(this.customTimeInput.value);
      this.originalTime = this.minutes;
      this.updateDisplay();
    });
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = parseInt(btn.dataset.time);
        this.minutes = time;
        this.originalTime = time;
        this.seconds = 0;
        this.customTimeInput.value = time;
        this.updateDisplay();
      });
    });

    this.customTimeBtn.addEventListener('click', () => {
      this.customTimeInput.style.display = 
        this.customTimeInput.style.display === 'block' ? 'none' : 'block';
    });
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
  }

  updateDisplay() {
    this.minutesDisplay.textContent = String(this.minutes).padStart(2, '0');
    this.secondsDisplay.textContent = String(this.seconds).padStart(2, '0');
  }
}

// Initialize timer when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const timer = new Timer();
}); 