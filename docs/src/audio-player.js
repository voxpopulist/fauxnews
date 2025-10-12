// Advanced audio player with custom controls and proper functionality
export class AudioPlayer {
  constructor(element, options = {}) {
    this.originalElement = element;
    this.audio = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.options = {
      showWaveform: false,
      autoHide: true,
      ...options
    };
    
    this.init();
  }
  
  init() {
    this.setupAudio();
    this.createCustomControls();
    this.bindEvents();
  }
  
  setupAudio() {
    // Use the original audio element or create a new one
    this.audio = this.originalElement.cloneNode(true);
    this.audio.style.display = 'none';
    this.audio.removeAttribute('controls');
    this.audio.preload = 'none';
    
    // Set the source from data attributes
    const src = this.originalElement.dataset.src || this.originalElement.src;
    if (src) {
      this.audio.dataset.src = src;
    }
  }
  
  createCustomControls() {
    const container = document.createElement('div');
    container.className = 'audio-player relative bg-gradient-to-r from-dark-400/50 to-dark-300/50 rounded-xl border border-dark-200/20 backdrop-blur-sm shadow-lg p-4';
    
    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-4';
    
    // Play/Pause button
    const playButton = document.createElement('button');
    playButton.className = 'audio-button flex-shrink-0';
    playButton.innerHTML = `
      <svg class="w-6 h-6 play-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg class="w-6 h-6 pause-icon hidden" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;
    
    // Progress section
    const progressSection = document.createElement('div');
    progressSection.className = 'flex-1 flex items-center gap-3';
    
    // Current time
    const currentTime = document.createElement('span');
    currentTime.className = 'audio-time text-xs min-w-[3rem] text-dark-100';
    currentTime.textContent = '0:00';
    
    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'audio-progress flex-1 cursor-pointer';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'audio-progress-bar w-0';
    progressContainer.appendChild(progressBar);
    
    // Duration
    const duration = document.createElement('span');
    duration.className = 'audio-time text-xs min-w-[3rem] text-dark-100';
    duration.textContent = '--:--';
    
    // Speed control
    const speedButton = document.createElement('button');
    speedButton.className = 'text-xs bg-dark-400/30 hover:bg-primary-500/20 text-dark-100 hover:text-primary-200 px-2 py-1 rounded border border-dark-200/20 hover:border-primary-400/30 transition-all duration-200 flex-shrink-0';
    speedButton.textContent = '1×';
    
    // Assemble controls
    progressSection.appendChild(currentTime);
    progressSection.appendChild(progressContainer);
    progressSection.appendChild(duration);
    
    controls.appendChild(playButton);
    controls.appendChild(progressSection);
    controls.appendChild(speedButton);
    
    container.appendChild(controls);
    container.appendChild(this.audio);
    
    // Replace original element
    this.originalElement.parentNode.replaceChild(container, this.originalElement);
    
    // Store references
    this.container = container;
    this.playButton = playButton;
    this.playIcon = playButton.querySelector('.play-icon');
    this.pauseIcon = playButton.querySelector('.pause-icon');
    this.progressContainer = progressContainer;
    this.progressBar = progressBar;
    this.currentTimeEl = currentTime;
    this.durationEl = duration;
    this.speedButton = speedButton;
  }
  
  bindEvents() {
    // Play/pause button
    this.playButton.addEventListener('click', () => this.togglePlay());
    
    // Progress bar click
    this.progressContainer.addEventListener('click', (e) => {
      if (this.audio.duration) {
        const rect = this.progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        this.audio.currentTime = percentage * this.audio.duration;
      }
    });
    
    // Speed control
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    let currentSpeedIndex = 2; // Start at 1x
    
    this.speedButton.addEventListener('click', () => {
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const newSpeed = speeds[currentSpeedIndex];
      this.audio.playbackRate = newSpeed;
      this.speedButton.textContent = `${newSpeed}×`;
    });
    
    // Audio events
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
      this.durationEl.textContent = this.formatTime(this.duration);
    });
    
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.updateProgress();
      this.currentTimeEl.textContent = this.formatTime(this.currentTime);
    });
    
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
      
      // Pause other audio players
      document.querySelectorAll('audio').forEach(other => {
        if (other !== this.audio && !other.paused) {
          other.pause();
        }
      });
    });
    
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });
    
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
      this.progressBar.style.width = '0%';
      this.currentTimeEl.textContent = '0:00';
    });
    
    // Loading states
    this.audio.addEventListener('loadstart', () => {
      this.progressContainer.style.opacity = '0.5';
    });
    
    this.audio.addEventListener('canplay', () => {
      this.progressContainer.style.opacity = '1';
    });
  }
  
  async togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      // Load audio if not already loaded
      if (!this.audio.src && this.audio.dataset.src) {
        this.audio.src = this.audio.dataset.src;
      }
      
      try {
        await this.audio.play();
      } catch (error) {
        console.error('Audio play failed:', error);
      }
    }
  }
  
  updatePlayButton() {
    if (this.isPlaying) {
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
    } else {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }
  
  updateProgress() {
    if (this.audio.duration) {
      const progress = (this.audio.currentTime / this.audio.duration) * 100;
      this.progressBar.style.width = `${progress}%`;
    }
  }
  
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Simple function to create enhanced audio player
export function createAdvancedAudioPlayer(audioElement) {
  if (audioElement.dataset.enhanced === 'true') return;
  audioElement.dataset.enhanced = 'true';
  return new AudioPlayer(audioElement);
}