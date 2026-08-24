const FIT_STATUS_MESSAGE = "beyond-mobile-fit-status";
const MAX_RECOMMENDED_ROWS = 3;
const MIN_COMFORTABLE_ROW_HEIGHT = 72;

let latestEditorStatus = null;
let scanFrame = 0;
let lastSentKey = "";

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 560px)").matches
  );
}

function getSectionName(list) {
  const root = list.closest(".digital-menu-template");
  return (
    root?.querySelector(".dmt-section-head h2")?.textContent?.trim() ||
    "this category"
  );
}

function sendFitStatus(status) {
  const key = [
    status.state,
    status.section || "",
    status.itemCount || 0,
    status.rowCount || 0,
    status.targetHeight || 0,
  ].join("|");

  if (key === lastSentKey) return;
  lastSentKey = key;

  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: FIT_STATUS_MESSAGE,
        status,
      },
      window.location.origin
    );
  }
}

function evaluateFitList(list) {
  if (!isMobileViewport()) return;

  const root = list.closest(".digital-menu-template");
  if (!root || root.dataset.fitToView !== "true") return;

  const isMobileMenuSurface =
    Boolean(list.closest(".menu-mobile-preview-page")) ||
    root.classList.contains("dmt-live");

  if (!isMobileMenuSurface || !list.classList.contains("dmt-fit-rows")) {
    return;
  }

  const items = Array.from(list.children).filter((node) =>
    node.classList?.contains("dmt-item-row")
  );

  if (!items.length) return;

  const targetHeight = Number.parseFloat(
    list.style.getPropertyValue("--dmt-fit-row-height") ||
      window
        .getComputedStyle(list)
        .getPropertyValue("--dmt-fit-row-height")
  );

  if (!Number.isFinite(targetHeight) || targetHeight <= 0) return;

  const rowTops = [];
  items.forEach((item) => {
    const top = Math.round(item.offsetTop);
    if (!rowTops.some((value) => Math.abs(value - top) <= 2)) {
      rowTops.push(top);
    }
  });

  const rowCount = Math.max(1, rowTops.length);
  const section = getSectionName(list);

  const tooManyRows = rowCount > MAX_RECOMMENDED_ROWS;
  const rowsWouldBeTooShort = targetHeight < MIN_COMFORTABLE_ROW_HEIGHT;
  const recommended = !tooManyRows && !rowsWouldBeTooShort;

  if (!recommended) {
    /*
      Keep the restaurant's Fit to View preference ON, but do not
      force it on a category where it would make the menu cramped.
      Removing only this measured class restores the normal template
      card height while preserving the fixed mobile shell and scrolling.
    */
    list.classList.remove("dmt-fit-rows");
    list.dataset.fitSmartGuard = "skipped";

    sendFitStatus({
      state: "skipped",
      section,
      itemCount: items.length,
      rowCount,
      targetHeight: Math.round(targetHeight),
      reason: tooManyRows ? "too-many-rows" : "rows-too-short",
    });

    return;
  }

  delete list.dataset.fitSmartGuard;

  sendFitStatus({
    state: "applied",
    section,
    itemCount: items.length,
    rowCount,
    targetHeight: Math.round(targetHeight),
  });
}

function scanFitLists() {
  window.cancelAnimationFrame(scanFrame);
  scanFrame = window.requestAnimationFrame(() => {
    const fitLists = document.querySelectorAll(
      ".dmt-menu-list.dmt-fit-rows"
    );

    /*
      Reset the dedupe key whenever Fit is currently absent. This lets
      the same category report its status again after OFF -> ON.
    */
    if (!fitLists.length) {
      lastSentKey = "";
    }

    fitLists.forEach(evaluateFitList);
    renderEditorAdvice();
  });
}

function getBuilderLanguage() {
  return (
    document.querySelector(".menu-builder-unified")?.dataset
      ?.builderLanguage || "en"
  );
}

function clearEditorAdvice() {
  document
    .querySelectorAll(".menu-fit-smart-advice")
    .forEach((node) => node.remove());
}

function getAdviceCopy() {
  if (latestEditorStatus?.state !== "skipped") return null;

  const language = getBuilderLanguage();
  const section = latestEditorStatus.section || "";
  const itemCount = latestEditorStatus.itemCount || 0;

  if (language === "he") {
    return {
      dir: "rtl",
      title: "Fit to View לא מומלץ בקטגוריה הזו",
      copy: `${section ? `ב־${section} ` : ""}יש ${itemCount} פריטים שממלאים את אזור הפריטים. כדי למנוע כרטיסים צפופים, הקטגוריה הזו משתמשת אוטומטית בגובה הכרטיס הרגיל.`,
    };
  }

  return {
    dir: "ltr",
    title: "Fit to View isn’t recommended for this category",
    copy: `${section ? `${section} has ` : "This category has "}${itemCount} items filling the item area. To avoid cramped cards, this category automatically uses the normal card height.`,
  };
}

function renderEditorAdvice() {
  const existing = document.querySelector(".menu-fit-smart-advice");
  const copy = getAdviceCopy();

  if (!copy) {
    existing?.remove();
    return;
  }

  const fitRow = document.querySelector(
    ".mobile-menu-preview-editor-shell .menu-brand-fit-row"
  );

  if (!fitRow) {
    existing?.remove();
    return;
  }

  const fitToggle = fitRow.querySelector(".menu-brand-fit-toggle");
  if (fitToggle?.getAttribute("aria-checked") !== "true") {
    existing?.remove();
    return;
  }

  let advice = existing;
  if (!advice) {
    advice = document.createElement("div");
    advice.className = "menu-fit-smart-advice";
    advice.setAttribute("data-no-builder-translate", "true");
    advice.append(
      document.createElement("strong"),
      document.createElement("span")
    );
    fitRow.insertAdjacentElement("afterend", advice);
  } else if (advice.previousElementSibling !== fitRow) {
    fitRow.insertAdjacentElement("afterend", advice);
  }

  advice.dir = copy.dir;

  const title = advice.querySelector("strong");
  const body = advice.querySelector("span");

  if (title && title.textContent !== copy.title) {
    title.textContent = copy.title;
  }

  if (body && body.textContent !== copy.copy) {
    body.textContent = copy.copy;
  }
}

function handleFitStatusMessage(event) {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== FIT_STATUS_MESSAGE) return;

  latestEditorStatus = event.data.status || null;
  renderEditorAdvice();
}

function handleDocumentClick(event) {
  const toggle = event.target.closest?.(".menu-brand-fit-toggle");
  if (!toggle) return;

  window.setTimeout(() => {
    if (toggle.getAttribute("aria-checked") !== "true") {
      latestEditorStatus = null;
      lastSentKey = "";
      clearEditorAdvice();
    }
  }, 0);
}

function startFitGuard() {
  const root = document.documentElement;
  if (!root || root.dataset.beyondFitSmartGuard === "true") return;

  root.dataset.beyondFitSmartGuard = "true";

  const observer = new MutationObserver(() => {
    scanFitLists();
    renderEditorAdvice();
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-fit-to-view", "aria-checked"],
  });

  window.addEventListener("resize", scanFitLists, { passive: true });
  window.addEventListener("message", handleFitStatusMessage);
  document.addEventListener("click", handleDocumentClick);

  scanFitLists();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFitGuard, { once: true });
} else {
  startFitGuard();
}
