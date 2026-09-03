import { supabase } from "../../../lib/supabaseClient";

export const AI_DISH_REFERENCE_MAX_FILES = 6;
export const AI_DISH_REFERENCE_MIN_FILES = 2;
export const AI_DISH_MAX_ITEMS = 3;
export const AI_DISH_MIN_ITEMS = 2;
export const AI_DISH_REFERENCE_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file?.name || "reference photo"}.`));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.84) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the restaurant photo references.")), type, quality);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.onerror = () => reject(new Error("Could not prepare the restaurant photo references."));
    reader.readAsDataURL(blob);
  });
}

function drawCover(context, image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (imageRatio > boxRatio) {
    sw = image.naturalHeight * boxRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / boxRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

export function validateDishReferenceFiles(files = []) {
  if (files.length < AI_DISH_REFERENCE_MIN_FILES) return `Upload at least ${AI_DISH_REFERENCE_MIN_FILES} real dish photos.`;
  if (files.length > AI_DISH_REFERENCE_MAX_FILES) return `Use up to ${AI_DISH_REFERENCE_MAX_FILES} reference photos for this test.`;
  if (files.some((file) => !ALLOWED_TYPES.has(file?.type))) return "Use JPG, PNG or WEBP dish photos.";
  const total = files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
  if (total > AI_DISH_REFERENCE_MAX_TOTAL_BYTES) return "Reference photos can be up to 30 MB combined.";
  return "";
}

export async function createDishReferenceCollage(files = []) {
  const validation = validateDishReferenceFiles(files);
  if (validation) throw new Error(validation);

  const loaded = [];
  try {
    for (const file of files) loaded.push(await fileToImage(file));
    const count = loaded.length;
    const columns = count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / columns);
    const size = 1536;
    const gap = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not prepare the restaurant photo references.");
    context.fillStyle = "#f3f1ec";
    context.fillRect(0, 0, size, size);

    const cellWidth = (size - gap * (columns + 1)) / columns;
    const cellHeight = (size - gap * (rows + 1)) / rows;
    loaded.forEach(({ image }, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = gap + column * (cellWidth + gap);
      const y = gap + row * (cellHeight + gap);
      context.save();
      context.beginPath();
      context.roundRect(x, y, cellWidth, cellHeight, 22);
      context.clip();
      drawCover(context, image, x, y, cellWidth, cellHeight);
      context.restore();
    });

    const blob = await canvasToBlob(canvas);
    return {
      mimeType: "image/jpeg",
      base64: await blobToBase64(blob),
      bytes: blob.size,
    };
  } finally {
    loaded.forEach(({ url }) => URL.revokeObjectURL(url));
  }
}

async function parseFunctionError(error) {
  let message = error?.message || "Could not generate this dish image.";
  try {
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw);
          message = body?.error || body?.message || message;
        } catch {
          message = raw;
        }
      }
    }
  } catch {
    // Keep the original function error.
  }
  return new Error(message);
}

export async function generateDishImageWithAi({ projectId, restaurantName, vibe, item, reference }) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Sign in to generate AI dish photos.");
  if (!projectId) throw new Error("This menu needs a saved project before AI dish photos can be generated.");
  if (!item?.id || !item?.name) throw new Error("Choose a valid menu item.");
  if (!reference?.base64) throw new Error("Upload restaurant dish reference photos first.");

  const { data, error } = await supabase.functions.invoke("menu-ai-dish-image-test", {
    body: {
      projectId,
      restaurantName,
      vibe,
      item,
      reference,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw await parseFunctionError(error);
  if (!data?.ok || !data?.imageUrl) throw new Error(data?.error || "AI returned no dish image.");
  return data;
}

export function formatDishImageCost(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `$${amount.toFixed(amount < 0.01 ? 4 : 3)}`;
}

export function localizedDishText(value, language = "en") {
  if (value && typeof value === "object") {
    return String(value[language] || value.en || value.he || value.ar || "").trim();
  }
  return String(value || "").trim();
}

export function normalizeVibe(value) {
  return String(value || "").trim().slice(0, 900);
}
