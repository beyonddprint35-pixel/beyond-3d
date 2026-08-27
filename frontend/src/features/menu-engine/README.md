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

## Initial architecture

- `domain/menuSchema.js` — canonical menu document shape and language behavior.
- `domain/designSchema.js` — versioned customer design configuration.
- `domain/designConstraints.js` — allowed responsive values and mobile-safe boundaries.
- `domain/templateRegistry.js` — template families. V1 starts with Classic and Visual.

## Planned next layers

- `data/` — repository + mutations for menu_sites, menu_groups, menu_items and design persistence.
- `renderer/` — one MenuRenderer used by preview and published menus.
- `renderer/templates/classic/` — compatibility implementation of the existing approved menu.
- `renderer/templates/visual/` — image-led menu.
- `studio/` — responsive Content / Design / Preview workspace.
- `studio/commands/` — validated commands used by desktop, phone and Buddy AI.
- `ai/` — canonical import and design-action schemas.

The first migration milestone is not a redesign: it is reproducing the current Classic live menu through the new renderer without changing its public URL, content, or approved appearance.
