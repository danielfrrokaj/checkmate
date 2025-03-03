class Timer {
  constructor() {
    this.minutes = 25;
    this.seconds = 0;
    this.isRunning = false;
    this.timerId = null;
    
    this.minutesDisplay = document.getElementById('minutes');
    this.secondsDisplay = document.getElementById('seconds');
    this.startButton = document.getElementById('startTimer');
    this.resetButton = document.getElementById('resetTimer');
    this.customTimeInput = document.getElementById('customTime');
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.startButton.addEventListener('click', () => this.toggleTimer());
    this.resetButton.addEventListener('click', () => this.resetTimer());
    this.customTimeInput.addEventListener('change', () => {
      this.minutes = parseInt(this.customTimeInput.value);
      this.updateDisplay();
    });
  }

  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
      this.startButton.textContent = 'Start';
    } else {
      this.startTimer();
      this.startButton.textContent = 'Pause';
    }
  }

  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerId = setInterval(() => this.tick(), 1000);
    }
  }

  stopTimer() {
    this.isRunning = false;
    clearInterval(this.timerId);
  }

  resetTimer() {
    this.stopTimer();
    this.minutes = parseInt(this.customTimeInput.value);
    this.seconds = 0;
    this.startButton.textContent = 'Start';
    this.updateDisplay();
  }

  tick() {
    if (this.seconds === 0) {
      if (this.minutes === 0) {
        this.timerComplete();
        return;
      }
      this.minutes--;
      this.seconds = 59;
    } else {
      this.seconds--;
    }
    this.updateDisplay();
  }

  updateDisplay() {
    this.minutesDisplay.textContent = String(this.minutes).padStart(2, '0');
    this.secondsDisplay.textContent = String(this.seconds).padStart(2, '0');
  }

  timerComplete() {
    this.stopTimer();
    this.resetTimer();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Timer Complete!',
      message: 'Your focus session has ended.',
      priority: 2
    });
  }
}

// Initialize timer when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const timer = new Timer();
}); 