import test from "node:test";
import assert from "node:assert/strict";
import { groupBranch, moveItemToGroup, moveMenuGroup, moveMenuItem, ordered, reorderMenuGroups, reorderMenuItems, removeMenuGroup, rootGroupId } from "./menuStructure.js";

function fixture() {
  return {
    groups: [
      { id: "food", sort_order: 10, visible: false },
      { id: "drinks", parent_id: null, sort_order: 20 },
      { id: "hot", parent_id: "food", sort_order: 40 },
      { id: "cold", parent_id: "food", sort_order: 70, visible: false },
      { id: "wine", parent_id: "drinks", sort_order: 4 },
    ],
    items: [
      { id: "soup", group_id: "hot", sort_order: 3, visible: false, price: "25" },
      { id: "bread", group_id: "hot", sort_order: 12, visible: true },
      { id: "salad", group_id: "cold", sort_order: 5 },
      { id: "red", group_id: "wine", sort_order: 0 },
    ],
  };
}

test("category moves preserve their subcategories, items, and visibility", () => {
  const original = fixture();
  const moved = moveMenuGroup(original, "drinks", -1);
  assert.deepEqual(ordered(moved.groups.filter((group) => !group.parent_id)).map((group) => group.id), ["drinks", "food"]);
  assert.deepEqual(moved.groups.filter((group) => group.parent_id), original.groups.filter((group) => group.parent_id));
  assert.deepEqual(moved.items, original.items);
  assert.equal(moved.groups.find((group) => group.id === "food").visible, false);
  assert.equal(original.groups[0].sort_order, 10);
});

test("subcategory moves are scoped to siblings and desktop drag cannot reparent", () => {
  const original = fixture();
  const moved = moveMenuGroup(original, "cold", -1);
  assert.deepEqual(groupBranch(moved.groups, "food").map((group) => group.id), ["food", "cold", "hot"]);
  assert.equal(moved.groups.find((group) => group.id === "wine").sort_order, 4);
  assert.deepEqual(reorderMenuGroups(original, "cold", "drinks"), original);
});

test("item arrows and drag reorder only their own group, including hidden items", () => {
  const original = fixture();
  const moved = moveMenuItem(original, "bread", -1);
  assert.deepEqual(ordered(moved.items.filter((item) => item.group_id === "hot")).map((item) => item.id), ["bread", "soup"]);
  assert.equal(moved.items.find((item) => item.id === "soup").visible, false);
  assert.equal(moved.items.find((item) => item.id === "salad").sort_order, 5);
  assert.deepEqual(reorderMenuItems(original, "bread", "salad"), original);
  assert.deepEqual(reorderMenuItems(original, "bread", "soup"), moved);
});

test("boundary moves and missing entries leave menu order intact", () => {
  const menu = fixture();
  assert.deepEqual(moveMenuGroup(menu, "food", -1), menu);
  assert.deepEqual(moveMenuGroup(menu, "drinks", 1), menu);
  assert.deepEqual(moveMenuItem(menu, "soup", -1), menu);
  assert.deepEqual(moveMenuItem(menu, "bread", 1), menu);
  assert.deepEqual(moveMenuItem(menu, "missing", 1), menu);
});

test("existing items can move to a subcategory without losing prices or visibility", () => {
  const menu = fixture();
  const moved = moveItemToGroup(menu, "soup", "cold");
  assert.deepEqual(moved.items.find((item) => item.id === "soup"), { ...menu.items[0], group_id: "cold", sort_order: 6 });
  assert.equal(rootGroupId(moved.groups, "cold"), "food");
  assert.deepEqual(moveItemToGroup(menu, "soup", "missing"), menu);
  assert.deepEqual(moveItemToGroup(menu, "soup", "hot"), menu);
});

test("deleting a category removes its whole branch without orphaning items", () => {
  const menu = fixture();
  const next = removeMenuGroup(menu, "food");
  assert.deepEqual(next.groups.map((group) => group.id), ["drinks", "wine"]);
  assert.deepEqual(next.items.map((item) => item.id), ["red"]);
  const childRemoved = removeMenuGroup(menu, "hot");
  assert.deepEqual(childRemoved.groups.map((group) => group.id), ["food", "drinks", "cold", "wine"]);
  assert.deepEqual(childRemoved.items.map((item) => item.id), ["salad", "red"]);
});

test("saved JSON retains hierarchy, hidden states, and edited order", () => {
  const menu = moveMenuItem(moveMenuGroup(fixture(), "cold", -1), "bread", -1);
  const restored = JSON.parse(JSON.stringify(menu));
  assert.deepEqual(groupBranch(restored.groups, "food").map((group) => group.id), ["food", "cold", "hot"]);
  assert.deepEqual(ordered(restored.items.filter((item) => item.group_id === "hot")).map((item) => item.id), ["bread", "soup"]);
  assert.equal(restored.groups[0].visible, false);
  assert.equal(restored.items[0].visible, false);
});
