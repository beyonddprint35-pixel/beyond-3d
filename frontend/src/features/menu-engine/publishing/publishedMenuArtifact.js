import { normalizeMenuDesign } from "../domain/designSchema";

export const PUBLISHED_MENU_ARTIFACT_VERSION = 1;

function safeSlug(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildPublishedMenuArtifact(contract, versionId) {
  if (!contract?.siteId || !contract?.menu || !contract?.design) {
    throw new Error("A complete publish document is required.");
  }
  if (!versionId) throw new Error("A version id is required.");

  const slug = safeSlug(contract.slug || contract.menu.slug);
  if (!slug) throw new Error("A menu slug is required.");

  return Object.freeze({
    artifactVersion: PUBLISHED_MENU_ARTIFACT_VERSION,
    versionId: String(versionId),
    siteId: String(contract.siteId),
    slug,
    publishedAt: new Date().toISOString(),
    menu: contract.menu,
    design: normalizeMenuDesign(contract.design),
  });
}

export function publishedArtifactPath(artifact) {
  if (!artifact?.siteId || !artifact?.versionId) throw new Error("Invalid published menu artifact.");
  return `/published-menus/${encodeURIComponent(artifact.siteId)}/${encodeURIComponent(artifact.versionId)}.json`;
}

export function activeMenuPointerPath(slug) {
  const normalized = safeSlug(slug);
  if (!normalized) throw new Error("A menu slug is required.");
  return `/published-menus/by-slug/${normalized}.json`;
}

export function buildActiveMenuPointer(artifact) {
  return Object.freeze({
    artifactVersion: PUBLISHED_MENU_ARTIFACT_VERSION,
    slug: artifact.slug,
    siteId: artifact.siteId,
    versionId: artifact.versionId,
    artifactPath: publishedArtifactPath(artifact),
    activatedAt: new Date().toISOString(),
  });
}

export function validatePublishedMenuArtifact(artifact) {
  const errors = [];
  if (artifact?.artifactVersion !== PUBLISHED_MENU_ARTIFACT_VERSION) errors.push("Unsupported artifact version");
  if (!artifact?.versionId) errors.push("Missing version id");
  if (!artifact?.siteId) errors.push("Missing site id");
  if (!artifact?.slug) errors.push("Missing slug");
  if (!artifact?.menu || !Array.isArray(artifact.menu.groups) || !Array.isArray(artifact.menu.items)) errors.push("Invalid menu document");
  if (!artifact?.design) errors.push("Missing design document");
  return { ok: errors.length === 0, errors };
}
