# MindMirror Computer Vision

This folder contains the computer vision and mood-music components that were separated from the browser extension. It includes the emotion detection demos, scanner research, and Spotify/MorphCast integrations.

## Contents
- `mood-music/` demos and UI prototypes
- `morphcast-loader.js` and `morphcast-service.js` for emotion detection integration
- `spotify-config.js` and `spotify-service.js` for mood-based music
- Scanner experiments and docs (simple/robust/efficient)
- Supporting setup guides and test pages

## Notes
- The browser extension now lives in the `HereToHelp` repo without these CV assets.
- Update `spotify-config.js` with your Spotify app credentials before using the music demos.

## Quick start
Serve the folder so the SDK and camera APIs run in a secure context (file:// will not work):
- `python3 -m http.server 8000` (run from `computer-vision/`)
- Open `http://localhost:8000/mood-music/mood-music-standalone.html`
