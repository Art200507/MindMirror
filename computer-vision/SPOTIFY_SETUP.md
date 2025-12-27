# Spotify API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Spotify Developer App

1. Go to: **https://developer.spotify.com/dashboard**
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: `MindMirror Mood Music`
   - **App description**: `AI mood detection with music playback`
   - **Redirect URI**: `http://localhost` (just put something, not used for Client Credentials)
   - **Which API/SDKs are you planning to use?**: Check **Web API**
   - **Terms of Service**: Check the box
5. Click **"Save"**

### Step 2: Get Your Credentials

1. You'll be taken to your app's dashboard
2. You'll see **Client ID** displayed
3. Click **"Settings"** button (top right)
4. Click **"View client secret"**
5. Copy both:
   - **Client ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Add Credentials to Extension

1. Open `/Users/AtharvaBadgujar/MindMirror/spotify-config.js`
2. Replace these lines:

```javascript
CLIENT_ID: 'YOUR_CLIENT_ID_HERE', // Paste your Client ID here
CLIENT_SECRET: 'YOUR_CLIENT_SECRET_HERE', // Paste your Client Secret here
```

With your actual credentials:

```javascript
CLIENT_ID: 'abc123xyz...', // Your actual Client ID
CLIENT_SECRET: 'def456uvw...', // Your actual Client Secret
```

3. Save the file

### Step 4: Reload Extension

1. Go to `chrome://extensions/`
2. Click the reload button on your extension
3. Done!

---

## What This Does

- **No user login required!** The extension authenticates automatically using Client Credentials Flow
- Users just click "Start Analysis" and it works
- The extension uses Spotify's public curated playlists
- Token auto-refreshes when it expires (every hour)

---

## Current Limitation

**Client Credentials Flow** gives app-level access, which means:

✅ **Can do**:
- Read public playlists
- Get playlist tracks
- Search for music

❌ **Cannot do**:
- Control user's Spotify playback (play/pause/next)
- Access user's personal playlists
- Get currently playing track

### Solution for Playback Control

To actually **play music**, users need Spotify Premium + an active device. You have two options:

#### Option A: Use Embedded Spotify Player (Recommended)
- Embed Spotify player iframes to play previews
- No authentication needed
- Works instantly

#### Option B: User OAuth Flow
- Users click "Connect Spotify" once
- Opens Spotify login popup
- Gets full playback control
- More complex but better UX

**Which would you prefer?**

---

## Next: Share Your Credentials

Once you create the Spotify app, share the:
1. **Client ID**
2. **Client Secret**

And I'll add them to `spotify-config.js` for you!
