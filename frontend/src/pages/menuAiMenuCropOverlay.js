import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import "./menuAiMenuCropOverlay.css";

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
const state = {
  open: false,
  zoom: 1,
  x: 50,
  y: 50,
  item: null,
  src: "",
  sourcePath: "",
  frameRatio: 1,
  frameLabel: "1:1",
  busy: false,
  drag: null,
};

function isContentStudio() {
  return location.pathname.startsWith("/menu-studio/content");
}

function isAiStudio() {
  return location.pathname.startsWith("/menu-studio/ai-images");
}

function localizedValues(value) {
  if (value && typeof value === "object") return Object.values(value).map(normalized).filter(Boolean);
  const text = normalized(value);
  return text ? [text] : [];
}

function projectIdFor(draft) {
  const q = new URLSearchParams(location.search).get("project") || "";
  return q || draft?.importProject?.id || draft?.profile?.importedProjectId || draft?.menu?.source_project_id || "draft";
}

function findItemForImage(src) {
  const draft = readMenuStudioV2Draft();
  const items = draft?.menu?.items || [];
  const clean = String(src || "");
  return items.find((item) => [item.image_url, item.image_original_url, item.image_processed_url].some((value) => String(value || "") === clean)
    || (item.image_ai_history || []).some((v) => String(v?.imageUrl || "") === clean))
    || items.find((item) => String(item.image_url || "") && clean.includes(String(item.image_url || "")))
    || null;
}

function selectedContentItem() {
  const draft = readMenuStudioV2Draft();
  const items = draft?.menu?.items || [];
  const active = document.querySelector(".menu-content-v2-items > button.active:not(.menu-content-v2-add-item)");
  if (!active) return null;
  const wantedName = normalized(active.querySelector("strong")?.textContent);
  const categoryBlock = active.closest(".menu-content-v2-category-block");
  const wantedGroup = normalized(categoryBlock?.querySelector(":scope > .menu-content-v2-category-row strong")?.textContent);
  const groups = draft?.menu?.groups || [];
  const matchingGroupIds = new Set(groups.filter((group) => localizedValues(group.name).includes(wantedGroup)).map((group) => group.id));
  return items.find((item) => matchingGroupIds.has(item.group_id) && localizedValues(item.name).includes(wantedName))
    || items.find((item) => localizedValues(item.name).includes(wantedName))
    || null;
}

function findSelectedContentImage() {
  if (!isContentStudio()) return null;
  const item = selectedContentItem();
  if (!item) return null;
  const names = new Set(localizedValues(item.name));
  const articles = [...document.querySelectorAll(".menu-content-v2-preview .bme-visual-item")];
  const article = articles.find((node) => names.has(normalized(node.querySelector("h3")?.textContent)));
  const media = article?.querySelector(".bme-item-media");
  const img = media?.querySelector("img");
  if (!media || !img || !img.src || media.clientWidth < 30 || media.clientHeight < 30) return null;
  return { item, article, media, img };
}

function findActiveAiImage() {
  if (!isAiStudio()) return null;
  const root = document.querySelector(".ai-photo-v2, .ai-dish-v1");
  if (!root) return null;
  const candidates = [...root.querySelectorAll(".ai-dish-v1-result-image img, .ai-photo-v2-results img")];
  const img = candidates.find((candidate) => candidate.offsetParent !== null && candidate.clientWidth > 120 && candidate.clientHeight > 120) || candidates[0] || null;
  if (!img) return null;
  return { item: findItemForImage(img.currentSrc || img.src), media: img.closest(".ai-dish-v1-result-image") || img.parentElement, img };
}

function ratioLabel(ratio) {
  if (Math.abs(ratio - 1) < .04) return "1:1";
  if (Math.abs(ratio - (4 / 3)) < .07) return "4:3";
  if (Math.abs(ratio - (3 / 2)) < .08) return "3:2";
  if (Math.abs(ratio - (16 / 9)) < .09) return "16:9";
  return `${ratio.toFixed(2)}:1`;
}

function frameRatioFromMedia(media) {
  const rect = media?.getBoundingClientRect?.();
  if (rect?.width > 20 && rect?.height > 20) return clamp(rect.width / rect.height, .45, 2.4);
  const raw = media?.closest?.(".bme-visual-item")?.dataset?.imageRatio || "4:3";
  const parts = raw.split(":").map(Number);
  return parts.length === 2 && parts[0] > 0 && parts[1] > 0 ? parts[0] / parts[1] : 4 / 3;
}

function editIconMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M8 12h8M12 8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function removeStaleButtons(keepMedia = null) {
  document.querySelectorAll(".beyond-menu-crop-btn").forEach((button) => {
    if (!keepMedia || button.parentElement !== keepMedia) button.remove();
  });
}

function ensureButton() {
  if (!isContentStudio() && !isAiStudio()) {
    removeStaleButtons();
    return;
  }

  const target = isContentStudio() ? findSelectedContentImage() : findActiveAiImage();
  if (!target?.media || !target?.img) {
    removeStaleButtons();
    return;
  }
  const media = target.media;
  removeStaleButtons(media);
  if (media.querySelector(":scope > .beyond-menu-crop-btn")) return;

  if (getComputedStyle(media).position === "static") media.style.position = "relative";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `beyond-menu-crop-btn ${isContentStudio() ? "icon-only" : ""}`;
  btn.innerHTML = isContentStudio() ? editIconMarkup() : `${editIconMarkup()}<span>Adjust menu crop</span>`;
  btn.setAttribute("aria-label", "Adjust photo position and zoom");
  btn.title = "Adjust photo position and zoom";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEditor(target.img, target.item, media);
  });
  media.appendChild(btn);
}

function createModal() {
  if (document.getElementById("beyond-menu-crop-modal")) return;
  const el = document.createElement("div");
  el.id = "beyond-menu-crop-modal";
  el.className = "beyond-menu-crop-modal";
  el.innerHTML = `<div class="beyond-menu-crop-backdrop"></div><section class="beyond-menu-crop-card" role="dialog" aria-modal="true" aria-label="Adjust menu photo"><header><div><strong>Adjust photo on menu</strong><p>Drag the photo to reposition it and zoom in or out. The menu style keeps its original proportions.</p></div><button type="button" data-close aria-label="Close">×</button></header><div class="beyond-menu-crop-preview-wrap"><div class="beyond-menu-crop-preview" data-preview><img alt="Menu photo framing preview"><span class="drag-hint">Drag to move</span></div><span data-frame-label>Menu frame</span></div><div class="beyond-menu-crop-controls"><label><span>Zoom</span><div><button type="button" data-zoom-out aria-label="Zoom out">−</button><input data-zoom type="range" min="1" max="3" step="0.05" value="1"><button type="button" data-zoom-in aria-label="Zoom in">+</button><output data-zoom-label>100%</output></div></label><label><span>Horizontal position</span><input data-x type="range" min="0" max="100" step="1" value="50"></label><label><span>Vertical position</span><input data-y type="range" min="0" max="100" step="1" value="50"></label><button type="button" class="beyond-menu-crop-reset" data-reset>Reset framing</button></div><footer><button type="button" data-close>Cancel</button><button type="button" class="primary" data-save>Use this framing</button></footer><p class="beyond-menu-crop-status" data-status></p></section>`;
  document.body.appendChild(el);

  el.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", closeEditor));
  el.querySelector(".beyond-menu-crop-backdrop").addEventListener("click", closeEditor);
  el.querySelector("[data-zoom]").addEventListener("input", (event) => { state.zoom = clamp(event.target.value, 1, 3); render(); });
  el.querySelector("[data-x]").addEventListener("input", (event) => { state.x = clamp(event.target.value, 0, 100); render(); });
  el.querySelector("[data-y]").addEventListener("input", (event) => { state.y = clamp(event.target.value, 0, 100); render(); });
  el.querySelector("[data-zoom-out]").addEventListener("click", () => { state.zoom = clamp(state.zoom - .1, 1, 3); render(); });
  el.querySelector("[data-zoom-in]").addEventListener("click", () => { state.zoom = clamp(state.zoom + .1, 1, 3); render(); });
  el.querySelector("[data-reset]").addEventListener("click", () => { state.zoom = 1; state.x = 50; state.y = 50; render(); });
  el.querySelector("[data-save]").addEventListener("click", saveCrop);

  const preview = el.querySelector("[data-preview]");
  preview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.busy) return;
    state.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    preview.setPointerCapture?.(event.pointerId);
    preview.classList.add("dragging");
    event.preventDefault();
  });
  preview.addEventListener("pointermove", (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const rect = preview.getBoundingClientRect();
    const dx = event.clientX - state.drag.x;
    const dy = event.clientY - state.drag.y;
    state.drag.x = event.clientX;
    state.drag.y = event.clientY;
    const sensitivity = 100 / Math.max(120, Math.min(rect.width, rect.height));
    state.x = clamp(state.x - dx * sensitivity, 0, 100);
    state.y = clamp(state.y - dy * sensitivity, 0, 100);
    render();
  });
  const endDrag = (event) => {
    if (!state.drag || (event.pointerId != null && state.drag.pointerId !== event.pointerId)) return;
    state.drag = null;
    preview.classList.remove("dragging");
  };
  preview.addEventListener("pointerup", endDrag);
  preview.addEventListener("pointercancel", endDrag);
}

function openEditor(img, providedItem = null, media = null) {
  createModal();
  const item = providedItem || findItemForImage(img.currentSrc || img.src);
  if (!item) {
    window.alert("Select a saved menu photo first, then adjust its framing.");
    return;
  }

  const crop = item.image_menu_crop || {};
  const visibleSrc = img.currentSrc || img.src;
  state.item = item;
  state.src = String(crop.source_url || visibleSrc);
  state.sourcePath = String(crop.source_path || item.image_processed_path || item.image_original_path || item.image_path || "");
  state.zoom = clamp(crop.zoom || 1, 1, 3);
  state.x = clamp(crop.x ?? item.image_focus_x ?? 50, 0, 100);
  state.y = clamp(crop.y ?? item.image_focus_y ?? 50, 0, 100);
  state.frameRatio = frameRatioFromMedia(media || img.parentElement);
  state.frameLabel = ratioLabel(state.frameRatio);
  state.open = true;
  state.busy = false;
  state.drag = null;

  const modal = document.getElementById("beyond-menu-crop-modal");
  modal.classList.add("open");
  modal.querySelector("[data-status]").textContent = "";
  modal.querySelector("[data-save]").disabled = false;
  render();
}

function closeEditor() {
  if (state.busy) return;
  state.open = false;
  state.drag = null;
  document.getElementById("beyond-menu-crop-modal")?.classList.remove("open");
}

function render() {
  const modal = document.getElementById("beyond-menu-crop-modal");
  if (!modal) return;
  const preview = modal.querySelector(".beyond-menu-crop-preview");
  const img = preview.querySelector("img");
  preview.style.aspectRatio = String(state.frameRatio || 1);
  img.src = state.src;
  img.style.objectPosition = `${state.x}% ${state.y}%`;
  img.style.transform = `scale(${state.zoom})`;
  img.style.transformOrigin = `${state.x}% ${state.y}%`;
  modal.querySelector("[data-zoom]").value = String(state.zoom);
  modal.querySelector("[data-x]").value = String(state.x);
  modal.querySelector("[data-y]").value = String(state.y);
  modal.querySelector("[data-zoom-label]").textContent = `${Math.round(state.zoom * 100)}%`;
  modal.querySelector("[data-frame-label]").textContent = `Menu frame · ${state.frameLabel}`;
}

async function imageForCanvas(src) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load this image for framing."));
    img.src = src;
  });
}

function outputDimensions(ratio) {
  const safeRatio = clamp(ratio, .45, 2.4);
  const longSide = 1536;
  if (safeRatio >= 1) return { width: longSide, height: Math.max(640, Math.round(longSide / safeRatio)) };
  return { width: Math.max(640, Math.round(longSide * safeRatio)), height: longSide };
}

async function buildCropFile() {
  const img = await imageForCanvas(state.src);
  const { width: outW, height: outH } = outputDimensions(state.frameRatio);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare menu framing.");

  const base = Math.max(outW / img.naturalWidth, outH / img.naturalHeight);
  const scale = base * state.zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const overflowX = Math.max(0, drawW - outW);
  const overflowY = Math.max(0, drawH - outH);
  const dx = -(overflowX * (state.x / 100));
  const dy = -(overflowY * (state.y / 100));
  ctx.drawImage(img, dx, dy, drawW, drawH);

  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create menu framing.")), "image/webp", .93));
  return new File([blob], `menu-framing-${state.item?.id || "item"}.webp`, { type: "image/webp" });
}

async function saveCrop() {
  if (state.busy || !state.item) return;
  const modal = document.getElementById("beyond-menu-crop-modal");
  const status = modal.querySelector("[data-status]");
  const save = modal.querySelector("[data-save]");
  state.busy = true;
  save.disabled = true;
  status.textContent = "Saving menu framing…";

  try {
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

    const sourceUrl = String(item.image_menu_crop?.source_url || state.src);
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
        ratio: state.frameRatio,
        ratio_label: state.frameLabel,
        updated_at: new Date().toISOString(),
      },
    } : entry);

    const next = { ...draft, menu: { ...draft.menu, items: nextItems } };
    if (!writeMenuStudioV2Draft(next)) throw new Error("Could not save this framing.");
    status.textContent = "Saved. The menu style keeps its original proportions.";
    window.setTimeout(() => location.reload(), 280);
  } catch (error) {
    status.textContent = error?.message || "Could not save this framing.";
    state.busy = false;
    save.disabled = false;
  }
}

export default function installMenuAiMenuCropOverlay() {
  createModal();
  let queued = false;
  const queueEnsure = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      ensureButton();
    });
  };
  const observer = new MutationObserver(queueEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "src"] });
  window.addEventListener("popstate", queueEnsure);
  window.addEventListener("hashchange", queueEnsure);
  document.addEventListener("click", queueEnsure, true);
  window.setInterval(queueEnsure, 1000);
  queueEnsure();
}