/**
 * Spotify Configuration
 * Store your Spotify App credentials here
 */

const SPOTIFY_CONFIG = {
  // Get these from: https://developer.spotify.com/dashboard
  CLIENT_ID: 'b85ef6fd86204f928a613f854527be37',
  CLIENT_SECRET: 'd437afcb10224a94913090008e9fc3df',

  // Chrome extension redirect URI (must match what you added in Spotify Dashboard)
  REDIRECT_URI: 'https://b85ef6fd86204f928a613f854527be37.chromiumapp.org/callback',

  // Scopes needed for the extension
  SCOPES: [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-private'
  ].join(' ')
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPOTIFY_CONFIG;
}
