const EPS = 1e-6;

function clonePoint(p) {
  return { x: Number(p?.x || 0), y: Number(p?.y || 0) };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lineLength(entity) {
  return Math.hypot(entity.end.x - entity.start.x, entity.end.y - entity.start.y);
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function lineDirection(entity) {
  return normalize({ x: entity.end.x - entity.start.x, y: entity.end.y - entity.start.y });
}

function endpoints(entity) {
  return entity?.type === "line"
    ? [
        { key: "start", point: entity.start },
        { key: "end", point: entity.end },
      ]
    : [];
}

export function repairCoincidentEndpoints(entities, tolerance = 1.25) {
  const next = entities.map((entity) => ({
    ...entity,
    start: entity.start ? clonePoint(entity.start) : entity.start,
    end: entity.end ? clonePoint(entity.end) : entity.end,
  }));

  const refs = [];
  next.forEach((entity, entityIndex) => {
    endpoints(entity).forEach(({ key, point }) => refs.push({ entityIndex, key, point }));
  });

  const visited = new Set();
  for (let i = 0; i < refs.length; i += 1) {
    if (visited.has(i)) continue;
    const cluster = [i];
    visited.add(i);
    for (let j = i + 1; j < refs.length; j += 1) {
      if (visited.has(j)) continue;
      if (distance(refs[i].point, refs[j].point) <= tolerance) {
        cluster.push(j);
        visited.add(j);
      }
    }
    if (cluster.length < 2) continue;
    const anchor = refs[cluster[0]].point;
    cluster.forEach((refIndex) => {
      const ref = refs[refIndex];
      next[ref.entityIndex][ref.key] = clonePoint(anchor);
    });
  }

  return next;
}

export function applyRelationConstraint(entities, relation) {
  if (!relation?.type || !Array.isArray(relation.entityIds) || relation.entityIds.length < 2) {
    return entities;
  }
  const [aId, bId] = relation.entityIds;
  const a = entities.find((entity) => entity.id === aId && entity.type === "line");
  const bIndex = entities.findIndex((entity) => entity.id === bId && entity.type === "line");
  if (!a || bIndex < 0) return entities;
  const b = entities[bIndex];
  if (b.fixed) return entities;

  const next = entities.map((entity) => ({ ...entity }));
  const lenB = Math.max(lineLength(b), EPS);
  const dirA = lineDirection(a);
  let dir = lineDirection(b);

  if (relation.type === "parallel") {
    const sign = dirA.x * dir.x + dirA.y * dir.y < 0 ? -1 : 1;
    dir = { x: dirA.x * sign, y: dirA.y * sign };
  } else if (relation.type === "perpendicular") {
    const c1 = { x: -dirA.y, y: dirA.x };
    const c2 = { x: dirA.y, y: -dirA.x };
    const dot1 = c1.x * dir.x + c1.y * dir.y;
    const dot2 = c2.x * dir.x + c2.y * dir.y;
    dir = dot1 >= dot2 ? c1 : c2;
  } else if (relation.type === "equal") {
    const lenA = Math.max(lineLength(a), EPS);
    next[bIndex] = {
      ...b,
      end: { x: b.start.x + dir.x * lenA, y: b.start.y + dir.y * lenA },
    };
    return next;
  } else {
    return entities;
  }

  next[bIndex] = {
    ...b,
    end: { x: b.start.x + dir.x * lenB, y: b.start.y + dir.y * lenB },
  };
  return next;
}

export function solveSketchConstraints(entities, relations = [], options = {}) {
  const tolerance = Number(options.coincidentTolerance ?? 1.25);
  let next = repairCoincidentEndpoints(entities, tolerance);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const relation of relations) next = applyRelationConstraint(next, relation);
  }
  return repairCoincidentEndpoints(next, tolerance);
}

export function sketchConstraintStatus(entities, relations = []) {
  const lines = entities.filter((entity) => entity.type === "line");
  if (!lines.length) return { label: "No sketch", ratio: 0, constrained: 0, total: 0 };
  let total = 0;
  let constrained = 0;
  for (const line of lines) {
    total += 4;
    if (line.fixed) constrained += 4;
    else {
      if (line.constraint === "horizontal" || line.constraint === "vertical") constrained += 1;
      if (Number.isFinite(line.dimensionLength) && line.dimensionLength > 0) constrained += 1;
    }
  }
  constrained += relations.length;
  constrained = Math.min(total, constrained);
  const ratio = total ? constrained / total : 0;
  return {
    label: ratio >= 0.99 ? "Fully constrained" : "Under-constrained",
    ratio,
    constrained,
    total,
  };
}