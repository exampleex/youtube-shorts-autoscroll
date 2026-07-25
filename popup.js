document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleAutoScroll');

  // Load current state (default: enabled)
  chrome.storage.local.get({ autoScrollEnabled: true }, (result) => {
    toggle.checked = result.autoScrollEnabled;
  });

  // Save new state when toggled
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoScrollEnabled: toggle.checked });
  });
});
