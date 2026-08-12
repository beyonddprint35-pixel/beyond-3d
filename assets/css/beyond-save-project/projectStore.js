import * as THREE from "three";
import { supabase } from "./supabaseClient";

export const PROJECT_SCHEMA_VERSION = 2;

function safePlainValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(safePlainValue);
  if (typeof value !== "object") return value;

  if (value?.isVector2) return { __three: "Vector2", value: value.toArray() };
  if (value?.isVector3) return { __three: "Vector3", value: value.toArray() };
  if (value?.isEuler) return { __three: "Euler", value: value.toArray() };
  if (value?.isQuaternion) return { __three: "Quaternion", value: value.toArray() };
  if (value?.isMatrix4) return { __three: "Matrix4", value: value.toArray() };
  if (value?.isColor) return { __three: "Color", value: value.getHex() };

  const next = {};
  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === "function") return;
    next[key] = safePlainValue(item);
  });
  return next;
}

function revivePlainValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(revivePlainValue);
  if (typeof value !== "object") return value;

  if (value.__three === "Vector2") return new THREE.Vector2().fromArray(value.value || []);
  if (value.__three === "Vector3") return new THREE.Vector3().fromArray(value.value || []);
  if (value.__three === "Euler") {
    const data = value.value || [];
    return new THREE.Euler(data[0] || 0, data[1] || 0, data[2] || 0, data[3] || "XYZ");
  }
  if (value.__three === "Quaternion") return new THREE.Quaternion().fromArray(value.value || []);
  if (value.__three === "Matrix4") return new THREE.Matrix4().fromArray(value.value || []);
  if (value.__three === "Color") return new THREE.Color(value.value ?? 0xffffff);

  const next = {};
  Object.entries(value).forEach(([key, item]) => {
    next[key] = revivePlainValue(item);
  });
  return next;
}

export function serializeCreatorObject(item) {
  if (!item) return null;

  const geometry = item.geometry?.isBufferGeometry
    ? item.geometry.toJSON()
    : null;

  const { geometry: _geometry, ...rest } = item;
  const plain = safePlainValue(rest);
  plain.geometry = geometry;
  return plain;
}

export function serializeCreatorObjects(objects = []) {
  return objects.map(serializeCreatorObject).filter(Boolean);
}

export function deserializeCreatorObject(item) {
  if (!item) return null;

  const geometryJson = item.geometry;
  const plain = { ...item, geometry: null };
  const revived = revivePlainValue(plain);

  if (geometryJson) {
    try {
      revived.geometry = new THREE.BufferGeometryLoader().parse(geometryJson);
      revived.geometry.computeBoundingBox();
      revived.geometry.computeBoundingSphere();
    } catch (error) {
      console.error("[BEYOND PROJECTS] Could not restore geometry", error);
      revived.geometry = null;
    }
  }

  return revived;
}

export function deserializeCreatorObjects(objects = []) {
  return objects.map(deserializeCreatorObject).filter(Boolean);
}

export async function saveProjectRecord({
  id = null,
  userId,
  name,
  projectType = "creator",
  projectData,
  thumbnailUrl,
  visibility = "private",
}) {
  if (!userId) throw new Error("Log in to save your project.");

  const payload = {
    user_id: userId,
    name: String(name || "Untitled Project").trim() || "Untitled Project",
    project_type: projectType,
    project_data: {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      ...(projectData || {}),
    },
    visibility,
    updated_at: new Date().toISOString(),
  };

  // Autosave intentionally leaves the existing thumbnail untouched.
  if (thumbnailUrl !== undefined) {
    payload.thumbnail_url = thumbnailUrl;
  }

  if (id) {
    const { data, error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  if (payload.thumbnail_url === undefined) {
    payload.thumbnail_url = null;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listProjectRecords(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id,user_id,name,project_type,project_data,thumbnail_url,visibility,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function renameProjectRecord({ id, userId, name }) {
  if (!id || !userId) throw new Error("Project ownership is required.");

  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Project name cannot be empty.");

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: cleanName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function duplicateProjectRecord({ project, userId }) {
  if (!project?.id || !userId) throw new Error("Project ownership is required.");

  const baseName = String(project.name || "Untitled Project").trim() || "Untitled Project";
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: `${baseName} Copy`,
      project_type: project.project_type || "creator",
      project_data: {
        ...(project.project_data || {}),
        duplicatedFrom: project.id,
        savedAt: now,
      },
      thumbnail_url: project.thumbnail_url || null,
      visibility: "private",
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProjectRecord({ id, userId }) {
  if (!id || !userId) return;

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
