import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import {
  Check,
  Circle as CircleIcon,
  Maximize2,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { CAD_KERNEL_API_VERSION, createCadKernelRuntime } from "./CadKernelRuntime";
import { initializeBeyondOpenCascade } from "./OpenCascadeLoader";
import { createCommitEnvelope } from "./NativeCadPayload";
import { solveSketchConstraints, sketchConstraintStatus } from "./ConstraintSolver";
import {
  coalescedPointerEvents,
  createPointerSession,
  isTouchPointer,
  pointerClientPoint,
  pointerTelemetry,
  pointerTravelPx,
  pointerTypeOf,
  predictedPointerEvents,
} from "./SketchInputRouter";
import "./SketchWorkspace.css";

/* ======================================================================
   BEYOND CREATOR — SKETCH MODE V30
   ----------------------------------------------------------------------
   Direct-modeling interaction layer inspired by tablet CAD workflows.

   The important compatibility rule is unchanged: when the user finishes,
   this component still sends the same payload shape used by BeyondCreator:

   {
     points: [[x,y], ...],
     height: number,
     twistDegrees: 0,
     scaleTop: 1,
     plane: "top",
     features: [{ points, depth, faceType, faceIndex }],
     edgeTreatments: [{ edgeType, edgeIndex, amount, mode }]
   }

   V12 foundation:
   - Pencil/mouse sketching while touch remains available for camera gestures
   - line, rectangle and circle sketch entities
   - grid / endpoint / horizontal / vertical snapping
   - automatic closed-profile creation
   - tap profile -> direct pull
   - numeric pull values
   - automatic add/cut based on pull direction
   - tap existing face -> direct offset-face pull
   - tap face + sketch tool -> face sketch mode
   - properly transformed interaction geometry on every active plane

   V13 adds:
   - live sketch dimension labels
   - exact rectangle width / height editing
   - exact circle diameter editing
   - exact standalone line length editing
   - automatic horizontal / vertical line constraints
   - selectable sketch entities with constraint controls

   V14 adds:
   - hover preselection for faces and edges
   - direct draggable sketch endpoints with snapping
   - rectangle-corner editing while preserving rectangular constraints
   - polyline vertex editing
   - compact non-destructive feature history with per-operation removal
   - stronger topology-editing foundation before the BRep/kernel migration

   V15 adds:
   - persistent IDs for bodies, modeling features and edge treatments
   - preview CAD-kernel abstraction so the renderer is no longer coupled to CSG calls
   - direct picking/editing of feature-created cap faces after booleans
   - feature-generated edge topology for post-boolean edge picking
   - live edge-treatment preview bands before commit
   - feature-history selection and direct numeric feature editing
   - exact payload sanitization so V15 metadata never breaks the parent pipeline

   V16 adds:
   - persistent topology registry for base and feature-created faces
   - feature-created cap faces are now valid sketch planes
   - compatible boss-on-boss and pocket-on-pocket stacked features
   - host-profile containment checks so flattened stacked operations stay exact
   - topology-aware hover equality and selection IDs
   - explicit kernel capability contract for the upcoming OpenCascade/BRep adapter
   - same parent payload remains valid; V16 topology metadata stays local

   V17 adds:
   - whole-body planar Move / Rotate / uniform Scale baked into the existing payload
   - exact transform panel plus touch-friendly transform nudge gizmo
   - multi-face selection groundwork for future Shell / Draft / pattern operations
   - construction origin and X/Y axis references that can be toggled in-model
   - kernel-gated Shell / Revolve entry points that never write invalid parent data
   - transform-aware history so every body transform remains undoable

   V18 adds:
   - stable CAD-kernel runtime API between SketchWorkspace and future BRep/WASM backends
   - globally registerable initialized BRep backend without coupling this component to a package loader
   - automatic mesh-kernel fallback if an external BRep preview/topology call fails
   - live kernel status/capability UI
   - advanced tool dispatch routed through the active kernel contract
   - OpenCascade adapter template kept out of the build until the project bundler is configured for WASM

   V28 adds:
   - continuous Pencil stroke capture with automatic line/circle/arc/profile recognition
   - live stroke classification feedback while drawing
   - smart freehand closed-profile creation and inferred H/V constraints
   - Pencil tool keeps finger navigation separate from sketch input

   V29 adds:
   - lightweight constraint solving and endpoint coincidence repair
   - fixed / parallel / perpendicular / equal sketch relations
   - midpoint snapping and constraint status feedback

   V30 adds:
   - Shapr-style one-gesture profile pull: press/drag a closed profile to extrude it
   - Shapr-style one-gesture face offset: Pencil/mouse press-drag directly on a face
   - finger tap selects faces/profiles while finger drag stays camera navigation-first
   - explicit pull gizmos accept touch, Pencil and mouse with larger tablet hit targets
   - modeling drags temporarily own the pointer so OrbitControls cannot jitter the camera
   - newly closed profiles become active immediately and show the pull manipulator
   - newly created extrusions keep their resulting cap selected for continuous modeling
   - filled side-face preselection/selection instead of outline-only feedback
   - rAF-throttled high-frequency pull updates for smoother iPad/Pencil interaction
   - explicit one-finger orbit / two-finger dolly-pan navigation mapping

   V19 adds:
   - actual OpenCascade.js loader and initialized BRep backend registration
   - native closed-profile wire/face/prism construction in millimetres
   - native top-face boss/pocket Fuse/Cut booleans
   - native OCCT triangulation converted directly to THREE.BufferGeometry
   - native face/edge enumeration alongside the compatibility topology layer
   - operation-level fallback for side-face features and legacy edge treatments
   ====================================================================== */

const UNIT = 0.02; // scene units per millimetre
const MIN_PULL_MM = 1;
const MIN_FEATURE_MM = 0.5;
const SNAP_MM = 2.2;
const GRID_MM = 1;
const CIRCLE_SEGMENTS = 48;
const PREVIEW_KERNEL = "Hybrid topology fallback V30";
const SMART_STROKE_MIN_MM = 3;
const SMART_LINE_TOLERANCE_MM = 1.4;
const DIRECT_DRAG_STEP_MM = 0.1;
const TOUCH_DRAG_STEP_MM = 0.5;
const TOUCH_TAP_MAX_PX = 10;
const TOUCH_TAP_MAX_MS = 360;

const KERNEL_CAPABILITIES = Object.freeze({
  persistentTopology: true,
  featureFaceSketching: true,
  pushPullFace: false,
  stackedSameDirectionFeatures: true,
  exactFeatureEdgeFillet: false,
  shell: false,
  revolve: false,
  sweep: false,
  loft: false,
  planarBodyTransform: true,
  multiFaceSelection: true,
  constructionReferences: true,
  brep: false,
  stepExport: false,
});

const BODY_COLOR = "#c7d3de";
const SELECT_COLOR = "#3fa9ff";
const PROFILE_COLOR = "#3fa9ff";
const GHOST_COLOR = "#4a5c6c";
const SNAP_COLOR = "#ffd35c";

let uidCounter = 1;
const uid = (prefix) => `${prefix}-${uidCounter++}`;
const deepClone = (value) => JSON.parse(JSON.stringify(value));

/* ======================================================================
   Plane helpers
   ====================================================================== */

function makePlane(origin, xAxis, yAxis, normal) {
  return {
    origin: origin.clone(),
    xAxis: xAxis.clone().normalize(),
    yAxis: yAxis.clone().normalize(),
    normal: normal.clone().normalize(),
  };
}

const TOP_PLANE = makePlane(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 1, 0)
);

function worldFromLocalMM(plane, x, y, z = 0) {
  return plane.origin
    .clone()
    .addScaledVector(plane.xAxis, x * UNIT)
    .addScaledVector(plane.yAxis, y * UNIT)
    .addScaledVector(plane.normal, z * UNIT);
}

function localFromWorldMM(plane, worldVec) {
  const rel = worldVec.clone().sub(plane.origin);
  return {
    x: rel.dot(plane.xAxis) / UNIT,
    y: rel.dot(plane.yAxis) / UNIT,
    z: rel.dot(plane.normal) / UNIT,
  };
}

function planeBasisMatrix(plane, axisSign = 1) {
  return new THREE.Matrix4().makeBasis(
    plane.xAxis,
    plane.yAxis,
    plane.normal.clone().multiplyScalar(axisSign)
  );
}

function planeQuaternion(plane) {
  return new THREE.Quaternion().setFromRotationMatrix(planeBasisMatrix(plane));
}

/* ======================================================================
   2D profile helpers
   ====================================================================== */

function signedArea(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    total += x1 * y2 - x2 * y1;
  }
  return total / 2;
}

function ensureCCW(points) {
  return signedArea(points) >= 0 ? points : [...points].reverse();
}

function polygonCentroid(points) {
  if (!points?.length) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function edgeOutwardNormal(points, index) {
  const a = points[index];
  const b = points[(index + 1) % points.length];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const edge = { x: dx / length, y: dy / length };
  return signedArea(points) >= 0
    ? { x: edge.y, y: -edge.x }
    : { x: -edge.y, y: edge.x };
}

function rectanglePoints(a, b) {
  return ensureCCW([
    [a.x, a.y],
    [b.x, a.y],
    [b.x, b.y],
    [a.x, b.y],
  ]);
}

function circlePoints(center, radius, segments = CIRCLE_SEGMENTS) {
  const points = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push([
      center.x + Math.cos(t) * radius,
      center.y + Math.sin(t) * radius,
    ]);
  }
  return ensureCCW(points);
}

function almostSamePoint(a, b, tolerance = SNAP_MM) {
  if (!a || !b) return false;
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
}


function pointInPolygon(point, polygon) {
  if (!polygon?.length) return false;
  let inside = false;
  const x = point.x;
  const y = point.y;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const crosses =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function ensureDraftMetadata(draft) {
  if (!draft) return draft;
  return {
    ...draft,
    id: draft.id || uid("body"),
    baseFeatureId: draft.baseFeatureId || uid("base"),
    features: (draft.features || []).map((feature) => ({
      ...feature,
      id: feature.id || uid("feature"),
      operation: feature.operation || (feature.depth >= 0 ? "add" : "cut"),
    })),
    edgeTreatments: (draft.edgeTreatments || []).map((treatment) => ({
      ...treatment,
      id: treatment.id || uid("edge-treatment"),
    })),
  };
}

function featureById(draft, featureId) {
  return (draft?.features || []).find((feature) => feature.id === featureId) || null;
}


function topologyFaceId(face) {
  if (!face) return null;
  if (face.topologyId) return face.topologyId;
  if (face.type === "cap") return "face:base:top";
  if (face.type === "side") return `face:base:side:${face.index}`;
  if (face.type === "feature-cap" && face.featureId) {
    return `face:feature:${face.featureId}:cap`;
  }
  return null;
}

function baseTopSelectionFace() {
  return { topologyId: "face:base:top", type: "cap", index: null, source: "base" };
}

function featureCapSelectionFace(feature) {
  if (!feature?.id) return null;
  return {
    topologyId: `face:feature:${feature.id}:cap`,
    type: "feature-cap",
    featureId: feature.id,
    faceType: feature.faceType,
    faceIndex: feature.faceIndex ?? null,
    source: "feature",
  };
}

function keepFaceSelected(state, face) {
  if (!face) return state;
  const id = topologyFaceId(face);
  return {
    ...state,
    selectedFace: face,
    selectedFaceIds: id ? [id] : [],
    selectedEdgeKey: null,
    selectedEdgeMeta: null,
    selectedBody: false,
    activeTool: "select",
    numericValue: "5",
    hoveredFace: null,
    hoveredEdgeKey: null,
  };
}

function topologyFacesForDraft(draft) {
  if (!draft?.points?.length) return [];
  const faces = [
    {
      topologyId: "face:base:top",
      type: "cap",
      source: "base",
      plane: makePlane(
        worldFromLocalMM(TOP_PLANE, 0, 0, draft.height),
        TOP_PLANE.xAxis,
        TOP_PLANE.yAxis,
        TOP_PLANE.normal
      ),
    },
  ];

  draft.points.forEach((_, index) => {
    const plane = sideFacePlane(draft.points, index);
    if (!plane) return;
    faces.push({
      topologyId: `face:base:side:${index}`,
      type: "side",
      index,
      source: "base",
      plane,
    });
  });

  for (const feature of draft.features || []) {
    if (!feature.id) continue;
    const basePlane = feature.faceType === "side"
      ? sideFacePlane(draft.points, feature.faceIndex)
      : TOP_PLANE;
    if (!basePlane) continue;
    const baseOffset = feature.faceType === "top" ? draft.height : 0;
    const capOffset = baseOffset + feature.depth;
    faces.push({
      topologyId: `face:feature:${feature.id}:cap`,
      type: "feature-cap",
      source: "feature",
      featureId: feature.id,
      faceType: feature.faceType,
      faceIndex: feature.faceIndex ?? null,
      plane: makePlane(
        worldFromLocalMM(basePlane, 0, 0, capOffset),
        basePlane.xAxis,
        basePlane.yAxis,
        basePlane.normal
      ),
    });
  }

  return faces;
}

function planeForSelectedFace(draft, face) {
  if (!draft || !face) return null;
  if (face.type === "cap") {
    return makePlane(
      worldFromLocalMM(TOP_PLANE, 0, 0, draft.height),
      TOP_PLANE.xAxis,
      TOP_PLANE.yAxis,
      TOP_PLANE.normal
    );
  }
  if (face.type === "side") {
    return sideFacePlane(draft.points, face.index);
  }
  if (face.type === "feature-cap" && face.featureId) {
    const feature = featureById(draft, face.featureId);
    if (!feature) return null;
    const basePlane = feature.faceType === "side"
      ? sideFacePlane(draft.points, feature.faceIndex)
      : TOP_PLANE;
    if (!basePlane) return null;
    const baseOffset = feature.faceType === "top" ? draft.height : 0;
    return makePlane(
      worldFromLocalMM(basePlane, 0, 0, baseOffset + feature.depth),
      basePlane.xAxis,
      basePlane.yAxis,
      basePlane.normal
    );
  }
  return null;
}

function distancePointToSegment2D(point, a, b) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lenSq = abx * abx + aby * aby || 1;
  let t = ((point.x - a[0]) * abx + (point.y - a[1]) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + abx * t;
  const cy = a[1] + aby * t;
  return Math.hypot(point.x - cx, point.y - cy);
}

function pointInsideOrOnPolygon(point, polygon, tolerance = 0.08) {
  if (pointInPolygon(point, polygon)) return true;
  for (let i = 0; i < polygon.length; i++) {
    if (distancePointToSegment2D(point, polygon[i], polygon[(i + 1) % polygon.length]) <= tolerance) {
      return true;
    }
  }
  return false;
}

function profileInsideHost(profile, hostFeature) {
  if (!profile?.points?.length || !hostFeature?.points?.length) return false;
  return profile.points.every(([x, y]) =>
    pointInsideOrOnPolygon({ x, y }, hostFeature.points)
  );
}

function stackedFeatureDepth(sketchContext, relativeDepth) {
  if (!sketchContext?.hostFeatureId) return relativeDepth;
  return Number(sketchContext.hostDepth || 0) + relativeDepth;
}

function stackedDirectionAllowed(sketchContext, relativeDepth) {
  if (!sketchContext?.hostFeatureId) return true;
  const hostDepth = Number(sketchContext.hostDepth || 0);
  if (hostDepth >= 0) return relativeDepth >= 0;
  return relativeDepth <= 0;
}


function rebaseFeatureDependencies(features) {
  const next = (features || []).map((feature) => ({ ...feature }));
  const byId = new Map(next.map((feature) => [feature.id, feature]));

  // Re-evaluate several passes so grandchildren follow their parent too.
  for (let pass = 0; pass < next.length + 1; pass++) {
    let changed = false;
    for (const feature of next) {
      if (!feature.hostFeatureId || feature.relativeDepth == null) continue;
      const host = byId.get(feature.hostFeatureId);
      if (!host) continue;
      const depth = Number(host.depth || 0) + Number(feature.relativeDepth || 0);
      if (Math.abs(Number(feature.depth || 0) - depth) > 1e-9) {
        feature.depth = depth;
        feature.operation = depth >= 0 ? "add" : "cut";
        changed = true;
      }
    }
    if (!changed) break;
  }

  return next;
}

function descendantFeatureIds(features, rootId) {
  const result = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const feature of features || []) {
      if (feature.hostFeatureId && result.has(feature.hostFeatureId) && !result.has(feature.id)) {
        result.add(feature.id);
        changed = true;
      }
    }
  }
  return result;
}

function sanitizeDraftForParent(draft) {
  return {
    points: (draft.points || []).map((point) => [...point]),
    height: draft.height,
    features: (draft.features || []).map((feature) => ({
      points: (feature.points || []).map((point) => [...point]),
      depth: feature.depth,
      faceType: feature.faceType,
      faceIndex: feature.faceIndex ?? null,
    })),
    edgeTreatments: (draft.edgeTreatments || []).map((treatment) => ({
      edgeType: treatment.edgeType,
      edgeIndex: treatment.edgeIndex,
      amount: treatment.amount,
      mode: treatment.mode,
    })),
  };
}


function transformPoint2D(point, { moveX = 0, moveY = 0, rotateDegrees = 0, scale = 1 }) {
  const angle = THREE.MathUtils.degToRad(rotateDegrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = point[0] * scale;
  const y = point[1] * scale;
  return [
    x * cos - y * sin + moveX,
    x * sin + y * cos + moveY,
  ];
}

function transformDraftPlanar(draft, transform) {
  if (!draft) return draft;
  const moveX = Number(transform.moveX || 0);
  const moveY = Number(transform.moveY || 0);
  const rotateDegrees = Number(transform.rotateDegrees || 0);
  const scale = Number(transform.scale || 1);
  if (!Number.isFinite(moveX) || !Number.isFinite(moveY) || !Number.isFinite(rotateDegrees)) return draft;
  if (!Number.isFinite(scale) || scale <= 0.001) return draft;

  const nextFeatures = (draft.features || []).map((feature) => {
    const isTop = feature.faceType !== "side";
    const points = isTop
      ? (feature.points || []).map((point) => transformPoint2D(point, { moveX, moveY, rotateDegrees, scale }))
      : (feature.points || []).map(([x, y]) => [x * scale, y * scale]);
    return {
      ...feature,
      points,
      depth: Number(feature.depth || 0) * scale,
      relativeDepth:
        feature.relativeDepth == null
          ? feature.relativeDepth
          : Number(feature.relativeDepth || 0) * scale,
    };
  });

  return ensureDraftMetadata({
    ...draft,
    points: (draft.points || []).map((point) =>
      transformPoint2D(point, { moveX, moveY, rotateDegrees, scale })
    ),
    height: Number(draft.height || 0) * scale,
    features: rebaseFeatureDependencies(nextFeatures),
    edgeTreatments: (draft.edgeTreatments || []).map((treatment) => ({
      ...treatment,
      amount: Number(treatment.amount || 0) * scale,
    })),
  });
}

function draftCenterWorld(draft) {
  if (!draft?.points?.length) return new THREE.Vector3(0, 0.2, 0);
  const bounds = profileBounds(draft.points);
  return worldFromLocalMM(
    TOP_PLANE,
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    Math.max(0, Number(draft.height || 0))
  );
}

function profileBounds(points) {
  if (!points?.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function lineLength(entity) {
  if (!entity || entity.type !== "line") return 0;
  return Math.hypot(
    entity.end.x - entity.start.x,
    entity.end.y - entity.start.y
  );
}

function inferLineConstraint(start, end, snap = null) {
  if (snap === "horizontal" || Math.abs(end.y - start.y) < 0.0001) return "horizontal";
  if (snap === "vertical" || Math.abs(end.x - start.x) < 0.0001) return "vertical";
  return null;
}

function dimensionDraftForProfile(profile) {
  if (!profile) return { width: "", height: "", diameter: "" };
  if (profile.type === "circle") {
    return {
      width: "",
      height: "",
      diameter: (profile.radius * 2).toFixed(1),
    };
  }
  const bounds = profileBounds(profile.points);
  return {
    width: bounds.width.toFixed(1),
    height: bounds.height.toFixed(1),
    diameter: "",
  };
}

function resizeProfile(profile, dimensionDraft) {
  if (!profile) return profile;

  if (profile.type === "circle") {
    const diameter = Number(dimensionDraft.diameter);
    if (!Number.isFinite(diameter) || diameter <= 0) return profile;
    const radius = diameter / 2;
    return {
      ...profile,
      radius,
      points: circlePoints(profile.center, radius),
    };
  }

  const bounds = profileBounds(profile.points);
  const targetWidth = Number(dimensionDraft.width);
  const targetHeight = Number(dimensionDraft.height);
  const width = Number.isFinite(targetWidth) && targetWidth > 0 ? targetWidth : bounds.width;
  const height = Number.isFinite(targetHeight) && targetHeight > 0 ? targetHeight : bounds.height;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  if (profile.type === "rectangle") {
    return {
      ...profile,
      points: rectanglePoints(
        { x: cx - width / 2, y: cy - height / 2 },
        { x: cx + width / 2, y: cy + height / 2 }
      ),
    };
  }

  const sx = bounds.width > 0.0001 ? width / bounds.width : 1;
  const sy = bounds.height > 0.0001 ? height / bounds.height : 1;
  return {
    ...profile,
    points: ensureCCW(
      profile.points.map(([x, y]) => [
        cx + (x - cx) * sx,
        cy + (y - cy) * sy,
      ])
    ),
  };
}

function syncProfileEntities(entities, profile) {
  const matching = entities.filter((entity) => entity.profileId === profile.id);
  if (!matching.length || profile.type === "circle") return entities;

  let cursor = 0;
  return entities.map((entity) => {
    if (entity.profileId !== profile.id || entity.type !== "line") return entity;
    const index = cursor++;
    const start = profile.points[index % profile.points.length];
    const end = profile.points[(index + 1) % profile.points.length];
    return {
      ...entity,
      start: { x: start[0], y: start[1] },
      end: { x: end[0], y: end[1] },
      constraint: inferLineConstraint(
        { x: start[0], y: start[1] },
        { x: end[0], y: end[1] }
      ),
    };
  });
}

function nearestProfileVertexIndex(profile, point) {
  if (!profile?.points?.length) return -1;
  let bestIndex = -1;
  let bestDistance = Infinity;
  profile.points.forEach(([x, y], index) => {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function updateProfileVertex(profile, originalPoint, nextPoint) {
  if (!profile?.points?.length) return profile;
  const index = nearestProfileVertexIndex(profile, originalPoint);
  if (index < 0) return profile;

  if (profile.type === "rectangle" && profile.points.length === 4) {
    const points = profile.points.map((point) => [...point]);
    const previousIndex = (index + 3) % 4;
    const nextIndex = (index + 1) % 4;
    const current = profile.points[index];
    const previous = profile.points[previousIndex];
    const next = profile.points[nextIndex];

    points[index] = [nextPoint.x, nextPoint.y];

    if (Math.abs(previous[1] - current[1]) < Math.abs(previous[0] - current[0])) {
      points[previousIndex][1] = nextPoint.y;
    } else {
      points[previousIndex][0] = nextPoint.x;
    }

    if (Math.abs(next[1] - current[1]) < Math.abs(next[0] - current[0])) {
      points[nextIndex][1] = nextPoint.y;
    } else {
      points[nextIndex][0] = nextPoint.x;
    }

    return { ...profile, points };
  }

  return {
    ...profile,
    points: profile.points.map((point, pointIndex) =>
      pointIndex === index ? [nextPoint.x, nextPoint.y] : [...point]
    ),
  };
}

function featureLabel(feature, index) {
  const shownDepth = feature?.hostFeatureId && feature?.relativeDepth != null
    ? feature.relativeDepth
    : feature?.depth || 0;
  const amount = Math.abs(shownDepth).toFixed(1);
  const stacked = feature?.hostFeatureId ? "Stacked " : "";
  return `${stacked}${feature?.depth >= 0 ? "Add" : "Cut"} ${amount} mm · ${
    feature?.faceType === "side" ? "Side" : "Top"
  } #${index + 1}`;
}

function offsetSideFacePoints(points, faceIndex, amountMM) {
  if (!points?.length || faceIndex == null) return points;
  const next = points.map((p) => [...p]);
  const i = ((faceIndex % points.length) + points.length) % points.length;
  const j = (i + 1) % points.length;
  const normal = edgeOutwardNormal(points, i);

  next[i][0] += normal.x * amountMM;
  next[i][1] += normal.y * amountMM;
  next[j][0] += normal.x * amountMM;
  next[j][1] += normal.y * amountMM;

  return next;
}


function applyFaceOffsetToDraft(
  draft,
  face,
  amountMM
) {
  if (
    !draft ||
    !face ||
    !Number.isFinite(
      Number(amountMM)
    )
  ) {
    return draft;
  }

  const amount =
    Number(amountMM);


  /* --------------------------------------------------------
     BASE TOP FACE
  -------------------------------------------------------- */

  if (face.type === "cap") {
    return {
      ...draft,

      height:
        Math.max(
          MIN_PULL_MM,
          Number(
            draft.height || 0
          ) + amount
        ),
    };
  }


  /* --------------------------------------------------------
     BASE SIDE FACE
  -------------------------------------------------------- */

  if (face.type === "side") {
    return {
      ...draft,

      points:
        offsetSideFacePoints(
          draft.points,
          face.index,
          amount
        ),
    };
  }


  /* --------------------------------------------------------
     FEATURE CAP
  -------------------------------------------------------- */

  if (
    face.type ===
      "feature-cap" &&
    face.featureId
  ) {
    let features =
      (
        draft.features || []
      ).map(feature => {

        if (
          feature.id !==
          face.featureId
        ) {
          return {
            ...feature
          };
        }


        let nextDepth =
          feature.depth >= 0

            ? Math.max(
                MIN_FEATURE_MM,

                Number(
                  feature.depth ||
                  0
                ) + amount
              )

            : Math.min(
                -MIN_FEATURE_MM,

                Number(
                  feature.depth ||
                  0
                ) + amount
              );


        const next = {
          ...feature
        };


        /*
          Preserve stacked-feature relationship.
        */

        if (
          feature.hostFeatureId
        ) {
          const host =
            featureById(
              draft,
              feature.hostFeatureId
            );

          if (host) {
            const hostDepth =
              Number(
                host.depth || 0
              );

            nextDepth =
              hostDepth >= 0

                ? Math.max(
                    hostDepth +
                      MIN_FEATURE_MM,

                    nextDepth
                  )

                : Math.min(
                    hostDepth -
                      MIN_FEATURE_MM,

                    nextDepth
                  );

            next.relativeDepth =
              nextDepth -
              hostDepth;
          }
        }


        next.depth =
          nextDepth;

        next.operation =
          nextDepth >= 0
            ? "add"
            : "cut";

        return next;
      });


    features =
      rebaseFeatureDependencies(
        features
      );


    return {
      ...draft,
      features,
    };
  }


  return draft;
}


/*
  Re-resolve the SAME semantic face after the B-Rep
  has been rebuilt.

  This is what makes:

      select → pull → release → pull again

  feel continuous rather than losing selection.
*/

function persistentFaceAfterDraftEdit(
  draft,
  previousFace
) {
  if (
    !draft ||
    !previousFace
  ) {
    return null;
  }

  const id =
    topologyFaceId(
      previousFace
    );

  if (!id) {
    return previousFace;
  }


  return (
    topologyFacesForDraft(
      draft
    ).find(
      face =>
        face.topologyId === id
    ) ||
    null
  );
}

/* ======================================================================
   Geometry builders
   ====================================================================== */

function extrudeLocalGeometry(points, heightMM) {
  const shape = new THREE.Shape(
    ensureCCW(points).map(([x, y]) => new THREE.Vector2(x * UNIT, y * UNIT))
  );
  const depth = Math.max(0.0002, heightMM * UNIT);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 12,
  });
  geo.computeVertexNormals();
  return geo;
}

function flatWorldGeometry(points, plane, normalOffsetMM = 0) {
  const shape = new THREE.Shape(
    ensureCCW(points).map(([x, y]) => new THREE.Vector2(x * UNIT, y * UNIT))
  );
  const geo = new THREE.ShapeGeometry(shape);
  const matrix = planeBasisMatrix(plane);
  matrix.setPosition(
    plane.origin.clone().addScaledVector(plane.normal, normalOffsetMM * UNIT)
  );
  geo.applyMatrix4(matrix);
  return geo;
}

function placeGeometry(geo, plane, axisSign = 1, normalOffsetMM = 0) {
  const placed = geo.clone();
  const matrix = planeBasisMatrix(plane, axisSign);
  matrix.setPosition(
    plane.origin.clone().addScaledVector(plane.normal, normalOffsetMM * UNIT)
  );
  placed.applyMatrix4(matrix);
  placed.computeVertexNormals();
  return placed;
}

function meshFromGeometry(geo, color = BODY_COLOR) {
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.06,
    })
  );
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);
  return mesh;
}

function sideFacePlane(basePoints, faceIndex) {
  if (faceIndex == null || !basePoints?.length) return null;
  const index = ((faceIndex % basePoints.length) + basePoints.length) % basePoints.length;
  const a = basePoints[index];
  const b = basePoints[(index + 1) % basePoints.length];
  if (!a || !b) return null;

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return null;

  const edgeDirLocal = { x: dx / length, y: dy / length };
  const outwardLocal = edgeOutwardNormal(basePoints, index);

  const worldEdgeDir = TOP_PLANE.xAxis
    .clone()
    .multiplyScalar(edgeDirLocal.x)
    .addScaledVector(TOP_PLANE.yAxis, edgeDirLocal.y)
    .normalize();

  const worldOutward = TOP_PLANE.xAxis
    .clone()
    .multiplyScalar(outwardLocal.x)
    .addScaledVector(TOP_PLANE.yAxis, outwardLocal.y)
    .normalize();

  const worldOrigin = worldFromLocalMM(TOP_PLANE, a[0], a[1], 0);

  return makePlane(worldOrigin, worldEdgeDir, TOP_PLANE.normal, worldOutward);
}

const MeshPreviewKernel = {
  apiVersion: CAD_KERNEL_API_VERSION,
  id: "mesh-csg-fallback",
  name: PREVIEW_KERNEL,
  capabilities: KERNEL_CAPABILITIES,

  topology(draft) {
    return topologyFacesForDraft(draft);
  },

  createBase(draft) {
    return meshFromGeometry(
      placeGeometry(extrudeLocalGeometry(draft.points, draft.height), TOP_PLANE)
    );
  },

  featureTool(draft, feature) {
    const featurePlane =
      feature.faceType === "side"
        ? sideFacePlane(draft.points, feature.faceIndex)
        : TOP_PLANE;
    if (!featurePlane) return null;

    const direction = feature.depth >= 0 ? 1 : -1;
    const magnitude = Math.abs(feature.depth);
    let geometry;

    if (feature.faceType === "side") {
      geometry = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        direction,
        0
      );
    } else {
      const normalOffset = direction >= 0 ? draft.height : draft.height - magnitude;
      geometry = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        1,
        normalOffset
      );
    }

    return { mesh: meshFromGeometry(geometry), direction };
  },

  combine(workingMesh, toolMesh, operation) {
    const next = operation === "add"
      ? CSG.union(workingMesh, toolMesh)
      : CSG.subtract(workingMesh, toolMesh);
    next.material = workingMesh.material;
    return next;
  },

  buildPreview(draft) {
    if (!draft?.points?.length) return null;
    let workingMesh = this.createBase(draft);

    for (const feature of draft.features || []) {
      if (!feature.points?.length || Math.abs(feature.depth) < MIN_FEATURE_MM) continue;
      const tool = this.featureTool(draft, feature);
      if (!tool) continue;

      try {
        workingMesh = this.combine(
          workingMesh,
          tool.mesh,
          feature.operation || (tool.direction >= 0 ? "add" : "cut")
        );
      } catch (error) {
        console.warn("Beyond Sketch preview kernel operation failed:", error);
      }
    }

    workingMesh.geometry.computeVertexNormals();
    return workingMesh.geometry;
  },
};

const cadKernelRuntime = createCadKernelRuntime(MeshPreviewKernel);
cadKernelRuntime.installGlobalBridge();

function buildCompositeGeometry(draft) {
  return cadKernelRuntime.buildPreview(draft);
}

function edgeSegmentsForDraft(draft) {
  if (!draft?.points?.length) return [];
  const { points, height } = draft;
  const segments = [];

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    segments.push({
      key: `base-vertical-${i}`,
      edgeType: "vertical",
      edgeIndex: i,
      source: "base",
      editable: true,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
    });
    segments.push({
      key: `base-top-${i}`,
      edgeType: "top",
      edgeIndex: i,
      source: "base",
      editable: true,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], height),
    });
    segments.push({
      key: `base-bottom-${i}`,
      edgeType: "bottom",
      edgeIndex: i,
      source: "base",
      editable: true,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], 0),
    });
  }

  for (const feature of draft.features || []) {
    if (!feature.id || !feature.points?.length) continue;
    const plane = feature.faceType === "side"
      ? sideFacePlane(draft.points, feature.faceIndex)
      : TOP_PLANE;
    if (!plane) continue;

    const host = feature.hostFeatureId ? featureById(draft, feature.hostFeatureId) : null;
    const hostOffset = host ? Number(host.depth || 0) : 0;
    const mouthOffset = feature.faceType === "top"
      ? draft.height + hostOffset
      : hostOffset;
    const capOffset = feature.faceType === "top"
      ? draft.height + feature.depth
      : feature.depth;

    for (let i = 0; i < feature.points.length; i++) {
      const a = feature.points[i];
      const b = feature.points[(i + 1) % feature.points.length];
      const mouthA = worldFromLocalMM(plane, a[0], a[1], mouthOffset);
      const mouthB = worldFromLocalMM(plane, b[0], b[1], mouthOffset);
      const capA = worldFromLocalMM(plane, a[0], a[1], capOffset);
      const capB = worldFromLocalMM(plane, b[0], b[1], capOffset);

      segments.push({
        key: `feature-${feature.id}-mouth-${i}`,
        edgeType: "feature-mouth",
        edgeIndex: i,
        source: "feature",
        featureId: feature.id,
        editable: cadKernelRuntime.supports("exactFeatureEdgeFillet"),
        a: mouthA,
        b: mouthB,
      });
      segments.push({
        key: `feature-${feature.id}-cap-${i}`,
        edgeType: "feature-cap",
        edgeIndex: i,
        source: "feature",
        featureId: feature.id,
        editable: cadKernelRuntime.supports("exactFeatureEdgeFillet"),
        a: capA,
        b: capB,
      });
      segments.push({
        key: `feature-${feature.id}-wall-${i}`,
        edgeType: "feature-wall",
        edgeIndex: i,
        source: "feature",
        featureId: feature.id,
        editable: cadKernelRuntime.supports("exactFeatureEdgeFillet"),
        a: mouthA,
        b: capA,
      });
    }
  }

  return segments;
}

/* ======================================================================
   Pointer / ray helpers
   ====================================================================== */

function quantizeDragMM(value, event) {
  const step = isTouchPointer(event) ? TOUCH_DRAG_STEP_MM : DIRECT_DRAG_STEP_MM;
  return Math.round(value / step) * step;
}

function usePlaneRaycast() {
  const { camera, gl, raycaster } = useThree();

  return useCallback(
    (event, plane) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const threePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        plane.normal,
        plane.origin
      );
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(threePlane, hit)) return null;
      return localFromWorldMM(plane, hit);
    },
    [camera, gl, raycaster]
  );
}

function useAxisDrag() {
  const { camera, gl, raycaster } = useThree();

  return useCallback(
    (event, axisOrigin, axisDirection) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      let helperNormal = new THREE.Vector3()
        .crossVectors(axisDirection, cameraDirection)
        .cross(axisDirection);

      if (helperNormal.lengthSq() < 1e-6) helperNormal = cameraDirection.clone();
      helperNormal.normalize();

      const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        helperNormal,
        axisOrigin
      );
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, hit)) return null;

      return hit.clone().sub(axisOrigin).dot(axisDirection) / UNIT;
    },
    [camera, gl, raycaster]
  );
}

function useEdgePicker(segments) {
  const { camera, gl, size } = useThree();

  return useCallback(
    (event) => {
      if (!segments.length) return null;
      const rect = gl.domElement.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      const toScreen = (point) => {
        const projected = point.clone().project(camera);
        return {
          x: ((projected.x + 1) / 2) * size.width,
          y: ((1 - projected.y) / 2) * size.height,
        };
      };

      let best = null;
      const pointerType = event?.pointerType || event?.nativeEvent?.pointerType || "mouse";
      let bestDistance = pointerType === "pen" ? 22 : 18;

      for (const segment of segments) {
        const a = toScreen(segment.a);
        const b = toScreen(segment.b);
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const lengthSq = abx * abx + aby * aby || 1;
        let t = ((px - a.x) * abx + (py - a.y) * aby) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const cx = a.x + abx * t;
        const cy = a.y + aby * t;
        const distance = Math.hypot(px - cx, py - cy);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = { ...segment, hitDistance: distance };
        }
      }

      return best;
    },
    [segments, camera, gl, size]
  );
}

/* ======================================================================
   Snapping
   ====================================================================== */

function getSnapCandidates(state, options = {}) {
  const points = [];
  const { excludeEntityId = null, excludeProfileId = null } = options;

  for (const entity of state.sketchEntities || []) {
    if (entity.id === excludeEntityId) continue;
    if (excludeProfileId && entity.profileId === excludeProfileId) continue;
    if (entity.type === "line") {
      points.push(entity.start, entity.end);
      points.push({
        x: (entity.start.x + entity.end.x) / 2,
        y: (entity.start.y + entity.end.y) / 2,
        snapKind: "midpoint",
      });
    }
  }

  for (const profile of state.sketchProfiles || []) {
    if (profile.id === excludeProfileId) continue;
    for (const [x, y] of profile.points) points.push({ x, y });
  }

  for (const point of state.lineChain || []) points.push(point);

  return points;
}

function snapSketchPoint(raw, state, options = {}) {
  let point = {
    x: Math.round(raw.x / GRID_MM) * GRID_MM,
    y: Math.round(raw.y / GRID_MM) * GRID_MM,
  };
  let snap = "grid";

  const candidates = getSnapCandidates(state, options);
  let nearest = null;
  let nearestDistance = SNAP_MM;

  for (const candidate of candidates) {
    const distance = Math.hypot(raw.x - candidate.x, raw.y - candidate.y);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  if (nearest) {
    point = { x: nearest.x, y: nearest.y };
    snap = nearest.snapKind || "endpoint";
  }

  if (state.activeTool === "line" && state.lineChain?.length) {
    const start = state.lineChain[state.lineChain.length - 1];
    const dx = Math.abs(raw.x - start.x);
    const dy = Math.abs(raw.y - start.y);

    if (dx <= SNAP_MM && dy > dx) {
      point.x = start.x;
      point.y = Math.round(raw.y / GRID_MM) * GRID_MM;
      snap = "vertical";
    } else if (dy <= SNAP_MM && dx > dy) {
      point.y = start.y;
      point.x = Math.round(raw.x / GRID_MM) * GRID_MM;
      snap = "horizontal";
    }

    const chainStart = state.lineChain[0];
    if (state.lineChain.length >= 3 && almostSamePoint(raw, chainStart)) {
      point = { ...chainStart };
      snap = "close";
    }
  }

  return { ...point, snap };
}


function pointLineDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

function simplifyStroke(points, tolerance = 0.8) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = pointLineDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplifyStroke(points.slice(0, index + 1), tolerance);
  const right = simplifyStroke(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function fitCircleFrom3Points(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-5) return null;
  const aa = a.x * a.x + a.y * a.y;
  const bb = b.x * b.x + b.y * b.y;
  const cc = c.x * c.x + c.y * c.y;
  const x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d;
  const y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;
  return { center: { x, y }, radius: Math.hypot(a.x - x, a.y - y) };
}

function classifySmartStroke(rawPoints) {
  if (!rawPoints || rawPoints.length < 2) return null;
  const points = simplifyStroke(rawPoints, 0.55);
  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const xs = rawPoints.map((p) => p.x);
  const ys = rawPoints.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const diagonal = Math.hypot(width, height);
  if (diagonal < SMART_STROKE_MIN_MM) return null;

  const maxLineDeviation = Math.max(...rawPoints.map((p) => pointLineDistance(p, first, last)));
  if (maxLineDeviation <= SMART_LINE_TOLERANCE_MM) {
    return { type: "line", start: first, end: last };
  }

  const closed = Math.hypot(last.x - first.x, last.y - first.y) <= Math.max(2.8, diagonal * 0.16);
  if (closed && rawPoints.length >= 8) {
    const center = rawPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    center.x /= rawPoints.length;
    center.y /= rawPoints.length;
    const radii = rawPoints.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
    const radius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const radialError = Math.sqrt(radii.reduce((sum, r) => sum + (r - radius) ** 2, 0) / radii.length) / Math.max(radius, 0.001);
    const aspect = width / Math.max(height, 0.001);
    if (radialError < 0.16 && aspect > 0.68 && aspect < 1.47) {
      return { type: "circle", center, radius };
    }
    const polygon = simplifyStroke(rawPoints, Math.max(0.65, diagonal * 0.012));
    if (polygon.length >= 3) return { type: "closed-polyline", points: polygon };
  }

  if (!closed && rawPoints.length >= 6) {
    const mid = rawPoints[Math.floor(rawPoints.length / 2)];
    const circle = fitCircleFrom3Points(first, mid, last);
    if (circle && circle.radius > 1) {
      const errors = rawPoints.map((p) => Math.abs(Math.hypot(p.x - circle.center.x, p.y - circle.center.y) - circle.radius));
      const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
      if (meanError / circle.radius < 0.08) {
        return { type: "arc", center: circle.center, radius: circle.radius, start: first, end: last, via: mid };
      }
    }
  }

  return { type: "polyline", points };
}

function sampleArcEntity(entity, segments = 40) {
  const { center, radius, start, end, via } = entity;
  const a0 = Math.atan2(start.y - center.y, start.x - center.x);
  let a1 = Math.atan2(end.y - center.y, end.x - center.x);
  const am = Math.atan2(via.y - center.y, via.x - center.x);
  const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const ccwSpan = norm(a1 - a0);
  const midSpan = norm(am - a0);
  const ccw = midSpan <= ccwSpan;
  let span = ccw ? ccwSpan : -norm(a0 - a1);
  if (Math.abs(span) < 1e-4) span = Math.PI * 2;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = a0 + span * (i / segments);
    return { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
  });
}

/* ======================================================================
   Scene primitives
   ====================================================================== */

function CameraRig({ requestRef, controlsRef }) {
  const { camera } = useThree();
  const targetPosition = useRef(null);
  const targetLook = useRef(null);
  const targetUp = useRef(null);

  useEffect(() => {
    const request = (
      position,
      lookAt,
      up = null
    ) => {
      targetPosition.current =
        position.clone();

      targetLook.current =
        lookAt.clone();

      targetUp.current =
        up
          ? up.clone().normalize()
          : null;
    };

    /*
      Direct modeling owns geometry only.

      When Pencil/mouse manipulation begins,
      any unfinished camera preset/focus animation
      can be cancelled immediately.
    */
    request.cancel = () => {
      targetPosition.current = null;
      targetLook.current = null;
      targetUp.current = null;
    };

    requestRef.current =
      request;

    return () => {
      if (
        requestRef.current === request
      ) {
        requestRef.current = null;
      }
    };
  }, [requestRef]);

  useFrame(() => {
    if (targetUp.current) {
      camera.up.lerp(targetUp.current, 0.22).normalize();
    }

    if (targetPosition.current) {
      camera.position.lerp(targetPosition.current, 0.2);
      if (camera.position.distanceTo(targetPosition.current) < 0.003) {
        camera.position.copy(targetPosition.current);
        targetPosition.current = null;
      }
    }

    if (targetLook.current && controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, 0.2);
      controlsRef.current.update();
      if (controlsRef.current.target.distanceTo(targetLook.current) < 0.003) {
        controlsRef.current.target.copy(targetLook.current);
        targetLook.current = null;
      }
    }
  });

  return null;
}

function SketchPlaneSurface({ plane, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave }) {
  const groupRef = useRef(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(plane.origin);
    groupRef.current.quaternion.copy(planeQuaternion(plane));
  }, [plane]);

  return (
    <group ref={groupRef}>
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      >
        <planeGeometry args={[24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial
          color="#2d6f9e"
          transparent
          opacity={0.045}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CompositeSolid({ geometry, preview = false }) {
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={preview ? "#9fb7c8" : BODY_COLOR}
        roughness={0.4}
        metalness={0.05}
        transparent={preview}
        opacity={preview ? 0.82 : 1}
      />
    </mesh>
  );
}

function GhostSolid({ geometry }) {
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={GHOST_COLOR}
        roughness={0.6}
        transparent
        opacity={0.26}
      />
    </mesh>
  );
}

function SketchEntityLines({
  plane,
  entities,
  lineChain,
  previewPoint,
  selectedEntityId,
  canSelect,
  onSelect,
}) {
  return (
    <>
      {entities.map((entity) => {
        if (!["line", "arc", "polyline"].includes(entity.type)) return null;
        const selected = entity.id === selectedEntityId;
        const localPoints = entity.type === "line"
          ? [entity.start, entity.end]
          : entity.type === "arc"
            ? sampleArcEntity(entity)
            : entity.points;
        if (!localPoints?.length) return null;
        const midpointPoint = localPoints[Math.floor(localPoints.length / 2)];
        const midpoint = { x: midpointPoint.x, y: midpointPoint.y };
        return (
          <group key={entity.id}>
            <Line
              points={localPoints.map((point) => worldFromLocalMM(plane, point.x, point.y, 0.05))}
              color={selected ? SNAP_COLOR : "#80bce8"}
              lineWidth={selected ? 4 : 2.2}
              onPointerDown={(event) => {
                if (!canSelect || isTouchPointer(event)) return;
                event.stopPropagation();
                onSelect?.(entity.id);
              }}
            />
            {entity.constraint && (
              <Html
                position={worldFromLocalMM(plane, midpoint.x, midpoint.y, 0.12)}
                center
                distanceFactor={6}
                style={{ pointerEvents: "none" }}
              >
                <div className={`sketch3d-constraint-badge ${selected ? "is-selected" : ""}`}>
                  {entity.constraint === "horizontal" ? "H" : "V"}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {lineChain?.length > 0 &&
        lineChain.map((point, index) => (
          <mesh
            key={`chain-${index}`}
            position={worldFromLocalMM(plane, point.x, point.y, 0.08)}
          >
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color={index === 0 ? SNAP_COLOR : SELECT_COLOR} />
          </mesh>
        ))}

      {lineChain?.length > 0 && previewPoint && (
        <Line
          points={[
            worldFromLocalMM(
              plane,
              lineChain[lineChain.length - 1].x,
              lineChain[lineChain.length - 1].y,
              0.06
            ),
            worldFromLocalMM(plane, previewPoint.x, previewPoint.y, 0.06),
          ]}
          color={previewPoint.snap === "close" ? SNAP_COLOR : SELECT_COLOR}
          lineWidth={2.6}
        />
      )}
    </>
  );
}


function SmartStrokePreview({ plane, points, kind }) {
  if (!points?.length) return null;
  const world = points.map((point) => worldFromLocalMM(plane, point.x, point.y, 0.075));
  return (
    <>
      {world.length > 1 && (
        <Line points={world} color={kind ? SNAP_COLOR : SELECT_COLOR} lineWidth={3} />
      )}
      <Html position={world[world.length - 1]} center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div className="sketch3d-smart-stroke-badge">{kind || "DRAW"}</div>
      </Html>
    </>
  );
}

function ToolPreview({ plane, state }) {
  const start = state.toolStart;
  const hover = state.hoverPoint;
  if (!start || !hover) return null;

  if (state.activeTool === "rectangle") {
    const points = rectanglePoints(start, hover).map(([x, y]) =>
      worldFromLocalMM(plane, x, y, 0.06)
    );
    return (
      <Line
        points={[...points, points[0]]}
        color={SELECT_COLOR}
        lineWidth={2.4}
      />
    );
  }

  if (state.activeTool === "circle") {
    const radius = Math.hypot(hover.x - start.x, hover.y - start.y);
    if (radius < 0.01) return null;
    const points = circlePoints(start, radius, 64).map(([x, y]) =>
      worldFromLocalMM(plane, x, y, 0.06)
    );
    return (
      <Line
        points={[...points, points[0]]}
        color={SELECT_COLOR}
        lineWidth={2.4}
      />
    );
  }

  return null;
}

function SnapMarker({ plane, hoverPoint }) {
  if (!hoverPoint) return null;
  const world = worldFromLocalMM(plane, hoverPoint.x, hoverPoint.y, 0.1);
  const highlighted = ["endpoint", "close", "horizontal", "vertical"].includes(
    hoverPoint.snap
  );

  return (
    <group position={world}>
      <mesh>
        <ringGeometry args={[0.018, 0.028, 18]} />
        <meshBasicMaterial
          color={highlighted ? SNAP_COLOR : "#6da9d3"}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

function ProfileRegion({
  plane,
  profile,
  selected,
  selectable = true,
  onSelect,
  onDirectPointerDown = null,
  onDirectPointerMove = null,
  onDirectPointerUp = null,
}) {
  const geometry = useMemo(
    () => flatWorldGeometry(profile.points, plane, 0.025),
    [profile.points, plane]
  );
  const touchTapRef = useRef(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      onPointerDown={(event) => {
        if (!selectable) return;
        if (isTouchPointer(event)) {
          const point = pointerClientPoint(event);
          touchTapRef.current = {
            pointerId: event.pointerId,
            x: point.x,
            y: point.y,
            at: performance.now(),
            moved: false,
          };
          return;
        }
        event.stopPropagation();
        if (onDirectPointerDown) {
          onDirectPointerDown(event, profile);
        } else {
          onSelect(profile.id);
        }
      }}
      onPointerMove={(event) => {
        if (isTouchPointer(event)) {
          const tap = touchTapRef.current;
          if (tap?.pointerId === event.pointerId && pointerTravelPx(tap, event) > TOUCH_TAP_MAX_PX) {
            tap.moved = true;
          }
          return;
        }
        if (onDirectPointerMove) onDirectPointerMove(event);
      }}
      onPointerUp={(event) => {
        if (isTouchPointer(event)) {
          const tap = touchTapRef.current;
          touchTapRef.current = null;
          if (
            tap?.pointerId === event.pointerId &&
            !tap.moved &&
            pointerTravelPx(tap, event) <= TOUCH_TAP_MAX_PX &&
            performance.now() - tap.at <= TOUCH_TAP_MAX_MS
          ) {
            onSelect(profile.id);
          }
          return;
        }
        if (onDirectPointerUp) {
          event.stopPropagation();
          event.target?.releasePointerCapture?.(event.pointerId);
          onDirectPointerUp(event);
        }
      }}
      onPointerCancel={(event) => {
        if (isTouchPointer(event)) {
          touchTapRef.current = null;
          return;
        }
        if (onDirectPointerUp) {
          event.target?.releasePointerCapture?.(event.pointerId);
          onDirectPointerUp(event);
        }
      }}
    >
      <meshBasicMaterial
        color={PROFILE_COLOR}
        transparent
        opacity={selected ? 0.36 : 0.13}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function ProfileDimensionLabels({ plane, profile, visible = true }) {
  if (!visible || !profile) return null;

  if (profile.type === "circle") {
    const labelPos = worldFromLocalMM(
      plane,
      profile.center.x,
      profile.center.y - profile.radius - 5,
      0.14
    );
    return (
      <Html position={labelPos} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div className="sketch3d-dimension-label">Ø {(profile.radius * 2).toFixed(1)} mm</div>
      </Html>
    );
  }

  const bounds = profileBounds(profile.points);
  const widthPos = worldFromLocalMM(
    plane,
    (bounds.minX + bounds.maxX) / 2,
    bounds.minY - 5,
    0.14
  );
  const heightPos = worldFromLocalMM(
    plane,
    bounds.maxX + 5,
    (bounds.minY + bounds.maxY) / 2,
    0.14
  );

  return (
    <>
      <Html position={widthPos} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div className="sketch3d-dimension-label">{bounds.width.toFixed(1)} mm</div>
      </Html>
      <Html position={heightPos} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div className="sketch3d-dimension-label is-vertical">{bounds.height.toFixed(1)} mm</div>
      </Html>
    </>
  );
}

function PullGizmo({ origin, axis, active, onPointerDown, onPointerMove, onPointerUp, numericValue = null, onNumericChange = null, onNumericApply = null, dimensionText = null }) {
  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axis.clone().normalize()
      ),
    [axis]
  );

  const handlers = {
    onPointerDown: (event) => {
      event.stopPropagation();
      event.target?.setPointerCapture?.(event.pointerId);
      onPointerDown(event);
    },
    onPointerMove: (event) => {
      event.stopPropagation();
      onPointerMove(event);
    },
    onPointerUp: (event) => {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      onPointerUp(event);
    },
    onPointerCancel: (event) => {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      onPointerUp(event);
    },
  };

  return (
    <group position={origin} quaternion={quaternion}>
      <Line
        points={[
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.52, 0),
        ]}
        color={active ? SNAP_COLOR : SELECT_COLOR}
        lineWidth={4}
      />
      <mesh position={[0, 0.27, 0]} {...handlers}>
        <cylinderGeometry args={[0.085, 0.085, 0.5, 18]} />
        <meshBasicMaterial
          color={active ? SNAP_COLOR : SELECT_COLOR}
          transparent
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.55, 0]} {...handlers}>
        <sphereGeometry args={[0.115, 18, 18]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.55, 0]} {...handlers}>
        <coneGeometry args={[0.072, 0.16, 20]} />
        <meshBasicMaterial color={active ? SNAP_COLOR : SELECT_COLOR} />
      </mesh>
      <mesh position={[0, 0, 0]} {...handlers}>
        <sphereGeometry args={[0.11, 18, 18]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0]} {...handlers}>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshBasicMaterial color={active ? SNAP_COLOR : SELECT_COLOR} />
      </mesh>
      {(dimensionText || numericValue != null) && (
        <Html position={[0, 0.78, 0]} center distanceFactor={6} zIndexRange={[35, 0]}>
          {numericValue != null && onNumericChange && onNumericApply ? (
            <label className="sketch3d-pull-tag" onPointerDown={(event) => event.stopPropagation()}>
              <input
                type="number"
                step="0.5"
                value={numericValue}
                onChange={(event) => onNumericChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onNumericApply();
                  }
                }}
              />
              <span>mm</span>
            </label>
          ) : (
            <div className="sketch3d-pull-readout">{dimensionText}</div>
          )}
        </Html>
      )}
    </group>
  );
}

function sideFaceOverlayGeometry(draft, faceIndex) {
  if (!draft?.points?.length || faceIndex == null) return null;
  const i = ((faceIndex % draft.points.length) + draft.points.length) % draft.points.length;
  const a = draft.points[i];
  const b = draft.points[(i + 1) % draft.points.length];
  if (!a || !b) return null;

  const outward = edgeOutwardNormal(draft.points, i);
  const worldNormal = TOP_PLANE.xAxis
    .clone()
    .multiplyScalar(outward.x)
    .addScaledVector(TOP_PLANE.yAxis, outward.y)
    .normalize();
  const nudge = worldNormal.multiplyScalar(0.0008);

  const p1 = worldFromLocalMM(TOP_PLANE, a[0], a[1], 0).add(nudge);
  const p2 = worldFromLocalMM(TOP_PLANE, b[0], b[1], 0).add(nudge);
  const p3 = worldFromLocalMM(TOP_PLANE, b[0], b[1], draft.height).add(nudge);
  const p4 = worldFromLocalMM(TOP_PLANE, a[0], a[1], draft.height).add(nudge);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z,
        p3.x, p3.y, p3.z,
        p4.x, p4.y, p4.z,
      ],
      3
    )
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function FaceHighlight({ draft, face, color = SELECT_COLOR, opacity = 0.28 }) {
  const geometry = useMemo(() => {
    if (!draft || !face) return null;

    if (face.type === "cap") {
      return flatWorldGeometry(draft.points, TOP_PLANE, draft.height + 0.03);
    }

    if (face.type === "feature-cap" && face.featureId) {
      const feature = featureById(draft, face.featureId);
      if (!feature) return null;
      const plane = feature.faceType === "side"
        ? sideFacePlane(draft.points, feature.faceIndex)
        : TOP_PLANE;
      if (!plane) return null;
      const offset = feature.faceType === "top"
        ? draft.height + feature.depth
        : feature.depth;
      const nudge = feature.depth >= 0 ? 0.03 : -0.03;
      return flatWorldGeometry(feature.points, plane, offset + nudge);
    }

    if (face.type === "side" && face.index != null) {
      return sideFaceOverlayGeometry(draft, face.index);
    }

    return null;
  }, [draft, face]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!draft || !face) return null;

  if (geometry) {
    const sideFace = face.type === "side";
    return (
      <>
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={opacity >= 0.2}
          />
        </mesh>
        {sideFace && (
          <Line
            points={[
              worldFromLocalMM(TOP_PLANE, draft.points[face.index][0], draft.points[face.index][1], 0),
              worldFromLocalMM(TOP_PLANE, draft.points[(face.index + 1) % draft.points.length][0], draft.points[(face.index + 1) % draft.points.length][1], 0),
              worldFromLocalMM(TOP_PLANE, draft.points[(face.index + 1) % draft.points.length][0], draft.points[(face.index + 1) % draft.points.length][1], draft.height),
              worldFromLocalMM(TOP_PLANE, draft.points[face.index][0], draft.points[face.index][1], draft.height),
              worldFromLocalMM(TOP_PLANE, draft.points[face.index][0], draft.points[face.index][1], 0),
            ]}
            color={color}
            lineWidth={opacity < 0.2 ? 2.4 : 3.4}
          />
        )}
      </>
    );
  }

  return null;
}

function EdgeOverlay({ segments, selectedKey, hoveredKey, bodySelected = false }) {
  return (
    <>
      {segments.map((segment) => {
        const selected = segment.key === selectedKey;
        const hovered = !selected && segment.key === hoveredKey;
        return (
          <Line
            key={segment.key}
            points={[segment.a, segment.b]}
            color={selected ? SNAP_COLOR : hovered ? "#73c5ff" : bodySelected ? "#58b7ff" : "#132331"}
            lineWidth={selected ? 3.6 : hovered ? 2.7 : bodySelected ? 2.1 : segment.source === "feature" ? 0.9 : 1.25}
            transparent
            opacity={bodySelected ? 0.9 : segment.source === "feature" && !selected && !hovered ? 0.55 : 1}
          />
        );
      })}
    </>
  );
}

function EdgeTreatmentPreview({ draft, segments }) {
  if (!draft) return null;
  const treatments = draft.edgeTreatments || [];
  if (!treatments.length) return null;

  return (
    <>
      {treatments.map((treatment) => {
        const targetKey = treatment.targetEdgeKey ||
          `base-${treatment.edgeType}-${treatment.edgeIndex}`;
        const segment = segments.find((item) => item.key === targetKey);
        if (!segment) return null;
        const width = Math.max(4, Math.min(11, 4 + Number(treatment.amount || 0) * 1.1));
        return (
          <Line
            key={treatment.id || `${targetKey}-${treatment.mode}`}
            points={[segment.a, segment.b]}
            color={treatment.mode === "fillet" ? "#8ad7ff" : "#d7b6ff"}
            lineWidth={width}
            transparent
            opacity={0.38}
          />
        );
      })}
    </>
  );
}

function SketchEndpointHandles({ plane, entity, onPointerDown, onPointerMove, onPointerUp }) {
  if (!entity || entity.type !== "line") return null;
  const endpoints = [["start", entity.start], ["end", entity.end]];

  return (
    <>
      {endpoints.map(([key, point]) => (
        <mesh
          key={`${entity.id}-${key}`}
          position={worldFromLocalMM(plane, point.x, point.y, 0.15)}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.target?.setPointerCapture?.(event.pointerId);
            onPointerDown(event, key);
          }}
          onPointerMove={(event) => {
            onPointerMove(event);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            event.target?.releasePointerCapture?.(event.pointerId);
            onPointerUp(event);
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            event.target?.releasePointerCapture?.(event.pointerId);
            onPointerUp(event);
          }}
        >
          <sphereGeometry args={[0.06, 18, 18]} />
          <meshBasicMaterial color={SNAP_COLOR} depthTest={false} />
        </mesh>
      ))}
    </>
  );
}

function facePullDataFor(draft, face) {
  if (!draft || !face) return null;

  if (face.type === "cap") {
    const center = polygonCentroid(draft.points);
    return {
      origin: worldFromLocalMM(TOP_PLANE, center.x, center.y, draft.height + 0.06),
      axis: TOP_PLANE.normal.clone(),
    };
  }

  if (face.type === "side" && face.index != null) {
    const i = face.index;
    const a = draft.points[i];
    const b = draft.points[(i + 1) % draft.points.length];
    const plane = sideFacePlane(draft.points, i);
    if (!a || !b || !plane) return null;
    const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return {
      origin: worldFromLocalMM(plane, edgeLength / 2, draft.height / 2, 0.06),
      axis: plane.normal.clone(),
    };
  }

  if (face.type === "feature-cap" && face.featureId) {
    const feature = featureById(draft, face.featureId);
    if (!feature) return null;
    const plane = feature.faceType === "side"
      ? sideFacePlane(draft.points, feature.faceIndex)
      : TOP_PLANE;
    if (!plane) return null;
    const center = polygonCentroid(feature.points);
    const offset = feature.faceType === "top"
      ? draft.height + feature.depth
      : feature.depth;
    return {
      origin: worldFromLocalMM(plane, center.x, center.y, offset + 0.06),
      axis: plane.normal.clone(),
    };
  }

  return null;
}

/* ======================================================================
   Main scene
   ====================================================================== */

function SketchScene({ state, actions, cameraRigRef, controlsRef }) {
  const planeRaycast = usePlaneRaycast();
  const axisDragFrom = useAxisDrag();
  const edgeSegments = useMemo(() => edgeSegmentsForDraft(state.draft), [state.draft]);
  const pickEdge = useEdgePicker(edgeSegments);

  const pullRef = useRef(null);
  const pullFrameRef = useRef(null);
  const pendingPullValueRef = useRef(null);
  const sketchPointerRef = useRef(null);
  const touchSolidTapRef = useRef(null);
  const touchGroundTapRef = useRef(null);
  const endpointDragRef = useRef(null);
  const lastSolidTapRef = useRef({ id: null, at: 0 });

  const committedGeometries = useMemo(
    () => state.committed.map((item) => buildCompositeGeometry(item)),
    [state.committed]
  );

  useEffect(
    () => () => {
      committedGeometries.forEach((geo) => geo?.dispose?.());
      if (pullFrameRef.current != null) cancelAnimationFrame(pullFrameRef.current);
    },
    [committedGeometries]
  );

  const draftForPreview = useMemo(() => {
    if (!state.draft) return null;

    if (
      state.mode ===
        "pulling-face" &&
      state.selectedFace
    ) {
      return applyFaceOffsetToDraft(
        state.draft,
        state.selectedFace,
        state.pendingPull
      );
    }

    if (
      state.mode === "pulling-profile" &&
      state.sketchContext?.kind === "feature" &&
      state.activeProfileId
    ) {
      const profile = state.sketchProfiles.find((p) => p.id === state.activeProfileId);
      if (!profile || Math.abs(state.pendingPull) < 0.01) return state.draft;
      return {
        ...state.draft,
        features: [
          ...(state.draft.features || []),
          {
            id: "preview-feature",
            points: profile.points,
            depth: stackedFeatureDepth(state.sketchContext, state.pendingPull),
            operation: stackedFeatureDepth(state.sketchContext, state.pendingPull) >= 0 ? "add" : "cut",
            faceType: state.sketchContext.faceType,
            faceIndex: state.sketchContext.faceIndex,
            hostFeatureId: state.sketchContext.hostFeatureId || null,
            relativeDepth: state.pendingPull,
          },
        ],
      };
    }

    return state.draft;
  }, [state]);

  const draftGeometry = useMemo(
    () => {
      const interactivePreview =
        state.mode === "pulling-face" ||
        state.mode === "pulling-profile";

      /*
        Tablet CAD must feel immediate.

        During the gesture we deliberately use the
        lightweight mesh kernel.

        Once released, OpenCascade validates/rebuilds
        the final B-Rep.
      */
      if (
        interactivePreview &&
        draftForPreview
      ) {
        return MeshPreviewKernel
          .buildPreview(
            draftForPreview
          );
      }

      return buildCompositeGeometry(
        draftForPreview
      );
    },

    [
      draftForPreview,
      state.mode,
    ]
  );

  useEffect(() => () => draftGeometry?.dispose?.(), [draftGeometry]);

  const basePullGeometry = useMemo(() => {
    if (
      state.mode !== "pulling-profile" ||
      state.sketchContext?.kind !== "base" ||
      !state.activeProfileId ||
      state.pendingPull <= 0.01
    ) {
      return null;
    }

    const profile = state.sketchProfiles.find((p) => p.id === state.activeProfileId);
    if (!profile) return null;

    return placeGeometry(
      extrudeLocalGeometry(profile.points, Math.max(0.1, state.pendingPull)),
      state.activePlane
    );
  }, [state]);

  useEffect(() => () => basePullGeometry?.dispose?.(), [basePullGeometry]);

  const selectedProfile = useMemo(
    () => state.sketchProfiles.find((profile) => profile.id === state.activeProfileId) || null,
    [state.sketchProfiles, state.activeProfileId]
  );

  const selectedSketchEntity = useMemo(
    () => state.sketchEntities.find((entity) => entity.id === state.selectedSketchEntityId) || null,
    [state.sketchEntities, state.selectedSketchEntityId]
  );

  const selectedTopologyFaces = useMemo(() => {
    if (!state.draft || !state.selectedFaceIds?.length) return [];
    const byId = new Map(topologyFacesForDraft(state.draft).map((face) => [face.topologyId, face]));
    return state.selectedFaceIds.map((id) => byId.get(id)).filter(Boolean);
  }, [state.draft, state.selectedFaceIds]);

  const profilePullOrigin = useMemo(() => {
    if (!selectedProfile) return null;
    const center = polygonCentroid(selectedProfile.points);
    return worldFromLocalMM(state.activePlane, center.x, center.y, 0.06);
  }, [selectedProfile, state.activePlane]);

  const facePull = useMemo(
    () => facePullDataFor(state.draft, state.selectedFace),
    [state.draft, state.selectedFace]
  );

  const smartStrokeRef = useRef(false);

  function handleSketchPointerMove(event) {
    if (isTouchPointer(event)) {
      return;
    }

    if (
      sketchPointerRef.current
        ?.pointerId != null &&
      sketchPointerRef.current
        .pointerId !==
        event.pointerId
    ) {
      return;
    }

    /*
      Consume every REAL coalesced pointer sample.

      This makes Apple Pencil drawing considerably
      smoother than processing only one point per
      browser pointermove event.

      Predicted samples are deliberately NOT
      committed to geometry.
    */
    const samples =
      coalescedPointerEvents(event);

    const strokePoints =
      [];

    let latestRaw =
      null;

    for (
      const sample of samples
    ) {
      const raw =
        planeRaycast(
          sample,
          state.activePlane
        );

      if (!raw) {
        continue;
      }

      latestRaw =
        raw;

      if (
        state.activeTool ===
          "smart" &&
        smartStrokeRef.current
      ) {
        strokePoints.push(
          raw
        );
      }
    }

    /*
      Capture Pencil telemetry for the interaction
      layer without tying geometry logic to a
      particular Apple Pencil generation.
    */
    if (
      sketchPointerRef.current
    ) {
      sketchPointerRef
        .current
        .telemetry =
        pointerTelemetry(event);

      sketchPointerRef
        .current
        .predictedSamples =
        predictedPointerEvents(
          event
        ).length;
    }

    if (
      strokePoints.length
    ) {
      actions
        .updateSmartStrokeBatch(
          strokePoints
        );

      return;
    }

    if (latestRaw) {
      actions.setHoverPoint(
        snapSketchPoint(
          latestRaw,
          state
        )
      );
    }
  }

  function handleSketchPointerDown(event) {
    if (isTouchPointer(event)) return;
    event.stopPropagation();

    /*
      Camera state becomes immutable while the
      direct-modeling pointer owns the gesture.
    */
    cameraRigRef.current
      ?.cancel?.();

    sketchPointerRef.current =
      createPointerSession(
        event,
        {
          role:
            "sketch",
        }
      );

    if (
      controlsRef.current
    ) {
      controlsRef.current
        .enabled = false;
    }
    event.target?.setPointerCapture?.(event.pointerId);
    if (state.activeTool === "select") {
      actions.clearSketchEntitySelection();
      return;
    }
    const raw = planeRaycast(event, state.activePlane);
    if (!raw) return;
    if (state.activeTool === "smart") {
      smartStrokeRef.current = true;
      actions.beginSmartStroke(raw);
      return;
    }
    actions.placeSketchPoint(snapSketchPoint(raw, state));
  }

  function handleSketchPointerUp(event) {
    if (isTouchPointer(event)) return;
    if (
      sketchPointerRef.current?.pointerId != null &&
      sketchPointerRef.current.pointerId !== event.pointerId
    ) return;
    event.stopPropagation();
    event.target?.releasePointerCapture?.(event.pointerId);
    sketchPointerRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (smartStrokeRef.current) {
      smartStrokeRef.current = false;
      actions.finishSmartStroke();
    }
  }

  function beginProfilePull(event, profileOverride = null, source = "gizmo") {
    const profile = profileOverride || selectedProfile;
    const origin = profile
      ? worldFromLocalMM(
          state.activePlane,
          polygonCentroid(profile.points).x,
          polygonCentroid(profile.points).y,
          0.06
        )
      : profilePullOrigin;
    if (!profile || !origin) return;

    cameraRigRef.current
      ?.cancel?.();

    if (
      controlsRef.current
    ) {
      controlsRef.current
        .enabled = false;
    }
    event.target?.setPointerCapture?.(event.pointerId);

    const axis = state.activePlane.normal.clone().normalize();
    const start = axisDragFrom(event, origin, axis) ?? 0;
    pullRef.current = {
      type: "profile",
      source,
      pointerId: event.pointerId,
      origin: origin.clone(),
      axis,
      start,
    };
    pendingPullValueRef.current = null;
    actions.beginProfilePull(profile.id);
  }

  function beginFacePull(event, faceOverride = null, source = "gizmo") {
    const face = faceOverride || state.selectedFace;
    const pullData = faceOverride ? facePullDataFor(state.draft, faceOverride) : facePull;
    if (!face || !pullData) return;

    cameraRigRef.current
      ?.cancel?.();

    if (
      controlsRef.current
    ) {
      controlsRef.current
        .enabled = false;
    }
    event.target?.setPointerCapture?.(event.pointerId);

    const start = axisDragFrom(event, pullData.origin, pullData.axis) ?? 0;
    pullRef.current = {
      type: "face",
      source,
      pointerId: event.pointerId,
      origin: pullData.origin.clone(),
      axis: pullData.axis.clone(),
      start,
    };
    pendingPullValueRef.current = null;
    actions.beginFacePull(face);
  }

  function movePull(event) {
    if (!pullRef.current) return;
    if (
      pullRef.current.pointerId != null &&
      event.pointerId != null &&
      pullRef.current.pointerId !== event.pointerId
    ) return;
    const current = axisDragFrom(
      event,
      pullRef.current.origin,
      pullRef.current.axis
    );
    if (current == null) return;
    const value = quantizeDragMM(current - pullRef.current.start, event);
    pendingPullValueRef.current = value;
    if (pullFrameRef.current != null) return;
    pullFrameRef.current = requestAnimationFrame(() => {
      pullFrameRef.current = null;
      if (pendingPullValueRef.current == null) return;
      const nextValue = pendingPullValueRef.current;
      pendingPullValueRef.current = null;
      actions.updatePull(nextValue);
    });
  }

  function endPull(event = null) {
    if (!pullRef.current) {
      return;
    }

    if (
      event?.pointerId != null &&
      pullRef.current
        .pointerId != null &&
      pullRef.current
        .pointerId !==
        event.pointerId
    ) {
      return;
    }


    const type =
      pullRef.current.type;

    let finalPullValue =
      null;


    if (
      pullFrameRef.current != null
    ) {
      cancelAnimationFrame(
        pullFrameRef.current
      );

      pullFrameRef.current =
        null;
    }


    if (
      pendingPullValueRef
        .current != null
    ) {
      finalPullValue =
        pendingPullValueRef
          .current;

      pendingPullValueRef
        .current = null;

      actions.updatePull(
        finalPullValue
      );
    }


    pullRef.current =
      null;


    if (
      controlsRef.current
    ) {
      controlsRef.current
        .enabled = true;
    }


    if (
      type === "profile"
    ) {
      actions.endProfilePull();
    }


    if (
      type === "face"
    ) {
      /*
        Pass the final Pencil sample directly.
        Do not depend on React having rendered it yet.
      */
      actions.endFacePull(
        finalPullValue
      );
    }
  }

  function classifySolidFace(event) {
    if (!event.face || !state.draft) return null;
    const worldNormal = event.face.normal
      .clone()
      .transformDirection(event.object.matrixWorld)
      .normalize();

    // Feature caps are checked first. This is the V15 topology bridge:
    // a cap created by an add/cut remains tied to the feature that made it,
    // so selecting it can edit that feature's depth directly.
    const features = [...(state.draft.features || [])].reverse();
    for (const feature of features) {
      if (!feature.id || !feature.points?.length) continue;
      const plane = feature.faceType === "side"
        ? sideFacePlane(state.draft.points, feature.faceIndex)
        : TOP_PLANE;
      if (!plane) continue;

      const local = localFromWorldMM(plane, event.point);
      const capOffset = feature.faceType === "top"
        ? state.draft.height + feature.depth
        : feature.depth;
      const normalAlignment = Math.abs(worldNormal.dot(plane.normal));

      if (
        Math.abs(local.z - capOffset) <= 1.1 &&
        normalAlignment > 0.62 &&
        pointInPolygon(local, feature.points)
      ) {
        return {
          topologyId: `face:feature:${feature.id}:cap`,
          type: "feature-cap",
          featureId: feature.id,
          faceType: feature.faceType,
          faceIndex: feature.faceIndex ?? null,
        };
      }
    }

    if (worldNormal.dot(TOP_PLANE.normal) > 0.86) {
      return { topologyId: "face:base:top", type: "cap", index: null };
    }

    let bestIndex = null;
    let bestDot = -Infinity;
    state.draft.points.forEach((_, index) => {
      const outward = edgeOutwardNormal(state.draft.points, index);
      const worldOutward = TOP_PLANE.xAxis
        .clone()
        .multiplyScalar(outward.x)
        .addScaledVector(TOP_PLANE.yAxis, outward.y)
        .normalize();
      const dot = worldOutward.dot(worldNormal);
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = index;
      }
    });

    return bestIndex != null && bestDot > 0.48
      ? { topologyId: `face:base:side:${bestIndex}`, type: "side", index: bestIndex }
      : null;
  }

  function handleSolidPointerMove(event) {
    if (pullRef.current?.source === "surface") {
      movePull(event);
      return;
    }
    if (isTouchPointer(event)) {
      const tap = touchSolidTapRef.current;
      if (tap?.pointerId === event.pointerId && pointerTravelPx(tap, event) > TOUCH_TAP_MAX_PX) {
        tap.moved = true;
      }
      return;
    }
    if (state.mode !== "idle") return;
    const face = classifySolidFace(event);
    const edgeHit = state.multiSelect ? null : pickEdge(event);
    const pointerType = pointerTypeOf(event);
    const preciseEdgeDistance = pointerType === "pen" ? 8 : 6;

    // V27 adaptive priority: face wins across the surface; an edge only
    // preselects when the Pencil/cursor is intentionally very close to it.
    if (edgeHit && edgeHit.hitDistance <= preciseEdgeDistance) {
      actions.setHoverSelection({ edgeKey: edgeHit.key, face: null });
      return;
    }
    actions.setHoverSelection({ edgeKey: null, face });
  }

  function beginEndpointDrag(event, endpointKey) {
    if (!selectedSketchEntity) return;

    cameraRigRef.current
      ?.cancel?.();

    if (
      controlsRef.current
    ) {
      controlsRef.current
        .enabled = false;
    }
    endpointDragRef.current = {
      entityId: selectedSketchEntity.id,
      profileId: selectedSketchEntity.profileId || null,
      endpointKey,
    };
  }

  function moveEndpointDrag(event) {
    if (!endpointDragRef.current) return;
    const raw = planeRaycast(event, state.activePlane);
    if (!raw) return;
    const snapped = snapSketchPoint(raw, state, {
      excludeEntityId: endpointDragRef.current.entityId,
      excludeProfileId: endpointDragRef.current.profileId,
    });
    actions.updateSketchEndpoint(endpointDragRef.current.entityId, endpointDragRef.current.endpointKey, snapped);
  }

  function endEndpointDrag() {
    if (!endpointDragRef.current) return;
    endpointDragRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  }

  function focusFace(face) {
    if (!face || !state.draft || !cameraRigRef.current) return;
    let target = null;
    let normal = TOP_PLANE.normal.clone();

    if (face.type === "cap") {
      const c = polygonCentroid(state.draft.points);
      target = worldFromLocalMM(TOP_PLANE, c.x, c.y, state.draft.height);
    } else if (face.type === "side") {
      const plane = sideFacePlane(state.draft.points, face.index);
      if (plane) {
        const a = state.draft.points[face.index];
        const b = state.draft.points[(face.index + 1) % state.draft.points.length];
        const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
        target = worldFromLocalMM(plane, edgeLength / 2, state.draft.height / 2, 0);
        normal = plane.normal.clone();
      }
    } else if (face.type === "feature-cap" && face.featureId) {
      const feature = featureById(state.draft, face.featureId);
      if (feature) {
        const plane = feature.faceType === "side"
          ? sideFacePlane(state.draft.points, feature.faceIndex)
          : TOP_PLANE;
        if (plane) {
          const c = polygonCentroid(feature.points);
          const offset = feature.faceType === "top"
            ? state.draft.height + feature.depth
            : feature.depth;
          target = worldFromLocalMM(plane, c.x, c.y, offset);
          normal = plane.normal.clone().multiplyScalar(feature.depth >= 0 ? 1 : -1);
        }
      }
    }

    if (!target) return;
    const distance = 2.2;
    const position = target.clone().addScaledVector(normal.normalize(), distance);
    cameraRigRef.current(position, target);
  }

  function handleSolidPointerDown(event) {
    if (state.mode !== "idle") return;

    if (isTouchPointer(event)) {
      const point = pointerClientPoint(event);
      const face = classifySolidFace(event);
      const edgeHit = state.multiSelect ? null : pickEdge(event);
      touchSolidTapRef.current = {
        pointerId: event.pointerId,
        x: point.x,
        y: point.y,
        at: performance.now(),
        moved: false,
        face,
        edgeHit,
      };
      // Do not stop propagation: a finger drag must remain OrbitControls navigation.
      return;
    }

    event.stopPropagation();

    const face = classifySolidFace(event);
    const edgeHit = state.multiSelect ? null : pickEdge(event);
    const pointerType = pointerTypeOf(event);
    const preciseEdgeDistance = pointerType === "pen" ? 8 : 6;

    // Double tap/click a face to look straight at it, matching tablet CAD
    // muscle memory without requiring a separate camera command.
    if (face) {
      const id = topologyFaceId(face);
      const now = performance.now();
      const previous = lastSolidTapRef.current;
      if (previous.id === id && now - previous.at < 330) {
        lastSolidTapRef.current = { id: null, at: 0 };
        actions.selectFace(face);
        focusFace(face);
        return;
      }
      lastSolidTapRef.current = { id, at: now };
    }

    // Profile selection is handled by ProfileRegion before this group.
    // On the solid itself V27 prefers faces, except inside a deliberate
    // narrow edge-intent zone; body selection is available via context tap
    // and the adaptive toolbar.
    if (edgeHit && edgeHit.hitDistance <= preciseEdgeDistance) {
      actions.selectEdge(edgeHit);
      return;
    }
    if (face) {
      if (state.multiSelect) {
        actions.selectFace(face);
      } else {
        // One Pencil/mouse gesture now does both selection and direct face offset.
        // A tap ends at 0 mm and leaves the face selected; a drag immediately edits it.
        beginFacePull(event, face, "surface");
      }
      return;
    }
    if (edgeHit) {
      actions.selectEdge(edgeHit);
      return;
    }
    if (!state.multiSelect) actions.selectBody();
  }

  function handleSolidPointerUp(event) {
    if (isTouchPointer(event)) {
      const tap = touchSolidTapRef.current;
      touchSolidTapRef.current = null;
      if (
        !tap ||
        tap.pointerId !== event.pointerId ||
        tap.moved ||
        pointerTravelPx(tap, event) > TOUCH_TAP_MAX_PX ||
        performance.now() - tap.at > TOUCH_TAP_MAX_MS
      ) return;

      const edgeDistance = tap.edgeHit?.hitDistance ?? Infinity;
      if (!state.multiSelect && tap.edgeHit && edgeDistance <= 10) {
        actions.selectEdge(tap.edgeHit);
        return;
      }
      if (tap.face) {
        const id = topologyFaceId(tap.face);
        const now = performance.now();
        const previous = lastSolidTapRef.current;
        actions.selectFace(tap.face);
        if (previous.id === id && now - previous.at < 360) {
          lastSolidTapRef.current = { id: null, at: 0 };
          focusFace(tap.face);
        } else {
          lastSolidTapRef.current = { id, at: now };
        }
      }
      return;
    }

    if (pullRef.current?.source === "surface") {
      event.stopPropagation();
      event.target?.releasePointerCapture?.(event.pointerId);
      endPull(event);
    }
  }

  function handleSolidPointerCancel(event) {
    if (isTouchPointer(event)) {
      touchSolidTapRef.current = null;
      return;
    }
    if (pullRef.current?.source === "surface") endPull(event);
  }

  function handleSolidContextMenu(event) {
    if (state.mode !== "idle" || isTouchPointer(event)) return;
    event.stopPropagation();
    event.nativeEvent?.preventDefault?.();
    actions.selectBody();
  }

  const sketching = ["sketching", "profile-ready", "pulling-profile"].includes(state.mode);

  return (
    <>
      <CameraRig requestRef={cameraRigRef} controlsRef={controlsRef} />

      <color attach="background" args={["#020b12"]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={2.05}
        color="#e4f2ff"
        castShadow
      />
      <pointLight position={[-4, 2.5, 3]} intensity={0.75} color="#3fa9ff" />
      

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onPointerDown={(event) => {
          if (isTouchPointer(event)) {
            const point = pointerClientPoint(event);
            touchGroundTapRef.current = {
              pointerId: event.pointerId,
              x: point.x,
              y: point.y,
              at: performance.now(),
              moved: false,
            };
            return;
          }
          if (state.mode === "idle") actions.clearSelection();
        }}
        onPointerMove={(event) => {
          if (!isTouchPointer(event)) return;
          const tap = touchGroundTapRef.current;
          if (tap?.pointerId === event.pointerId && pointerTravelPx(tap, event) > TOUCH_TAP_MAX_PX) {
            tap.moved = true;
          }
        }}
        onPointerUp={(event) => {
          if (!isTouchPointer(event)) return;
          const tap = touchGroundTapRef.current;
          touchGroundTapRef.current = null;
          if (
            state.mode === "idle" &&
            tap?.pointerId === event.pointerId &&
            !tap.moved &&
            pointerTravelPx(tap, event) <= TOUCH_TAP_MAX_PX &&
            performance.now() - tap.at <= TOUCH_TAP_MAX_MS
          ) {
            actions.clearSelection();
          }
        }}
        onPointerCancel={() => {
          touchGroundTapRef.current = null;
        }}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Grid
        position={[0, -0.002, 0]}
        args={[12, 12]}
        cellSize={GRID_MM * UNIT}
        cellThickness={0.35}
        cellColor="#203e56"
        sectionSize={10 * UNIT}
        sectionThickness={0.75}
        sectionColor="#2c5c7d"
        fadeDistance={9}
        fadeStrength={1}
        infiniteGrid
      />

      <ConstructionReferences visible={state.showConstructionRefs} />
      <ConstructionPlaneOverlays planes={state.constructionPlanes} selectedId={state.selectedConstructionPlaneId} visible={state.showConstructionRefs} actions={actions} controlsRef={controlsRef} />
      <SweepPathOverlay path={state.sweepPath} selectedIndex={state.selectedSweepPointIndex} actions={actions} controlsRef={controlsRef} />

      {committedGeometries.map((geometry, index) => (
        <GhostSolid key={index} geometry={geometry} />
      ))}

      {draftGeometry && (
        <group
          onPointerDown={handleSolidPointerDown}
          onPointerMove={handleSolidPointerMove}
          onPointerUp={handleSolidPointerUp}
          onPointerCancel={handleSolidPointerCancel}
          onContextMenu={handleSolidContextMenu}
          onPointerOut={() => actions.setHoverSelection({ edgeKey: null, face: null })}
        >
          <CompositeSolid
            geometry={draftGeometry}
            preview={state.mode === "pulling-face" || state.mode === "pulling-profile"}
          />
        </group>
      )}

      {basePullGeometry && <CompositeSolid geometry={basePullGeometry} preview />}

      {state.draft && state.mode === "idle" && (
        <>
          <EdgeTreatmentPreview draft={state.draft} segments={edgeSegments} />
          <EdgeOverlay
            segments={edgeSegments}
            selectedKey={state.selectedEdgeKey}
            hoveredKey={state.hoveredEdgeKey}
            bodySelected={state.selectedBody}
          />
        </>
      )}

      {state.draft && state.mode === "idle" && (!state.selectedFace || state.multiSelect) && state.hoveredFace && !state.hoveredEdgeKey && (
        <FaceHighlight draft={state.draft} face={state.hoveredFace} color="#73c5ff" opacity={0.13} />
      )}

      {state.draft && state.mode === "idle" && state.multiSelect && selectedTopologyFaces.map((face) => (
        <FaceHighlight key={face.topologyId} draft={state.draft} face={face} color="#58b7ff" opacity={0.25} />
      ))}

      {state.draft && state.selectedFace && state.mode !== "sketching" && !state.multiSelect && (
        <FaceHighlight draft={state.draft} face={state.selectedFace} />
      )}

      {sketching && (
        <>
          <SketchPlaneSurface
            plane={state.activePlane}
            onPointerDown={handleSketchPointerDown}
            onPointerMove={handleSketchPointerMove}
            onPointerUp={handleSketchPointerUp}
            onPointerCancel={handleSketchPointerUp}
            onPointerLeave={() => {
              if (!sketchPointerRef.current) actions.setHoverPoint(null);
            }}
          />

          <SketchEntityLines
            plane={state.activePlane}
            entities={state.sketchEntities}
            lineChain={state.lineChain}
            previewPoint={state.activeTool === "line" ? state.hoverPoint : null}
            selectedEntityId={state.selectedSketchEntityId}
            canSelect={state.activeTool === "select" && state.mode === "sketching"}
            onSelect={actions.selectSketchEntity}
          />

          {state.mode === "sketching" && state.activeTool === "select" && selectedSketchEntity && (
            <SketchEndpointHandles
              plane={state.activePlane}
              entity={selectedSketchEntity}
              onPointerDown={beginEndpointDrag}
              onPointerMove={moveEndpointDrag}
              onPointerUp={endEndpointDrag}
            />
          )}

          <ToolPreview plane={state.activePlane} state={state} />
          {state.activeTool === "smart" && (
            <SmartStrokePreview plane={state.activePlane} points={state.smartStrokePoints} kind={state.smartStrokeKind} />
          )}
          <SnapMarker plane={state.activePlane} hoverPoint={state.hoverPoint} />

          {state.sketchProfiles.map((profile) => (
            <ProfileRegion
              key={profile.id}
              plane={state.activePlane}
              profile={profile}
              selected={profile.id === state.activeProfileId}
              selectable={state.activeTool === "select"}
              onSelect={actions.selectProfile}
              onDirectPointerDown={
                state.sketchContext?.kind === "construction"
                  ? null
                  : (event, directProfile) => beginProfilePull(event, directProfile, "profile-surface")
              }
              onDirectPointerMove={movePull}
              onDirectPointerUp={endPull}
            />
          ))}

          {selectedProfile && (
            <ProfileDimensionLabels
              plane={state.activePlane}
              profile={selectedProfile}
              visible={state.mode === "profile-ready" || state.mode === "pulling-profile"}
            />
          )}
        </>
      )}

      {state.mode === "profile-ready" && profilePullOrigin && (
        <PullGizmo
          origin={profilePullOrigin}
          axis={state.activePlane.normal}
          active={false}
          onPointerDown={beginProfilePull}
          onPointerMove={movePull}
          onPointerUp={endPull}
          numericValue={state.numericValue}
          onNumericChange={actions.setNumericValue}
          onNumericApply={actions.applyProfileNumeric}
        />
      )}

      {state.mode === "pulling-profile" && profilePullOrigin && (
        <PullGizmo
          origin={profilePullOrigin}
          axis={state.activePlane.normal}
          active
          onPointerDown={() => {}}
          onPointerMove={movePull}
          onPointerUp={endPull}
          dimensionText={`${state.pendingPull >= 0 ? "+" : ""}${state.pendingPull.toFixed(1)} mm`}
        />
      )}

      {state.mode === "idle" && facePull && state.selectedFace && !state.multiSelect && (
        <PullGizmo
          origin={facePull.origin}
          axis={facePull.axis}
          active={false}
          onPointerDown={beginFacePull}
          onPointerMove={movePull}
          onPointerUp={endPull}
          numericValue={state.numericValue}
          onNumericChange={actions.setNumericValue}
          onNumericApply={actions.applyFaceNumeric}
        />
      )}

      {state.mode === "pulling-face" && facePull && (
        <PullGizmo
          origin={facePull.origin}
          axis={facePull.axis}
          active
          onPointerDown={() => {}}
          onPointerMove={movePull}
          onPointerUp={endPull}
          dimensionText={`${state.pendingPull >= 0 ? "+" : ""}${state.pendingPull.toFixed(1)} mm`}
        />
      )}

      {state.draft && state.mode === "idle" && !state.multiSelect && state.selectedBody && (
        <DraftTransformGizmo draft={state.draft} actions={actions} controlsRef={controlsRef} readout={state.bodyGizmoReadout} />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.75}
        zoomSpeed={0.9}
        panSpeed={0.8}
        screenSpacePanning
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        minDistance={0.55}
        maxDistance={10}
        maxPolarAngle={Math.PI * 0.96}
      />
    </>
  );
}

/* ======================================================================
   View controls
   ====================================================================== */

const VIEW_PRESETS = {
  iso: { azimuth: 45, polar: 55, distance: 3.2 },
  top: { azimuth: 0, polar: 1, distance: 3.2 },
  front: { azimuth: 0, polar: 82, distance: 3.2 },
  right: { azimuth: 90, polar: 82, distance: 3.2 },
};

function ViewCube({ onView, onFit }) {
  return (
    <div className="sketch3d-viewcube">
      <button type="button" onClick={() => onView("iso")}>ISO</button>
      <button type="button" onClick={() => onView("top")}>TOP</button>
      <button type="button" onClick={() => onView("front")}>FRONT</button>
      <button type="button" onClick={() => onView("right")}>RIGHT</button>
      <button type="button" className="sketch3d-viewcube-fit" onClick={onFit}>
        <Maximize2 size={14} />
        FIT
      </button>
    </div>
  );
}

function ToolRail({ state, actions }) {
  const tools = [
    { id: "select", label: "Select", icon: MousePointer2 },
    { id: "smart", label: "Pencil", icon: Pencil },
    { id: "line", label: "Line", icon: Minus },
    { id: "rectangle", label: "Rectangle", icon: Square },
    { id: "circle", label: "Circle", icon: CircleIcon },
  ];

  return (
    <div className="sketch3d-toolrail">
      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={state.activeTool === id ? "is-active" : ""}
          onClick={() => actions.activateTool(id)}
          title={label}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}


function ConstructionReferences({ visible = true }) {
  if (!visible) return null;
  const extent = 180 * UNIT;
  return (
    <group position={[0, 0.0015, 0]}>
      <Line points={[[-extent, 0, 0], [extent, 0, 0]]} color="#d56b6b" lineWidth={1.4} transparent opacity={0.72} />
      <Line points={[[0, 0, -extent], [0, 0, extent]]} color="#6ea7df" lineWidth={1.4} transparent opacity={0.72} />
      <mesh>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color="#f3d36b" />
      </mesh>
    </group>
  );
}

function ConstructionPlaneWidget({ plane, selected, actions, controlsRef }) {
  const axisDragFrom = useAxisDrag();
  const dragRef = useRef(null);
  const ax = THREE.MathUtils.degToRad(Number(plane.angleX || 0));
  const ay = THREE.MathUtils.degToRad(Number(plane.angleY || 0));
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, 0, ay, "XYZ"));
  const origin = worldFromLocalMM(TOP_PLANE, 0, 0, Number(plane.offset || 0));
  const xAxis = TOP_PLANE.xAxis.clone().applyQuaternion(quaternion);
  const yAxis = TOP_PLANE.yAxis.clone().applyQuaternion(quaternion);
  const normal = TOP_PLANE.normal.clone().applyQuaternion(quaternion);
  const displayPlane = makePlane(origin, xAxis, yAxis, normal);

  function beginDrag(event) {
    event.stopPropagation();
    actions.selectConstructionPlane(plane.id);
    if (isTouchPointer(event)) return;
    if (controlsRef.current) controlsRef.current.enabled = false;
    const axis = TOP_PLANE.normal.clone();
    const startT = axisDragFrom(event, origin, axis) ?? 0;
    dragRef.current = { startT, startOffset: Number(plane.offset || 0), origin, axis };
    event.target?.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!dragRef.current) return;
    event.stopPropagation();
    const t = axisDragFrom(event, dragRef.current.origin, dragRef.current.axis);
    if (t == null) return;
    actions.updateConstructionPlane(plane.id, "offset", dragRef.current.startOffset + (t - dragRef.current.startT));
  }

  function endDrag(event) {
    if (!dragRef.current) return;
    event.stopPropagation();
    dragRef.current = null;
    event.target?.releasePointerCapture?.(event.pointerId);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }

  return (
    <group position={origin} quaternion={planeQuaternion(displayPlane)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <planeGeometry args={[3.8, 3.8]} />
        <meshBasicMaterial color={selected ? "#61c8ff" : "#2d8fe0"} transparent opacity={selected ? 0.14 : 0.055} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={[[-1.9, 0.002, 0], [1.9, 0.002, 0]]} color={selected ? "#80d6ff" : "#3f7fa8"} lineWidth={selected ? 2.4 : 1.1} transparent opacity={0.8} />
      <Line points={[[0, 0.002, -1.9], [0, 0.002, 1.9]]} color={selected ? "#80d6ff" : "#3f7fa8"} lineWidth={selected ? 2.4 : 1.1} transparent opacity={0.8} />
      {plane.points?.length >= 3 && (
        <Line points={[...plane.points, plane.points[0]].map(([x, z]) => new THREE.Vector3(x * UNIT, 0.004, z * UNIT))} color="#7be0a0" lineWidth={2.2} />
      )}
      {selected && (
        <Html position={[0, 0.08, 0]} center transform={false} zIndexRange={[24, 0]}>
          <div className="sketch3d-direct-plane-hud" onPointerDown={(event) => event.stopPropagation()}>
            <strong>{Number(plane.offset || 0).toFixed(1)} mm</strong>
            <span>drag plane ↕</span>
            <button type="button" onClick={() => actions.updateConstructionPlane(plane.id, "angleX", Number(plane.angleX || 0) - 5)}>X−</button>
            <button type="button" onClick={() => actions.updateConstructionPlane(plane.id, "angleX", Number(plane.angleX || 0) + 5)}>X+</button>
            <button type="button" onClick={() => actions.updateConstructionPlane(plane.id, "angleY", Number(plane.angleY || 0) - 5)}>Y−</button>
            <button type="button" onClick={() => actions.updateConstructionPlane(plane.id, "angleY", Number(plane.angleY || 0) + 5)}>Y+</button>
            <button type="button" className="is-primary" onClick={() => actions.sketchOnConstructionPlane(plane.id)}>Sketch</button>
          </div>
        </Html>
      )}
    </group>
  );
}

function ConstructionPlaneOverlays({ planes = [], selectedId = null, visible = true, actions, controlsRef }) {
  if (!visible) return null;
  return <>{planes.map((plane) => <ConstructionPlaneWidget key={plane.id} plane={plane} selected={plane.id === selectedId} actions={actions} controlsRef={controlsRef} />)}</>;
}

function SweepPathPoint({ nativePoint, index, selected, actions, controlsRef }) {
  const groundPick = useGroundRaycast();
  const dragRef = useRef(false);
  const [x, profileY, extrusionZ] = nativePoint;
  const world = new THREE.Vector3(Number(x) * UNIT, Number(extrusionZ || 0) * UNIT, Number(profileY) * UNIT);
  const dragPlane = makePlane(new THREE.Vector3(0, Number(extrusionZ || 0) * UNIT, 0), TOP_PLANE.xAxis, TOP_PLANE.yAxis, TOP_PLANE.normal);

  function begin(event) {
    event.stopPropagation();
    actions.selectSweepPathPoint(index);
    dragRef.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false;
    event.target?.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    if (!dragRef.current) return;
    event.stopPropagation();
    const local = groundPick(event, dragPlane);
    if (!local) return;
    actions.updateSweepPathPoint(index, [local.x, local.y, Number(extrusionZ || 0)]);
  }

  function end(event) {
    if (!dragRef.current) return;
    dragRef.current = false;
    event.stopPropagation();
    event.target?.releasePointerCapture?.(event.pointerId);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }

  return (
    <group position={world}>
      <mesh onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <sphereGeometry args={[selected ? 0.04 : 0.029, 18, 18]} />
        <meshBasicMaterial color={selected ? "#ffffff" : index === 0 ? "#7be0a0" : "#ffd35c"} />
      </mesh>
      {selected && (
        <Html position={[0, 0.09, 0]} center transform={false} zIndexRange={[24, 0]}>
          <div className="sketch3d-direct-path-hud" onPointerDown={(event) => event.stopPropagation()}>
            <strong>P{index + 1}</strong>
            <span>{Number(x).toFixed(1)}, {Number(profileY).toFixed(1)}, {Number(extrusionZ || 0).toFixed(1)} mm</span>
            <button type="button" onClick={() => actions.nudgeSweepPathPoint(index, "z", -1)}>Z−</button>
            <button type="button" onClick={() => actions.nudgeSweepPathPoint(index, "z", 1)}>Z+</button>
          </div>
        </Html>
      )}
    </group>
  );
}

function SweepPathOverlay({ path = [], selectedIndex = null, actions, controlsRef }) {
  if (!Array.isArray(path) || path.length < 1) return null;
  const points = path.map(([x, z, y]) => new THREE.Vector3(Number(x) * UNIT, Number(y || 0) * UNIT, Number(z) * UNIT));
  return (
    <>
      {points.length >= 2 && <Line points={points} color="#ffd35c" lineWidth={3} />}
      {path.map((point, index) => <SweepPathPoint key={`sweep-path-${index}`} nativePoint={point} index={index} selected={selectedIndex === index} actions={actions} controlsRef={controlsRef} />)}
    </>
  );
}

function DraftTransformGizmo({ draft, actions, controlsRef, readout }) {
  const axisDragFrom = useAxisDrag();
  const planeRaycast = usePlaneRaycast();
  const dragRef = useRef(null);

  if (!draft) return null;

  const origin = draftCenterWorld(draft).clone();
  const xAxis = TOP_PLANE.xAxis.clone().normalize();
  const yAxis = TOP_PLANE.yAxis.clone().normalize();
  const upAxis = TOP_PLANE.normal.clone().normalize();
  const xTip = origin.clone().addScaledVector(xAxis, 0.72);
  const yTip = origin.clone().addScaledVector(yAxis, 0.72);
  const rotatePlane = makePlane(origin, xAxis, yAxis, upAxis);

  const beginAxis = (event, kind, axis) => {
    event.stopPropagation();
    event.target?.setPointerCapture?.(event.pointerId);
    if (controlsRef.current) controlsRef.current.enabled = false;
    const start = axisDragFrom(event, origin, axis) ?? 0;
    dragRef.current = { kind, axis: axis.clone(), start };
    actions.beginBodyTransform(kind);
  };

  const beginRotate = (event) => {
    event.stopPropagation();
    event.target?.setPointerCapture?.(event.pointerId);
    if (controlsRef.current) controlsRef.current.enabled = false;
    const point = planeRaycast(event, rotatePlane);
    if (!point) return;
    const startAngle = Math.atan2(point.y, point.x);
    dragRef.current = { kind: "rotate", startAngle };
    actions.beginBodyTransform("rotate");
  };

  const move = (event) => {
    if (!dragRef.current) return;
    event.stopPropagation();
    if (dragRef.current.kind === "rotate") {
      const point = planeRaycast(event, rotatePlane);
      if (!point) return;
      const angle = Math.atan2(point.y, point.x);
      let delta = THREE.MathUtils.radToDeg(angle - dragRef.current.startAngle);
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      actions.updateBodyTransform("rotate", delta);
      return;
    }
    const current = axisDragFrom(event, origin, dragRef.current.axis);
    if (current == null) return;
    actions.updateBodyTransform(dragRef.current.kind, current - dragRef.current.start);
  };

  const end = (event) => {
    if (!dragRef.current) return;
    event?.stopPropagation?.();
    event?.target?.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
    actions.endBodyTransform();
  };

  const axisQuaternion = (axis) =>
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);

  return (
    <group>
      <group position={origin} quaternion={axisQuaternion(xAxis)}>
        <Line points={[[0, 0, 0], [0, 0.72, 0]]} color="#ff6767" lineWidth={4} />
        <mesh
          position={[0, 0.36, 0]}
          onPointerDown={(event) => beginAxis(event, "x", xAxis)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <cylinderGeometry args={[0.075, 0.075, 0.72, 16]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
        <mesh
          position={[0, 0.76, 0]}
          onPointerDown={(event) => beginAxis(event, "x", xAxis)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <coneGeometry args={[0.09, 0.2, 18]} />
          <meshBasicMaterial color="#ff6767" />
        </mesh>
      </group>

      <group position={origin} quaternion={axisQuaternion(yAxis)}>
        <Line points={[[0, 0, 0], [0, 0.72, 0]]} color="#6bd88a" lineWidth={4} />
        <mesh
          position={[0, 0.36, 0]}
          onPointerDown={(event) => beginAxis(event, "y", yAxis)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <cylinderGeometry args={[0.075, 0.075, 0.72, 16]} />
          <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
        </mesh>
        <mesh
          position={[0, 0.76, 0]}
          onPointerDown={(event) => beginAxis(event, "y", yAxis)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <coneGeometry args={[0.09, 0.2, 18]} />
          <meshBasicMaterial color="#6bd88a" />
        </mesh>
      </group>

      <mesh
        position={origin}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={beginRotate}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <torusGeometry args={[0.58, 0.025, 12, 72]} />
        <meshBasicMaterial color="#63a9ff" transparent opacity={0.88} depthTest={false} />
      </mesh>
      <mesh
        position={origin}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={beginRotate}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <torusGeometry args={[0.58, 0.085, 10, 64]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      <mesh position={origin}>
        <sphereGeometry args={[0.075, 18, 18]} />
        <meshBasicMaterial color="#f2f7fb" />
      </mesh>

      <Html position={xTip} center distanceFactor={6} zIndexRange={[30, 0]}>
        <ExactGizmoInput label={readout?.kind === "x" ? `X ${Number(readout.value || 0).toFixed(1)}mm` : "X"} suffix="mm" onApply={(value) => actions.applyBodyTransformExact("x", value)} />
      </Html>
      <Html position={yTip} center distanceFactor={6} zIndexRange={[30, 0]}>
        <ExactGizmoInput label={readout?.kind === "y" ? `Y ${Number(readout.value || 0).toFixed(1)}mm` : "Y"} suffix="mm" onApply={(value) => actions.applyBodyTransformExact("y", value)} />
      </Html>
      <Html position={origin.clone().add(new THREE.Vector3(0, 0.26, 0))} center distanceFactor={6} zIndexRange={[30, 0]}>
        <ExactGizmoInput
          label={readout?.kind === "rotate" ? `R ${Number(readout.value || 0).toFixed(1)}°` : "R"}
          suffix="°"
          onApply={(value) => actions.applyBodyTransformExact("rotate", value)}
        />
      </Html>
    </group>
  );
}

function ExactGizmoInput({ label, suffix, onApply }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("0");

  const apply = () => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) onApply(numeric);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="sketch3d-gizmo-tag"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setValue("0");
          setEditing(true);
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <label className="sketch3d-gizmo-input" onPointerDown={(event) => event.stopPropagation()}>
      <input
        autoFocus
        type="number"
        step="0.5"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") apply();
          if (event.key === "Escape") setEditing(false);
        }}
        onBlur={apply}
      />
      <span>{suffix}</span>
    </label>
  );
}

function AdvancedModelPanel({ state, actions, kernelInfo }) {
  if (!state.draft || state.mode !== "idle" || !state.showAdvancedPanel) return null;
  return (
    <div className="sketch3d-advanced-panel">
      <div className="sketch3d-advanced-title">
        <span>Model</span>
        <em>V27 · {kernelInfo?.connected ? "BRep" : "Mesh"}</em>
      </div>
      <div className="sketch3d-advanced-actions">
        <button
          type="button"
          className={state.multiSelect ? "is-active" : ""}
          onClick={actions.toggleMultiSelect}
        >
          Multi-face
        </button>
        <button
          type="button"
          className={state.showConstructionRefs ? "is-active" : ""}
          onClick={actions.toggleConstructionRefs}
        >
          Axes
        </button>
        <button
          type="button"
          className={kernelInfo?.capabilities?.shell ? "is-kernel-ready" : "is-kernel-locked"}
          onClick={() => actions.requestKernelTool("shell")}
        >
          Shell{kernelInfo?.capabilities?.shell ? "" : "*"}
        </button>
        <button
          type="button"
          className={kernelInfo?.capabilities?.revolve ? "is-kernel-ready" : "is-kernel-locked"}
          onClick={() => actions.requestKernelTool("revolve")}
        >
          Revolve{kernelInfo?.capabilities?.revolve ? "" : "*"}
        </button>
        <button
          type="button"
          className={kernelInfo?.capabilities?.sweep ? "is-kernel-ready" : "is-kernel-locked"}
          onClick={() => actions.requestKernelTool("sweep")}
          title="V26 native Sweep · editable line/curve path"
        >
          Sweep{kernelInfo?.capabilities?.sweep ? "" : "*"}
        </button>
        <button
          type="button"
          className={kernelInfo?.capabilities?.loft ? "is-kernel-ready" : "is-kernel-locked"}
          onClick={() => actions.requestKernelTool("loft")}
          title="V26 native Loft · ordered advanced construction-plane sections"
        >
          Loft{kernelInfo?.capabilities?.loft ? "" : "*"}
        </button>
      </div>
      <div className="sketch3d-native-tool-grid">
        <label>
          <span>Shell</span>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={state.shellThickness}
            onChange={(event) => actions.setNativeToolValue("shellThickness", event.target.value)}
          />
          <em>mm</em>
        </label>
        <label>
          <span>Revolve</span>
          <input
            type="number"
            min="1"
            max="360"
            step="5"
            value={state.revolveAngle}
            onChange={(event) => actions.setNativeToolValue("revolveAngle", event.target.value)}
          />
          <em>°</em>
        </label>
        <div className="sketch3d-axis-toggle" role="group" aria-label="Revolve axis">
          <button type="button" className={state.revolveAxis === "x" ? "is-active" : ""} onClick={() => actions.setNativeToolValue("revolveAxis", "x")}>X axis</button>
          <button type="button" className={state.revolveAxis === "y" ? "is-active" : ""} onClick={() => actions.setNativeToolValue("revolveAxis", "y")}>Y axis</button>
        </div>
        <label>
          <span>Sweep</span>
          <input type="number" min="1" step="1" value={state.sweepLength} onChange={(event) => actions.setNativeToolValue("sweepLength", event.target.value)} />
          <em>mm</em>
        </label>
        <label>
          <span>Loft Z</span>
          <input type="number" min="1" step="1" value={state.loftOffset} onChange={(event) => actions.setNativeToolValue("loftOffset", event.target.value)} />
          <em>mm</em>
        </label>
        <label>
          <span>Loft scale</span>
          <input type="number" min="0.05" step="0.05" value={state.loftScale} onChange={(event) => actions.setNativeToolValue("loftScale", event.target.value)} />
          <em>×</em>
        </label>
      </div>

      <div className="sketch3d-v24-builder">
        <div className="sketch3d-v24-section">
          <div className="sketch3d-v24-head"><span>Construction planes</span><button type="button" onClick={actions.addConstructionPlane}>+ Plane</button></div>
          {(state.constructionPlanes || []).length === 0 && <small>No offset planes yet · add one for multi-section Loft.</small>}
          {(state.constructionPlanes || []).map((plane, index) => (
            <div className={`sketch3d-v24-plane-row ${state.selectedConstructionPlaneId === plane.id ? "is-selected" : ""}`} key={plane.id}>
              <button type="button" className="sketch3d-v24-plane-name" onClick={() => actions.selectConstructionPlane(plane.id)}>P{index + 1}</button>
              <input title="Offset" type="number" step="1" value={plane.offset} onChange={(event) => actions.updateConstructionPlane(plane.id, "offset", event.target.value)} />
              <em>mm</em>
              <input title="Tilt X" type="number" step="5" value={plane.angleX || 0} onChange={(event) => actions.updateConstructionPlane(plane.id, "angleX", event.target.value)} />
              <input title="Tilt Y" type="number" step="5" value={plane.angleY || 0} onChange={(event) => actions.updateConstructionPlane(plane.id, "angleY", event.target.value)} />
              <button type="button" title="Move section earlier" onClick={() => actions.reorderConstructionPlane(plane.id, -1)}>↑</button>
              <button type="button" title="Move section later" onClick={() => actions.reorderConstructionPlane(plane.id, 1)}>↓</button>
              <button type="button" onClick={() => actions.sketchOnConstructionPlane(plane.id)}>Sketch</button>
              <span className={plane.points?.length >= 3 ? "is-ready" : ""}>{plane.points?.length >= 3 ? "Profile ✓" : "Empty"}</span>
              <button type="button" className="is-danger" onClick={() => actions.removeConstructionPlane(plane.id)}>×</button>
            </div>
          ))}
        </div>

        <div className="sketch3d-v24-section">
          <div className="sketch3d-v24-head"><span>Sweep path</span><button type="button" onClick={actions.resetSweepPath}>Reset</button></div>
          <div className="sketch3d-v24-path-actions">
            <label><span>Step</span><input type="number" min="1" step="1" value={state.sweepPathStep} onChange={(event) => actions.setNativeToolValue("sweepPathStep", event.target.value)} /><em>mm</em></label>
            <button type="button" className={state.sweepCurveMode ? "is-active" : ""} onClick={() => actions.setNativeToolValue("sweepCurveMode", !state.sweepCurveMode)}>Curve</button>
            <label><span>Bow</span><input type="number" step="1" value={state.sweepCurveOffset} onChange={(event) => actions.setNativeToolValue("sweepCurveOffset", event.target.value)} /><em>mm</em></label>
            <button type="button" onClick={() => actions.extendSweepPath("x", 1)}>+X</button>
            <button type="button" onClick={() => actions.extendSweepPath("x", -1)}>−X</button>
            <button type="button" onClick={() => actions.extendSweepPath("y", 1)}>+Y</button>
            <button type="button" onClick={() => actions.extendSweepPath("y", -1)}>−Y</button>
            <button type="button" onClick={() => actions.extendSweepPath("z", 1)}>+Z</button>
            <button type="button" onClick={() => actions.extendSweepPath("z", -1)}>−Z</button>
          </div>
          <small>{(state.sweepPath || []).length >= 2 ? `${state.sweepPath.length} sampled path points · ${state.sweepCurveMode ? "curved" : "linear"} Sweep ready` : "Add path segments, then press Sweep."}</small>
        </div>
      </div>

      <div className="sketch3d-transform-grid">
        <label><span>X</span><input type="number" step="1" value={state.transformDraft.moveX} onChange={(event) => actions.setTransformDraft("moveX", event.target.value)} /><em>mm</em></label>
        <label><span>Y</span><input type="number" step="1" value={state.transformDraft.moveY} onChange={(event) => actions.setTransformDraft("moveY", event.target.value)} /><em>mm</em></label>
        <label><span>R</span><input type="number" step="5" value={state.transformDraft.rotateDegrees} onChange={(event) => actions.setTransformDraft("rotateDegrees", event.target.value)} /><em>°</em></label>
        <label><span>S</span><input type="number" min="0.01" step="0.05" value={state.transformDraft.scale} onChange={(event) => actions.setTransformDraft("scale", event.target.value)} /><em>×</em></label>
      </div>
      <div className="sketch3d-transform-buttons">
        <button type="button" onClick={actions.resetTransformDraft}>Reset</button>
        <button type="button" className="sketch3d-primary" onClick={actions.applyDraftTransform}>Apply transform</button>
      </div>
      <small>
        {kernelInfo?.connected
          ? `${kernelInfo.name} connected · advanced commands use the CAD-kernel runtime`
          : "* Waiting for BRep/WASM backend · safe mesh fallback stays active"}
      </small>
    </div>
  );
}

function FeatureHistory({ draft, actions, selectedFeatureId = null, kernelInfo = null }) {
  if (!draft) return null;
  const features = draft.features || [];
  const edgeTreatments = draft.edgeTreatments || [];

  return (
    <div className="sketch3d-history">
      <div className="sketch3d-history-title">
        <span>History</span>
        <em>{kernelInfo?.name || MeshPreviewKernel.name} · {cadKernelRuntime.topology(draft).length} faces</em>
      </div>
      <div className="sketch3d-history-row is-base">
        <span>Base Extrude</span>
        <em>{draft.height.toFixed(1)} mm</em>
      </div>
      {features.map((feature, index) => (
        <div
          className={`sketch3d-history-row ${selectedFeatureId === feature.id ? "is-selected" : ""}`}
          key={feature.id || `feature-${index}`}
          role="button"
          tabIndex={0}
          onClick={() => actions.selectFeatureFromHistory(feature.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              actions.selectFeatureFromHistory(feature.id);
            }
          }}
        >
          <span>{featureLabel(feature, index)}</span>
          <label className="sketch3d-history-depth" onClick={(event) => event.stopPropagation()}>
            <input
              key={`${feature.id}-${feature.depth}`}
              type="number"
              step="0.5"
              defaultValue={Number(
                feature.hostFeatureId && feature.relativeDepth != null
                  ? feature.relativeDepth
                  : feature.depth || 0
              ).toFixed(1)}
              aria-label="Feature depth in millimetres"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  actions.setFeatureDepth(feature.id, Number(event.currentTarget.value));
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => actions.setFeatureDepth(feature.id, Number(event.currentTarget.value))}
            />
            <em>mm</em>
          </label>
          <button
            type="button"
            title="Remove feature"
            onClick={(event) => {
              event.stopPropagation();
              actions.removeFeatureById(feature.id);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {edgeTreatments.map((treatment, index) => (
        <div className="sketch3d-history-row" key={treatment.id || `edge-${index}`}>
          <span>{treatment.mode === "fillet" ? "Fillet" : "Chamfer"}</span>
          <label className="sketch3d-history-depth">
            <input
              key={`${treatment.id}-${treatment.amount}`}
              type="number"
              min="0.1"
              step="0.5"
              defaultValue={Number(treatment.amount || 0).toFixed(1)}
              aria-label="Edge treatment amount in millimetres"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  actions.setEdgeTreatmentAmount(treatment.id, Number(event.currentTarget.value));
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => actions.setEdgeTreatmentAmount(treatment.id, Number(event.currentTarget.value))}
            />
            <em>mm</em>
          </label>
          <button
            type="button"
            title="Remove edge treatment"
            onClick={() => actions.removeEdgeTreatmentById(treatment.id)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {(draft.nativeOperations || []).map((operation, index) => (
        <div className="sketch3d-history-row is-native" key={operation.id || `native-${operation.type}-${index}`}>
          <span>{operation.type === "shell" ? "Shell" : operation.type === "revolve" ? "Revolve" : operation.type === "sweep" ? "Sweep" : operation.type === "loft" ? "Loft" : operation.type}</span>
          <em>
            {operation.type === "shell"
              ? `${Number(operation.thickness || 0).toFixed(1)} mm`
              : operation.type === "revolve"
                ? `${Number(operation.angleDegrees || 360).toFixed(0)}° · ${(operation.axis || "x").toUpperCase()}`
                : operation.type === "sweep"
                  ? `${Math.abs(Number(operation.path?.[operation.path.length - 1]?.[2] || 0) - Number(operation.path?.[0]?.[2] || 0)).toFixed(1)} mm path`
                  : operation.type === "loft"
                    ? `${operation.sections?.length || 0} sections · ${Number(operation.sections?.[operation.sections.length - 1]?.offset || 0).toFixed(1)} mm`
                    : "Native"}
          </em>
          <button type="button" title="Remove native operation" onClick={() => actions.removeNativeOperation(operation.id || operation.type)}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ======================================================================
   Context UI
   ====================================================================== */

function NumericPull({ value, onChange, onApply, signed = false, suffix = "mm" }) {
  return (
    <div className="sketch3d-numeric-pull">
      <input
        type="number"
        step="0.5"
        min={signed ? undefined : 0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply();
        }}
      />
      <span>{suffix}</span>
      <button type="button" className="sketch3d-primary" onClick={onApply}>
        Apply
      </button>
    </div>
  );
}

function ProfileDimensionEditor({ state, actions }) {
  const profile = state.sketchProfiles.find((item) => item.id === state.activeProfileId);
  if (!profile) return null;

  if (profile.type === "circle") {
    return (
      <div className="sketch3d-profile-dimensions">
        <label>
          <span>Ø</span>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={state.dimensionDraft.diameter}
            onChange={(event) => actions.setProfileDimension("diameter", event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && actions.applyProfileDimensions()}
          />
          <em>mm</em>
        </label>
        <button type="button" onClick={actions.applyProfileDimensions}>Size</button>
      </div>
    );
  }

  return (
    <div className="sketch3d-profile-dimensions">
      <label>
        <span>W</span>
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={state.dimensionDraft.width}
          onChange={(event) => actions.setProfileDimension("width", event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && actions.applyProfileDimensions()}
        />
        <em>mm</em>
      </label>
      <label>
        <span>H</span>
        <input
          type="number"
          min="0.1"
          step="0.5"
          value={state.dimensionDraft.height}
          onChange={(event) => actions.setProfileDimension("height", event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && actions.applyProfileDimensions()}
        />
        <em>mm</em>
      </label>
      <button type="button" onClick={actions.applyProfileDimensions}>Size</button>
    </div>
  );
}

function ContextToolbar({ state, actions, objectCount, maxObjects }) {
  const atLimit = objectCount >= maxObjects;

  if (state.mode === "sketching" && state.selectedSketchEntityId) {
    const entity = state.sketchEntities.find((item) => item.id === state.selectedSketchEntityId);
    if (entity?.type === "line") {
      return (
        <div className="sketch3d-context-bar sketch3d-context-bar-line">
          <span>Line selected · set an exact length or constrain it</span>
          <NumericPull
            value={state.numericValue}
            onChange={actions.setNumericValue}
            onApply={actions.applyLineNumeric}
            suffix="mm"
          />
          <button
            type="button"
            className={entity.constraint === "horizontal" ? "is-active-constraint" : ""}
            onClick={() => actions.applyLineConstraint("horizontal")}
          >
            H
          </button>
          <button
            type="button"
            className={entity.constraint === "vertical" ? "is-active-constraint" : ""}
            onClick={() => actions.applyLineConstraint("vertical")}
          >
            V
          </button>
          <button type="button" onClick={actions.setConstraintReference}>Ref</button>
          <button type="button" onClick={() => actions.applyRelation("parallel")}>∥</button>
          <button type="button" onClick={() => actions.applyRelation("perpendicular")}>⊥</button>
          <button type="button" onClick={() => actions.applyRelation("equal")}>Equal</button>
          <button type="button" className={entity.fixed ? "is-active-constraint" : ""} onClick={actions.toggleFixSketchEntity}>
            {entity.fixed ? "Unlock" : "Fix"}
          </button>
          <button type="button" onClick={actions.repairSketch}>Repair</button>
          <button type="button" onClick={actions.deleteSketchEntity}>
            <Trash2 size={14} />
          </button>
          <button type="button" onClick={actions.clearSketchEntitySelection}>
            <X size={14} />
          </button>
        </div>
      );
    }
  }

  if (state.mode === "sketching") {
    const constraintStatus = sketchConstraintStatus(state.sketchEntities, state.sketchRelations);
    let instruction = `Draw on the plane · ${constraintStatus.label}`;
    if (state.activeTool === "line") {
      instruction = state.lineChain.length
        ? "Continue the line · snap back to the first point to close"
        : "Tap to start a line";
    }
    if (state.activeTool === "rectangle") {
      instruction = state.toolStart
        ? "Tap the opposite corner"
        : "Tap the first rectangle corner";
    }
    if (state.activeTool === "circle") {
      instruction = state.toolStart
        ? "Tap to set the radius"
        : "Tap the circle center";
    }

    return (
      <div className="sketch3d-context-bar">
        <span>{instruction}</span>
        {(state.toolStart || state.lineChain.length > 0) && (
          <button type="button" onClick={actions.undoSketchStep}>
            <Undo2 size={14} /> Back
          </button>
        )}
        <button type="button" onClick={actions.cancelSketch}>
          <X size={14} /> Cancel
        </button>
      </div>
    );
  }

  if (state.mode === "profile-ready") {
    const feature = state.sketchContext?.kind === "feature";
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-profile">
        <span>
          {feature
            ? state.sketchContext?.hostFeatureId
              ? Number(state.sketchContext.hostDepth || 0) >= 0
                ? "Stacked profile · pull outward to add on this boss"
                : "Stacked profile · push inward to deepen this pocket"
              : "Profile selected · drag the profile or arrow outward to add or inward to cut"
            : "Profile selected · drag the profile or arrow to create the solid"}
        </span>
        <ProfileDimensionEditor state={state} actions={actions} />
        <NumericPull
          value={state.numericValue}
          onChange={actions.setNumericValue}
          onApply={actions.applyProfileNumeric}
          signed={feature}
        />
        <button type="button" onClick={actions.backToSketch}>
          Back
        </button>
      </div>
    );
  }

  if (state.mode === "pulling-profile") {
    const feature = state.sketchContext?.kind === "feature";
    return (
      <div className="sketch3d-context-bar">
        <span>
          {feature
            ? `${state.pendingPull >= 0 ? "Add" : "Cut"} · ${Math.abs(state.pendingPull).toFixed(1)} mm`
            : `${Math.max(0, state.pendingPull).toFixed(1)} mm`}
        </span>
      </div>
    );
  }

  if (state.mode === "pulling-face") {
    return (
      <div className="sketch3d-context-bar">
        <span>
          Offset face · {state.pendingPull >= 0 ? "+" : ""}
          {state.pendingPull.toFixed(1)} mm
        </span>
      </div>
    );
  }

  if (state.mode === "idle" && state.multiSelect) {
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-profile">
        <span>
          {state.selectedFaceIds.length
            ? `${state.selectedFaceIds.length} faces selected · Shell will remove selected cap face(s)`
            : "Multi-face selection · tap faces to add or remove them"}
        </span>
        {state.selectedFaceIds.length > 0 && (
          <button type="button" onClick={() => actions.requestKernelTool("shell")}>Shell {Number(state.shellThickness || 2).toFixed(1)} mm</button>
        )}
        <button type="button" onClick={actions.finishMultiSelect}>Done</button>
      </div>
    );
  }

  if (state.mode === "idle" && state.selectedBody) {
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-profile">
        <span>Body selected · drag the red/green arrows to move or the blue ring to rotate</span>
        <button type="button" onClick={actions.toggleAdvancedPanel}>
          {state.showAdvancedPanel ? "Hide tools" : "More tools"}
        </button>
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.selectedEdgeKey) {
    const featureEdge = state.selectedEdgeMeta?.editable === false;
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-edge">
        <span>
          {featureEdge
            ? "Feature edge selected · persistent topology is active; BRep fillet comes next"
            : "Base edge selected"}
        </span>
        {!featureEdge && (
          <>
            <div className="sketch3d-amount-stepper">
              <button type="button" onClick={() => actions.setEdgeAmount(-0.5)}>−</button>
              <span>{state.edgeAmount.toFixed(1)} mm</span>
              <button type="button" onClick={() => actions.setEdgeAmount(0.5)}>+</button>
            </div>
            <button type="button" onClick={() => actions.applyEdgeTreatment("fillet")}>
              Fillet
            </button>
            <button type="button" onClick={() => actions.applyEdgeTreatment("chamfer")}>
              Chamfer
            </button>
          </>
        )}
        <button type="button" onClick={actions.selectBody}>Body</button>
        <button type="button" onClick={actions.toggleAdvancedPanel}>More tools</button>
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.selectedFace) {
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-profile">
        <span>
          {state.selectedFace.type === "feature-cap"
            ? "Feature face selected · drag the face or arrow to edit depth, or choose a sketch tool"
            : "Face selected · drag the face or arrow to offset, or choose a sketch tool"}
        </span>
        <NumericPull
          value={state.numericValue}
          onChange={actions.setNumericValue}
          onApply={actions.applyFaceNumeric}
          signed
        />
        <button type="button" onClick={actions.selectBody}>Body</button>
        <button type="button" onClick={actions.toggleAdvancedPanel}>More tools</button>
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.draft) {
    return (
      <div className="sketch3d-context-bar">
        <span>Tap a face to select · Pencil-drag the face to offset · finger-drag empty space to orbit · double-tap a face to look straight at it</span>
        <button type="button" onClick={actions.selectBody}>Body</button>
        <button type="button" onClick={actions.toggleAdvancedPanel}>
          {state.showAdvancedPanel ? "Hide tools" : "More tools"}
        </button>
      </div>
    );
  }

  return (
    <div className="sketch3d-context-bar">
      <span>
        {atLimit
          ? "Object limit reached"
          : "Choose Pencil, Line, Rectangle or Circle to begin a sketch"}
      </span>
    </div>
  );
}

/* ======================================================================
   State
   ====================================================================== */

function freshState() {
  return {
    mode: "idle", // idle | sketching | profile-ready | pulling-profile | pulling-face
    activeTool: "select",
    activePlane: TOP_PLANE,
    sketchContext: null, // { kind: "base" } or { kind:"feature", faceType, faceIndex }
    sketchEntities: [],
    sketchProfiles: [],
    lineChain: [],
    toolStart: null,
    hoverPoint: null,
    smartStrokePoints: [],
    smartStrokeKind: null,
    activeProfileId: null,
    selectedSketchEntityId: null,
    sketchRelations: [],
    constraintReferenceEntityId: null,
    dimensionDraft: { width: "", height: "", diameter: "" },
    pendingPull: 0,
    numericValue: "10",
    draft: null,
    committed: [],
    selectedFace: null,
    selectedEdgeKey: null,
    selectedEdgeMeta: null,
    selectedBody: false,
    showAdvancedPanel: false,
    bodyGizmoReadout: null,
    hoveredFace: null,
    hoveredEdgeKey: null,
    edgeAmount: 2,
    multiSelect: false,
    selectedFaceIds: [],
    showConstructionRefs: true,
    shellThickness: "2.0",
    revolveAngle: "360",
    revolveAxis: "x",
    sweepLength: "40",
    loftOffset: "40",
    loftScale: "0.65",
    constructionPlanes: [],
    selectedConstructionPlaneId: null,
    sweepPath: [],
    sweepPathStep: "20",
    sweepCurveMode: false,
    sweepCurveOffset: "12",
    selectedSweepPointIndex: null,
    loftManualOrder: true,
    transformDraft: { moveX: "0", moveY: "0", rotateDegrees: "0", scale: "1" },
  };
}

/* ======================================================================
   Top-level workspace
   ====================================================================== */

function SketchWorkspace({
  active,
  engineStatus,
  onCreateSolid,
  onCreateNativeSolid,
  onSwitchToStudio,
  objectCount,
  maxObjects,
}) {
  const [state, setState] = useState(freshState);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [kernelInfo, setKernelInfo] = useState(() => cadKernelRuntime.info());
  const [kernelBootStatus, setKernelBootStatus] = useState("idle");

  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const controlsRef = useRef(null);
  const cameraRigRef = useRef(null);
  const bodyTransformRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!active) {
      setState(freshState());
      historyRef.current = [];
      redoRef.current = [];
    }
  }, [active]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => cadKernelRuntime.subscribe(setKernelInfo), []);

  useEffect(() => {
    if (!active || cadKernelRuntime.info().connected || kernelBootStatus === "loading" || kernelBootStatus === "ready") return;
    let cancelled = false;
    setKernelBootStatus("loading");
    initializeBeyondOpenCascade({
      fallbackBuildPreview: (draft) => MeshPreviewKernel.buildPreview(draft),
      fallbackTopology: (draft) => MeshPreviewKernel.topology(draft),
    })
      .then(() => {
        if (!cancelled) {
          setKernelBootStatus("ready");
          setToast("OpenCascade BRep kernel online");
        }
      })
      .catch((error) => {
        console.warn("Beyond OpenCascade initialization failed; mesh fallback remains active:", error);
        if (!cancelled) {
          setKernelBootStatus("fallback");
          setToast("BRep unavailable · mesh fallback active");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, kernelBootStatus]);

  useEffect(() => {
    if (state.mode !== "sketching" || !cameraRigRef.current) return;

    let center = state.activePlane.origin.clone();

    if (state.sketchContext?.kind === "feature" && state.draft) {
      if (state.sketchContext.faceType === "top") {
        const c = polygonCentroid(state.draft.points);
        center = worldFromLocalMM(state.activePlane, c.x, c.y, 0);
      } else if (state.sketchContext.faceType === "side") {
        const i = state.sketchContext.faceIndex;
        const a = state.draft.points[i];
        const b = state.draft.points[(i + 1) % state.draft.points.length];
        const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
        center = worldFromLocalMM(
          state.activePlane,
          edgeLength / 2,
          state.draft.height / 2,
          0
        );
      }
    }

    const position = center
      .clone()
      .addScaledVector(state.activePlane.normal, 3.1);

    cameraRigRef.current(position, center, state.activePlane.yAxis);
  }, [state.mode, state.activePlane, state.sketchContext, state.draft]);

  useEffect(() => {
    function onKeyDown(event) {
      if (!active) return;
      if (event.key === "Escape") {
        if (["sketching", "profile-ready"].includes(state.mode)) {
          setState((s) => ({
            ...s,
            mode: s.draft ? "idle" : "idle",
            activeTool: "select",
            sketchContext: null,
            sketchEntities: [],
            sketchProfiles: [],
            lineChain: [],
            toolStart: null,
            hoverPoint: null,
            activeProfileId: null,
            selectedSketchEntityId: null,
            activePlane: TOP_PLANE,
          }));
        } else {
          setState((s) => ({
            ...s,
            selectedFace: null,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
            selectedFaceIds: [],
            multiSelect: false,
          }));
        }
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "1") actions.activateTool("line");
        if (event.key === "2") actions.activateTool("rectangle");
        if (event.key === "3") actions.activateTool("circle");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, state.mode]);

  function snapshotOf(source) {
    return {
      draft: source.draft,
      committed: source.committed,
    };
  }

  function pushHistory(snapshot) {
    historyRef.current.push(deepClone(snapshot));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }

  const clearSketchFields = (source) => ({
    ...source,
    mode: "idle",
    activeTool: "select",
    activePlane: TOP_PLANE,
    sketchContext: null,
    sketchEntities: [],
    sketchProfiles: [],
    lineChain: [],
    toolStart: null,
    hoverPoint: null,
    smartStrokePoints: [],
    smartStrokeKind: null,
    activeProfileId: null,
    selectedSketchEntityId: null,
    sketchRelations: [],
    constraintReferenceEntityId: null,
    dimensionDraft: { width: "", height: "", diameter: "" },
    pendingPull: 0,
  });

  const actions = useMemo(() => {
    const api = {
      setHoverPoint(point) {
        setState((s) => {
          if (!s.hoverPoint && !point) return s;
          if (
            s.hoverPoint &&
            point &&
            s.hoverPoint.x === point.x &&
            s.hoverPoint.y === point.y &&
            s.hoverPoint.snap === point.snap
          ) return s;
          return { ...s, hoverPoint: point };
        });
      },

      setNumericValue(value) {
        setState((s) => ({ ...s, numericValue: value }));
      },

      setProfileDimension(field, value) {
        setState((s) => ({
          ...s,
          dimensionDraft: { ...s.dimensionDraft, [field]: value },
        }));
      },

      applyProfileDimensions() {
        setState((s) => {
          const profile = s.sketchProfiles.find((item) => item.id === s.activeProfileId);
          if (!profile) return s;
          const resized = resizeProfile(profile, s.dimensionDraft);
          const sketchProfiles = s.sketchProfiles.map((item) =>
            item.id === resized.id ? resized : item
          );
          const sketchEntities = syncProfileEntities(s.sketchEntities, resized);
          return {
            ...s,
            sketchProfiles,
            sketchEntities,
            dimensionDraft: dimensionDraftForProfile(resized),
          };
        });
      },

      selectSketchEntity(entityId) {
        setState((s) => {
          const entity = s.sketchEntities.find((item) => item.id === entityId);
          if (!entity || entity.type !== "line") return s;
          return {
            ...s,
            selectedSketchEntityId: entityId,
            activeProfileId: null,
            activeTool: "select",
            numericValue: lineLength(entity).toFixed(1),
          };
        });
      },

      clearSketchEntitySelection() {
        setState((s) => ({ ...s, selectedSketchEntityId: null }));
      },

      applyLineNumeric() {
        setState((s) => {
          const value = Number(s.numericValue);
          const index = s.sketchEntities.findIndex(
            (item) => item.id === s.selectedSketchEntityId && item.type === "line"
          );
          if (index < 0 || !Number.isFinite(value) || value <= 0) return s;
          const entity = s.sketchEntities[index];
          if (entity.profileId) {
            setToast("For a closed profile, edit Width / Height instead");
            return s;
          }
          let dx = entity.end.x - entity.start.x;
          let dy = entity.end.y - entity.start.y;
          const current = Math.hypot(dx, dy) || 1;
          if (entity.constraint === "horizontal") {
            dx = Math.sign(dx || 1) * value;
            dy = 0;
          } else if (entity.constraint === "vertical") {
            dx = 0;
            dy = Math.sign(dy || 1) * value;
          } else {
            dx = (dx / current) * value;
            dy = (dy / current) * value;
          }
          const nextEntity = {
            ...entity,
            dimensionLength: value,
            end: { x: entity.start.x + dx, y: entity.start.y + dy },
          };
          const sketchEntities = [...s.sketchEntities];
          sketchEntities[index] = nextEntity;
          return { ...s, sketchEntities, numericValue: lineLength(nextEntity).toFixed(1) };
        });
      },

      applyLineConstraint(constraint) {
        setState((s) => {
          const index = s.sketchEntities.findIndex(
            (item) => item.id === s.selectedSketchEntityId && item.type === "line"
          );
          if (index < 0) return s;
          const entity = s.sketchEntities[index];
          if (entity.profileId) {
            setToast("Closed profiles keep their geometric constraints automatically");
            return s;
          }
          const length = lineLength(entity) || 1;
          const dx = entity.end.x - entity.start.x;
          const dy = entity.end.y - entity.start.y;
          const nextEntity = { ...entity, constraint };
          if (constraint === "horizontal") {
            nextEntity.end = {
              x: entity.start.x + Math.sign(dx || 1) * length,
              y: entity.start.y,
            };
          } else {
            nextEntity.end = {
              x: entity.start.x,
              y: entity.start.y + Math.sign(dy || 1) * length,
            };
          }
          const sketchEntities = [...s.sketchEntities];
          sketchEntities[index] = nextEntity;
          return { ...s, sketchEntities, numericValue: lineLength(nextEntity).toFixed(1) };
        });
      },

      setConstraintReference() {
        setState((s) => {
          if (!s.selectedSketchEntityId) return s;
          setToast("Reference line set · select another line");
          return { ...s, constraintReferenceEntityId: s.selectedSketchEntityId };
        });
      },

      applyRelation(type) {
        setState((s) => {
          const a = s.constraintReferenceEntityId;
          const b = s.selectedSketchEntityId;
          if (!a || !b || a === b) {
            setToast("Set a reference line, then select a second line");
            return s;
          }
          const relation = { id: uid("constraint"), type, entityIds: [a, b] };
          const sketchRelations = [
            ...s.sketchRelations.filter((item) => !(item.type === type && item.entityIds?.includes(a) && item.entityIds?.includes(b))),
            relation,
          ];
          const sketchEntities = solveSketchConstraints(s.sketchEntities, sketchRelations);
          setToast(`${type[0].toUpperCase()}${type.slice(1)} constraint added`);
          return { ...s, sketchEntities, sketchRelations, constraintReferenceEntityId: null };
        });
      },

      toggleFixSketchEntity() {
        setState((s) => {
          const id = s.selectedSketchEntityId;
          if (!id) return s;
          const sketchEntities = s.sketchEntities.map((entity) =>
            entity.id === id ? { ...entity, fixed: !entity.fixed } : entity
          );
          const fixed = sketchEntities.find((entity) => entity.id === id)?.fixed;
          setToast(fixed ? "Geometry fixed" : "Geometry unlocked");
          return { ...s, sketchEntities };
        });
      },

      repairSketch() {
        setState((s) => {
          const sketchEntities = solveSketchConstraints(s.sketchEntities, s.sketchRelations, { coincidentTolerance: 1.5 });
          setToast("Sketch endpoints repaired and constraints solved");
          return { ...s, sketchEntities };
        });
      },

      deleteSketchEntity() {
        setState((s) => {
          const entity = s.sketchEntities.find((item) => item.id === s.selectedSketchEntityId);
          if (!entity) return s;
          if (entity.profileId) {
            return {
              ...s,
              sketchEntities: s.sketchEntities.filter((item) => item.profileId !== entity.profileId),
              sketchProfiles: s.sketchProfiles.filter((profile) => profile.id !== entity.profileId),
              selectedSketchEntityId: null,
              activeProfileId: null,
              sketchRelations: s.sketchRelations.filter((relation) => !relation.entityIds?.includes(entity.id)),
            };
          }
          return {
            ...s,
            sketchEntities: s.sketchEntities.filter((item) => item.id !== entity.id),
            selectedSketchEntityId: null,
          };
        });
      },

      activateTool(tool) {
        if (tool === "select") {
          setState((s) => {
            if (s.mode === "sketching") {
              return {
                ...s,
                activeTool: "select",
                lineChain: [],
                toolStart: null,
                hoverPoint: null,
                activeProfileId: null,
              };
            }
            if (s.mode === "profile-ready") {
              return { ...s, mode: "sketching", activeTool: "select", activeProfileId: null };
            }
            return { ...s, activeTool: "select" };
          });
          return;
        }

        setState((s) => {
          if (s.mode === "sketching") {
            return {
              ...s,
              activeTool: tool,
              lineChain: [],
              toolStart: null,
              hoverPoint: null,
              smartStrokePoints: [],
              smartStrokeKind: null,
              selectedSketchEntityId: null,
            };
          }

          if (s.mode === "profile-ready") {
            return {
              ...s,
              mode: "sketching",
              activeTool: tool,
              activeProfileId: null,
              lineChain: [],
              toolStart: null,
              selectedSketchEntityId: null,
            };
          }

          if (!s.draft) {
            return {
              ...s,
              mode: "sketching",
              activeTool: tool,
              activePlane: TOP_PLANE,
              sketchContext: { kind: "base" },
              sketchEntities: [],
              sketchProfiles: [],
              lineChain: [],
              toolStart: null,
              hoverPoint: null,
              activeProfileId: null,
              selectedFace: null,
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
            };
          }

          if (!s.selectedFace) {
            setToast("Select a face first, then choose a sketch tool");
            return s;
          }

          const selectedFace = s.selectedFace;
          const plane = planeForSelectedFace(s.draft, selectedFace);
          if (!plane) return s;

          let faceType = selectedFace.type === "side" ? "side" : "top";
          let faceIndex = selectedFace.type === "side" ? selectedFace.index : null;
          let hostFeatureId = null;
          let hostDepth = 0;

          if (selectedFace.type === "feature-cap") {
            const hostFeature = featureById(s.draft, selectedFace.featureId);
            if (!hostFeature) return s;
            faceType = hostFeature.faceType;
            faceIndex = hostFeature.faceIndex ?? null;
            hostFeatureId = hostFeature.id;
            hostDepth = Number(hostFeature.depth || 0);
            setToast(
              hostDepth >= 0
                ? "Sketching on boss face · pull outward to stack another boss"
                : "Sketching on pocket floor · push inward to deepen the pocket"
            );
          }

          return {
            ...s,
            mode: "sketching",
            activeTool: tool,
            activePlane: plane,
            sketchContext: {
              kind: "feature",
              faceType,
              faceIndex,
              hostFeatureId,
              hostDepth,
              hostTopologyId: topologyFaceId(selectedFace),
            },
            sketchEntities: [],
            sketchProfiles: [],
            lineChain: [],
            toolStart: null,
            hoverPoint: null,
            activeProfileId: null,
            selectedFace: null,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      beginSmartStroke(point) {
        setState((s) => ({
          ...s,
          smartStrokePoints: [{ x: point.x, y: point.y }],
          smartStrokeKind: null,
          hoverPoint: null,
        }));
      },

      updateSmartStroke(point) {
        api.updateSmartStrokeBatch(
          [point]
        );
      },

      updateSmartStrokeBatch(
        samples
      ) {
        setState((s) => {
          if (
            s.activeTool !==
              "smart" ||
            !s.smartStrokePoints
              .length
          ) {
            return s;
          }

          if (
            !Array.isArray(
              samples
            ) ||
            !samples.length
          ) {
            return s;
          }

          const points = [
            ...s.smartStrokePoints,
          ];

          for (
            const point of samples
          ) {
            if (!point) {
              continue;
            }

            const previous =
              points[
                points.length - 1
              ];

            /*
              Keep enough Pencil samples for smooth
              geometry without flooding React state.
            */
            if (
              Math.hypot(
                point.x -
                  previous.x,
                point.y -
                  previous.y
              ) < 0.25
            ) {
              continue;
            }

            points.push({
              x:
                point.x,

              y:
                point.y,
            });
          }

          if (
            points.length ===
            s.smartStrokePoints
              .length
          ) {
            return s;
          }

          const classified =
            points.length >= 5
              ? classifySmartStroke(
                  points
                )
              : null;

          const label =
            classified?.type ===
              "closed-polyline"
              ? "PROFILE"
              : classified
                  ?.type
                  ?.toUpperCase?.() ||
                null;

          return {
            ...s,

            smartStrokePoints:
              points,

            smartStrokeKind:
              label,
          };
        });
      },

      finishSmartStroke() {
        setState((s) => {
          if (s.activeTool !== "smart" || s.smartStrokePoints.length < 2) {
            return { ...s, smartStrokePoints: [], smartStrokeKind: null };
          }
          const result = classifySmartStroke(s.smartStrokePoints);
          if (!result) return { ...s, smartStrokePoints: [], smartStrokeKind: null };

          if (result.type === "line") {
            const start = snapSketchPoint(result.start, s);
            const end = snapSketchPoint(result.end, { ...s, lineChain: [start], activeTool: "line" });
            const entity = {
              id: uid("line"), type: "line",
              start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y },
              constraint: inferLineConstraint(start, end, end.snap), profileId: null,
            };
            setToast(entity.constraint ? `Line recognized · ${entity.constraint}` : "Line recognized");
            return { ...s, sketchEntities: [...s.sketchEntities, entity], smartStrokePoints: [], smartStrokeKind: null };
          }

          if (result.type === "circle") {
            const profile = {
              id: uid("profile"), type: "circle", center: result.center, radius: result.radius,
              points: circlePoints(result.center, result.radius),
            };
            setToast(`Circle recognized · Ø ${(result.radius * 2).toFixed(1)} mm`);
            const autoReady = s.sketchContext?.kind !== "construction";
            return {
              ...s,
              mode: autoReady ? "profile-ready" : "sketching",
              sketchProfiles: [...s.sketchProfiles, profile],
              smartStrokePoints: [],
              smartStrokeKind: null,
              activeTool: "select",
              activeProfileId: autoReady ? profile.id : null,
              numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
              dimensionDraft: autoReady ? dimensionDraftForProfile(profile) : s.dimensionDraft,
            };
          }

          if (result.type === "arc") {
            const entity = { id: uid("arc"), type: "arc", ...result, profileId: null, constraint: null };
            setToast(`Arc recognized · R ${result.radius.toFixed(1)} mm`);
            return { ...s, sketchEntities: [...s.sketchEntities, entity], smartStrokePoints: [], smartStrokeKind: null };
          }

          if (result.type === "closed-polyline") {
            const profileId = uid("profile");
            const pts = ensureCCW(result.points.map((p) => [p.x, p.y]));
            const profile = { id: profileId, type: "polyline", points: pts };
            const entities = pts.map((p, index) => {
              const next = pts[(index + 1) % pts.length];
              const start = { x: p[0], y: p[1] };
              const end = { x: next[0], y: next[1] };
              return { id: uid("line"), type: "line", start, end, constraint: inferLineConstraint(start, end), profileId };
            });
            setToast(`Closed profile recognized · ${pts.length} edges`);
            const autoReady = s.sketchContext?.kind !== "construction";
            return {
              ...s,
              mode: autoReady ? "profile-ready" : "sketching",
              sketchEntities: [...s.sketchEntities, ...entities],
              sketchProfiles: [...s.sketchProfiles, profile],
              smartStrokePoints: [],
              smartStrokeKind: null,
              activeTool: "select",
              activeProfileId: autoReady ? profileId : null,
              numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
              dimensionDraft: autoReady ? dimensionDraftForProfile(profile) : s.dimensionDraft,
            };
          }

          const entity = { id: uid("polyline"), type: "polyline", points: result.points, profileId: null, constraint: null };
          setToast("Free curve captured");
          return { ...s, sketchEntities: [...s.sketchEntities, entity], smartStrokePoints: [], smartStrokeKind: null };
        });
      },

      placeSketchPoint(point) {
        setState((s) => {
          if (s.mode !== "sketching") return s;

          if (s.activeTool === "line") {
            if (!s.lineChain.length) {
              return {
                ...s,
                lineChain: [{ x: point.x, y: point.y }],
              };
            }

            const previous = s.lineChain[s.lineChain.length - 1];
            if (Math.hypot(previous.x - point.x, previous.y - point.y) < 0.05) {
              return s;
            }

            const entity = {
              id: uid("line"),
              type: "line",
              start: { ...previous },
              end: { x: point.x, y: point.y },
              constraint: inferLineConstraint(previous, point, point.snap),
              profileId: null,
            };

            const shouldClose =
              s.lineChain.length >= 3 &&
              almostSamePoint(point, s.lineChain[0], 0.15);

            if (shouldClose) {
              const profilePoints = ensureCCW(
                s.lineChain.map((p) => [p.x, p.y])
              );
              const profileId = uid("profile");
              const profile = {
                id: profileId,
                type: "polyline",
                points: profilePoints,
              };
              const chainEntityCount = Math.max(0, s.lineChain.length - 1);
              const splitIndex = Math.max(0, s.sketchEntities.length - chainEntityCount);
              const taggedExisting = s.sketchEntities.map((item, index) =>
                index >= splitIndex ? { ...item, profileId } : item
              );
              const autoReady = s.sketchContext?.kind !== "construction";

              return {
                ...s,
                mode: autoReady ? "profile-ready" : "sketching",
                sketchEntities: [...taggedExisting, { ...entity, profileId }],
                sketchProfiles: [...s.sketchProfiles, profile],
                lineChain: [],
                toolStart: null,
                hoverPoint: null,
                activeTool: "select",
                activeProfileId: autoReady ? profileId : null,
                numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
                dimensionDraft: autoReady ? dimensionDraftForProfile(profile) : s.dimensionDraft,
              };
            }

            return {
              ...s,
              sketchEntities: [...s.sketchEntities, entity],
              lineChain: [
                ...s.lineChain,
                { x: point.x, y: point.y },
              ],
            };
          }

          if (s.activeTool === "rectangle") {
            if (!s.toolStart) {
              return {
                ...s,
                toolStart: { x: point.x, y: point.y },
              };
            }

            if (
              Math.abs(point.x - s.toolStart.x) < 0.2 ||
              Math.abs(point.y - s.toolStart.y) < 0.2
            ) {
              return s;
            }

            const profilePoints = rectanglePoints(s.toolStart, point);
            const profileId = uid("profile");
            const profile = { id: profileId, type: "rectangle", points: profilePoints };
            const entities = profilePoints.map((p, index) => {
              const endPoint = profilePoints[(index + 1) % profilePoints.length];
              const start = { x: p[0], y: p[1] };
              const end = { x: endPoint[0], y: endPoint[1] };
              return {
                id: uid("line"),
                type: "line",
                start,
                end,
                constraint: inferLineConstraint(start, end),
                profileId,
              };
            });
            const autoReady = s.sketchContext?.kind !== "construction";

            return {
              ...s,
              mode: autoReady ? "profile-ready" : "sketching",
              sketchEntities: [...s.sketchEntities, ...entities],
              sketchProfiles: [...s.sketchProfiles, profile],
              toolStart: null,
              hoverPoint: null,
              activeTool: "select",
              activeProfileId: autoReady ? profileId : null,
              numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
              dimensionDraft: autoReady ? dimensionDraftForProfile(profile) : s.dimensionDraft,
            };
          }

          if (s.activeTool === "circle") {
            if (!s.toolStart) {
              return {
                ...s,
                toolStart: { x: point.x, y: point.y },
              };
            }

            const radius = Math.hypot(
              point.x - s.toolStart.x,
              point.y - s.toolStart.y
            );
            if (radius < 0.5) return s;

            const profile = {
              id: uid("profile"),
              type: "circle",
              center: { ...s.toolStart },
              radius,
              points: circlePoints(s.toolStart, radius),
            };
            const autoReady = s.sketchContext?.kind !== "construction";

            return {
              ...s,
              mode: autoReady ? "profile-ready" : "sketching",
              sketchProfiles: [...s.sketchProfiles, profile],
              toolStart: null,
              hoverPoint: null,
              activeTool: "select",
              activeProfileId: autoReady ? profile.id : null,
              numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
              dimensionDraft: autoReady ? dimensionDraftForProfile(profile) : s.dimensionDraft,
            };
          }

          return s;
        });
      },

      undoSketchStep() {
        setState((s) => {
          if (s.toolStart) return { ...s, toolStart: null };
          if (s.lineChain.length > 1) {
            const newChain = s.lineChain.slice(0, -1);
            return {
              ...s,
              lineChain: newChain,
              sketchEntities: s.sketchEntities.slice(0, -1),
            };
          }
          if (s.lineChain.length === 1) return { ...s, lineChain: [] };
          return s;
        });
      },

      cancelSketch() {
        setState((s) => clearSketchFields(s));
      },

      selectProfile(profileId) {
        setState((s) => {
          const profile = s.sketchProfiles.find((item) => item.id === profileId);
          if (!profile) return s;
          if (s.sketchContext?.kind === "construction" && s.sketchContext?.planeId) {
            const planeId = s.sketchContext.planeId;
            setToast("Construction-plane profile captured · ready for Loft");
            return {
              ...clearSketchFields(s),
              constructionPlanes: s.constructionPlanes.map((plane) => plane.id === planeId ? { ...plane, points: deepClone(profile.points) } : plane),
              selectedConstructionPlaneId: planeId,
            };
          }
          if (s.sketchContext?.hostFeatureId) {
            const hostFeature = featureById(s.draft, s.sketchContext.hostFeatureId);
            if (!hostFeature || !profileInsideHost(profile, hostFeature)) {
              setToast("Keep the stacked sketch inside the selected feature face");
              return s;
            }
          }
          return {
            ...s,
            mode: "profile-ready",
            activeProfileId: profileId,
            activeTool: "select",
            lineChain: [],
            toolStart: null,
            hoverPoint: null,
            numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
            selectedSketchEntityId: null,
            dimensionDraft: dimensionDraftForProfile(profile),
          };
        });
      },

      backToSketch() {
        setState((s) => ({
          ...s,
          mode: "sketching",
          activeTool: "rectangle",
          activeProfileId: null,
          selectedSketchEntityId: null,
          pendingPull: 0,
        }));
      },

      beginProfilePull(profileId = null) {
        setState((s) => {
          const nextProfileId = profileId || s.activeProfileId;
          const profile = s.sketchProfiles.find((item) => item.id === nextProfileId);
          if (!profile) return s;
          if (s.sketchContext?.hostFeatureId) {
            const hostFeature = featureById(s.draft, s.sketchContext.hostFeatureId);
            if (!hostFeature || !profileInsideHost(profile, hostFeature)) {
              setToast("Keep the stacked sketch inside the selected feature face");
              return s;
            }
          }
          return {
            ...s,
            mode: "pulling-profile",
            activeProfileId: nextProfileId,
            activeTool: "select",
            selectedSketchEntityId: null,
            pendingPull: 0,
            numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
            dimensionDraft: dimensionDraftForProfile(profile),
          };
        });
      },

      beginFacePull(face = null) {
        setState((s) => {
          const nextFace = face || s.selectedFace;
          if (!nextFace || !s.draft) return s;
          const id = topologyFaceId(nextFace);
          return {
            ...s,
            mode: "pulling-face",
            selectedFace: nextFace,
            selectedFaceIds: id ? [id] : [],
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
            selectedBody: false,
            activeTool: "select",
            pendingPull: 0,
            numericValue: "5",
            hoveredFace: null,
            hoveredEdgeKey: null,
          };
        });
      },

      updatePull(value) {
        setState((s) => {
          if (s.mode === "pulling-profile") {
            if (s.sketchContext?.kind === "base") {
              return { ...s, pendingPull: Math.max(0, value) };
            }
            if (s.sketchContext?.hostFeatureId) {
              const hostDepth = Number(s.sketchContext.hostDepth || 0);
              return {
                ...s,
                pendingPull: hostDepth >= 0 ? Math.max(0, value) : Math.min(0, value),
              };
            }
            return { ...s, pendingPull: value };
          }
          if (s.mode === "pulling-face") {
            return { ...s, pendingPull: value };
          }
          return s;
        });
      },

      endProfilePull() {
        setState((s) => {
          if (s.mode !== "pulling-profile") return s;
          const profile = s.sketchProfiles.find((p) => p.id === s.activeProfileId);
          if (!profile) return { ...s, mode: "profile-ready", pendingPull: 0 };

          if (s.sketchContext?.kind === "base") {
            if (s.pendingPull < MIN_PULL_MM) {
              return { ...s, mode: "profile-ready", pendingPull: 0 };
            }

            const draft = ensureDraftMetadata({
              points: profile.points,
              height: s.pendingPull,
              features: [],
              edgeTreatments: [],
            });
            pushHistory(snapshotOf(s));
            return keepFaceSelected(
              clearSketchFields({ ...s, draft }),
              baseTopSelectionFace()
            );
          }

          if (Math.abs(s.pendingPull) < MIN_FEATURE_MM) {
            return { ...s, mode: "profile-ready", pendingPull: 0 };
          }

          if (!stackedDirectionAllowed(s.sketchContext, s.pendingPull)) {
            setToast("Reverse-direction stacking needs the full BRep kernel");
            return { ...s, mode: "profile-ready", pendingPull: 0 };
          }

          const depth = stackedFeatureDepth(s.sketchContext, s.pendingPull);
          const feature = {
            id: uid("feature"),
            points: profile.points,
            depth,
            operation: depth >= 0 ? "add" : "cut",
            sourceProfileId: profile.id,
            faceType: s.sketchContext.faceType,
            faceIndex: s.sketchContext.faceIndex,
            hostFeatureId: s.sketchContext.hostFeatureId || null,
            relativeDepth: s.sketchContext.hostFeatureId ? s.pendingPull : null,
            hostTopologyId: s.sketchContext.hostTopologyId || null,
          };
          const draft = {
            ...s.draft,
            features: [...(s.draft?.features || []), feature],
          };
          pushHistory(snapshotOf(s));
          return keepFaceSelected(
            clearSketchFields({ ...s, draft }),
            featureCapSelectionFace(feature)
          );
        });
      },

      applyProfileNumeric() {
        setState((s) => {
          const amount = Number(s.numericValue);
          if (!Number.isFinite(amount)) return s;
          const profile = s.sketchProfiles.find((p) => p.id === s.activeProfileId);
          if (!profile) return s;

          if (s.sketchContext?.kind === "base") {
            if (amount < MIN_PULL_MM) {
              setToast(`Minimum height is ${MIN_PULL_MM} mm`);
              return s;
            }
            const draft = ensureDraftMetadata({
              points: profile.points,
              height: amount,
              features: [],
              edgeTreatments: [],
            });
            pushHistory(snapshotOf(s));
            return keepFaceSelected(
              clearSketchFields({ ...s, draft }),
              baseTopSelectionFace()
            );
          }

          if (Math.abs(amount) < MIN_FEATURE_MM) {
            setToast(`Minimum feature depth is ${MIN_FEATURE_MM} mm`);
            return s;
          }

          if (!stackedDirectionAllowed(s.sketchContext, amount)) {
            setToast(
              Number(s.sketchContext?.hostDepth || 0) >= 0
                ? "This boss face currently supports outward stacked adds only"
                : "This pocket floor currently supports deeper stacked cuts only"
            );
            return s;
          }

          const depth = stackedFeatureDepth(s.sketchContext, amount);
          const feature = {
            id: uid("feature"),
            points: profile.points,
            depth,
            operation: depth >= 0 ? "add" : "cut",
            sourceProfileId: profile.id,
            faceType: s.sketchContext.faceType,
            faceIndex: s.sketchContext.faceIndex,
            hostFeatureId: s.sketchContext.hostFeatureId || null,
            relativeDepth: s.sketchContext.hostFeatureId ? amount : null,
            hostTopologyId: s.sketchContext.hostTopologyId || null,
          };
          const draft = {
            ...s.draft,
            features: [...(s.draft?.features || []), feature],
          };
          pushHistory(snapshotOf(s));
          return keepFaceSelected(
            clearSketchFields({ ...s, draft }),
            featureCapSelectionFace(feature)
          );
        });
      },

      async endFacePull(
        finalAmount = null
      ) {
        const source =
          stateRef.current;

        if (
          source.mode !==
            "pulling-face" ||
          !source.selectedFace ||
          !source.draft
        ) {
          return;
        }


        /*
          Number(null) === 0, so null must be treated
          explicitly as "no final pointer sample".
        */
        const supplied =
          finalAmount == null
            ? Number.NaN
            : Number(
                finalAmount
              );


        const amount =
          Number.isFinite(
            supplied
          )
            ? supplied
            : Number(
                source.pendingPull ||
                0
              );


        /*
          Tap without meaningful movement =
          select only, no geometry change.
        */
        if (
          Math.abs(amount) <
          0.05
        ) {
          setState(s => ({
            ...s,
            mode:
              "idle",
            pendingPull:
              0,
          }));

          return;
        }


        const candidate =
          applyFaceOffsetToDraft(
            source.draft,
            source.selectedFace,
            amount
          );


        let nextDraft =
          candidate;

        let validatedByBRep =
          false;


        /*
          OpenCascade online:
          validate final topology before history commit.

          Mesh fallback:
          retain current Creator behavior.
        */
        if (
          cadKernelRuntime
            .supports(
              "pushPullFace"
            )
        ) {
          const result =
            await cadKernelRuntime
              .runTool(
                "pushPullFace",
                {
                  draft:
                    deepClone(
                      source.draft
                    ),

                  nextDraft:
                    deepClone(
                      candidate
                    ),

                  selectedFace:
                    deepClone(
                      source.selectedFace
                    ),

                  selectedFaceIds:
                    deepClone(
                      source
                        .selectedFaceIds ||
                      []
                    ),

                  amount,
                }
              );


          if (!result?.ok) {
            setToast(
              result?.message ||
              "OpenCascade rejected this face offset"
            );

            setState(s => ({
              ...s,
              mode:
                "idle",
              pendingPull:
                0,
            }));

            return;
          }


          nextDraft =
            result.nextDraft ||
            candidate;

          validatedByBRep =
            true;
        }


        /*
          Never apply an asynchronous WASM result to
          another body if the user changed objects
          while validation was running.
        */
        if (
          stateRef.current
            ?.draft?.id !==
          source.draft.id
        ) {
          return;
        }


        pushHistory(
          snapshotOf(source)
        );


        const selectedFace =
          persistentFaceAfterDraftEdit(
            nextDraft,
            source.selectedFace
          );


        const selectedId =
          topologyFaceId(
            selectedFace
          );


        setState(s => ({
          ...s,

          draft:
            nextDraft,

          selectedFace,

          selectedFaceIds:
            selectedId
              ? [selectedId]
              : [],

          mode:
            "idle",

          pendingPull:
            0,

          numericValue:
            "5",
        }));


        if (
          validatedByBRep
        ) {
          setToast(
            `Face offset ${
              amount >= 0
                ? "+"
                : ""
            }${amount.toFixed(1)} mm · BRep validated`
          );
        }
      },

      async applyFaceNumeric() {
        const source =
          stateRef.current;


        if (
          !source.selectedFace ||
          !source.draft
        ) {
          return;
        }


        const amount =
          Number(
            source.numericValue
          );


        if (
          !Number.isFinite(
            amount
          ) ||
          Math.abs(amount) <
            0.01
        ) {
          return;
        }


        const candidate =
          applyFaceOffsetToDraft(
            source.draft,
            source.selectedFace,
            amount
          );


        let nextDraft =
          candidate;

        let validatedByBRep =
          false;


        if (
          cadKernelRuntime
            .supports(
              "pushPullFace"
            )
        ) {
          const result =
            await cadKernelRuntime
              .runTool(
                "pushPullFace",
                {
                  draft:
                    deepClone(
                      source.draft
                    ),

                  nextDraft:
                    deepClone(
                      candidate
                    ),

                  selectedFace:
                    deepClone(
                      source.selectedFace
                    ),

                  selectedFaceIds:
                    deepClone(
                      source
                        .selectedFaceIds ||
                      []
                    ),

                  amount,
                }
              );


          if (!result?.ok) {
            setToast(
              result?.message ||
              "OpenCascade rejected this face offset"
            );

            return;
          }


          nextDraft =
            result.nextDraft ||
            candidate;

          validatedByBRep =
            true;
        }


        if (
          stateRef.current
            ?.draft?.id !==
          source.draft.id
        ) {
          return;
        }


        pushHistory(
          snapshotOf(source)
        );


        const selectedFace =
          persistentFaceAfterDraftEdit(
            nextDraft,
            source.selectedFace
          );


        const selectedId =
          topologyFaceId(
            selectedFace
          );


        setState(s => ({
          ...s,

          draft:
            nextDraft,

          selectedFace,

          selectedFaceIds:
            selectedId
              ? [selectedId]
              : [],
        }));


        if (
          validatedByBRep
        ) {
          setToast(
            `Face offset ${
              amount >= 0
                ? "+"
                : ""
            }${amount.toFixed(1)} mm · BRep validated`
          );
        }
      },

      selectFace(face) {
        setState((s) => {
          const id = topologyFaceId(face);
          if (s.multiSelect && id) {
            const exists = s.selectedFaceIds.includes(id);
            const selectedFaceIds = exists
              ? s.selectedFaceIds.filter((item) => item !== id)
              : [...s.selectedFaceIds, id];
            return {
              ...s,
              selectedFace: exists ? null : face,
              selectedFaceIds,
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
              selectedBody: false,
              activeTool: "select",
              hoveredFace: null,
              hoveredEdgeKey: null,
            };
          }
          return {
            ...s,
            selectedFace: face,
            selectedFaceIds: id ? [id] : [],
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
            selectedBody: false,
            activeTool: "select",
            numericValue: "5",
            hoveredFace: null,
            hoveredEdgeKey: null,
          };
        });
      },

      selectEdge(edge) {
        setState((s) => {
          const existing = (s.draft?.edgeTreatments || []).find((treatment) =>
            treatment.targetEdgeKey
              ? treatment.targetEdgeKey === edge.key
              : treatment.edgeType === edge.edgeType && treatment.edgeIndex === edge.edgeIndex
          );
          return {
            ...s,
            selectedEdgeKey: edge.key,
            selectedEdgeMeta: {
              edgeType: edge.edgeType,
              edgeIndex: edge.edgeIndex,
              source: edge.source || "base",
              featureId: edge.featureId || null,
              editable: edge.editable !== false,
              key: edge.key,
            },
            edgeAmount: existing ? Number(existing.amount || s.edgeAmount) : s.edgeAmount,
            selectedFace: null,
            selectedFaceIds: [],
            selectedBody: false,
            activeTool: "select",
            hoveredFace: null,
            hoveredEdgeKey: null,
          };
        });
      },

      clearSelection() {
        setState((s) => ({
          ...s,
          selectedFace: null,
          selectedFaceIds: [],
          selectedEdgeKey: null,
          selectedEdgeMeta: null,
          selectedBody: false,
          hoveredFace: null,
          hoveredEdgeKey: null,
        }));
      },

      toggleMultiSelect() {
        setState((s) => ({
          ...s,
          multiSelect: !s.multiSelect,
          selectedFace: null,
          selectedFaceIds: [],
          selectedEdgeKey: null,
          selectedEdgeMeta: null,
          selectedBody: false,
        }));
      },

      finishMultiSelect() {
        setState((s) => ({ ...s, multiSelect: false }));
      },

      selectBody() {
        setState((s) => ({
          ...s,
          selectedBody: Boolean(s.draft),
          selectedFace: null,
          selectedFaceIds: [],
          selectedEdgeKey: null,
          selectedEdgeMeta: null,
          hoveredFace: null,
          hoveredEdgeKey: null,
          activeTool: "select",
        }));
      },

      toggleAdvancedPanel() {
        setState((s) => ({ ...s, showAdvancedPanel: !s.showAdvancedPanel }));
      },

      beginBodyTransform(kind) {
        setState((s) => {
          if (!s.draft || bodyTransformRef.current) return s;
          bodyTransformRef.current = { kind, baseDraft: deepClone(s.draft) };
          pushHistory(snapshotOf(s));
          return { ...s, bodyGizmoReadout: { kind, value: 0 } };
        });
      },

      updateBodyTransform(kind, value) {
        setState((s) => {
          const session = bodyTransformRef.current;
          if (!session || !session.baseDraft || session.kind !== kind) return s;
          const numeric = Number(value || 0);
          const transform = { moveX: 0, moveY: 0, rotateDegrees: 0, scale: 1 };
          if (kind === "x") transform.moveX = numeric;
          if (kind === "y") transform.moveY = numeric;
          if (kind === "rotate") transform.rotateDegrees = numeric;
          return {
            ...s,
            draft: transformDraftPlanar(session.baseDraft, transform),
            bodyGizmoReadout: { kind, value: numeric },
          };
        });
      },

      endBodyTransform() {
        bodyTransformRef.current = null;
        setState((s) => ({ ...s, bodyGizmoReadout: null, selectedBody: Boolean(s.draft) }));
      },

      applyBodyTransformExact(kind, value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        setState((s) => {
          if (!s.draft) return s;
          const transform = { moveX: 0, moveY: 0, rotateDegrees: 0, scale: 1 };
          if (kind === "x") transform.moveX = numeric;
          if (kind === "y") transform.moveY = numeric;
          if (kind === "rotate") transform.rotateDegrees = numeric;
          if (kind === "scale") transform.scale = Math.max(0.01, numeric);
          pushHistory(snapshotOf(s));
          return {
            ...s,
            draft: transformDraftPlanar(s.draft, transform),
            selectedBody: true,
            bodyGizmoReadout: null,
          };
        });
      },

      toggleConstructionRefs() {
        setState((s) => ({ ...s, showConstructionRefs: !s.showConstructionRefs }));
      },

      setTransformDraft(key, value) {
        setState((s) => ({
          ...s,
          transformDraft: { ...s.transformDraft, [key]: value },
        }));
      },

      resetTransformDraft() {
        setState((s) => ({
          ...s,
          transformDraft: { moveX: "0", moveY: "0", rotateDegrees: "0", scale: "1" },
        }));
      },

      applyDraftTransform() {
        setState((s) => {
          if (!s.draft) return s;
          const transform = {
            moveX: Number(s.transformDraft.moveX || 0),
            moveY: Number(s.transformDraft.moveY || 0),
            rotateDegrees: Number(s.transformDraft.rotateDegrees || 0),
            scale: Number(s.transformDraft.scale || 1),
          };
          if (
            !Number.isFinite(transform.moveX) ||
            !Number.isFinite(transform.moveY) ||
            !Number.isFinite(transform.rotateDegrees) ||
            !Number.isFinite(transform.scale) ||
            transform.scale <= 0.001
          ) {
            setToast("Enter valid Move / Rotate / Scale values");
            return s;
          }
          const noChange =
            Math.abs(transform.moveX) < 1e-9 &&
            Math.abs(transform.moveY) < 1e-9 &&
            Math.abs(transform.rotateDegrees) < 1e-9 &&
            Math.abs(transform.scale - 1) < 1e-9;
          if (noChange) return s;
          pushHistory(snapshotOf(s));
          const draft = transformDraftPlanar(s.draft, transform);
          setToast(
            `Body transformed · ΔX ${transform.moveX.toFixed(1)} · ΔY ${transform.moveY.toFixed(1)} · R ${transform.rotateDegrees.toFixed(1)}° · S ${transform.scale.toFixed(2)}×`
          );
          return {
            ...s,
            draft,
            transformDraft: { moveX: "0", moveY: "0", rotateDegrees: "0", scale: "1" },
            selectedFace: null,
            selectedFaceIds: [],
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      nudgeDraft(kind, amount) {
        setState((s) => {
          if (!s.draft) return s;
          const transform = { moveX: 0, moveY: 0, rotateDegrees: 0, scale: 1 };
          if (kind === "x") transform.moveX = amount;
          if (kind === "y") transform.moveY = amount;
          if (kind === "rotate") transform.rotateDegrees = amount;
          if (kind === "scale") transform.scale = amount;
          pushHistory(snapshotOf(s));
          return {
            ...s,
            draft: transformDraftPlanar(s.draft, transform),
            selectedFace: null,
            selectedFaceIds: [],
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      addConstructionPlane() {
        setState((s) => {
          const lastOffset = s.constructionPlanes.length ? Math.max(...s.constructionPlanes.map((p) => Number(p.offset || 0))) : 0;
          const plane = { id: uid("plane"), offset: Math.max(10, lastOffset + 20), angleX: 0, angleY: 0, order: s.constructionPlanes.length + 1, points: null };
          return { ...s, constructionPlanes: [...s.constructionPlanes, plane], selectedConstructionPlaneId: plane.id, showConstructionRefs: true };
        });
      },

      selectConstructionPlane(planeId) {
        setState((s) => ({ ...s, selectedConstructionPlaneId: planeId, showConstructionRefs: true }));
      },

      updateConstructionPlane(planeId, key, value) {
        setState((s) => ({ ...s, constructionPlanes: s.constructionPlanes.map((plane) => plane.id === planeId ? { ...plane, [key]: ["offset", "angleX", "angleY", "order"].includes(key) ? Number(value || 0) : value } : plane) }));
      },

      removeConstructionPlane(planeId) {
        setState((s) => ({ ...s, constructionPlanes: s.constructionPlanes.filter((plane) => plane.id !== planeId), selectedConstructionPlaneId: s.selectedConstructionPlaneId === planeId ? null : s.selectedConstructionPlaneId }));
      },

      reorderConstructionPlane(planeId, direction) {
        setState((s) => {
          const list = [...s.constructionPlanes];
          const index = list.findIndex((plane) => plane.id === planeId);
          if (index < 0) return s;
          const nextIndex = Math.max(0, Math.min(list.length - 1, index + direction));
          if (nextIndex === index) return s;
          const [item] = list.splice(index, 1);
          list.splice(nextIndex, 0, item);
          return { ...s, constructionPlanes: list.map((plane, order) => ({ ...plane, order: order + 1 })) };
        });
      },

      sketchOnConstructionPlane(planeId) {
        setState((s) => {
          const item = s.constructionPlanes.find((plane) => plane.id === planeId);
          if (!item) return s;
          const ax = THREE.MathUtils.degToRad(Number(item.angleX || 0));
          const ay = THREE.MathUtils.degToRad(Number(item.angleY || 0));
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, 0, ay, "XYZ"));
          const xAxis = TOP_PLANE.xAxis.clone().applyQuaternion(q);
          const yAxis = TOP_PLANE.yAxis.clone().applyQuaternion(q);
          const normal = TOP_PLANE.normal.clone().applyQuaternion(q);
          const plane = makePlane(
            worldFromLocalMM(TOP_PLANE, 0, 0, Number(item.offset || 0)),
            xAxis, yAxis, normal
          );
          setToast(`Sketching on construction plane · ${Number(item.offset || 0).toFixed(1)} mm`);
          return {
            ...s, mode: "sketching", activeTool: "rectangle", activePlane: plane,
            sketchContext: { kind: "construction", planeId },
            sketchEntities: [], sketchProfiles: [], lineChain: [], toolStart: null, hoverPoint: null,
            activeProfileId: null, selectedSketchEntityId: null, selectedConstructionPlaneId: planeId,
            selectedFace: null, selectedEdgeKey: null, selectedEdgeMeta: null,
          };
        });
      },

      resetSweepPath() {
        setState((s) => {
          const first = s.draft?.points?.[0] || [0, 0];
          return { ...s, sweepPath: [[Number(first[0]), Number(first[1]), 0]], selectedSweepPointIndex: 0 };
        });
      },

      extendSweepPath(axis, direction) {
        setState((s) => {
          const step = Math.max(1, Number(s.sweepPathStep || 20)) * (direction < 0 ? -1 : 1);
          const first = s.draft?.points?.[0] || [0, 0];
          const path = s.sweepPath.length ? [...s.sweepPath.map((p) => [...p])] : [[Number(first[0]), Number(first[1]), 0]];
          const last = [...path[path.length - 1]];
          // Native path coordinates are [profileX, profileY, extrusionZ].
          if (axis === "x") last[0] = Number(last[0]) + step;
          if (axis === "y") last[1] = Number(last[1]) + step;
          if (axis === "z") last[2] = Number(last[2] || 0) + step;
          if (s.sweepCurveMode && path.length >= 1) {
            const start = path[path.length - 1];
            const offset = Number(s.sweepCurveOffset || 12);
            const mid = [
              (Number(start[0]) + Number(last[0])) / 2,
              (Number(start[1]) + Number(last[1])) / 2 + offset,
              (Number(start[2] || 0) + Number(last[2] || 0)) / 2,
            ];
            const samples = 6;
            for (let i = 1; i <= samples; i += 1) {
              const t = i / samples;
              const omt = 1 - t;
              path.push([
                omt * omt * Number(start[0]) + 2 * omt * t * Number(mid[0]) + t * t * Number(last[0]),
                omt * omt * Number(start[1]) + 2 * omt * t * Number(mid[1]) + t * t * Number(last[1]),
                omt * omt * Number(start[2] || 0) + 2 * omt * t * Number(mid[2] || 0) + t * t * Number(last[2] || 0),
              ]);
            }
          } else {
            path.push(last);
          }
          return { ...s, sweepPath: path, selectedSweepPointIndex: path.length - 1 };
        });
      },

      selectSweepPathPoint(index) {
        setState((s) => ({ ...s, selectedSweepPointIndex: index }));
      },

      updateSweepPathPoint(index, point) {
        setState((s) => {
          if (!Array.isArray(s.sweepPath) || index < 0 || index >= s.sweepPath.length) return s;
          const sweepPath = s.sweepPath.map((item, i) => i === index ? point.map(Number) : item);
          return { ...s, sweepPath, selectedSweepPointIndex: index };
        });
      },

      nudgeSweepPathPoint(index, axis, delta) {
        setState((s) => {
          if (!Array.isArray(s.sweepPath) || index < 0 || index >= s.sweepPath.length) return s;
          const sweepPath = s.sweepPath.map((item, i) => {
            if (i !== index) return item;
            const next = [...item].map(Number);
            const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
            next[axisIndex] = Number(next[axisIndex] || 0) + Number(delta || 0);
            return next;
          });
          return { ...s, sweepPath, selectedSweepPointIndex: index };
        });
      },

      setNativeToolValue(key, value) {
        setState((s) => ({ ...s, [key]: value }));
      },

      async requestKernelTool(tool) {
        const label = tool === "shell" ? "Shell" : tool === "revolve" ? "Revolve" : tool;
        const result = await cadKernelRuntime.runTool(tool, {
          draft: deepClone(stateRef.current?.draft || null),
          selectedFace: deepClone(stateRef.current?.selectedFace || null),
          selectedFaceIds: deepClone(stateRef.current?.selectedFaceIds || []),
          shellThickness: Number(stateRef.current?.shellThickness || 2),
          revolveAngle: Number(stateRef.current?.revolveAngle || 360),
          revolveAxis: stateRef.current?.revolveAxis || "x",
          sweepLength: Number(stateRef.current?.sweepLength || 40),
          sweepPath: deepClone(stateRef.current?.sweepPath || []),
          sweepCurveMode: Boolean(stateRef.current?.sweepCurveMode),
          loftManualOrder: Boolean(stateRef.current?.loftManualOrder),
          loftOffset: Number(stateRef.current?.loftOffset || 40),
          loftScale: Number(stateRef.current?.loftScale || 0.65),
          constructionPlanes: deepClone(stateRef.current?.constructionPlanes || []),
        });

        if (!result?.ok) {
          setToast(result?.message || `${label} requires the BRep CAD kernel`);
          return;
        }

        if (result.nextDraft) {
          setToast(result.message || `${label} updated`);
          setState((s) => {
            pushHistory(snapshotOf(s));
            return {
              ...s,
              draft: result.nextDraft,
              selectedFace: null,
              selectedFaceIds: [],
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
            };
          });
        }

        setToast(result.message || `${label} completed`);
      },

      removeNativeOperation(operationId) {
        setState((s) => {
          if (!s.draft) return s;
          pushHistory(snapshotOf(s));
          const draft = {
            ...s.draft,
            nativeOperations: (s.draft.nativeOperations || []).filter(
              (operation) => (operation.id || operation.type) !== operationId
            ),
          };
          return { ...s, draft, selectedFace: null, selectedFaceIds: [] };
        });
      },

      setEdgeAmount(delta) {
        setState((s) => ({
          ...s,
          edgeAmount: Math.max(
            0.5,
            Math.round((s.edgeAmount + delta) * 10) / 10
          ),
        }));
      },

      applyEdgeTreatment(mode) {
        setState((s) => {
          if (!s.selectedEdgeMeta || !s.draft) return s;
          if (s.selectedEdgeMeta.editable === false) {
            setToast("This edge needs the BRep kernel before fillet/chamfer can be applied");
            return s;
          }
          const treatment = {
            id: uid("edge-treatment"),
            targetEdgeKey: s.selectedEdgeMeta.key,
            edgeType: s.selectedEdgeMeta.edgeType,
            edgeIndex: s.selectedEdgeMeta.edgeIndex,
            amount: s.edgeAmount,
            mode,
          };
          const draft = {
            ...s.draft,
            edgeTreatments: [
              ...(s.draft.edgeTreatments || []).filter((item) =>
                item.targetEdgeKey
                  ? item.targetEdgeKey !== s.selectedEdgeMeta.key
                  : !(
                      item.edgeType === s.selectedEdgeMeta.edgeType &&
                      item.edgeIndex === s.selectedEdgeMeta.edgeIndex
                    )
              ),
              treatment,
            ],
          };
          pushHistory(snapshotOf(s));
          setToast(
            `${mode === "fillet" ? "Fillet" : "Chamfer"} ${s.edgeAmount.toFixed(1)} mm added`
          );
          return {
            ...s,
            draft,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      setHoverSelection({ edgeKey = null, face = null }) {
        setState((s) => {
          const sameFace =
            (!s.hoveredFace && !face) ||
            (s.hoveredFace &&
              face &&
              topologyFaceId(s.hoveredFace) === topologyFaceId(face));
          if (s.hoveredEdgeKey === edgeKey && sameFace) return s;
          return { ...s, hoveredEdgeKey: edgeKey, hoveredFace: face };
        });
      },

      updateSketchEndpoint(entityId, endpointKey, point) {
        setState((s) => {
          const entity = s.sketchEntities.find((item) => item.id === entityId);
          if (!entity || entity.type !== "line") return s;
          if (entity.fixed) {
            setToast("This sketch entity is fixed · unlock it before dragging");
            return s;
          }
          const originalPoint = entity[endpointKey];
          const otherKey = endpointKey === "start" ? "end" : "start";
          const otherPoint = entity[otherKey];
          const nextPoint = { x: point.x, y: point.y };
          if (entity.constraint === "horizontal") nextPoint.y = otherPoint.y;
          if (entity.constraint === "vertical") nextPoint.x = otherPoint.x;

          if (!entity.profileId) {
            const edited = s.sketchEntities.map((item) => item.id === entityId ? {
              ...item,
              [endpointKey]: nextPoint,
              constraint: inferLineConstraint(
                endpointKey === "start" ? nextPoint : item.start,
                endpointKey === "end" ? nextPoint : item.end,
                point.snap
              ),
            } : item);
            return {
              ...s,
              sketchEntities: solveSketchConstraints(edited, s.sketchRelations),
            };
          }

          const profile = s.sketchProfiles.find((item) => item.id === entity.profileId);
          if (!profile || profile.type === "circle") return s;
          const nextProfile = updateProfileVertex(profile, originalPoint, nextPoint);
          return {
            ...s,
            sketchProfiles: s.sketchProfiles.map((item) => item.id === nextProfile.id ? nextProfile : item),
            sketchEntities: syncProfileEntities(s.sketchEntities, nextProfile),
          };
        });
      },

      selectFeatureFromHistory(featureId) {
        setState((s) => {
          if (!s.draft || !featureId) return s;
          const feature = featureById(s.draft, featureId);
          if (!feature) return s;
          return {
            ...s,
            selectedFace: {
              topologyId: `face:feature:${feature.id}:cap`,
              type: "feature-cap",
              featureId: feature.id,
              faceType: feature.faceType,
              faceIndex: feature.faceIndex ?? null,
            },
            selectedFaceIds: [`face:feature:${feature.id}:cap`],
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
            selectedBody: false,
            activeTool: "select",
            numericValue: "5",
            hoveredFace: null,
            hoveredEdgeKey: null,
          };
        });
      },

      setFeatureDepth(featureId, depth) {
        setState((s) => {
          if (!s.draft || !featureId || !Number.isFinite(depth)) return s;
          const feature = featureById(s.draft, featureId);
          if (!feature) return s;

          let nextFeatures = (s.draft.features || []).map((item) => ({ ...item }));
          const index = nextFeatures.findIndex((item) => item.id === featureId);
          if (index < 0) return s;

          if (feature.hostFeatureId) {
            if (Math.abs(depth) < MIN_FEATURE_MM) {
              setToast(`Minimum stacked depth is ${MIN_FEATURE_MM} mm`);
              return s;
            }
            const host = featureById(s.draft, feature.hostFeatureId);
            if (!host) return s;
            const relativeDepth = depth;
            const sameDirection = host.depth >= 0 ? relativeDepth >= 0 : relativeDepth <= 0;
            if (!sameDirection) {
              setToast("Stacked features must continue in the host face direction");
              return s;
            }
            nextFeatures[index] = {
              ...nextFeatures[index],
              relativeDepth,
              depth: Number(host.depth || 0) + relativeDepth,
            };
          } else {
            if (Math.abs(depth) < MIN_FEATURE_MM) {
              setToast(`Minimum feature depth is ${MIN_FEATURE_MM} mm`);
              return s;
            }
            if (Math.abs(Number(feature.depth || 0) - depth) < 0.0001) return s;
            nextFeatures[index] = {
              ...nextFeatures[index],
              depth,
              operation: depth >= 0 ? "add" : "cut",
            };
          }

          nextFeatures = rebaseFeatureDependencies(nextFeatures);
          const updated = nextFeatures[index];
          const draft = { ...s.draft, features: nextFeatures };
          pushHistory(snapshotOf(s));
          setToast(
            feature.hostFeatureId
              ? `Stacked depth ${Number(updated.relativeDepth || 0).toFixed(1)} mm`
              : `Feature depth ${Number(updated.depth || 0).toFixed(1)} mm`
          );
          return { ...s, draft };
        });
      },

      removeFeatureById(featureId) {
        setState((s) => {
          if (!s.draft || !featureId) return s;
          const removedIds = descendantFeatureIds(s.draft.features || [], featureId);
          const draft = {
            ...s.draft,
            features: (s.draft.features || []).filter((feature) => !removedIds.has(feature.id)),
          };
          pushHistory(snapshotOf(s));
          setToast(removedIds.size > 1 ? "Feature and dependent features removed" : "Feature removed");
          return {
            ...s,
            draft,
            selectedFace: removedIds.has(s.selectedFace?.featureId) ? null : s.selectedFace,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      setEdgeTreatmentAmount(treatmentId, amount) {
        setState((s) => {
          if (!s.draft || !treatmentId || !Number.isFinite(amount) || amount < 0.1) return s;
          const current = (s.draft.edgeTreatments || []).find((item) => item.id === treatmentId);
          if (!current || Math.abs(Number(current.amount) - amount) < 0.0001) return s;
          const draft = {
            ...s.draft,
            edgeTreatments: (s.draft.edgeTreatments || []).map((item) =>
              item.id === treatmentId ? { ...item, amount } : item
            ),
          };
          pushHistory(snapshotOf(s));
          setToast(`${current.mode === "fillet" ? "Fillet" : "Chamfer"} ${amount.toFixed(1)} mm`);
          return { ...s, draft, edgeAmount: amount };
        });
      },

      removeEdgeTreatmentById(treatmentId) {
        setState((s) => {
          if (!s.draft || !treatmentId) return s;
          const draft = {
            ...s.draft,
            edgeTreatments: (s.draft.edgeTreatments || []).filter(
              (treatment) => treatment.id !== treatmentId
            ),
          };
          pushHistory(snapshotOf(s));
          setToast("Edge treatment removed");
          return { ...s, draft, selectedEdgeKey: null, selectedEdgeMeta: null };
        });
      },

      removeFeature(index) {
        setState((s) => {
          if (!s.draft) return s;
          const draft = { ...s.draft, features: (s.draft.features || []).filter((_, i) => i !== index) };
          pushHistory(snapshotOf(s));
          setToast("Feature removed");
          return { ...s, draft, selectedFace: null, selectedEdgeKey: null, selectedEdgeMeta: null };
        });
      },

      removeEdgeTreatment(index) {
        setState((s) => {
          if (!s.draft) return s;
          const draft = { ...s.draft, edgeTreatments: (s.draft.edgeTreatments || []).filter((_, i) => i !== index) };
          pushHistory(snapshotOf(s));
          setToast("Edge treatment removed");
          return { ...s, draft, selectedEdgeKey: null, selectedEdgeMeta: null };
        });
      },

      deleteSelection() {
        setState((s) => {
          if (s.selectedEdgeMeta && s.draft) {
            const draft = {
              ...s.draft,
              edgeTreatments: (s.draft.edgeTreatments || []).filter(
                (treatment) =>
                  !(
                    treatment.edgeType === s.selectedEdgeMeta.edgeType &&
                    treatment.edgeIndex === s.selectedEdgeMeta.edgeIndex
                  )
              ),
            };
            pushHistory(snapshotOf(s));
            return {
              ...s,
              draft,
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
            };
          }

          if (s.selectedFace || s.selectedFaceIds?.length) {
            return { ...s, selectedFace: null, selectedFaceIds: [] };
          }

          if (s.draft) {
            pushHistory(snapshotOf(s));
            return {
              ...s,
              draft: null,
              selectedFace: null,
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
            };
          }

          return s;
        });
      },

      undo() {
        if (!historyRef.current.length) return;
        setState((s) => {
          redoRef.current.push(deepClone(snapshotOf(s)));
          const previous = historyRef.current.pop();
          return {
            ...s,
            ...previous,
            mode: "idle",
            activeTool: "select",
            selectedFace: null,
            selectedFaceIds: [],
            multiSelect: false,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },

      redo() {
        if (!redoRef.current.length) return;
        setState((s) => {
          historyRef.current.push(deepClone(snapshotOf(s)));
          const next = redoRef.current.pop();
          return {
            ...s,
            ...next,
            mode: "idle",
            activeTool: "select",
            selectedFace: null,
            selectedFaceIds: [],
            multiSelect: false,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
          };
        });
      },
    };

    return api;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCommit() {
    if (!state.draft) return;
    if (objectCount >= maxObjects) {
      setToast("Object limit reached");
      return;
    }

    const localDraft = deepClone(ensureDraftMetadata(state.draft));
    const envelope = createCommitEnvelope(localDraft);

    if (envelope.mode === "native" && typeof onCreateNativeSolid !== "function") {
      setToast("Native CAD model is ready · connect onCreateNativeSolid in BeyondCreator before final deployment");
      return;
    }

    setBusy(true);
    try {
      const engine = envelope.mode === "native"
        ? await onCreateNativeSolid(envelope.nativeCad)
        : await onCreateSolid(envelope.legacy);

      setToast(`Added to model${engine ? ` · ${engine}` : ""}`);
      setState((s) => ({
        ...s,
        committed: [...s.committed, localDraft],
        draft: null,
        mode: "idle",
        activeTool: "select",
        selectedFace: null,
        selectedFaceIds: [],
        selectedEdgeKey: null,
        selectedEdgeMeta: null,
      }));
      historyRef.current = [];
      redoRef.current = [];
    } catch (error) {
      setToast(error?.message || "Could not add to model");
    } finally {
      setBusy(false);
    }
  }

  function handleView(preset) {
    const config = VIEW_PRESETS[preset];
    if (!config || !cameraRigRef.current) return;

    const azimuth = THREE.MathUtils.degToRad(config.azimuth);
    const polar = THREE.MathUtils.degToRad(config.polar);
    const target =
      controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0.3, 0);

    const position = new THREE.Vector3(
      target.x + config.distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + config.distance * Math.cos(polar),
      target.z + config.distance * Math.sin(polar) * Math.cos(azimuth)
    );

    cameraRigRef.current(position, target, new THREE.Vector3(0, 1, 0));
  }

  function handleFit() {
    const points = state.draft?.points || [];
    if (!points.length || !cameraRigRef.current) {
      handleView("iso");
      return;
    }

    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const depth = maxY - minY;
    const height = state.draft.height || 0;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const target = worldFromLocalMM(TOP_PLANE, centerX, centerY, height / 2);
    const radius = Math.max(width, depth, height, 30) * UNIT;
    const distance = Math.max(1.2, radius * 2.4);

    const azimuth = THREE.MathUtils.degToRad(45);
    const polar = THREE.MathUtils.degToRad(55);
    const position = new THREE.Vector3(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth)
    );

    cameraRigRef.current(position, target, new THREE.Vector3(0, 1, 0));
  }

  if (!active) return null;

  const canFinish = Boolean(state.draft) && !busy && objectCount < maxObjects;

  return (
    <div className="sketch3d-root">
      <div className="sketch3d-topbar">
        <span className={`sketch3d-engine-pill sketch3d-engine-${engineStatus}`}>
          {engineStatus === "ready"
            ? "ENGINE READY"
            : engineStatus === "loading"
              ? "LOADING ENGINE"
              : engineStatus === "fallback"
                ? "FALLBACK ENGINE"
                : "ENGINE IDLE"}
        </span>

        <span
          className={`sketch3d-kernel-pill ${kernelInfo.connected ? "is-brep" : "is-fallback"}`}
          title={kernelInfo.connected ? `${kernelInfo.name} connected` : kernelBootStatus === "loading" ? "OpenCascade WebAssembly is initializing" : "Mesh preview fallback active"}
        >
          {kernelInfo.connected ? "BREP ONLINE" : kernelBootStatus === "loading" ? "BREP LOADING" : "MESH FALLBACK"}
        </span>

        <span className="sketch3d-object-count">
          {objectCount} / {maxObjects} OBJECTS
        </span>

        {state.draft?.nativeOperations?.length > 0 && (
          <span
            className={`sketch3d-native-commit-pill ${typeof onCreateNativeSolid === "function" ? "is-ready" : "is-locked"}`}
            title={typeof onCreateNativeSolid === "function" ? "BeyondCreator native CAD commit handler connected" : "V22 native payload is ready; parent handler will be connected before final deployment"}
          >
            {typeof onCreateNativeSolid === "function" ? "NATIVE COMMIT READY" : "NATIVE COMMIT LOCKED"}
          </span>
        )}

        <div className="sketch3d-topbar-actions">
          <button
            type="button"
            onClick={actions.undo}
            disabled={!historyRef.current.length}
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={actions.redo}
            disabled={!redoRef.current.length}
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            onClick={actions.deleteSelection}
            disabled={
              !state.draft &&
              !state.selectedFace &&
              !state.selectedFaceIds?.length &&
              !state.selectedEdgeKey &&
              !state.selectedBody
            }
            title="Delete"
          >
            <Trash2 size={16} />
          </button>

          {state.draft && (
            <button
              type="button"
              onClick={runCommit}
              disabled={!canFinish}
              className="sketch3d-finish-btn"
            >
              <Check size={15} />
              Finish
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToStudio}
            className="sketch3d-studio-btn"
          >
            Send to Studio
          </button>
        </div>
      </div>

      <div className="sketch3d-canvas-wrap">
        <Canvas
          shadows
          camera={{
            position: [2.4, 1.9, 2.4],
            fov: 46,
            near: 0.01,
            far: 100,
          }}
          gl={{ antialias: true }}
        >
          <SketchScene
            state={state}
            actions={actions}
            cameraRigRef={cameraRigRef}
            controlsRef={controlsRef}
          />
        </Canvas>

        <ToolRail state={state} actions={actions} />
        <AdvancedModelPanel state={state} actions={actions} kernelInfo={kernelInfo} />
        {state.draft && state.mode === "idle" && (
          <FeatureHistory
            draft={state.draft}
            actions={actions}
            selectedFeatureId={state.selectedFace?.type === "feature-cap" ? state.selectedFace.featureId : null}
            kernelInfo={kernelInfo}
          />
        )}
        <ViewCube onView={handleView} onFit={handleFit} />

        <div className="sketch3d-floating-toolbar">
          <ContextToolbar
            state={state}
            actions={actions}
            objectCount={objectCount}
            maxObjects={maxObjects}
          />
        </div>

        {busy && <div className="sketch3d-busy">Building…</div>}
        {toast && <div className="sketch3d-toast">{toast}</div>}
      </div>
    </div>
  );
}

export default SketchWorkspace;
