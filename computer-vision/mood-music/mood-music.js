// Mood Music Page Controller
class MoodMusicController {
  constructor() {
    this.spotifyService = new SpotifyService();
    this.morphcastService = new MorphCastService();
    this.currentMusicMode = 'match';
    this.lastPlayedEmotion = null;
    this.isMoodAnalyzing = false;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSavedSettings();
  }

  setupEventListeners() {
    // Close button
    document.getElementById('close-btn').addEventListener('click', () => {
      window.close();
    });

    // Start/Stop buttons
    document.getElementById('start-analysis-btn').addEventListener('click', () => {
      this.handleStartAnalysis();
    });

    document.getElementById('stop-analysis-btn').addEventListener('click', () => {
      this.handleStopAnalysis();
    });

    // Music mode buttons
    const matchBtn = document.getElementById('match-mode-btn');
    const boostBtn = document.getElementById('boost-mode-btn');
    const energyBtn = document.getElementById('energy-mode-btn');

    const switchMusicMode = (mode) => {
      this.currentMusicMode = mode;
      matchBtn.classList.toggle('active', mode === 'match');
      boostBtn.classList.toggle('active', mode === 'boost');
      energyBtn.classList.toggle('active', mode === 'energy');
      localStorage.setItem('musicMode', mode);

      // Force update if already analyzing
      if (this.lastPlayedEmotion) {
        this.updateMusicPlayer(this.lastPlayedEmotion);
      }
    };

    matchBtn.addEventListener('click', () => switchMusicMode('match'));
    boostBtn.addEventListener('click', () => switchMusicMode('boost'));
    energyBtn.addEventListener('click', () => switchMusicMode('energy'));
  }

  loadSavedSettings() {
    const savedMode = localStorage.getItem('musicMode');
    if (savedMode) {
      this.currentMusicMode = savedMode;
      document.querySelectorAll('.mood-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.moodMode === savedMode);
      });
    }
  }

  async handleStartAnalysis() {
    try {
      const startBtn = document.getElementById('start-analysis-btn');
      const stopBtn = document.getElementById('stop-analysis-btn');
      const cameraStatus = document.getElementById('camera-status');
      const cameraStatusText = cameraStatus.querySelector('span');
      const emotionSection = document.getElementById('emotion-section');
      const musicSection = document.getElementById('music-section');

      // Initialize camera
      cameraStatusText.textContent = 'Initializing camera...';
      const videoElement = document.getElementById('camera-preview');

      await this.morphcastService.initialize(videoElement);

      // Wait for MorphCast SDK to be ready
      cameraStatusText.textContent = 'Loading MorphCast AI...';

      const morphCastReady = new Promise((resolve) => {
        if (window.morphCastStart) {
          resolve();
        } else {
          window.addEventListener('MORPHCAST_READY', resolve, { once: true });
        }
      });

      await morphCastReady;

      if (window.morphCastStart) {
        console.log('[Mood Music] Starting MorphCast analysis...');
        await window.morphCastStart();
        console.log('[Mood Music] ✅ MorphCast started - real emotion detection active!');
        cameraStatusText.textContent = 'Camera active - Analyzing emotions';
      } else {
        console.warn('[Mood Music] MorphCast SDK not available, using simulation');
        cameraStatusText.textContent = 'Camera active - Simulation mode';
      }
      emotionSection.style.display = 'block';

      // Set up emotion update callback
      this.morphcastService.onEmotionUpdate = (data) => {
        this.updateEmotionUI(data);
      };

      // Start emotion analysis
      await this.morphcastService.startAnalysis();
      this.isMoodAnalyzing = true;

      // Update UI
      startBtn.style.display = 'none';
      stopBtn.style.display = 'flex';

      // Show music section after a few seconds
      setTimeout(() => {
        musicSection.style.display = 'block';
      }, 3000);

    } catch (error) {
      console.error('Error starting mood analysis:', error);
      alert(`Error: ${error.message}\n\nMake sure you allowed camera access!`);
    }
  }

  async handleStopAnalysis() {
    const startBtn = document.getElementById('start-analysis-btn');
    const stopBtn = document.getElementById('stop-analysis-btn');
    const cameraStatus = document.getElementById('camera-status');
    const cameraStatusText = cameraStatus.querySelector('span');
    const emotionSection = document.getElementById('emotion-section');
    const musicSection = document.getElementById('music-section');

    // Stop MorphCast SDK
    if (window.morphCastStop) {
      await window.morphCastStop();
      console.log('[Mood Music] MorphCast stopped');
    }

    // Stop emotion analysis
    this.morphcastService.cleanup();
    this.isMoodAnalyzing = false;

    // Update UI
    cameraStatusText.textContent = 'Camera ready';
    emotionSection.style.display = 'none';
    musicSection.style.display = 'none';
    startBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
  }

  updateEmotionUI(data) {
    // Update emotion bars
    const emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral'];
    emotions.forEach(emotion => {
      const value = Math.round(data.emotions[emotion] || 0);
      const barFill = document.getElementById(`emotion-${emotion}`);
      const valueSpan = document.getElementById(`value-${emotion}`);

      if (barFill && valueSpan) {
        barFill.style.width = `${value}%`;
        valueSpan.textContent = `${value}%`;
      }
    });

    // Update dominant emotion
    const dominantSpan = document.getElementById('dominant-emotion');
    if (dominantSpan) {
      dominantSpan.textContent = data.dominant;
    }

    // Update music based on emotion
    if (data.dominant && data.dominant !== this.lastPlayedEmotion) {
      this.updateMusicPlayer(data.dominant);
    }
  }

  updateMusicPlayer(emotion) {
    this.lastPlayedEmotion = emotion;

    // Get playlist ID for this emotion and mode
    const playlistId = this.spotifyService.getPlaylistForEmotion(emotion, this.currentMusicMode);

    // Update embedded player
    const spotifyPlayer = document.getElementById('spotify-player');
    const playlistMood = document.getElementById('current-playlist-mood');

    // Spotify embed URL format
    spotifyPlayer.src = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
    playlistMood.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);

    console.log(`[Mood Music] Changed to ${emotion} playlist (${this.currentMusicMode} mode) - ID: ${playlistId}`);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  new MoodMusicController();
});
