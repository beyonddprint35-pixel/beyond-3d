import { supabase } from "../../../lib/supabaseClient";

function base64ToFile(base64, mimeType, name) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mimeType || "image/jpeg" });
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

export async function enhanceMenuPhotoWithAi({ sourceUrl, mode = "enhance", itemId = "dish" }) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = data?.session?.access_token;
  if (!token) throw new Error("Please sign in again before enhancing photos.");

  const size = await imageSizeForUrl(sourceUrl);
  const endpoint = import.meta.env.VITE_MENU_PHOTO_AI_ENDPOINT || "/.netlify/functions/menu-photo-enhance";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sourceUrl, mode, size }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "AI could not enhance this photo.");
  if (!result?.imageBase64) throw new Error("AI returned no photo.");

  return {
    file: base64ToFile(result.imageBase64, result.mimeType, `${itemId}-${mode}-ai.jpg`),
    mode: result.mode || mode,
    model: result.model || "gpt-image-2",
    size: result.size || size,
  };
}
