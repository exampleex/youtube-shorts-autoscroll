(function () {
  'use strict';

  let currentVideo = null;
  let currentUrl = location.href;
  let currentSrc = '';
  let hasScrolledForCurrentVideo = false;
  let autoScrollEnabled = true;

  // Initialize status from storage
  chrome.storage.local.get({ autoScrollEnabled: true }, (result) => {
    autoScrollEnabled = result.autoScrollEnabled;
  });

  // Listen for settings toggle changes from popup
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.autoScrollEnabled) {
      autoScrollEnabled = changes.autoScrollEnabled.newValue;
    }
  });

  function resetVideoState() {
    hasScrolledForCurrentVideo = false;
  }

  function scrollToNext() {
    if (!autoScrollEnabled || hasScrolledForCurrentVideo) return;
    hasScrolledForCurrentVideo = true;

    // Method 1: Click YouTube's "Next Video" button
    const nextButton = document.querySelector(
      'button[aria-label="Next video"], button[aria-label="Next"], #navigation-button-down button'
    );

    if (nextButton) {
      nextButton.click();
      return;
    }

    // Method 2: Fallback to simulating ArrowDown key press
    const downArrowEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      code: 'ArrowDown',
      keyCode: 40,
      which: 40,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(downArrowEvent);
  }

  function handleVideo(video) {
    if (!video) return;

    // Detect if video source or element changed
    if (video !== currentVideo || video.currentSrc !== currentSrc) {
      currentVideo = video;
      currentSrc = video.currentSrc;
      resetVideoState();
    }

    // Ensure loop remains disabled on active video
    video.loop = false;

    // Attach event listeners
    video.removeEventListener('ended', onVideoEnded);
    video.addEventListener('ended', onVideoEnded);

    video.removeEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('timeupdate', onTimeUpdate);
  }

  function onVideoEnded() {
    scrollToNext();
  }

  function onTimeUpdate(e) {
    const video = e.target;

    // Re-disable loop if YouTube resets it
    if (video.loop) {
      video.loop = false;
    }

    // Reset scroll state if video restarted from beginning
    if (video.currentTime < 1.0 && hasScrolledForCurrentVideo) {
      resetVideoState();
    }

    // Trigger scroll right before video finishes
    if (video.duration && video.currentTime >= video.duration - 0.2) {
      scrollToNext();
    }
  }

  function checkAndAttachActiveVideo() {
    // 1. Detect YouTube SPA URL changes
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      resetVideoState();
    }

    // 2. Find currently active playing video element
    const videos = Array.from(document.querySelectorAll('video'));
    for (const video of videos) {
      if (!video.paused && video.readyState >= 2) {
        handleVideo(video);
        break;
      }
    }
  }

  // Monitor SPA navigation events
  window.addEventListener('yt-navigate-finish', () => {
    currentUrl = location.href;
    resetVideoState();
  });

  // Periodic check for video elements and route changes
  setInterval(checkAndAttachActiveVideo, 300);

  const observer = new MutationObserver(() => {
    checkAndAttachActiveVideo();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
