/**
 * MorphCast SDK Loader
 * Loads and initializes the MorphCast SDK
 */

(function() {
  console.log('[MorphCast Loader] Starting...');

  // Load MorphCast SDK dynamically
  const script = document.createElement('script');
  script.src = 'https://ai-sdk.morphcast.com/v1.16/ai-sdk.js';
  script.async = true;

  script.onload = function() {
    console.log('[MorphCast Loader] SDK script loaded');
    initMorphCast();
  };

  script.onerror = function() {
    console.error('[MorphCast Loader] Failed to load SDK script');
  };

  document.head.appendChild(script);

  function initMorphCast() {
    if (typeof CY === 'undefined' || !CY.loader) {
      setTimeout(initMorphCast, 100);
      return;
    }

    console.log('[MorphCast] SDK loaded, initializing...');

    CY.loader()
      .licenseKey("apfbff9db84145a06a047cf6d1915506638bde2ae52ac7")
      .addModule(CY.modules().FACE_EMOTION.name, {smoothness: 0.40})
      .addModule(CY.modules().FACE_DETECTOR.name, {maxInputFrameSize: 320, smoothness: 0.83})
      .load()
      .then(({ start, stop }) => {
        console.log('[MorphCast] ✅ SDK ready!');
        window.morphCastStart = start;
        window.morphCastStop = stop;
        window.dispatchEvent(new CustomEvent('MORPHCAST_READY', { detail: { start, stop } }));
      })
      .catch((error) => {
        console.error('[MorphCast] SDK initialization failed:', error);
      });
  }
})();
