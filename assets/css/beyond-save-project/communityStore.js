import { supabase } from "./supabaseClient";

export const COMMUNITY_SCHEMA_VERSION = 1;

function creatorDisplayName(value) {
  const name = String(value || "").trim();
  return name || "BEYOND Creator";
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .map((tag) => String(tag || "").trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 8)
  )];
}

async function existingShare({ userId, sourceType, sourceId }) {
  const { data, error } = await supabase
    .from("community_items")
    .select("id")
    .eq("user_id", userId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function upsertCommunityShare({
  userId,
  sourceType,
  sourceId,
  title,
  description,
  tags = [],
  thumbnailUrl = null,
  creatorName,
  sourcePayload,
}) {
  if (!userId) throw new Error("Log in to share with Beyond Community.");
  if (!sourceId) throw new Error("A source model is required.");

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    title: String(title || "Untitled Creation").trim() || "Untitled Creation",
    description: String(description || "").trim(),
    tags: cleanTags(tags),
    thumbnail_url: thumbnailUrl || null,
    creator_name: creatorDisplayName(creatorName),
    source_payload: {
      communitySchemaVersion: COMMUNITY_SCHEMA_VERSION,
      ...(sourcePayload || {}),
    },
    updated_at: now,
  };

  const existing = await existingShare({ userId, sourceType, sourceId });

  if (existing?.id) {
    const { data, error } = await supabase
      .from("community_items")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("community_items")
    .insert({
      ...payload,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishProjectToCommunity({
  project,
  userId,
  creatorName,
}) {
  if (!project?.id) throw new Error("Save the project before publishing it.");

  return upsertCommunityShare({
    userId,
    sourceType: "project",
    sourceId: project.id,
    title: project.name || "Untitled Project",
    description: "Created in BEYOND Creator.",
    tags: [String(project.project_type || "creator")],
    thumbnailUrl: project.thumbnail_url || null,
    creatorName,
    sourcePayload: {
      projectType: project.project_type || "creator",
      projectData: project.project_data || {},
      originalProjectId: project.id,
    },
  });
}

export async function publishAiModelToCommunity({
  generation,
  userId,
  creatorName,
}) {
  if (!generation?.id) throw new Error("AI model is required.");
  if (generation.status !== "SUCCEEDED") {
    throw new Error("Only completed AI models can be shared.");
  }

  const rawPrompt = String(generation.prompt || "").trim();
  const title = rawPrompt
    ? (rawPrompt.length > 72 ? `${rawPrompt.slice(0, 72)}…` : rawPrompt)
    : generation.mode === "photos"
      ? "Photo-generated 3D model"
      : "AI-generated 3D model";

  return upsertCommunityShare({
    userId,
    sourceType: "ai_model",
    sourceId: generation.id,
    title,
    description:
      generation.mode === "photos"
        ? "Created from photos in BEYOND AI Studio."
        : "Created with BEYOND AI Studio.",
    tags: ["AI", generation.mode === "photos" ? "Photos to 3D" : "Text to 3D"],
    thumbnailUrl: generation.thumbnail_url || null,
    creatorName,
    sourcePayload: {
      generationId: generation.id,
      meshyTaskId: generation.meshy_task_id,
      mode: generation.mode,
      prompt: generation.prompt,
      status: generation.status,
      model3mfUrl: generation.model_3mf_url,
      model3mfStoragePath: generation.model_3mf_storage_path,
      glbUrl: generation.glb_url || null,
      glbStoragePath: generation.glb_storage_path,
      thumbnailUrl: generation.thumbnail_url,
      thumbnailStoragePath: generation.thumbnail_storage_path,
    },
  });
}


export async function resolveOwnedAiGenerationAssets({ item, userId }) {
  if (!userId || !item?.source_id) return null;
  if (item.user_id && item.user_id !== userId) return null;

  const { data, error } = await supabase
    .from("ai_generations")
    .select(
      "id,user_id,glb_url,glb_storage_path,model_3mf_url,model_3mf_storage_path,thumbnail_url,thumbnail_storage_path"
    )
    .eq("id", item.source_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[BEYOND COMMUNITY] Could not resolve owned AI assets:", error);
    return null;
  }

  if (!data) return null;

  const next = { ...data };

  if (data.glb_storage_path) {
    const { data: signed } = await supabase.storage
      .from("ai-models")
      .createSignedUrl(data.glb_storage_path, 600);

    next.glb_signed_url = signed?.signedUrl || null;
  }

  if (data.model_3mf_storage_path) {
    const { data: signed } = await supabase.storage
      .from("ai-models")
      .createSignedUrl(data.model_3mf_storage_path, 600);

    next.model_3mf_signed_url = signed?.signedUrl || null;
  }

  return next;
}


export async function updateCommunityPublication({
  item,
  userId,
  title,
  description,
  tags = [],
  allowRemix = true,
  allowComments = true,
  allowUseForPrint = true,
}) {
  if (!userId) throw new Error("Log in to update this publication.");
  if (!item?.id) throw new Error("Community creation is required.");
  if (item.user_id !== userId) {
    throw new Error("You can only edit your own Community publications.");
  }

  const cleanTitle =
    String(title || "").trim().slice(0, 90) || "Untitled Creation";
  const cleanDescription =
    String(description || "").trim().slice(0, 500);

  const sourcePayload = {
    ...(item.source_payload || {}),
    permissions: {
      ...((item.source_payload || {}).permissions || {}),
      allowRemix: Boolean(allowRemix),
      allowComments: Boolean(allowComments),
      allowUseForPrint: Boolean(allowUseForPrint),
    },
  };

  const { data, error } = await supabase
    .from("community_items")
    .update({
      title: cleanTitle,
      description: cleanDescription,
      tags: cleanTags(tags),
      source_payload: sourcePayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unpublishCommunitySource({
  userId,
  sourceType,
  sourceId,
}) {
  if (!userId || !sourceId) return;

  const { error } = await supabase
    .from("community_items")
    .delete()
    .eq("user_id", userId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) throw error;
}

export async function listUserCommunityShares(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("community_items")
    .select("id,user_id,source_type,source_id,title,thumbnail_url,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listCommunityItems({ limit = 60 } = {}) {
  const { data, error } = await supabase
    .from("community_items")
    .select(
      "id,user_id,source_type,source_id,title,description,tags,thumbnail_url,creator_name,source_payload,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listCommunityLikes() {
  const { data, error } = await supabase
    .from("community_likes")
    .select("item_id,user_id,created_at")
    .limit(5000);

  if (error) throw error;
  return data || [];
}

export async function setCommunityLike({ itemId, userId, liked }) {
  if (!userId) throw new Error("Log in to like creations.");
  if (!itemId) return;

  if (liked) {
    const { error } = await supabase
      .from("community_likes")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", userId);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("community_likes")
    .insert({
      item_id: itemId,
      user_id: userId,
    });

  if (error && error.code !== "23505") throw error;
  return true;
}

export async function remixCommunityProject({ item, userId }) {
  if (!userId) throw new Error("Log in to remix this creation.");
  if (item?.source_type !== "project") {
    throw new Error("Only Creator projects can be remixed in Creator.");
  }

  const source = item.source_payload || {};
  const projectData = source.projectData;

  if (!projectData || typeof projectData !== "object") {
    throw new Error("This Community project does not contain editable project data.");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: `${item.title || "Community Project"} Remix`,
      project_type: source.projectType || "creator",
      project_data: {
        ...projectData,
        remixedFromCommunityItem: item.id,
        remixedFromProjectId: source.originalProjectId || null,
        remixedFromCreator: item.creator_name || null,
        savedAt: now,
      },
      thumbnail_url: item.thumbnail_url || null,
      visibility: "private",
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}


export async function listCommunityCommentCounts({ limit = 5000 } = {}) {
  const { data, error } = await supabase
    .from("community_comments")
    .select("item_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listCommunityComments({ itemId, limit = 120 } = {}) {
  if (!itemId) return [];

  const { data, error } = await supabase
    .from("community_comments")
    .select("id,item_id,user_id,creator_name,body,created_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function addCommunityComment({
  itemId,
  userId,
  creatorName,
  body,
}) {
  if (!userId) throw new Error("Log in to comment.");
  if (!itemId) throw new Error("A Community creation is required.");

  const cleanBody = String(body || "").trim();

  if (!cleanBody) {
    throw new Error("Write a comment first.");
  }

  if (cleanBody.length > 500) {
    throw new Error("Comments can be up to 500 characters.");
  }

  const { data, error } = await supabase
    .from("community_comments")
    .insert({
      item_id: itemId,
      user_id: userId,
      creator_name: creatorDisplayName(creatorName),
      body: cleanBody,
    })
    .select("id,item_id,user_id,creator_name,body,created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCommunityComment({
  commentId,
  userId,
}) {
  if (!userId || !commentId) return;

  const { error } = await supabase
    .from("community_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) throw error;
}

// BEYOND_COMMUNITY_FOLLOWS_DISCOVERY
export async function listCommunityFollows({ limit = 5000 } = {}) {
  const { data, error } = await supabase
    .from("community_follows")
    .select("follower_id,creator_user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function setCommunityFollow({
  creatorUserId,
  userId,
  following,
}) {
  if (!userId) throw new Error("Log in to follow creators.");
  if (!creatorUserId) throw new Error("Creator profile is required.");
  if (creatorUserId === userId) {
    throw new Error("You cannot follow your own profile.");
  }

  if (following) {
    const { error } = await supabase
      .from("community_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("creator_user_id", creatorUserId);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("community_follows")
    .insert({
      follower_id: userId,
      creator_user_id: creatorUserId,
    });

  if (error && error.code !== "23505") throw error;
  return true;
}
// BEYOND_COMMUNITY_ACTIVITY_CENTER
export async function listCommunityRecentComments({ limit = 240 } = {}) {
  const { data, error } = await supabase
    .from("community_comments")
    .select("id,item_id,user_id,creator_name,body,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}



// BEYOND_COMMUNITY_SAVED_CREATIONS
export async function listCommunitySaves({ userId, limit = 5000 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("community_saves")
    .select("item_id,user_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function setCommunitySave({ itemId, userId, saved }) {
  if (!userId) throw new Error("Log in to save creations.");
  if (!itemId) throw new Error("A Community creation is required.");

  if (saved) {
    const { error } = await supabase
      .from("community_saves")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", userId);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("community_saves")
    .insert({
      item_id: itemId,
      user_id: userId,
    });

  if (error && error.code !== "23505") throw error;
  return true;
}
