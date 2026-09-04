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
  const explicitProject = projectId && projectId !== "draft" ? projectId : "";
  return {
    sourcePath: path,
    projectId: String(explicitProject || parts[1] || "").trim(),
  };
}

async function sessionToken() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Please sign in again before enhancing photos.");
  return session.access_token;
}

async function parseFunctionError(error, fallback = "AI photo request failed.") {
  let message = error?.message || fallback;
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

async function invokePhotoAi(body, fallback) {
  const token = await sessionToken();
  const { data, error } = await supabase.functions.invoke("menu-photo-enhance", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw await parseFunctionError(error, fallback);
  if (!data?.ok) throw new Error(data?.error || fallback);
  return data;
}

export async function getMenuPhotoStyleMemory({ projectId = "", sourcePath = "" }) {
  const context = resolveStorageContext("", sourcePath, projectId);
  if (!context.projectId) return { exists: false };
  const data = await invokePhotoAi({ action: "status", projectId: context.projectId }, "Could not read Style Memory.");
  return { exists: Boolean(data.styleMemoryExists), path: data.styleMemoryPath || "", projectId: context.projectId };
}

export async function rememberMenuPhotoStyle({ projectId = "", sourcePath = "", approvedPath }) {
  const context = resolveStorageContext("", sourcePath || approvedPath, projectId);
  if (!context.projectId || !approvedPath) throw new Error("Could not save Style Memory for this menu.");
  const data = await invokePhotoAi({ action: "remember", projectId: context.projectId, approvedPath }, "Could not save Style Memory.");
  return { exists: Boolean(data.styleMemoryExists), path: data.styleMemoryPath || "", projectId: context.projectId };
}

export async function resetMenuPhotoStyleMemory({ projectId = "", sourcePath = "" }) {
  const context = resolveStorageContext("", sourcePath, projectId);
  if (!context.projectId) return { exists: false };
  const data = await invokePhotoAi({ action: "reset", projectId: context.projectId }, "Could not reset Style Memory.");
  return { exists: Boolean(data.styleMemoryExists), projectId: context.projectId };
}

export async function enhanceMenuPhotoWithAi({
  sourceUrl,
  sourcePath = "",
  projectId = "",
  mode = "enhance",
  itemId = "dish",
}) {
  const context = resolveStorageContext(sourceUrl, sourcePath, projectId);
  if (!context.projectId || !context.sourcePath) {
    throw new Error("The original uploaded dish photo could not be found. Try uploading it again.");
  }

  const size = await imageSizeForUrl(sourceUrl);
  const data = await invokePhotoAi({
    action: "enhance",
    projectId: context.projectId,
    itemId,
    sourcePath: context.sourcePath,
    mode,
    size,
  }, "AI could not enhance this photo.");

  if (!data?.imageBase64) throw new Error("AI returned no photo.");
  return {
    file: base64ToFile(data.imageBase64, data.mimeType, `${itemId}-${mode}-ai.png`),
    mode: data.mode || mode,
    model: data.model || "gpt-image-2",
    size: data.size || size,
    styleLocked: Boolean(data.styleLocked),
    styleMemoryExists: Boolean(data.styleMemoryExists),
    projectId: context.projectId,
  };
}
