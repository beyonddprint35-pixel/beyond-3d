import { supabase } from "../../../lib/supabaseClient";

export const MENU_IMPORT_MAX_FILES = 12;
export const MENU_IMPORT_MAX_TOTAL_MB = 25;
export const MENU_IMPORT_MAX_TOTAL_BYTES = MENU_IMPORT_MAX_TOTAL_MB * 1024 * 1024;
export const MENU_IMPORT_SUPPORTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function totalImportBytes(files = []) {
  return files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
}

export function validateImportFiles(files = []) {
  if (files.length > MENU_IMPORT_MAX_FILES) return `You can upload up to ${MENU_IMPORT_MAX_FILES} files.`;
  if (files.some((file) => !MENU_IMPORT_SUPPORTED_TYPES.has(file?.type))) return "Only PDF, JPG, PNG or WEBP files are supported.";
  if (totalImportBytes(files) > MENU_IMPORT_MAX_TOTAL_BYTES) return `The combined upload can be up to ${MENU_IMPORT_MAX_TOTAL_MB} MB.`;
  return "";
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        base64: comma >= 0 ? value.slice(comma + 1) : value,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function parseFunctionError(functionError) {
  let message = functionError?.message || "Could not build this menu.";
  let details = null;
  try {
    const response = functionError?.context;
    if (response && typeof response.clone === "function") {
      const raw = await response.clone().text();
      if (raw) {
        try {
          details = JSON.parse(raw);
          message = details?.error || details?.message || message;
        } catch {
          message = raw || message;
        }
      }
    }
  } catch {
    // Preserve the original function error.
  }
  const error = new Error(message);
  error.details = details;
  return error;
}

export async function getMenuAiAllowance() {
  const { data, error } = await supabase.rpc("get_menu_generation_allowance");
  if (error) throw error;
  return data;
}

export async function getMenuImportSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

export async function importMenuWithAi({ session, files = [], text = "", languages = [] }) {
  if (!session?.user?.id || !session?.access_token) throw new Error("Sign in is required to use AI menu import.");
  if (!languages.length) throw new Error("Choose at least one menu language.");
  if (!String(text || "").trim() && !files.length) throw new Error("Upload your menu or paste its content first.");
  const fileError = validateImportFiles(files);
  if (fileError) throw new Error(fileError);

  const allowance = await getMenuAiAllowance();
  if (allowance && !allowance.unlimited && Number(allowance.remaining_attempts) <= 0) {
    throw new Error("You have used all available AI menu builds.");
  }

  const sourceType = String(text || "").trim() && files.length
    ? "mixed"
    : String(text || "").trim()
      ? "text"
      : files.some((file) => file.type === "application/pdf")
        ? "pdf"
        : "image";

  const { data: project, error: createError } = await supabase
    .from("menu_projects")
    .insert({
      owner_user_id: session.user.id,
      created_by: session.user.id,
      name: `Menu Import ${new Date().toLocaleDateString("en-CA")}`,
      source_type: sourceType,
    })
    .select()
    .single();

  if (createError) throw createError;

  const payloadFiles = await Promise.all(files.map(fileToPayload));
  const imageOnly = files.length > 0
    && files.every((file) => file.type?.startsWith("image/"))
    && !String(text || "").trim();
  const functionName = imageOnly ? "menu-ai-extract-smart-test" : "menu-ai-extract";

  const { data, error: functionError } = await supabase.functions.invoke(functionName, {
    body: {
      projectId: project.id,
      text: String(text || "").trim(),
      files: payloadFiles,
      languages,
      expectedItemCount: 0,
      recoveryProjectId: null,
      smartRetry: false,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (functionError) throw await parseFunctionError(functionError);
  if (!data?.ok || !data?.menu) throw new Error(data?.error || "Could not build this menu.");

  return {
    project: { ...project, name: data.menu?.restaurant_name || project.name, structured_menu: data.menu, status: "ready" },
    menu: data.menu,
    allowance: data.unlimited ? allowance : { ...allowance, remaining_attempts: data.remainingAttempts },
    aiCost: data.aiCost || null,
  };
}
