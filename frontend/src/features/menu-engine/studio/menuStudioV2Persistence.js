import { createProjectSaveQueue } from "./projectSaveQueue";
import { supabase } from "../../../lib/supabaseClient";
import { adaptAiStructuredMenuToV3, normalizeV3MenuPriceOptions } from "../data/aiMenuImportAdapter";

export const MENU_STUDIO_SCHEMA_VERSION = 2;
export const MENU_STUDIO_ACTIVE_PROJECT_KEY = "beyond-menu-studio-active-project-v2";

const projectSaves = createProjectSaveQueue({ save: saveMenuStudioProject, onState: emitSaveState });

function text(value) {
  return value == null ? "" : String(value).trim();
}

function hasStudioMenu(state) {
  return Array.isArray(state?.menu?.groups) && Array.isArray(state?.menu?.items);
}

function sourceTypeForDraft(draft) {
  const mode = draft?.profile?.mode || draft?.profile?.sourceFallback || "manual";
  if (mode === "upload") return "text";
  if (mode === "website") return "text";
  return "text";
}

export function menuStudioProjectId(draft = {}) {
  return text(
    draft?.projectId
      || draft?.persistenceProjectId
      || draft?.importProject?.id
      || draft?.profile?.importedProjectId
      || draft?.menu?.source_project_id,
  );
}

export function readActiveMenuStudioProjectId() {
  if (typeof window === "undefined") return "";
  try {
    return text(window.localStorage.getItem(MENU_STUDIO_ACTIVE_PROJECT_KEY));
  } catch {
    return "";
  }
}

export function setActiveMenuStudioProjectId(projectId) {
  if (typeof window === "undefined") return;
  try {
    if (projectId) window.localStorage.setItem(MENU_STUDIO_ACTIVE_PROJECT_KEY, projectId);
    else window.localStorage.removeItem(MENU_STUDIO_ACTIVE_PROJECT_KEY);
  } catch {
    // Active project convenience must never block editing.
  }
}

export function studioStateFromDraft(draft = {}, projectId = menuStudioProjectId(draft)) {
  const normalizedMenu = draft?.menu
    ? normalizeV3MenuPriceOptions({
        ...draft.menu,
        source_project_id: draft.menu.source_project_id || projectId || "",
      })
    : null;

  return {
    schemaVersion: MENU_STUDIO_SCHEMA_VERSION,
    menu: normalizedMenu,
    design: draft?.design || null,
    designId: text(draft?.designId),
    profile: {
      ...(draft?.profile || {}),
      importedProjectId: draft?.profile?.importedProjectId || projectId || "",
    },
    contentLanguage: text(draft?.contentLanguage || normalizedMenu?.default_language || "en") || "en",
    publication: draft?.publication || null,
    savedAt: new Date().toISOString(),
  };
}

export function draftFromMenuStudioProject(project) {
  if (!project?.id) return null;
  const state = project.studio_state && typeof project.studio_state === "object" ? project.studio_state : {};
  let menu = hasStudioMenu(state) ? state.menu : null;

  if (!menu && project?.structured_menu?.sections?.length && Array.isArray(project.structured_menu.sections)) {
    menu = adaptAiStructuredMenuToV3(project.structured_menu, { projectId: project.id });
  }
  if (!menu) return null;

  menu = normalizeV3MenuPriceOptions({
    ...menu,
    source_project_id: menu.source_project_id || project.id,
  });

  return {
    ...state,
    menu,
    projectId: project.id,
    persistenceProjectId: project.id,
    profile: {
      ...(state.profile || {}),
      importedProjectId: state?.profile?.importedProjectId || project.id,
    },
    importProject: {
      id: project.id,
      name: project.name,
      status: project.status,
      source_type: project.source_type,
      structured_menu: project.structured_menu || {},
    },
    savedAt: state.savedAt || project.updated_at || new Date().toISOString(),
  };
}

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

const PROJECT_COLUMNS = "id,name,status,source_type,structured_menu,source_metadata,activated_site_id,studio_state,studio_schema_version,created_at,updated_at,last_opened_at,archived_at";

export async function loadMenuStudioProject(projectId) {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from("menu_projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .is("archived_at", null)
    .single();
  if (error) throw error;
  return data;
}

export async function ensureMenuStudioProject(draft = {}) {
  if (!draft?.menu) return { project: null, draft };
  const session = await currentSession();
  if (!session?.user?.id) return { project: null, draft };

  let projectId = menuStudioProjectId(draft);
  let project = null;

  if (projectId) {
    project = await loadMenuStudioProject(projectId);
  }

  if (!project) {
    const { data, error } = await supabase
      .from("menu_projects")
      .insert({
        owner_user_id: session.user.id,
        created_by: session.user.id,
        name: text(draft?.menu?.restaurant_name) || "Untitled Menu",
        source_type: sourceTypeForDraft(draft),
        status: "draft",
      })
      .select(PROJECT_COLUMNS)
      .single();
    if (error) throw error;
    project = data;
    projectId = data.id;
  }

  const nextDraft = {
    ...draft,
    projectId,
    persistenceProjectId: projectId,
    menu: normalizeV3MenuPriceOptions({
      ...draft.menu,
      source_project_id: draft.menu.source_project_id || projectId,
    }),
    profile: {
      ...(draft.profile || {}),
      importedProjectId: draft?.profile?.importedProjectId || projectId,
    },
  };

  const state = studioStateFromDraft(nextDraft, projectId);
  const { data: updated, error: updateError } = await supabase
    .from("menu_projects")
    .update({
      name: text(nextDraft.menu.restaurant_name) || project.name || "Untitled Menu",
      studio_state: state,
      studio_schema_version: MENU_STUDIO_SCHEMA_VERSION,
      last_opened_at: new Date().toISOString(),
      archived_at: null,
    })
    .eq("id", projectId)
    .select(PROJECT_COLUMNS)
    .single();
  if (updateError) throw updateError;

  setActiveMenuStudioProjectId(projectId);
  return { project: updated, draft: { ...nextDraft, savedAt: state.savedAt } };
}

export async function saveMenuStudioProject(draft = {}) {
  const projectId = menuStudioProjectId(draft);
  if (!projectId || !draft?.menu) return null;
  const state = studioStateFromDraft(draft, projectId);
  const { data, error } = await supabase
    .from("menu_projects")
    .update({
      name: text(draft.menu.restaurant_name) || "Untitled Menu",
      studio_state: state,
      studio_schema_version: MENU_STUDIO_SCHEMA_VERSION,
    })
    .eq("id", projectId)
    .select("id,updated_at")
    .single();
  if (error) throw error;
  return data;
}

function emitSaveState(state, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("beyond-menu-studio-cloud-save", { detail: { state, ...detail } }));
}

export function queueMenuStudioProjectSave(draft = {}) {
  const projectId = menuStudioProjectId(draft);
  if (!projectId || !draft?.menu || typeof window === "undefined") return;
  projectSaves.enqueue(projectId, draft);
}

export function flushMenuStudioProjectSave(projectId) {
  return projectSaves.flush(projectId);
}

export async function listMenuStudioProjects() {
  const { data, error } = await supabase
    .from("menu_projects")
    .select(PROJECT_COLUMNS)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).flatMap((project) => {
    if (hasStudioMenu(project.studio_state)) return [project];
    // Older imports already have editable content, but predate studio_state.
    // Use the same adapter as direct project entry; persist only when edited.
    const draft = draftFromMenuStudioProject(project);
    return draft ? [{ ...project, studio_state: studioStateFromDraft(draft, project.id) }] : [];
  });
}

export async function archiveMenuStudioProject(projectId) {
  const { error } = await supabase
    .from("menu_projects")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", projectId);
  if (error) throw error;
  if (readActiveMenuStudioProjectId() === projectId) setActiveMenuStudioProjectId("");
}

export async function deleteMenuStudioProject(projectId) {
  const id = text(projectId);
  if (!id) throw new Error("This menu could not be identified.");

  await flushMenuStudioProjectSave(id);

  const { data: project, error: projectError } = await supabase
    .from("menu_projects")
    .select("id,activated_site_id,source_metadata,studio_state")
    .eq("id", id)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project?.id) throw new Error("This menu no longer exists or you do not have permission to delete it.");

  const legacySiteId = text(
    project.activated_site_id
      || project.studio_state?.profile?.legacySiteId
      || project.source_metadata?.studio_migration?.site_id,
  );

  // Older migrated menus can still be served from menu_sites. Take that route
  // offline before removing the Studio project so a deleted menu cannot remain live.
  if (legacySiteId) {
    const { data: legacySite, error: legacyReadError } = await supabase
      .from("menu_sites")
      .select("id,published")
      .eq("id", legacySiteId)
      .maybeSingle();
    if (legacyReadError) throw legacyReadError;

    if (legacySite?.published) {
      const { data: unpublished, error: unpublishError } = await supabase
        .from("menu_sites")
        .update({ published: false })
        .eq("id", legacySiteId)
        .select("id");
      if (unpublishError) throw unpublishError;
      if (!unpublished?.length) throw new Error("Could not take the live menu offline. Please try again.");
    }
  }

  const { data: deleted, error } = await supabase
    .from("menu_projects")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!deleted?.length) throw new Error("This menu could not be deleted.");

  if (readActiveMenuStudioProjectId() === id) setActiveMenuStudioProjectId("");
  return true;
}

export async function duplicateMenuStudioProject(project) {
  const session = await currentSession();
  if (!session?.user?.id) throw new Error("Sign in is required.");
  const sourceState = project?.studio_state || {};
  if (!hasStudioMenu(sourceState)) throw new Error("This menu does not have an editable Studio draft.");

  const duplicateName = `${text(project.name) || "Menu"} Copy`;
  const { data: created, error: createError } = await supabase
    .from("menu_projects")
    .insert({
      owner_user_id: session.user.id,
      created_by: session.user.id,
      name: duplicateName,
      source_type: "text",
      status: "draft",
      studio_schema_version: MENU_STUDIO_SCHEMA_VERSION,
      studio_state: sourceState,
    })
    .select(PROJECT_COLUMNS)
    .single();
  if (createError) throw createError;

  const nextState = {
    ...sourceState,
    menu: {
      ...sourceState.menu,
      source_project_id: created.id,
      restaurant_name: duplicateName,
    },
    profile: {
      ...(sourceState.profile || {}),
      importedProjectId: created.id,
      duplicatedFromProjectId: project.id,
    },
    publication: null,
    savedAt: new Date().toISOString(),
  };
  const { data: updated, error: updateError } = await supabase
    .from("menu_projects")
    .update({ studio_state: nextState, name: duplicateName })
    .eq("id", created.id)
    .select(PROJECT_COLUMNS)
    .single();
  if (updateError) throw updateError;
  return updated;
}