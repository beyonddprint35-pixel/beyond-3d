# Beyond Menu Engine V3

This folder is the new shared foundation for all Beyond customer menus.

## Core rules

1. Customer content is data. It belongs in Supabase, not restaurant-specific JSX.
2. Customer design is configuration. It belongs in a validated, versioned design schema, not customer-specific CSS files.
3. Beyond components are code. Classic and Visual templates share one renderer and one menu data model.
4. Mobile is the primary target for both the published menu and Menu Studio. Desktop enhances the same responsive system.
5. The editor may feel flexible like Figma, but it must never persist arbitrary absolute positioning that can break a phone layout.
6. Every design change passes through constraints before rendering or persistence.
7. Existing published menus must keep their current appearance until an owner explicitly publishes a new design.
8. react-v2 remains the production/migration source until V3 is approved.
9. Accessibility is a shared platform capability. All menu templates use the same shared accessibility component so one update propagates to every menu.
10. Analytics are privacy-first and event-based. We measure menu/category/item interaction without requiring customer identity or storing unnecessary personal information.
11. AI may suggest design, merchandising, translation, or allergen metadata, but owner-confirmed information is required before publishing sensitive claims such as allergens.

## Initial architecture

- `domain/menuSchema.js` — canonical menu document shape and language behavior.
- `domain/designSchema.js` — versioned customer design configuration.
- `domain/designConstraints.js` — allowed responsive values and mobile-safe boundaries.
- `domain/templateRegistry.js` — template families. V1 starts with Classic and Visual.
- `domain/itemMetadata.js` — allergens, dietary badges, spice level, and merchandising badges such as Chef’s Choice, Popular, Signature, New and Recommended.
- `analytics/analyticsSchema.js` — anonymous event vocabulary and dashboard insight model.

## Analytics direction

The public menu renderer will eventually emit anonymous events such as `menu_view`, `category_view`, `item_impression`, `item_open`, `language_change`, `badge_filter`, and `cta_click`.

The restaurant-facing dashboard can then show:

- menu views and engagement trends;
- most viewed categories;
- most displayed / opened items;
- item open rate;
- language usage;
- underexposed items;
- AI/business suggestions such as promoting a popular item, moving it higher, adding a photo, improving a description, or adding a merchandising badge.

Analytics recommendations never change the live menu automatically. They create owner-reviewable suggestions.

## Planned next layers

- `data/` — repository + mutations for menu_sites, menu_groups, menu_items and design persistence.
- `renderer/` — one MenuRenderer used by preview and published menus.
- `renderer/templates/classic/` — compatibility implementation of the existing approved menu.
- `renderer/templates/visual/` — image-led menu.
- `studio/` — responsive Content / Design / Preview / Analytics workspace.
- `studio/commands/` — validated commands used by desktop, phone and Buddy AI.
- `ai/` — canonical import and design-action schemas.
- `analytics/` — privacy-first event collection, aggregation and restaurant dashboard insights.

The first migration milestone is not a redesign: it is reproducing the current Classic live menu through the new renderer without changing its public URL, content, or approved appearance.
