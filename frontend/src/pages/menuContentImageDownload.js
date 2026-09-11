import { readMenuStudioV2Draft } from "../features/menu-engine/studio/menuStudioV2Session";
import "./menuContentImageDownload.css";

const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

function isContentStudio() {
  return window.location.pathname.startsWith("/menu-studio/content");
}

function localizedValues(value) {
  if (value && typeof value === "object") return Object.values(value).map(normalized).filter(Boolean);
  const text = normalized(value);
  return text ? [text] : [];
}

function selectedItemFromDraft(draft) {
  const items = draft?.menu?.items || [];
  const groups = draft?.menu?.groups || [];
  const active = document.querySelector(".menu-content-v2-items > button.active:not(.menu-content-v2-add-item)");
  if (!active) return null;

  const wantedName = normalized(active.querySelector("strong")?.textContent);
  const categoryBlock = active.closest(".menu-content-v2-category-block");
  const wantedGroup = normalized(categoryBlock?.querySelector(":scope > .menu-content-v2-category-row strong")?.textContent);
  const matchingGroupIds = new Set(
    groups.filter((group) => localizedValues(group.name).includes(wantedGroup)).map((group) => group.id),
  );

  return items.find((item) => matchingGroupIds.has(item.group_id) && localizedValues(item.name).includes(wantedName))
    || items.find((item) => localizedValues(item.name).includes(wantedName))
    || null;
}

function itemName(item) {
  if (item?.name && typeof item.name === "object") {
    return String(item.name.en || item.name.he || item.name.ar || Object.values(item.name)[0] || "menu-photo");
  }
  return String(item?.name || item?.name_en || item?.title || "menu-photo");
}

function safeFilename(value) {
  const cleaned = String(value || "menu-photo")
    .normalize("NFKD")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || "menu-photo";
}

function extensionFor(blob, url) {
  const type = String(blob?.type || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  if (type.includes("heic") || type.includes("heif")) return "heic";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match?.[1]?.toLowerCase() || "jpg";
  } catch {
    return "jpg";
  }
}

function iconMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function fullPhotoUrl(item) {
  if (!item) return "";

  // image_url may point to a menu-framing derivative. Downloads should always
  // prefer the untouched full-resolution source asset instead of that crop.
  const enhanced = String(item.image_processed_url || "").trim();
  if (enhanced) return enhanced;

  const original = String(item.image_original_url || "").trim();
  if (original) return original;

  // Older framed items may only retain the full source inside image_menu_crop.
  const framingSource = String(item.image_menu_crop?.source_url || "").trim();
  if (framingSource) return framingSource;

  // Last fallback for legacy items that never stored original/processed fields.
  return String(item.image_url || "").trim();
}

async function downloadCurrentPhoto(button) {
  if (button.disabled) return;

  window.dispatchEvent(new CustomEvent("beyond-menu-studio-flush-draft", { detail: { saved: true } }));
  const draft = readMenuStudioV2Draft();
  const item = selectedItemFromDraft(draft);
  const url = fullPhotoUrl(item);
  if (!item || !url) return;

  const originalLabel = button.querySelector("span")?.textContent || "Download photo";
  button.disabled = true;
  button.classList.add("is-downloading");
  const label = button.querySelector("span");
  if (label) label.textContent = "Downloading…";

  try {
    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${safeFilename(itemName(item))}.${extensionFor(blob, url)}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  } catch (error) {
    console.error("Beyond photo download failed", error);
    window.alert("Could not download this photo. Please try again.");
  } finally {
    button.disabled = false;
    button.classList.remove("is-downloading");
    if (label) label.textContent = originalLabel;
  }
}

function ensureDownloadButton() {
  if (!isContentStudio()) return;

  // The customer-facing studio must never expose raw storage URLs.
  document.querySelectorAll(".menu-content-v2-image-url-toggle, .menu-content-v2-image-input").forEach((node) => {
    node.style.setProperty("display", "none", "important");
    node.setAttribute("aria-hidden", "true");
  });

  const editor = document.querySelector(".menu-content-v2-image-editor");
  if (!editor) return;

  const draft = readMenuStudioV2Draft();
  const item = selectedItemFromDraft(draft);
  const hasPhoto = Boolean(fullPhotoUrl(item));

  let button = editor.querySelector(":scope > .menu-content-v2-image-download");
  if (!hasPhoto) {
    button?.remove();
    return;
  }

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "menu-content-v2-image-download";
    button.innerHTML = `${iconMarkup()}<span>Download photo</span>`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      downloadCurrentPhoto(button);
    });
    editor.appendChild(button);
  }
}

export default function installMenuContentImageDownload() {
  if (typeof window === "undefined") return;

  let queued = false;
  const queueEnsure = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      ensureDownloadButton();
    });
  };

  const observer = new MutationObserver(queueEnsure);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "src"],
  });

  document.addEventListener("click", queueEnsure, true);
  window.addEventListener("popstate", queueEnsure);
  window.addEventListener("hashchange", queueEnsure);
  window.addEventListener("beyond-menu-translations-applied", queueEnsure);
  window.setInterval(queueEnsure, 1200);
  queueEnsure();
}
