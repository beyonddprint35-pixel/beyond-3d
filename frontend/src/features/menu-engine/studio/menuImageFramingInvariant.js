import { removeMenuItemImage } from "../data/menuItemImageService";
import {
  readMenuStudioV2Draft,
  writeMenuStudioV2Draft,
} from "./menuStudioV2Session";

function text(value) {
  return String(value || "").trim();
}

function preferredCurrentSource(item) {
  if (text(item?.image_processed_path) && text(item?.image_processed_url)) {
    return {
      path: text(item.image_processed_path),
      url: text(item.image_processed_url),
    };
  }
  if (text(item?.image_original_path) && text(item?.image_original_url)) {
    return {
      path: text(item.image_original_path),
      url: text(item.image_original_url),
    };
  }
  return { path: "", url: "" };
}

function sanitizeItemPhotoFraming(item) {
  const crop = item?.image_menu_crop;
  if (!crop) return { item, changed: false, staleOutputPath: "" };

  const outputPath = text(crop.output_path);
  const cropSourcePath = text(crop.source_path);
  const currentPath = text(item.image_path);
  const currentUrl = text(item.image_url);
  const preferred = preferredCurrentSource(item);

  const currentIsCropOutput = Boolean(outputPath && currentPath === outputPath);
  const cropSourceStillCurrent = !preferred.path || !cropSourcePath || preferred.path === cropSourcePath;
  const currentPhotoExists = Boolean(currentPath || currentUrl);

  // A framing record is valid only while the item is still displaying that
  // framing output and the underlying original/AI source has not changed.
  if (currentIsCropOutput && cropSourceStillCurrent && currentPhotoExists) {
    return { item, changed: false, staleOutputPath: "" };
  }

  const next = {
    ...item,
    image_menu_crop: null,
    image_focus_x: 50,
    image_focus_y: 50,
  };

  // If an old crop is still occupying image_url/image_path while a newer
  // original or AI-processed photo exists, restore that newer source. This
  // repairs projects that were already affected by the old framing behavior.
  if (currentIsCropOutput && preferred.path && preferred.url && !cropSourceStillCurrent) {
    next.image_path = preferred.path;
    next.image_url = preferred.url;
  }

  return {
    item: next,
    changed: true,
    staleOutputPath: outputPath && outputPath !== text(next.image_path) ? outputPath : "",
  };
}

export function sanitizeMenuImageFraming(menu) {
  if (!menu || !Array.isArray(menu.items)) {
    return { menu, changed: false, staleOutputPaths: [] };
  }

  let changed = false;
  const staleOutputPaths = new Set();
  const items = menu.items.map((item) => {
    const result = sanitizeItemPhotoFraming(item);
    if (result.changed) changed = true;
    if (result.staleOutputPath) staleOutputPaths.add(result.staleOutputPath);
    return result.item;
  });

  return {
    menu: changed ? { ...menu, items } : menu,
    changed,
    staleOutputPaths: [...staleOutputPaths],
  };
}

function cleanStoragePaths(paths) {
  paths.forEach((path) => {
    removeMenuItemImage(path).catch(() => {});
  });
}

function repairStoredDraft({ broadcast = true } = {}) {
  const draft = readMenuStudioV2Draft();
  if (!draft?.menu) return false;

  const result = sanitizeMenuImageFraming(draft.menu);
  if (!result.changed) return false;

  const next = { ...draft, menu: result.menu };
  if (!writeMenuStudioV2Draft(next)) return false;

  cleanStoragePaths(result.staleOutputPaths);

  if (broadcast) {
    window.dispatchEvent(new CustomEvent("beyond-menu-translations-applied", {
      detail: { menu: next.menu, profile: next.profile || {} },
    }));
  }
  return true;
}

export default function installMenuImageFramingInvariant() {
  if (typeof window === "undefined") return;

  // Repair older affected drafts immediately on reload.
  queueMicrotask(() => repairStoredDraft());

  // Every Content Studio autosave already emits this event. Validate the photo
  // state immediately afterwards so a replacement, deletion, revert or new AI
  // result can never keep framing metadata that belongs to the previous image.
  window.addEventListener("beyond-menu-translations-applied", () => {
    queueMicrotask(() => repairStoredDraft());
  });

  // Also repair after returning to the tab, covering restored browser sessions.
  window.addEventListener("pageshow", () => queueMicrotask(() => repairStoredDraft()));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) queueMicrotask(() => repairStoredDraft());
  });
}
