import { normalizeMenuDesign } from "../domain/designSchema";

export const MENU_PUBLISH_CONTRACT_VERSION = 1;

export function buildPublishContract(session) {
  if (!session?.source?.siteId) {
    throw new Error("Cannot publish a draft without a site id.");
  }

  return {
    contractVersion: MENU_PUBLISH_CONTRACT_VERSION,
    siteId: session.source.siteId,
    slug: session.source.slug || "",
    menu: session.menu,
    design: normalizeMenuDesign(session.design),
    generatedAt: new Date().toISOString(),
  };
}

export function validatePublishContract(contract) {
  const errors = [];
  if (!contract?.siteId) errors.push("Missing site id");
  if (!contract?.menu) errors.push("Missing menu document");
  if (!Array.isArray(contract?.menu?.groups)) errors.push("Missing menu groups");
  if (!Array.isArray(contract?.menu?.items)) errors.push("Missing menu items");
  if (!contract?.design) errors.push("Missing design document");
  if (contract?.contractVersion !== MENU_PUBLISH_CONTRACT_VERSION) errors.push("Unsupported publish contract version");

  return {
    ok: errors.length === 0,
    errors,
  };
}
