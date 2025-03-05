class Settings {
  constructor() {
    this.backgrounds = ['background.png', 'background1.jpg', 'background2.jpg', 'background3.jpg'];
    this.currentBackgroundIndex = 0;
    
    this.initializeSettings();
    this.initializeEventListeners();
  }

  async initializeSettings() {
    const settings = await chrome.storage.sync.get(['currentBackground', 'primaryColor']);
    
    if (settings.currentBackground) {
      document.body.style.backgroundImage = `url('assets/${settings.currentBackground}')`;
      this.currentBackgroundIndex = this.backgrounds.indexOf(settings.currentBackground);
    }
    
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      this.updateSelectedColor(settings.primaryColor);
    }
  }

  initializeEventListeners() {
    document.getElementById('cycleBackground').addEventListener('click', () => {
      this.cycleBackground();
    });

    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.updatePrimaryColor(color);
        this.updateSelectedColor(color);
      });
    });
  }

  updateSelectedColor(color) {
    document.querySelectorAll('.color-option').forEach(option => {
      if (option.dataset.color === color) {
        option.style.borderColor = 'white';
      } else {
        option.style.borderColor = 'transparent';
      }
    });
  }

  async cycleBackground() {
    this.currentBackgroundIndex = (this.currentBackgroundIndex + 1) % this.backgrounds.length;
    const newBackground = this.backgrounds[this.currentBackgroundIndex];
    
    document.body.style.backgroundImage = `url('assets/${newBackground}')`;
    await chrome.storage.sync.set({ currentBackground: newBackground });
  }

  async updatePrimaryColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    await chrome.storage.sync.set({ primaryColor: color });
  }
}

// Initialize settings when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  const settings = new Settings();
}); 