import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import "./menuLiveImageFraming.css";

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

const state = {
  active: false,
  busy: false,
  button: null,
  media: null,
  img: null,
  item: null,
  sourceUrl: "",
  sourcePath: "",
  originalDomSrc: "",
  originalObjectPosition: "",
  originalTransform: "",
  originalTransformOrigin: "",
  zoom: 1,
  x: 50,
  y: 50,
  ratio: 1,
  drag: null,
  pointers: new Map(),
  pinchStartDistance: 0,
  pinchStartZoom: 1,
};

function isContentStudio() {
  return location.pathname.startsWith("/menu-studio/content");
}

function localizedValues(value) {
  if (value && typeof value === "object") return Object.values(value).map(normalized).filter(Boolean);
  const text = normalized(value);
  return text ? [text] : [];
}

function projectIdFor(draft) {
  const queryId = new URLSearchParams(location.search).get("project") || "";
  return queryId || draft?.importProject?.id || draft?.profile?.importedProjectId || draft?.menu?.source_project_id || "draft";
}

function flushCurrentStudioDraft() {
  const detail = { saved: true };
  window.dispatchEvent(new CustomEvent("beyond-menu-studio-flush-draft", { detail }));
  return detail.saved;
}

function selectedItemFromDraft(draft) {
  const items = draft?.menu?.items || [];
  const groups = draft?.menu?.groups || [];
  const active = document.querySelector(".menu-content-v2-items > button.active:not(.menu-content-v2-add-item)");
  if (!active) return null;

  const wantedName = normalized(active.querySelector("strong")?.textContent);
  const categoryBlock = active.closest(".menu-content-v2-category-block");
  const wantedGroup = normalized(categoryBlock?.querySelector(":scope > .menu-content-v2-category-row strong")?.textContent);
  const matchingGroupIds = new Set(groups.filter((group) => localizedValues(group.name).includes(wantedGroup)).map((group) => group.id));

  return items.find((item) => matchingGroupIds.has(item.group_id) && localizedValues(item.name).includes(wantedName))
    || items.find((item) => localizedValues(item.name).includes(wantedName))
    || null;
}

function editIconMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M8 12h8M12 8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function findSelectedContentImage() {
  if (!isContentStudio()) return null;
  const draft = readMenuStudioV2Draft();
  const item = selectedItemFromDraft(draft);
  if (!item) return null;

  const names = new Set(localizedValues(item.name));
  const articles = [...document.querySelectorAll(".menu-content-v2-preview .bme-visual-item")];
  const article = articles.find((node) => names.has(normalized(node.querySelector("h3")?.textContent)));
  const media = article?.querySelector(".bme-item-media");
  const img = media?.querySelector("img");
  if (!media || !img || !img.src || media.clientWidth < 30 || media.clientHeight < 30) return null;
  return { item, media, img };
}

function removeStaleTriggerButtons(keepMedia = null) {
  document.querySelectorAll(".menu-content-v2-preview .beyond-live-framing-trigger").forEach((button) => {
    if (!keepMedia || button.parentElement !== keepMedia) button.remove();
  });
}

function ensureTriggerButton() {
  if (!isContentStudio()) {
    removeStaleTriggerButtons();
    return;
  }

  const target = findSelectedContentImage();
  if (!target?.media || !target?.img) {
    removeStaleTriggerButtons();
    return;
  }

  const media = target.media;
  removeStaleTriggerButtons(media);
  if (media.querySelector(":scope > .beyond-live-framing-trigger")) return;

  if (getComputedStyle(media).position === "static") media.style.position = "relative";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "beyond-menu-crop-btn icon-only beyond-live-framing-trigger";
  button.innerHTML = editIconMarkup();
  button.setAttribute("aria-label", "Adjust photo position and zoom");
  button.title = "Adjust photo position and zoom";
  media.appendChild(button);
}

function distanceBetweenPointers() {
  const points = [...state.pointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function frameRatio(media) {
  const rect = media?.getBoundingClientRect?.();
  if (!rect?.width || !rect?.height) return 1;
  return clamp(rect.width / rect.height, .45, 2.4);
}

function outputDimensions(ratio) {
  const safeRatio = clamp(ratio, .45, 2.4);
  const longSide = 1536;
  if (safeRatio >= 1) return { width: longSide, height: Math.max(640, Math.round(longSide / safeRatio)) };
  return { width: Math.max(640, Math.round(longSide * safeRatio)), height: longSide };
}

function setStatus(text, tone = "") {
  const toolbar = state.media?.querySelector(":scope > .beyond-live-framing-toolbar");
  const status = toolbar?.querySelector("[data-live-frame-status]");
  if (!status) return;
  status.textContent = text || "";
  status.dataset.tone = tone;
}

function render() {
  if (!state.active || !state.img) return;
  state.img.style.objectPosition = `${state.x}% ${state.y}%`;
  state.img.style.transform = `scale(${state.zoom})`;
  state.img.style.transformOrigin = `${state.x}% ${state.y}%`;

  const toolbar = state.media?.querySelector(":scope > .beyond-live-framing-toolbar");
  const zoomLabel = toolbar?.querySelector("[data-live-frame-zoom]");
  if (zoomLabel) zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function changeZoom(amount) {
  state.zoom = clamp(state.zoom + amount, 1, 3);
  render();
}

function resetFraming() {
  if (state.busy) return;
  state.zoom = 1;
  state.x = 50;
  state.y = 50;
  render();
}

function removeToolbar() {
  document.querySelectorAll(".beyond-live-framing-toolbar").forEach((node) => node.remove());
}

function restoreDomImage() {
  if (!state.img) return;
  if (state.originalDomSrc) state.img.src = state.originalDomSrc;
  state.img.style.objectPosition = state.originalObjectPosition;
  state.img.style.transform = state.originalTransform;
  state.img.style.transformOrigin = state.originalTransformOrigin;
}

function endEditor({ restore = true } = {}) {
  if (!state.active || state.busy) return;
  if (restore) restoreDomImage();
  state.media?.classList.remove("beyond-live-framing-active", "beyond-live-framing-dragging", "beyond-live-framing-saving");
  if (state.button) state.button.hidden = false;
  removeToolbar();
  state.active = false;
  state.button = null;
  state.media = null;
  state.img = null;
  state.item = null;
  state.drag = null;
  state.pointers.clear();
  ensureTriggerButton();
}

function makeToolbar() {
  const toolbar = document.createElement("div");
  toolbar.className = "beyond-live-framing-toolbar";
  toolbar.innerHTML = `
    <div class="beyond-live-framing-hint">Drag photo to move · scroll/pinch to zoom</div>
    <div class="beyond-live-framing-controls">
      <button type="button" data-live-frame-cancel aria-label="Cancel photo adjustment">×</button>
      <button type="button" data-live-frame-minus aria-label="Zoom out">−</button>
      <span data-live-frame-zoom>100%</span>
      <button type="button" data-live-frame-plus aria-label="Zoom in">+</button>
      <button type="button" data-live-frame-reset>Reset</button>
      <button type="button" class="done" data-live-frame-save>Done</button>
    </div>
    <div class="beyond-live-framing-status" data-live-frame-status></div>
  `;

  toolbar.addEventListener("pointerdown", (event) => event.stopPropagation());
  toolbar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.target.closest("[data-live-frame-cancel]")) endEditor({ restore: true });
    else if (event.target.closest("[data-live-frame-minus]")) changeZoom(-.1);
    else if (event.target.closest("[data-live-frame-plus]")) changeZoom(.1);
    else if (event.target.closest("[data-live-frame-reset]")) resetFraming();
    else if (event.target.closest("[data-live-frame-save]")) saveFraming();
  });
  return toolbar;
}

function beginEditor(button) {
  if (!isContentStudio() || state.busy) return;
  if (state.active) endEditor({ restore: true });

  if (!flushCurrentStudioDraft()) {
    window.alert("Could not save the latest menu changes. Please try again.");
    return;
  }

  const draft = readMenuStudioV2Draft();
  const item = selectedItemFromDraft(draft);
  const media = button.parentElement;
  const img = media?.querySelector("img");
  if (!draft || !item || !media || !img) return;

  const crop = item.image_menu_crop || {};
  const visibleSrc = img.currentSrc || img.src || item.image_url || "";
  const sourceUrl = String(crop.source_url || visibleSrc);
  if (!sourceUrl) return;

  state.active = true;
  state.busy = false;
  state.button = button;
  state.media = media;
  state.img = img;
  state.item = item;
  state.sourceUrl = sourceUrl;
  state.sourcePath = String(crop.source_path || item.image_processed_path || item.image_original_path || item.image_path || "");
  state.originalDomSrc = visibleSrc;
  state.originalObjectPosition = img.style.objectPosition || "";
  state.originalTransform = img.style.transform || "";
  state.originalTransformOrigin = img.style.transformOrigin || "";
  state.zoom = clamp(crop.zoom || 1, 1, 3);
  state.x = clamp(crop.x ?? item.image_focus_x ?? 50, 0, 100);
  state.y = clamp(crop.y ?? item.image_focus_y ?? 50, 0, 100);
  state.ratio = frameRatio(media);
  state.drag = null;
  state.pointers.clear();

  button.hidden = true;
  media.classList.add("beyond-live-framing-active");
  media.appendChild(makeToolbar());

  if (sourceUrl !== visibleSrc) img.src = sourceUrl;
  render();
}

function onPointerDown(event) {
  if (!state.active || state.busy || !state.media || !state.media.contains(event.target)) return;
  if (event.target.closest(".beyond-live-framing-toolbar")) return;
  if (event.button != null && event.button !== 0) return;

  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  state.media.setPointerCapture?.(event.pointerId);

  if (state.pointers.size === 1) {
    state.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    state.media.classList.add("beyond-live-framing-dragging");
  } else if (state.pointers.size === 2) {
    state.drag = null;
    state.pinchStartDistance = distanceBetweenPointers();
    state.pinchStartZoom = state.zoom;
  }
  event.preventDefault();
  event.stopPropagation();
}

function onPointerMove(event) {
  if (!state.active || !state.pointers.has(event.pointerId) || state.busy) return;
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (state.pointers.size >= 2) {
    const distance = distanceBetweenPointers();
    if (state.pinchStartDistance > 0) {
      state.zoom = clamp(state.pinchStartZoom * (distance / state.pinchStartDistance), 1, 3);
      render();
    }
    event.preventDefault();
    return;
  }

  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const rect = state.media.getBoundingClientRect();
  const dx = event.clientX - state.drag.x;
  const dy = event.clientY - state.drag.y;
  state.drag.x = event.clientX;
  state.drag.y = event.clientY;
  const sensitivity = 100 / Math.max(80, Math.min(rect.width, rect.height));
  state.x = clamp(state.x - dx * sensitivity, 0, 100);
  state.y = clamp(state.y - dy * sensitivity, 0, 100);
  render();
  event.preventDefault();
}

function onPointerEnd(event) {
  if (!state.active) return;
  state.pointers.delete(event.pointerId);
  if (state.drag?.pointerId === event.pointerId) state.drag = null;
  if (state.pointers.size < 2) {
    state.pinchStartDistance = 0;
    state.pinchStartZoom = state.zoom;
  }
  if (!state.pointers.size) state.media?.classList.remove("beyond-live-framing-dragging");
}

function onWheel(event) {
  if (!state.active || state.busy || !state.media?.contains(event.target) || event.target.closest(".beyond-live-framing-toolbar")) return;
  event.preventDefault();
  event.stopPropagation();
  changeZoom(event.deltaY > 0 ? -.08 : .08);
}

function imageForCanvas(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load this photo for framing."));
    image.src = src;
  });
}

async function buildCropFile() {
  const image = await imageForCanvas(state.sourceUrl);
  const { width: outW, height: outH } = outputDimensions(state.ratio);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare this photo framing.");

  const baseScale = Math.max(outW / image.naturalWidth, outH / image.naturalHeight);
  const scale = baseScale * state.zoom;
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  const overflowX = Math.max(0, drawW - outW);
  const overflowY = Math.max(0, drawH - outH);
  const dx = -(overflowX * (state.x / 100));
  const dy = -(overflowY * (state.y / 100));
  context.drawImage(image, dx, dy, drawW, drawH);

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Could not create this menu photo.")),
    "image/webp",
    .93,
  ));
  return new File([blob], `menu-framing-${state.item?.id || "item"}.webp`, { type: "image/webp" });
}

async function saveFraming() {
  if (!state.active || state.busy || !state.item) return;
  state.busy = true;
  state.media?.classList.add("beyond-live-framing-saving");
  setStatus("Saving…");

  const saveButton = state.media?.querySelector("[data-live-frame-save]");
  if (saveButton) saveButton.disabled = true;

  try {
    if (!flushCurrentStudioDraft()) throw new Error("Could not save the latest menu changes.");
    const draft = readMenuStudioV2Draft();
    const item = (draft?.menu?.items || []).find((entry) => entry.id === state.item.id);
    if (!draft || !item) throw new Error("Could not find this menu item.");

    const file = await buildCropFile();
    const previousCropPath = String(item.image_menu_crop?.output_path || "");
    const uploaded = await uploadMenuItemImage({
      file,
      itemId: item.id,
      projectId: projectIdFor(draft),
      previousPath: previousCropPath,
    });

    const sourceUrl = String(item.image_menu_crop?.source_url || state.sourceUrl);
    const sourcePath = String(item.image_menu_crop?.source_path || state.sourcePath || "");
    const nextItems = draft.menu.items.map((entry) => entry.id === item.id ? {
      ...entry,
      image_url: uploaded.image_url,
      image_path: uploaded.image_path,
      image_focus_x: 50,
      image_focus_y: 50,
      image_menu_crop: {
        source_url: sourceUrl,
        source_path: sourcePath,
        output_path: uploaded.image_path,
        zoom: state.zoom,
        x: state.x,
        y: state.y,
        ratio: state.ratio,
        updated_at: new Date().toISOString(),
      },
    } : entry);

    const next = { ...draft, menu: { ...draft.menu, items: nextItems } };
    if (!writeMenuStudioV2Draft(next)) throw new Error("Could not save this framing.");

    window.dispatchEvent(new CustomEvent("beyond-menu-translations-applied", {
      detail: { menu: next.menu, profile: next.profile || {} },
    }));

    // The saved asset already contains the selected crop. Remove the temporary
    // DOM transform immediately so React cannot leave a second zoom on the new file.
    if (state.img) {
      state.img.src = uploaded.image_url;
      state.img.style.objectPosition = "50% 50%";
      state.img.style.transform = state.originalTransform;
      state.img.style.transformOrigin = state.originalTransformOrigin;
    }

    state.busy = false;
    endEditor({ restore: false });
  } catch (error) {
    state.busy = false;
    state.media?.classList.remove("beyond-live-framing-saving");
    if (saveButton) saveButton.disabled = false;
    setStatus(error?.message || "Could not save this photo framing.", "error");
  }
}

function onDocumentClick(event) {
  if (!isContentStudio()) return;
  const button = event.target.closest?.(".menu-content-v2-preview .beyond-live-framing-trigger");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  beginEditor(button);
}

function onKeyDown(event) {
  if (!state.active) return;
  if (event.key === "Escape") {
    event.preventDefault();
    endEditor({ restore: true });
  } else if ((event.key === "+" || event.key === "=") && !state.busy) {
    event.preventDefault();
    changeZoom(.1);
  } else if (event.key === "-" && !state.busy) {
    event.preventDefault();
    changeZoom(-.1);
  }
}

export default function installMenuLiveImageFraming() {
  let queued = false;
  const queueEnsureTrigger = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      if (!state.active) ensureTriggerButton();
    });
  };

  const observer = new MutationObserver(queueEnsureTrigger);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "src"],
  });

  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("click", queueEnsureTrigger, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerEnd, true);
  document.addEventListener("pointercancel", onPointerEnd, true);
  document.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", queueEnsureTrigger);
  window.addEventListener("hashchange", queueEnsureTrigger);
  window.addEventListener("beyond-menu-translations-applied", queueEnsureTrigger);
  window.setInterval(queueEnsureTrigger, 1000);
  queueEnsureTrigger();
}
