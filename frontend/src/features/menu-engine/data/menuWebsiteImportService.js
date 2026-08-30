import { supabase } from "../../../lib/supabaseClient";
import { importMenuWithAi } from "./menuAiImportService";

async function parseFunctionError(functionError) {
  let message = functionError?.message || "Could not read this website.";
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

export function normalizeWebsiteUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Add a website URL first.");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try { parsed = new URL(withProtocol); }
  catch { throw new Error("Enter a valid website URL."); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http and https website links are supported.");
  parsed.hash = "";
  return parsed.toString();
}

export async function extractMenuWebsiteSource({ session, url }) {
  if (!session?.access_token) throw new Error("Sign in is required to import a website.");
  const normalizedUrl = normalizeWebsiteUrl(url);
  const { data, error } = await supabase.functions.invoke("menu-website-source", {
    body: { url: normalizedUrl },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw await parseFunctionError(error);
  if (!data?.ok || !String(data?.text || "").trim()) throw new Error(data?.error || "Could not find readable menu content on this website.");
  return { ...data, sourceUrl: data.sourceUrl || normalizedUrl };
}

export async function importMenuWebsiteWithAi({ session, url, languages }) {
  const source = await extractMenuWebsiteSource({ session, url });
  const result = await importMenuWithAi({
    session,
    files: [],
    text: source.text,
    languages,
  });
  return { ...result, websiteSource: source };
}
