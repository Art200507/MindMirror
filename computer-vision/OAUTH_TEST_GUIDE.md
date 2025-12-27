# Testing the Spotify OAuth Flow

## ✅ What Was Implemented

1. **OAuth User Authorization** - Users connect their Spotify account once
2. **Automatic Token Management** - Works forever after first login
3. **Full Playback Control** - Play, pause, next, previous, volume
4. **Chrome Identity API** - Secure OAuth popup flow

---

## 🧪 How to Test

### Step 1: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "MindMirror"
3. Click the reload icon 🔄

### Step 2: Open Extension

1. Click the extension icon
2. Click the **"Mood Music"** tab
3. Click **"Start Analysis"**

### Step 3: Connect Spotify (First Time Only)

You'll see a dialog:

```
To play music based on your mood, you need to connect your Spotify account.

✓ One-time authorization
✓ Full playback control
✓ Secure OAuth flow

Click OK to open Spotify login.
```

4. Click **OK**
5. A Spotify login window will pop up
6. Log in with your Spotify account
7. Click **"Agree"** to authorize the app
8. The popup will close automatically
9. You'll see: **"✓ Successfully connected to Spotify!"**

### Step 4: Test Mood Music

1. Allow camera access when prompted
2. You should see:
   - Your camera feed
   - Emotion bars updating in real-time
   - After 3 seconds, music should start playing based on detected mood

### Step 5: Verify Playback

1. Check if music is playing on your Spotify
2. Try the controls in the extension:
   - Play/Pause button
   - Next/Previous track buttons
3. Move your face away from camera → Volume should lower
4. Look back at camera → Volume should restore

---

## ✅ Expected Behavior

### First Launch
- Extension asks to connect Spotify
- OAuth popup appears
- User logs in once
- Token saved forever

### Subsequent Launches
- No login needed
- Works automatically
- Token auto-refreshes

---

## 🎵 Music Playback Requirements

**You MUST have:**
1. **Spotify Premium** account (Free won't work for playback API)
2. **Active Spotify device** - One of:
   - Spotify desktop app open (Windows/Mac/Linux)
   - Spotify mobile app open (iOS/Android)
   - Spotify web player open in a browser tab

**The extension will play music on whichever device is currently active.**

---

## 🐛 Troubleshooting

### "No active Spotify devices found"

**Solution:**
1. Open Spotify desktop app OR web player
2. Play any song
3. Pause it
4. Device is now "active"
5. Try extension again

### OAuth popup doesn't open

**Solution:**
1. Check browser console for errors
2. Make sure redirect URI is correct in Spotify Dashboard
3. Verify Client ID matches in spotify-config.js

### "Token expired" error

**Solution:**
- Should auto-refresh, but if not:
- Close extension
- Reopen and click "Start Analysis" again
- Will re-authenticate automatically

### Music doesn't change with mood

**Solution:**
1. Make sure your face is visible to camera
2. Good lighting helps
3. Wait 5-10 seconds for emotion to stabilize
4. Check console for errors

---

## 🔐 Security Notes

- OAuth token stored securely in Chrome storage
- Token never exposed to any third parties
- Only your extension can access the token
- Standard Spotify OAuth flow (same as any app)

---

## 📊 Test Scenarios

### Test 1: Happy Mood
1. Smile at camera
2. Wait 5 seconds
3. Should play: "Happy Hits" playlist

### Test 2: Sad Mood
1. Make sad face
2. Wait 5 seconds
3. Should play: "Life Sucks" playlist (if Match mode)
4. OR "Mood Booster" (if Boost mode)

### Test 3: Mode Switching
1. Start with "Match Mode"
2. While music playing, switch to "Boost Mode"
3. Next emotion change should use different playlist

### Test 4: Attention-Based Volume
1. Music playing
2. Look away from camera
3. Volume should drop to 30%
4. Look back
5. Volume should restore to 70%

---

## 🎉 Success Criteria

✅ OAuth popup appears
✅ User can log in
✅ Token saved successfully
✅ Camera activates
✅ Emotions detected and displayed
✅ Music starts playing automatically
✅ Controls work (play/pause/next/prev)
✅ Volume changes with attention
✅ Works on next launch without re-auth

---

**Ready to test!** Open the extension and try it out! 🚀
