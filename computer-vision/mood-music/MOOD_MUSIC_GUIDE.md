# Mood Music Feature - Setup Guide

The **Mood Music** feature uses facial emotion AI (MorphCast) to analyze your emotional state in real-time and plays music from Spotify that matches or boosts your mood.

## Features

### 1. **Real-Time Emotion Detection**
- Uses your webcam to analyze facial expressions
- Detects emotions: Happy, Sad, Angry, Surprised, Neutral
- Shows live emotion percentages and confidence scores
- Privacy-focused: All analysis happens locally in your browser

### 2. **Three Music Modes**

#### **Match Mode** (Default)
- Plays music that matches your current emotion
- Sad → Sad/Melancholic music
- Happy → Upbeat/Happy music
- Angry → Intense/Rage music

#### **Boost Mode**
- Plays music to improve your mood
- Sad → Uplifting/Mood Booster music
- Angry → Calming music
- Keeps you energized when happy

#### **Energy Mode**
- Matches your energy level instead of emotion
- High energy (happy/excited/angry) → Beast Mode playlists
- Medium energy → Feel Good playlists
- Low energy (sad/neutral) → Deep Focus playlists

### 3. **Attention-Based Controls**
- **Face detected + High attention (>50%)**: Normal volume (70%)
- **Low attention (<50%)**: Automatically lowers volume to 30%
- **Face not detected for 30 seconds**: Pauses playback
- Smart volume adjustments based on your engagement

### 4. **Spotify Integration**
- Plays music using official Spotify curated playlists
- Supports play, pause, next, previous controls
- Shows currently playing track information
- Works on any device with Spotify active

---

## Setup Instructions

### Step 1: Get Spotify Access Token

You need a Spotify Premium account and an access token.

**Quick Method (For Testing):**

1. Go to: https://developer.spotify.com/console/get-users-top-artists-and-tracks/
2. Click the green **"Get Token"** button
3. Click **"Request Token"** in the popup
4. Copy the generated access token (long string of characters)
5. **Note**: This token expires in 1 hour

**Alternative Method (Longer-lasting token):**

1. Create a Spotify App:
   - Go to: https://developer.spotify.com/dashboard
   - Click **"Create app"**
   - Name: "Mood Music Extension"
   - Redirect URI: `http://localhost:3000/callback`
   - Check "Web API"
   - Click **"Save"**

2. Get your Client ID and Client Secret from the app dashboard

3. Use OAuth 2.0 flow to get access token:
   ```
   Authorization URL:
   https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/callback&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing
   ```

4. This will redirect you with a code, exchange it for an access token

---

### Step 2: Open Spotify on a Device

**Important**: You must have Spotify open and active on at least one device:

- **Desktop**: Open the Spotify desktop app (Windows, Mac, or Linux)
- **Mobile**: Open the Spotify app on your phone (iOS or Android)
- **Web**: Open https://open.spotify.com in a browser tab

The extension will automatically use the first available active device.

---

### Step 3: Allow Camera Access

When you click **"Start Analysis"** for the first time:

1. Your browser will ask for camera permission
2. Click **"Allow"**
3. The extension only uses your camera for emotion detection
4. Video never leaves your browser - completely private

---

### Step 4: Use the Extension

1. **Open the extension** and click the **"Mood Music"** tab
2. Click **"Start Analysis"**
3. **Enter your Spotify access token** when prompted (only first time)
4. Your camera will activate and show your video feed
5. After 2-3 seconds, emotion bars will appear
6. After a few more seconds, music will start playing based on your detected emotion

---

## How to Use

### Switching Music Modes

Click on any of the three mode buttons:
- **Match Mood**: Music that matches your emotion
- **Boost Mood**: Uplifting music to improve mood
- **Energy Level**: Match your energy instead

The music will change to reflect the new mode on the next emotion change.

### Manual Controls

- **Play/Pause**: Click the play button to pause or resume
- **Next Track**: Skip to next song in the playlist
- **Previous Track**: Go back to previous song

### Stopping

Click **"Stop"** button to:
- Turn off your camera
- Pause the music
- Stop emotion analysis

You can restart anytime by clicking **"Start Analysis"** again.

---

## Spotify Playlists Used

The extension uses official Spotify curated playlists:

### Match Mode
- **Happy**: [Happy Hits](https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC)
- **Sad**: [Life Sucks](https://open.spotify.com/playlist/37i9dQZF1DX3YSRoSdA634)
- **Angry**: [Rage Beats](https://open.spotify.com/playlist/37i9dQZF1DX1tyCD9QhIWF)
- **Surprised**: [Mind Blown](https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n)
- **Neutral**: [Peaceful Piano](https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO)

### Boost Mode
- **Sad → Happy**: [Mood Booster](https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0)
- **Angry → Calm**: [Chill Vibes](https://open.spotify.com/playlist/37i9dQZF1DWXti3N4Wp5xy)
- **Happy → Energized**: [Hype](https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd)

### Energy Mode
- **High Energy**: [Beast Mode](https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP)
- **Medium Energy**: [Feel Good](https://open.spotify.com/playlist/37i9dQZF1DX2sUQwD7tbmL)
- **Low Energy**: [Deep Focus](https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp)

---

## Troubleshooting

### "No active Spotify devices found"
**Solution**: Open Spotify on any device (desktop, mobile, or web) and play any song, then pause it. The device will now be active.

### "Camera access denied"
**Solution**:
1. Click the camera icon in your browser's address bar
2. Select "Always allow" for camera access
3. Reload the extension

### "Token expired"
**Solution**:
1. Get a new token from the Spotify console (see Step 1)
2. Click "Start Analysis" again
3. Enter the new token when prompted

### Music not changing with emotions
**Solution**:
- Make sure your face is clearly visible to the camera
- Ensure good lighting
- Wait 5-10 seconds for emotion to stabilize before music changes
- Check that attention score is above 50%

### "Spotify API error"
**Solution**:
- Verify you have Spotify Premium (required for Web Playback API)
- Check that your access token is valid
- Make sure Spotify is not set to private session

---

## Privacy & Security

- **Camera video never leaves your browser** - All emotion analysis is done locally
- **No data is stored or transmitted** to any server except Spotify's official API
- **Access tokens are stored locally** in your browser's secure storage
- **You can stop the camera anytime** by clicking the Stop button

---

## Future Customization (Coming Soon)

- Custom playlist mapping for each emotion
- Save favorite playlists
- Mood history and analytics
- Export emotion data as CSV
- Collaborative playlists with friends
- Integration with other music services

---

## Tech Stack

- **MorphCast SDK**: Facial emotion AI
- **Spotify Web API**: Music playback and control
- **Chrome Extension APIs**: Camera access and storage
- **Gemini 2.0 Flash**: (For Help/Explain modes)

---

## Feedback & Issues

If you encounter any issues or have feature suggestions:
1. Check the browser console for error messages
2. Verify all setup steps are completed
3. Restart the browser and try again
4. Report issues with console error screenshots

---

Enjoy your mood-based music experience! 🎵😊🎧
