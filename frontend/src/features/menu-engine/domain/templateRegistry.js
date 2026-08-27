export const MENU_TEMPLATE_REGISTRY = Object.freeze({
  classic: {
    id: "classic",
    label: "Classic",
    description: "Typography-first menu without required item photography.",
    requiresItemImages: false,
    mobileFirst: true,
  },
  visual: {
    id: "visual",
    label: "Visual",
    description: "Image-led menu with responsive item cards.",
    requiresItemImages: false,
    mobileFirst: true,
  },
});

export function getMenuTemplateDefinition(templateId) {
  return MENU_TEMPLATE_REGISTRY[templateId] || MENU_TEMPLATE_REGISTRY.classic;
}

export function isKnownMenuTemplate(templateId) {
  return Boolean(MENU_TEMPLATE_REGISTRY[templateId]);
}
