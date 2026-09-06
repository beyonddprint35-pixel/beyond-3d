function isStudioRoute() {
  return window.location.pathname.startsWith("/menu-studio/");
}

function resetDocumentScroll() {
  if (!isStudioRoute()) return;
  const scrollingElement = document.scrollingElement || document.documentElement;
  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
  }
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
}

function applyStudioViewportLock() {
  const active = isStudioRoute();
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
    if (!isStudioRoute()) return;
    resetDocumentScroll();
  };

  const keepDocumentPinnedAfterFocus = () => {
    if (!isStudioRoute()) return;
    requestAnimationFrame(resetDocumentScroll);
  };

  window.addEventListener("popstate", applyStudioViewportLock);
  window.addEventListener("hashchange", applyStudioViewportLock);
  window.addEventListener("scroll", keepDocumentPinned, { passive: true });
  document.addEventListener("focusin", keepDocumentPinnedAfterFocus, true);
}
