import { supabase } from "../../../lib/supabaseClient";

function base64ToFile(base64, mimeType, name) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mimeType || "image/png" });
}

function imageSizeForUrl(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width || 1;
      const height = image.naturalHeight || image.height || 1;
      const ratio = width / height;
      if (ratio > 1.18) resolve("1536x1024");
      else if (ratio < 0.85) resolve("1024x1536");
      else resolve("1024x1024");
    };
    image.onerror = () => resolve("1536x1024");
    image.src = url;
  });
}

function resolveStorageContext(sourceUrl, sourcePath = "", projectId = "") {
  let path = String(sourcePath || "").trim();
  if (!path && sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const marker = "/storage/v1/object/public/menu-item-images/";
      const index = url.pathname.indexOf(marker);
      if (index >= 0) path = decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      path = "";
    }
  }
  const parts = path.split("/").filter(Boolean);
  return {
    sourcePath: path,
    projectId: String(projectId || parts[1] || "").trim(),
  };
}

async function parseFunctionError(error) {
  let message = error?.message || "AI could not enhance this photo.";
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

export async function enhanceMenuPhotoWithAi({
  sourceUrl,
  sourcePath = "",
  projectId = "",
  mode = "enhance",
  itemId = "dish",
}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Please sign in again before enhancing photos.");

  const context = resolveStorageContext(sourceUrl, sourcePath, projectId);
  if (!context.projectId || !context.sourcePath) {
    throw new Error("The original uploaded dish photo could not be found. Try uploading it again.");
  }

  const size = await imageSizeForUrl(sourceUrl);
  const { data, error } = await supabase.functions.invoke("menu-photo-enhance", {
    body: {
      projectId: context.projectId,
      itemId,
      sourcePath: context.sourcePath,
      mode,
      size,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw await parseFunctionError(error);
  if (!data?.ok || !data?.imageBase64) throw new Error(data?.error || "AI returned no photo.");

  return {
    file: base64ToFile(data.imageBase64, data.mimeType, `${itemId}-${mode}-ai.png`),
    mode: data.mode || mode,
    model: data.model || "gpt-image-2",
    size: data.size || size,
  };
}
