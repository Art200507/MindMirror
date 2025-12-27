/**
 * Spotify Service - Handles all Spotify API interactions
 */

class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.player = null;
    this.deviceId = null;
    this.currentTrack = null;
    this.isPlaying = false;

    // Official Spotify mood playlists (curated by Spotify)
    this.moodPlaylists = {
      // Match Mode - Music that matches the emotion
      match: {
        happy: '37i9dQZF1DXdPec7aLTmlC', // Happy Hits
        sad: '37i9dQZF1DX3YSRoSdA634', // Life Sucks
        angry: '37i9dQZF1DX1tyCD9QhIWF', // Rage Beats
        surprised: '37i9dQZF1DX4dyzvuaRJ0n', // Mind Blown
        neutral: '37i9dQZF1DX4sWSpwq3LiO', // Peaceful Piano
        excited: '37i9dQZF1DX0XUsuxWHRQd' // Hype
      },

      // Boost Mode - Uplifting music to improve mood
      boost: {
        happy: '37i9dQZF1DX0XUsuxWHRQd', // Even happier - Hype
        sad: '37i9dQZF1DX3rxVfibe1L0', // Mood Booster
        angry: '37i9dQZF1DWXti3N4Wp5xy', // Chill Vibes (calm down)
        surprised: '37i9dQZF1DX4sWSpwq3LiO', // Peaceful Piano
        neutral: '37i9dQZF1DX0XUsuxWHRQd', // Hype
        excited: '37i9dQZF1DX3rxVfibe1L0' // Mood Booster
      },

      // Energy Mode - Based on energy level not emotion
      energy: {
        high: '37i9dQZF1DX76Wlfdnj7AP', // Beast Mode
        medium: '37i9dQZF1DX2sUQwD7tbmL', // Feel Good
        low: '37i9dQZF1DWZd79rJ6a7lp' // Deep Focus
      }
    };
  }

  /**
   * Authenticate with Spotify using OAuth (User Authorization)
   * This gives full playback control
   */
  async authenticateWithOAuth() {
    try {
      // First, try to load existing token
      const hasToken = await this.loadToken();
      if (hasToken && this.isTokenValid()) {
        return true;
      }

      // Build OAuth authorization URL
      const config = typeof SPOTIFY_CONFIG !== 'undefined' ? SPOTIFY_CONFIG : {};

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', config.CLIENT_ID);
      authUrl.searchParams.append('response_type', 'token');
      authUrl.searchParams.append('redirect_uri', config.REDIRECT_URI);
      authUrl.searchParams.append('scope', config.SCOPES);
      authUrl.searchParams.append('show_dialog', 'false');

      // Launch OAuth flow using Chrome Identity API
      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl.toString(),
            interactive: true
          },
          (redirectUrl) => {
            if (chrome.runtime.lastError) {
              console.error('[Spotify OAuth] Error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!redirectUrl) {
              reject(new Error('No redirect URL received'));
              return;
            }

            // Extract access token from redirect URL
            // Format: https://.../#access_token=XXX&token_type=Bearer&expires_in=3600
            const params = new URLSearchParams(redirectUrl.split('#')[1]);
            const accessToken = params.get('access_token');
            const expiresIn = parseInt(params.get('expires_in')) || 3600;

            if (!accessToken) {
              reject(new Error('No access token in response'));
              return;
            }

            // Save token
            this.setAccessToken(accessToken, expiresIn);
            console.log('[Spotify OAuth] Authentication successful!');
            resolve(true);
          }
        );
      });
    } catch (error) {
      console.error('[Spotify OAuth] Error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with OAuth (has valid user token)
   */
  async isUserAuthenticated() {
    const hasToken = await this.loadToken();
    return hasToken && this.isTokenValid();
  }

  /**
   * Set access token
   */
  setAccessToken(token, expiresIn = 3600) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    chrome.storage.local.set({ spotifyToken: token, tokenExpiry: this.tokenExpiry });
  }

  /**
   * Load saved access token from storage
   */
  async loadToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['spotifyToken', 'tokenExpiry'], (result) => {
        if (result.spotifyToken && result.tokenExpiry > Date.now()) {
          this.accessToken = result.spotifyToken;
          this.tokenExpiry = result.tokenExpiry;
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Check if token is valid
   */
  isTokenValid() {
    return this.accessToken && this.tokenExpiry > Date.now();
  }

  /**
   * Make Spotify API request
   */
  async fetchSpotifyAPI(endpoint, method = 'GET', body = null) {
    if (!this.isTokenValid()) {
      throw new Error('Spotify token is invalid or expired');
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.spotify.com/${endpoint}`, options);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired - please re-authenticate');
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Get playlist for emotion and mode
   */
  getPlaylistForEmotion(emotion, musicMode = 'match') {
    if (musicMode === 'energy') {
      // For energy mode, map emotions to energy levels
      const energyMap = {
        happy: 'high',
        excited: 'high',
        angry: 'high',
        surprised: 'medium',
        neutral: 'low',
        sad: 'low'
      };
      const energyLevel = energyMap[emotion] || 'medium';
      return this.moodPlaylists.energy[energyLevel];
    }

    return this.moodPlaylists[musicMode][emotion] || this.moodPlaylists.match.neutral;
  }

  /**
   * Get tracks from a playlist
   */
  async getPlaylistTracks(playlistId, limit = 20) {
    const data = await this.fetchSpotifyAPI(
      `v1/playlists/${playlistId}/tracks?limit=${limit}`,
      'GET'
    );

    return data.items.map(item => ({
      uri: item.track.uri,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      album: item.track.album.name,
      duration: item.track.duration_ms
    }));
  }

  /**
   * Play tracks in user's Spotify
   */
  async playTracks(trackUris) {
    try {
      // First, try to get available devices
      const devices = await this.fetchSpotifyAPI('v1/me/player/devices', 'GET');

      if (!devices.devices || devices.devices.length === 0) {
        throw new Error('No active Spotify devices found. Please open Spotify on any device.');
      }

      // Use the first available device
      const deviceId = devices.devices[0].id;

      // Start playback
      await this.fetchSpotifyAPI(
        `v1/me/player/play?device_id=${deviceId}`,
        'PUT',
        { uris: trackUris }
      );

      this.isPlaying = true;
      return true;
    } catch (error) {
      console.error('Playback error:', error);
      throw error;
    }
  }

  /**
   * Play playlist for emotion
   */
  async playEmotionPlaylist(emotion, musicMode = 'match') {
    const playlistId = this.getPlaylistForEmotion(emotion, musicMode);
    const tracks = await this.getPlaylistTracks(playlistId);
    const trackUris = tracks.map(t => t.uri);

    await this.playTracks(trackUris);

    // Get currently playing track info
    await this.updateCurrentTrack();

    return tracks[0]; // Return first track info
  }

  /**
   * Get currently playing track
   */
  async updateCurrentTrack() {
    try {
      const data = await this.fetchSpotifyAPI('v1/me/player/currently-playing', 'GET');

      if (data && data.item) {
        this.currentTrack = {
          name: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          album: data.item.album.name,
          isPlaying: data.is_playing
        };
        this.isPlaying = data.is_playing;
        return this.currentTrack;
      }
      return null;
    } catch (error) {
      console.error('Error getting current track:', error);
      return null;
    }
  }

  /**
   * Pause playback
   */
  async pause() {
    await this.fetchSpotifyAPI('v1/me/player/pause', 'PUT');
    this.isPlaying = false;
  }

  /**
   * Resume playback
   */
  async resume() {
    await this.fetchSpotifyAPI('v1/me/player/play', 'PUT');
    this.isPlaying = true;
  }

  /**
   * Next track
   */
  async next() {
    await this.fetchSpotifyAPI('v1/me/player/next', 'POST');
    // Wait a bit for track to change
    setTimeout(() => this.updateCurrentTrack(), 500);
  }

  /**
   * Previous track
   */
  async previous() {
    await this.fetchSpotifyAPI('v1/me/player/previous', 'POST');
    setTimeout(() => this.updateCurrentTrack(), 500);
  }

  /**
   * Set volume (0-100)
   */
  async setVolume(volumePercent) {
    await this.fetchSpotifyAPI(`v1/me/player/volume?volume_percent=${volumePercent}`, 'PUT');
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpotifyService;
}
