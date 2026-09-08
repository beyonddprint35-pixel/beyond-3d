import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import { uploadMenuItemImage } from "../features/menu-engine/data/menuItemImageService";
import "./menuAiMenuCropOverlay.css";

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const state = { open: false, zoom: 1, x: 50, y: 50, item: null, src: "", busy: false };

function findActiveImage() {
  const root = document.querySelector(".ai-photo-v2, .ai-dish-v1");
  if (!root) return null;
  const candidates = [...root.querySelectorAll(".ai-dish-v1-result-image img, .ai-photo-v2-results img")];
  return candidates.find((img) => img.offsetParent !== null && img.clientWidth > 120 && img.clientHeight > 120) || candidates[0] || null;
}

function findItemForImage(src) {
  const draft = readMenuStudioV2Draft();
  const items = draft?.menu?.items || [];
  const clean = String(src || "");
  return items.find((item) => String(item.image_url || "") === clean || (item.image_ai_history || []).some((v) => String(v?.imageUrl || "") === clean))
    || items.find((item) => String(item.image_url || "") && clean.includes(String(item.image_url || "")))
    || null;
}

function projectIdFor(draft) {
  const q = new URLSearchParams(location.search).get("project") || "";
  return q || draft?.importProject?.id || draft?.profile?.importedProjectId || draft?.menu?.source_project_id || "draft";
}

function ensureButton() {
  if (!location.pathname.startsWith("/menu-studio/ai-images")) return;
  const img = findActiveImage();
  if (!img) return;
  const box = img.closest(".ai-dish-v1-result-image") || img.parentElement;
  if (!box || box.querySelector(".beyond-menu-crop-btn")) return;
  box.style.position = "relative";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "beyond-menu-crop-btn";
  btn.textContent = "Adjust menu crop";
  btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openEditor(img); });
  box.appendChild(btn);
}

function createModal() {
  if (document.getElementById("beyond-menu-crop-modal")) return;
  const el = document.createElement("div");
  el.id = "beyond-menu-crop-modal";
  el.className = "beyond-menu-crop-modal";
  el.innerHTML = `<div class="beyond-menu-crop-backdrop"></div><section class="beyond-menu-crop-card" role="dialog" aria-modal="true" aria-label="Adjust menu crop"><header><div><strong>Adjust how this photo appears on the menu</strong><p>Zoom and reposition the photo. The AI original stays saved.</p></div><button type="button" data-close aria-label="Close">×</button></header><div class="beyond-menu-crop-preview-wrap"><div class="beyond-menu-crop-preview"><img alt="Menu crop preview"></div><span>Menu preview</span></div><div class="beyond-menu-crop-controls"><label><span>Zoom</span><div><button type="button" data-zoom-out>−</button><input data-zoom type="range" min="1" max="3" step="0.05" value="1"><button type="button" data-zoom-in>+</button><output data-zoom-label>100%</output></div></label><label><span>Horizontal position</span><input data-x type="range" min="0" max="100" step="1" value="50"></label><label><span>Vertical position</span><input data-y type="range" min="0" max="100" step="1" value="50"></label><button type="button" class="beyond-menu-crop-reset" data-reset>Reset</button></div><footer><button type="button" data-close>Cancel</button><button type="button" class="primary" data-save>Use this crop on menu</button></footer><p class="beyond-menu-crop-status" data-status></p></section>`;
  document.body.appendChild(el);
  el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeEditor));
  el.querySelector(".beyond-menu-crop-backdrop").addEventListener("click", closeEditor);
  el.querySelector("[data-zoom]").addEventListener("input", (e) => { state.zoom = clamp(e.target.value, 1, 3); render(); });
  el.querySelector("[data-x]").addEventListener("input", (e) => { state.x = clamp(e.target.value, 0, 100); render(); });
  el.querySelector("[data-y]").addEventListener("input", (e) => { state.y = clamp(e.target.value, 0, 100); render(); });
  el.querySelector("[data-zoom-out]").addEventListener("click", () => { state.zoom = clamp(state.zoom - .1, 1, 3); render(); });
  el.querySelector("[data-zoom-in]").addEventListener("click", () => { state.zoom = clamp(state.zoom + .1, 1, 3); render(); });
  el.querySelector("[data-reset]").addEventListener("click", () => { state.zoom = 1; state.x = 50; state.y = 50; render(); });
  el.querySelector("[data-save]").addEventListener("click", saveCrop);
}

function openEditor(img) {
  createModal();
  const item = findItemForImage(img.currentSrc || img.src);
  if (!item) { alert("Choose a saved AI version first, then adjust its menu crop."); return; }
  state.item = item;
  state.src = img.currentSrc || img.src;
  state.zoom = 1;
  state.x = 50;
  state.y = 50;
  state.open = true;
  state.busy = false;
  document.getElementById("beyond-menu-crop-modal").classList.add("open");
  render();
}

function closeEditor() {
  if (state.busy) return;
  state.open = false;
  document.getElementById("beyond-menu-crop-modal")?.classList.remove("open");
}

function render() {
  const modal = document.getElementById("beyond-menu-crop-modal");
  if (!modal) return;
  const img = modal.querySelector(".beyond-menu-crop-preview img");
  img.src = state.src;
  img.style.objectPosition = `${state.x}% ${state.y}%`;
  img.style.transform = `scale(${state.zoom})`;
  img.style.transformOrigin = `${state.x}% ${state.y}%`;
  modal.querySelector("[data-zoom]").value = String(state.zoom);
  modal.querySelector("[data-x]").value = String(state.x);
  modal.querySelector("[data-y]").value = String(state.y);
  modal.querySelector("[data-zoom-label]").textContent = `${Math.round(state.zoom * 100)}%`;
}

async function imageForCanvas(src) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load this image for cropping."));
    img.src = src;
  });
}

async function buildCropFile() {
  const img = await imageForCanvas(state.src);
  const out = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare menu crop.");
  const base = Math.max(out / img.naturalWidth, out / img.naturalHeight);
  const scale = base * state.zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const overflowX = Math.max(0, drawW - out);
  const overflowY = Math.max(0, drawH - out);
  const dx = -(overflowX * (state.x / 100));
  const dy = -(overflowY * (state.y / 100));
  ctx.drawImage(img, dx, dy, drawW, drawH);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not create crop.")), "image/webp", .92));
  return new File([blob], `menu-crop-${state.item?.id || "item"}.webp`, { type: "image/webp" });
}

async function saveCrop() {
  if (state.busy || !state.item) return;
  const modal = document.getElementById("beyond-menu-crop-modal");
  const status = modal.querySelector("[data-status]");
  const save = modal.querySelector("[data-save]");
  state.busy = true;
  save.disabled = true;
  status.textContent = "Saving menu crop…";
  try {
    const draft = readMenuStudioV2Draft();
    const item = (draft?.menu?.items || []).find((i) => i.id === state.item.id);
    if (!draft || !item) throw new Error("Could not find this menu item.");
    const file = await buildCropFile();
    const historyPaths = new Set((item.image_ai_history || []).map((v) => v?.imagePath).filter(Boolean));
    const previousPath = item.image_path && !historyPaths.has(item.image_path) ? item.image_path : "";
    const uploaded = await uploadMenuItemImage({ file, itemId: item.id, projectId: projectIdFor(draft), previousPath });
    const nextItems = draft.menu.items.map((i) => i.id === item.id ? { ...i, image_url: uploaded.image_url, image_path: uploaded.image_path, image_focus_x: 50, image_focus_y: 50, image_menu_crop: { source_url: state.src, zoom: state.zoom, x: state.x, y: state.y, updated_at: new Date().toISOString() } } : i);
    const next = { ...draft, menu: { ...draft.menu, items: nextItems } };
    writeMenuStudioV2Draft(next);
    status.textContent = "Saved. This framing is now used on the menu.";
    setTimeout(() => location.reload(), 450);
  } catch (err) {
    status.textContent = err?.message || "Could not save this crop.";
    state.busy = false;
    save.disabled = false;
  }
}

export default function installMenuAiMenuCropOverlay() {
  createModal();
  const observer = new MutationObserver(() => ensureButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", ensureButton);
  window.addEventListener("hashchange", ensureButton);
  setInterval(ensureButton, 1200);
  ensureButton();
}
