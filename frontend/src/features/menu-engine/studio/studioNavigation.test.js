import test from "node:test";
import assert from "node:assert/strict";
import { chooseStudioProject, studioProjectUrl } from "./studioNavigation.js";

const projects = [{ id: "newest", activated_site_id: "site-a" }, { id: "last-opened", activated_site_id: "site-b" }];

test("Studio opens the only menu, the last-used menu, or the latest accessible menu", () => {
  assert.equal(chooseStudioProject([projects[0]]).id, "newest");
  assert.equal(chooseStudioProject(projects, { activeId: "last-opened" }).id, "last-opened");
  assert.equal(chooseStudioProject(projects, { activeId: "deleted" }).id, "newest");
  assert.equal(chooseStudioProject([]), null);
});

test("explicit project and site requests never fall back to a different menu", () => {
  assert.equal(chooseStudioProject(projects, { projectId: "last-opened" }).id, "last-opened");
  assert.equal(chooseStudioProject(projects, { siteId: "site-b" }).id, "last-opened");
  assert.equal(chooseStudioProject(projects, { projectId: "missing", activeId: "newest" }), null);
  assert.equal(chooseStudioProject(projects, { siteId: "missing", activeId: "newest" }), null);
});

test("switching menus keeps the stage and UI language without carrying the old import", () => {
  const url = studioProjectUrl("/menu-studio/analytics", "?project=old&ui=he&site=old-site&mode=website&websiteImported=1&design=old-design&slug=old-slug", "new");
  assert.equal(url, "/menu-studio/analytics?project=new&ui=he");
});
