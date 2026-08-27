(() => {
  "use strict";
  if (window.__goreecloudPrivacyShieldPopupGuard) return;
  window.__goreecloudPrivacyShieldPopupGuard = true;
  const originalOpen = window.open.bind(window);
  window.open = function privacyShieldOpen(...args) {
    const userActivated = navigator.userActivation ? navigator.userActivation.isActive : false;
    if (!userActivated) return null;
    return originalOpen(...args);
  };
})();
