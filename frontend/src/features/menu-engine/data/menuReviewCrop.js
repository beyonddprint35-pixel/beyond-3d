function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not preview ${file?.name || "menu photo"}.`));
    };
    image.src = url;
  });
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close?.() };
    } catch {
      // Fall back to a normal image element below.
    }
  }
  return loadImageElement(file);
}

function cropRect(box, imageWidth, imageHeight) {
  const normalized = box && typeof box === "object" ? box : null;
  if (!normalized) return null;

  const x = clamp(normalized.x, 0, 1000) / 1000 * imageWidth;
  const y = clamp(normalized.y, 0, 1000) / 1000 * imageHeight;
  const width = clamp(normalized.width, 1, 1000) / 1000 * imageWidth;
  const height = clamp(normalized.height, 1, 1000) / 1000 * imageHeight;
  if (width < 2 || height < 2) return null;

  // Give the owner enough surrounding context to recognize the row while
  // keeping the crop focused on the exact AI uncertainty.
  const padX = Math.max(10, width * 0.08);
  const padY = Math.max(10, height * 0.55);
  const left = Math.max(0, x - padX);
  const top = Math.max(0, y - padY);
  const right = Math.min(imageWidth, x + width + padX);
  const bottom = Math.min(imageHeight, y + height + padY);

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function renderCrop(source, rect) {
  if (!rect || typeof document === "undefined") return "";
  const maxWidth = 640;
  const scale = Math.min(1, maxWidth / rect.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return "";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export async function attachReviewSourceCrops(files = [], reviewItems = []) {
  if (!Array.isArray(reviewItems) || !reviewItems.length || !Array.isArray(files) || !files.length) return reviewItems || [];

  const items = reviewItems.map((item) => ({ ...item }));
  const filesByName = new Map();
  files.forEach((file) => {
    if (file?.name && !filesByName.has(file.name)) filesByName.set(file.name, file);
  });

  const indexesByFile = new Map();
  items.forEach((item, index) => {
    const fileName = String(item?.source_file_name || "").trim();
    if (!fileName || !item?.source_box || !filesByName.has(fileName)) return;
    const indexes = indexesByFile.get(fileName) || [];
    indexes.push(index);
    indexesByFile.set(fileName, indexes);
  });

  for (const [fileName, indexes] of indexesByFile.entries()) {
    const file = filesByName.get(fileName);
    if (!file) continue;
    let loaded = null;
    try {
      loaded = await loadImageSource(file);
      for (const index of indexes) {
        const rect = cropRect(items[index]?.source_box, loaded.width, loaded.height);
        const crop = renderCrop(loaded.source, rect);
        if (!crop) continue;
        items[index] = {
          ...items[index],
          source_photo_name: fileName,
          source_crop_data_url: crop,
        };
      }
    } catch {
      // Text evidence remains available if a browser cannot render a crop.
    } finally {
      loaded?.cleanup?.();
    }
  }

  return items;
}
