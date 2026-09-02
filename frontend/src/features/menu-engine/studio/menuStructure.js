export function ordered(list = []) {
  return [...list].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

export function groupBranch(groups, rootId) {
  const result = [];
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    const group = groups.find((entry) => entry.id === id);
    if (!group) return;
    visited.add(id);
    result.push(group);
    ordered(groups.filter((entry) => entry.parent_id === id)).forEach((child) => visit(child.id));
  }
  visit(rootId);
  return result;
}

export function rootGroupId(groups, id) {
  const visited = new Set();
  let group = groups.find((entry) => entry.id === id);
  while (group?.parent_id && !visited.has(group.id)) {
    visited.add(group.id);
    group = groups.find((entry) => entry.id === group.parent_id);
  }
  return group && !group.parent_id ? group.id : "";
}

function reorderSiblings(list, sourceId, targetId, parentKey) {
  const source = list.find((entry) => entry.id === sourceId);
  const target = list.find((entry) => entry.id === targetId);
  if (!source || !target || sourceId === targetId || (source[parentKey] || null) !== (target[parentKey] || null)) return list;
  const siblings = ordered(list.filter((entry) => (entry[parentKey] || null) === (source[parentKey] || null)));
  const from = siblings.findIndex((entry) => entry.id === sourceId);
  const to = siblings.findIndex((entry) => entry.id === targetId);
  const [moved] = siblings.splice(from, 1);
  siblings.splice(to, 0, moved);
  const positions = new Map(siblings.map((entry, index) => [entry.id, index]));
  return list.map((entry) => positions.has(entry.id) ? { ...entry, sort_order: positions.get(entry.id) } : entry);
}

export function reorderMenuGroups(menu, sourceId, targetId) {
  return { ...menu, groups: reorderSiblings(menu.groups, sourceId, targetId, "parent_id") };
}

export function reorderMenuItems(menu, sourceId, targetId) {
  return { ...menu, items: reorderSiblings(menu.items, sourceId, targetId, "group_id") };
}

function moveSibling(list, id, step, parentKey) {
  const source = list.find((entry) => entry.id === id);
  if (!source || ![-1, 1].includes(step)) return list;
  const siblings = ordered(list.filter((entry) => (entry[parentKey] || null) === (source[parentKey] || null)));
  const index = siblings.findIndex((entry) => entry.id === id);
  const target = siblings[index + step];
  return target ? reorderSiblings(list, id, target.id, parentKey) : list;
}

export function moveMenuGroup(menu, id, step) {
  return { ...menu, groups: moveSibling(menu.groups, id, step, "parent_id") };
}

export function moveMenuItem(menu, id, step) {
  return { ...menu, items: moveSibling(menu.items, id, step, "group_id") };
}

export function moveItemToGroup(menu, id, groupId) {
  const item = menu.items.find((entry) => entry.id === id);
  if (!item || item.group_id === groupId || !menu.groups.some((group) => group.id === groupId)) return menu;
  const siblings = menu.items.filter((entry) => entry.group_id === groupId);
  const sortOrder = siblings.length ? Math.max(...siblings.map((entry) => Number(entry.sort_order || 0))) + 1 : 0;
  return { ...menu, items: menu.items.map((entry) => entry.id === id ? { ...entry, group_id: groupId, sort_order: sortOrder } : entry) };
}

export function removeMenuGroup(menu, id) {
  const removedIds = new Set(groupBranch(menu.groups, id).map((entry) => entry.id));
  return {
    ...menu,
    groups: menu.groups.filter((entry) => !removedIds.has(entry.id)),
    items: menu.items.filter((entry) => !removedIds.has(entry.group_id)),
  };
}
