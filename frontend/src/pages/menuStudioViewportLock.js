function isStudioRoute() {
  return window.location.pathname.startsWith("/menu-studio/");
}

function isContentStudioRoute() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/menu-studio/content" || path.startsWith("/menu-studio/content/");
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 850px)").matches;
}

function shouldLockStudioViewport() {
  // Only Content Studio needs the desktop pane-lock contract. Design, Preview,
  // Analytics, Publish and AI Photo Studio are full-page workspaces and must
  // retain normal document scrolling on desktop as well as mobile.
  return isStudioRoute() && isContentStudioRoute() && !isMobileViewport();
}

function resetDocumentScroll() {
  if (!shouldLockStudioViewport()) return;
  const scrollingElement = document.scrollingElement || document.documentElement;
  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
  }
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
}

function applyStudioViewportLock() {
  const active = shouldLockStudioViewport();
  document.documentElement.classList.toggle("menu-studio-viewport-lock", active);
  document.body.classList.toggle("menu-studio-viewport-lock", active);
  if (active) {
    resetDocumentScroll();
    requestAnimationFrame(resetDocumentScroll);
  }
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

  const keepDocumentPinned = () => {
    if (!shouldLockStudioViewport()) return;
    resetDocumentScroll();
  };

  const keepDocumentPinnedAfterFocus = () => {
    if (!shouldLockStudioViewport()) return;
    requestAnimationFrame(resetDocumentScroll);
  };

  window.addEventListener("popstate", applyStudioViewportLock);
  window.addEventListener("hashchange", applyStudioViewportLock);
  window.addEventListener("resize", applyStudioViewportLock, { passive: true });
  window.addEventListener("orientationchange", applyStudioViewportLock, { passive: true });
  window.addEventListener("scroll", keepDocumentPinned, { passive: true });
  document.addEventListener("focusin", keepDocumentPinnedAfterFocus, true);
}
