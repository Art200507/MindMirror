# Deployment review

The Spotify client secret was removed from the browser configuration. Rotate that secret in the Spotify developer dashboard: it remains in Git history. Do not put a replacement secret in JavaScript.

The standalone mood/music page uses Spotify embeds. Other modules still use the Chrome Identity API and Spotify implicit token flow; those modules require migration to Authorization Code with PKCE before use as a regular website. The MorphCast license/domain configuration and camera-denial behavior still need live browser verification.

`MindMirror` is the canonical repository for the portfolio card. `mindmirrorai` is a duplicate implementation and has no root entry page. Do not advertise either as a verified live app until the browser integration checks pass.
