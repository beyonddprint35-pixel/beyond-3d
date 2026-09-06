function isContentStudio() {
  return window.location.pathname.startsWith("/menu-studio/content");
}

function scrollContainers() {
  return Array.from(document.querySelectorAll(
    ".menu-content-v2-tree, .menu-content-v2-inspector, .menu-content-v2-canvas, .menu-studio-mobile-preview-scroll"
  ));
}

function snapshotScroll() {
  return {
    x: window.scrollX,
    y: window.scrollY,
    elements: scrollContainers().map((element) => ({
      element,
      top: element.scrollTop,
      left: element.scrollLeft,
    })),
  };
}

function restoreScroll(snapshot) {
  if (!snapshot || !isContentStudio()) return;
  window.scrollTo(snapshot.x, snapshot.y);
  snapshot.elements.forEach(({ element, top, left }) => {
    if (!element?.isConnected) return;
    element.scrollTop = top;
    element.scrollLeft = left;
  });
}

export default function installMenuContentVisibilityScrollGuard() {
  let pendingSnapshot = null;

  const isVisibilityToggle = (target) => target instanceof HTMLInputElement
    && target.type === "checkbox"
    && Boolean(target.closest(".menu-content-v2-toggle, .menu-content-v2-mobile-visibility"));

  const capture = (event) => {
    if (!isContentStudio() || !isVisibilityToggle(event.target)) return;
    pendingSnapshot = snapshotScroll();
  };

  const restore = (event) => {
    if (!isContentStudio() || !isVisibilityToggle(event.target) || !pendingSnapshot) return;
    const snapshot = pendingSnapshot;
    pendingSnapshot = null;

    // React updates synchronously enough for the first microtask in most cases,
    // but Safari/Chrome can apply focus anchoring a frame later. Restore at all
    // three points so the clicked toggle never drags any Studio pane downward.
    queueMicrotask(() => restoreScroll(snapshot));
    requestAnimationFrame(() => {
      restoreScroll(snapshot);
      requestAnimationFrame(() => restoreScroll(snapshot));
    });
  };

  const preventFocusScroll = (event) => {
    if (!isContentStudio() || !isVisibilityToggle(event.target)) return;
    try {
      event.target.focus({ preventScroll: true });
    } catch {
      // Older browsers may not support preventScroll. The restore pass handles it.
    }
  };

  document.addEventListener("pointerdown", capture, true);
  document.addEventListener("change", restore, true);
  document.addEventListener("focusin", preventFocusScroll, true);
}
