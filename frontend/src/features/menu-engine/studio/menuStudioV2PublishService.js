import { supabase } from "../../../lib/supabaseClient";
import {
  menuStudioProjectId,
  saveMenuStudioProject,
} from "./menuStudioV2Persistence";

const VERSION_COLUMNS = "id,project_id,version_number,slug,menu_snapshot,design_snapshot,publication_snapshot,published_at";

function cleanSlug(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rpcMessage(error, fallback) {
  const raw = String(error?.message || error?.details || error?.hint || "").trim();
  if (/already in use|duplicate key|23505/i.test(raw)) return "This menu address is already in use.";
  if (/Authentication required|JWT|not authenticated/i.test(raw)) return "Sign in is required to publish this menu.";
  return raw || fallback;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      const next = value[key];
      if (next !== undefined) result[key] = canonicalJson(next);
      return result;
    }, {});
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJson(left ?? null)) === JSON.stringify(canonicalJson(right ?? null));
}

export function menuStudioHasUnpublishedChanges(project, publishedVersion) {
  if (!project?.published_version_id) return false;
  if (!publishedVersion || publishedVersion.id !== project.published_version_id) return true;
  const state = project?.studio_state || {};
  return !sameJson(state.menu, publishedVersion.menu_snapshot)
    || !sameJson(state.design, publishedVersion.design_snapshot);
}

export async function publishMenuStudioDraft({ draft, slug }) {
  const projectId = menuStudioProjectId(draft);
  if (!projectId) throw new Error("This menu has not been saved to your account yet.");

  const normalizedSlug = cleanSlug(slug);
  if (!normalizedSlug) throw new Error("Choose a valid public menu address.");

  // The publish RPC snapshots the cloud draft, not browser state. Force the
  // latest Studio state to Supabase before atomically creating the live version.
  await saveMenuStudioProject(draft);

  const { data, error } = await supabase.rpc("publish_menu_studio_v2", {
    p_project_id: projectId,
    p_slug: normalizedSlug,
  });
  if (error) throw new Error(rpcMessage(error, "Could not publish this menu."));
  if (!data?.ok || !data?.versionId) throw new Error("Could not create the live menu version.");
  return data;
}

export async function unpublishMenuStudioProject(projectId) {
  if (!projectId) throw new Error("Menu project is required.");
  const { data, error } = await supabase.rpc("unpublish_menu_studio_v2", {
    p_project_id: projectId,
  });
  if (error) throw new Error(rpcMessage(error, "Could not unpublish this menu."));
  if (!data?.ok) throw new Error("Could not unpublish this menu.");
  return data;
}

export async function readMenuStudioPublishState(projectId) {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from("menu_projects")
    .select("id,published_slug,published_version_id,published_at,status")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function listMenuStudioPublicationVersions(projectId) {
  if (!projectId) return [];
  const { data, error } = await supabase
    .from("menu_publication_versions")
    .select(VERSION_COLUMNS)
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadMenuStudioCurrentVersions(projects = []) {
  const versionIds = [...new Set(projects.map((project) => project?.published_version_id).filter(Boolean))];
  if (!versionIds.length) return new Map();
  const { data, error } = await supabase
    .from("menu_publication_versions")
    .select(VERSION_COLUMNS)
    .in("id", versionIds);
  if (error) throw error;
  return new Map((data || []).map((version) => [version.id, version]));
}

export { cleanSlug as normalizeMenuStudioPublishSlug };
