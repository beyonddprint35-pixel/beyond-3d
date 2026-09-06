function isStudioRoute() {
  return window.location.pathname.startsWith("/menu-studio/");
}

function applyStudioViewportLock() {
  const active = isStudioRoute();
  document.documentElement.classList.toggle("menu-studio-viewport-lock", active);
  document.body.classList.toggle("menu-studio-viewport-lock", active);
}

export default function installMenuStudioViewportLock() {
  applyStudioViewportLock();

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args);
    queueMicrotask(applyStudioViewportLock);
    return result;
  };

  history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    queueMicrotask(applyStudioViewportLock);
    return result;
  };

  window.addEventListener("popstate", applyStudioViewportLock);
  window.addEventListener("hashchange", applyStudioViewportLock);
}
