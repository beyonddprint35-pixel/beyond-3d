import { supabase } from "../../../lib/supabaseClient";

const BUCKET = "menu-item-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(file) {
  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

export function validateMenuItemImage(file) {
  if (!file) return "Choose an image first.";
  if (!ALLOWED_TYPES.has(file.type)) return "Use a JPG, PNG or WEBP image.";
  if (Number(file.size || 0) > MAX_BYTES) return "Images can be up to 8 MB.";
  return "";
}

export async function uploadMenuItemImage({ file, itemId, projectId = "draft", previousPath = "" }) {
  const validation = validateMenuItemImage(file);
  if (validation) throw new Error(validation);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData?.session;
  if (!session?.user?.id) throw new Error("Sign in to upload menu photos.");

  const safeItemId = String(itemId || "item").replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeProjectId = String(projectId || "draft").replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${session.user.id}/${safeProjectId}/${safeItemId}-${Date.now()}.${extensionFor(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = publicData?.publicUrl || "";
  if (!publicUrl) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw new Error("Could not create a public image URL.");
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]).catch(() => {});
  }

  return { image_url: publicUrl, image_path: path };
}

export async function removeMenuItemImage(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
