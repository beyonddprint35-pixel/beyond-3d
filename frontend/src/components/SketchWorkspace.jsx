import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment, Grid, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import {
  Check,
  Copy,
  Lock,
  Maximize2,
  Redo2,
  Trash2,
  Undo2,
  Unlock,
  X,
} from "lucide-react";

import "./SketchWorkspace.css";

/* ======================================================================
   REAL 3D DIRECT-MODELING SKETCH CANVAS
   ----------------------------------------------------------------------
   This replaces the previous SVG/pseudo-3D sketch canvas with an actual
   WebGL scene (react-three-fiber + three.js), so orbiting, shading and
   depth are real rather than hand-rolled trig projected onto flat SVG.

   It produces the exact same "sketch" payload shape that
   BeyondCreator.jsx's createSketchWorkspaceSolid()/createSketchSolid()
   already know how to turn into a real, boolean-composited solid:

     {
       points: [[x,y], ...]   // mm, base profile, drawn on the ground plane
       height: number         // mm
       twistDegrees: number
       scaleTop: number
       plane: "top"
       features: [{ points, depth, faceType: "top" | "side", faceIndex }]
       edgeTreatments: [{ edgeType: "top"|"bottom"|"vertical", edgeIndex, amount, mode }]
     }

   All local CSG here (three-csg-ts) is for live preview fidelity only.
   The authoritative solid is still built by the existing parent pipeline
   once we hand off via onCreateSolid — we don't touch that pipeline.
   ====================================================================== */

const UNIT = 0.02; // scene units per mm, preview-only scale
const CLOSE_PX = 26; // screen-space px tolerance to close a profile
const MIN_PULL_MM = 1;
const MIN_FEATURE_MM = 0.5;

const BODY_COLOR = "#c7d3de";
const BODY_COLOR_FEATURE_ADD = "#8fd0a5";
const BODY_COLOR_FEATURE_CUT = "#e08a8a";
const SELECT_COLOR = "#3fa9ff";
const GHOST_COLOR = "#4a5c6c";

/* ---------------------------------------------------------------------
   Plane helpers. A "plane" is an orthonormal basis in world (scene) space:
   origin (Vector3, scene units), xAxis, yAxis, normal (unit Vector3s).
   Local coordinates are always expressed in millimetres.
--------------------------------------------------------------------- */

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

function planeBasisMatrix(plane) {
  return new THREE.Matrix4().makeBasis(plane.xAxis, plane.yAxis, plane.normal);
}

function planeQuaternion(plane) {
  return new THREE.Quaternion().setFromRotationMatrix(planeBasisMatrix(plane));
}

/* ---------------------------------------------------------------------
   2D profile math (mm), all in a plane's local xy.
--------------------------------------------------------------------- */

function signedArea(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    total += x1 * y2 - x2 * y1;
  }
  return total / 2;
}

function polygonCentroid(points) {
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
  const area = signedArea(points);
  return area >= 0 ? { x: edge.y, y: -edge.x } : { x: -edge.y, y: edge.x };
}

/* ---------------------------------------------------------------------
   Geometry builders (mm in, scene-unit geometry out, local to a plane's
   own xy/extrude-z frame — i.e. NOT yet placed in world space).
--------------------------------------------------------------------- */

function extrudeLocalGeometry(points, heightMM) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(x * UNIT, y * UNIT))
  );
  const depth = Math.max(0.0002, heightMM * UNIT);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 8,
  });
  geo.computeVertexNormals();
  return geo;
}

// Places a locally-built extrude geometry into world space given a plane
// and an optional along-normal offset (mm) — used to slide feature tools
// up/down a cap face, or flip a side-face tool inward vs outward.
function placeGeometry(geo, plane, axisSign = 1, normalOffsetMM = 0) {
  const placed = geo.clone();
  const basis = new THREE.Matrix4().makeBasis(
    plane.xAxis,
    plane.yAxis,
    plane.normal.clone().multiplyScalar(axisSign)
  );
  const offset = plane.normal.clone().multiplyScalar(normalOffsetMM * UNIT);
  const m = basis.setPosition(plane.origin.clone().add(offset));
  placed.applyMatrix4(m);
  placed.computeVertexNormals();
  return placed;
}

function meshFromGeometry(geo, color) {
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08 })
  );
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);
  return mesh;
}

// Builds the current composite preview mesh geometry (world space) for a
// draft: base extrude, boolean-combined with every feature in order.
function buildCompositeGeometry(draft) {
  if (!draft?.points?.length) return null;

  let workingMesh = meshFromGeometry(
    placeGeometry(extrudeLocalGeometry(draft.points, draft.height), TOP_PLANE),
    BODY_COLOR
  );

  for (const feature of draft.features || []) {
    if (!feature.points?.length || Math.abs(feature.depth) < MIN_FEATURE_MM) continue;

    const isSide = feature.faceType === "side";
    const featurePlane = isSide
      ? sideFacePlane(draft.points, feature.faceIndex)
      : TOP_PLANE;
    if (!featurePlane) continue;

    const dir = feature.depth >= 0 ? 1 : -1;
    const magnitude = Math.abs(feature.depth);

    let toolGeo;
    if (isSide) {
      toolGeo = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        dir,
        0
      );
    } else {
      const normalOffset = dir >= 0 ? draft.height : draft.height - magnitude;
      toolGeo = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        1,
        normalOffset
      );
    }

    const toolMesh = meshFromGeometry(
      toolGeo,
      dir >= 0 ? BODY_COLOR_FEATURE_ADD : BODY_COLOR_FEATURE_CUT
    );

    try {
      const next =
        dir >= 0
          ? CSG.union(workingMesh, toolMesh)
          : CSG.subtract(workingMesh, toolMesh);
      next.material = workingMesh.material;
      workingMesh = next;
    } catch (err) {
      // Keep the previous working mesh if a boolean op fails on a
      // degenerate profile — the user can adjust and retry.
      console.warn("Sketch preview boolean failed:", err);
    }
  }

  return workingMesh.geometry;
}

// The local frame for sketching on a side face of the *base* profile,
// matching BeyondCreator.jsx's sideFaceFrame/feature transform exactly:
//   local x = distance along the edge (mm)
//   local y = height above the base (mm)
//   normal  = outward horizontal direction
function sideFacePlane(basePoints, faceIndex) {
  if (faceIndex == null) return null;
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

function edgeSegmentsForDraft(draft) {
  if (!draft?.points?.length) return [];
  const { points, height } = draft;
  const segs = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    segs.push({
      key: `v-${i}`,
      edgeType: "vertical",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
    });
    segs.push({
      key: `t-${i}`,
      edgeType: "top",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], height),
    });
    segs.push({
      key: `b-${i}`,
      edgeType: "bottom",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], 0),
    });
  }
  return segs;
}

function boundsOf(objects) {
  const box = new THREE.Box3();
  let any = false;
  for (const obj of objects) {
    if (!obj) continue;
    box.expandByObject(obj);
    any = true;
  }
  return any ? box : null;
}

const deepClone = (value) => JSON.parse(JSON.stringify(value));

/* ---------------------------------------------------------------------
   Axis-constrained drag: given a world axis (origin + direction), find
   the mm offset along that axis that the pointer is currently over, by
   intersecting the pointer ray with a helper plane that contains the
   axis and roughly faces the camera. This is what makes the pull/push
   gesture track the pointer correctly under a real perspective camera.
--------------------------------------------------------------------- */
function useAxisDrag() {
  const { camera, gl, raycaster } = useThree();

  return useCallback(
    (event, axisOrigin, axisDir) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      let helperNormal = new THREE.Vector3()
        .crossVectors(axisDir, camDir)
        .cross(axisDir);
      if (helperNormal.lengthSq() < 1e-6) helperNormal = camDir.clone();
      helperNormal.normalize();

      const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        helperNormal,
        axisOrigin
      );
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, hit)) return null;

      const rel = hit.clone().sub(axisOrigin);
      const t = rel.dot(axisDir);
      return t / UNIT; // mm along axis
    },
    [camera, gl, raycaster]
  );
}

function useGroundRaycast() {
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

/* ---------------------------------------------------------------------
   Screen-space picking for the thin edge lines. Real 3D raycasting
   against 1px lines is unreliable on touch, so we project every edge
   segment to screen space each render and pick the nearest one within
   a pixel tolerance — the same approach a CAD app's edge-pick uses.
--------------------------------------------------------------------- */
function useEdgePicker(segments) {
  const { camera, gl, size } = useThree();

  return useCallback(
    (event) => {
      if (!segments.length) return null;
      const rect = gl.domElement.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      const toScreen = (v3) => {
        const p = v3.clone().project(camera);
        return {
          x: ((p.x + 1) / 2) * size.width,
          y: ((1 - p.y) / 2) * size.height,
        };
      };

      let best = null;
      let bestDist = 16; // px tolerance

      for (const seg of segments) {
        const a = toScreen(seg.a);
        const b = toScreen(seg.b);
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const lenSq = abx * abx + aby * aby || 1;
        let t = ((px - a.x) * abx + (py - a.y) * aby) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + abx * t;
        const cy = a.y + aby * t;
        const dist = Math.hypot(px - cx, py - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = seg;
        }
      }
      return best;
    },
    [segments, camera, gl, size]
  );
}

/* ======================================================================
   Scene contents
   ====================================================================== */

function SketchPlaneSurface({ plane, size = 400, onPick, visible = true }) {
  const groupRef = useRef(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(plane.origin);
    groupRef.current.quaternion.copy(planeQuaternion(plane));
  }, [plane]);

  return (
    <group ref={groupRef}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onPick}
        visible={false}
      >
        <planeGeometry args={[size * UNIT, size * UNIT]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {visible && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0004, 0]}>
          <planeGeometry args={[size * UNIT, size * UNIT]} />
          <meshBasicMaterial
            color="#2d6f9e"
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function PendingProfileLine({ plane, points, cursor }) {
  if (!points.length) return null;
  const world = points.map(([x, y]) => worldFromLocalMM(plane, x, y, 0.02));
  const full = cursor ? [...world, worldFromLocalMM(plane, cursor.x, cursor.y, 0.02)] : world;
  return (
    <>
      <Line points={full} color={SELECT_COLOR} lineWidth={2.5} />
      {world.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? "#ffd35c" : SELECT_COLOR} />
        </mesh>
      ))}
    </>
  );
}

function CompositeSolid({ geometry, dimmed, selected }) {
  if (!geometry) return null;
  const color = selected ? SELECT_COLOR : dimmed ? GHOST_COLOR : BODY_COLOR;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.42}
        metalness={0.06}
        transparent={dimmed}
        opacity={dimmed ? 0.35 : 1}
      />
    </mesh>
  );
}

function GhostSolid({ geometry }) {
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={GHOST_COLOR} roughness={0.6} transparent opacity={0.28} />
    </mesh>
  );
}

function FaceHighlight({ points, height, faceType, faceIndex }) {
  const geo = useMemo(() => {
    if (faceType === "cap") {
      return extrudeLocalGeometry(points, 0.6);
    }
    return null;
  }, [points, faceType]);

  if (faceType === "cap" && geo) {
    return (
      <mesh geometry={geo} position={worldFromLocalMM(TOP_PLANE, 0, 0, height - 0.3)}>
        <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.3} depthWrite={false} />
      </mesh>
    );
  }

  if (faceType === "side" && faceIndex != null) {
    const a = points[faceIndex];
    const b = points[(faceIndex + 1) % points.length];
    const p1 = worldFromLocalMM(TOP_PLANE, a[0], a[1], 0);
    const p2 = worldFromLocalMM(TOP_PLANE, b[0], b[1], 0);
    const p3 = worldFromLocalMM(TOP_PLANE, b[0], b[1], height);
    const p4 = worldFromLocalMM(TOP_PLANE, a[0], a[1], height);
    return (
      <Line
        points={[p1, p2, p3, p4, p1]}
        color={SELECT_COLOR}
        lineWidth={4}
      />
    );
  }

  return null;
}

function EdgeOverlay({ segments, selectedKey }) {
  return (
    <>
      {segments.map((seg) => (
        <Line
          key={seg.key}
          points={[seg.a, seg.b]}
          color={seg.key === selectedKey ? "#ffd35c" : "#0a1420"}
          lineWidth={seg.key === selectedKey ? 3.5 : 1.4}
        />
      ))}
    </>
  );
}

function PullHandle({ origin, axis, active }) {
  const tip = origin.clone().addScaledVector(axis, 0.35);
  return (
    <group>
      <Line points={[origin, tip]} color={active ? "#ffd35c" : SELECT_COLOR} lineWidth={3} />
      <mesh position={tip}>
        <coneGeometry args={[0.045, 0.11, 16]} />
        <meshBasicMaterial color={active ? "#ffd35c" : SELECT_COLOR} />
      </mesh>
    </group>
  );
}

function CameraRig({ requestRef, controlsRef }) {
  const { camera } = useThree();
  const targetPos = useRef(null);
  const targetLook = useRef(null);

  useEffect(() => {
    requestRef.current = (position, lookAt) => {
      targetPos.current = position;
      targetLook.current = lookAt;
    };
  }, [requestRef]);

  useFrame(() => {
    if (targetPos.current) {
      camera.position.lerp(targetPos.current, 0.18);
      if (camera.position.distanceTo(targetPos.current) < 0.002) {
        camera.position.copy(targetPos.current);
        targetPos.current = null;
      }
    }
    if (targetLook.current && controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, 0.18);
      controlsRef.current.update();
    }
  });

  return null;
}

/* ======================================================================
   Main interactive scene: owns all pointer gesture logic.
   ====================================================================== */

function SketchScene({ state, actions, cameraRigRef, controlsRef }) {
  const axisDragFrom = useAxisDrag();
  const groundPick = useGroundRaycast();
  const edgeSegments = useMemo(
    () => edgeSegmentsForDraft(state.draft),
    [state.draft]
  );
  const pickEdge = useEdgePicker(edgeSegments);
  const { camera, gl, raycaster, size } = useThree();

  const compositeGeometry = useMemo(
    () => buildCompositeGeometry(state.draft),
    [state.draft]
  );

  const ghostGeometries = useMemo(
    () => state.committed.map((c) => buildCompositeGeometry(c)),
    [state.committed]
  );

  const pullRef = useRef(null);

  const activePlane = state.activePlane;

  // ---- drawing a profile (base or feature) ----
  function handlePlanePointerDown(event) {
    event.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;
    const local = groundPick(event, activePlane);
    if (!local) return;

    if (state.pendingProfile.length >= 3) {
      const first = worldFromLocalMM(
        activePlane,
        state.pendingProfile[0][0],
        state.pendingProfile[0][1],
        0
      );
      const screenA = first.clone().project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      const ax = ((screenA.x + 1) / 2) * size.width;
      const ay = ((1 - screenA.y) / 2) * size.height;
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (Math.hypot(px - ax, py - ay) < CLOSE_PX) {
        actions.closeProfile();
        return;
      }
    }
    actions.addProfilePoint([local.x, local.y]);
  }

  function handlePlanePointerUp() {
    if (controlsRef.current) controlsRef.current.enabled = true;
  }

  // ---- pull / push drag (base extrude or feature depth) ----
  function beginPull(event) {
    event.stopPropagation();
    if (controlsRef.current) controlsRef.current.enabled = false;
    const centroid = polygonCentroid(state.pendingProfile);
    const axisOrigin = worldFromLocalMM(activePlane, centroid.x, centroid.y, 0);
    pullRef.current = {
      pointerId: event.pointerId,
      axisOrigin,
      axisDir: activePlane.normal.clone(),
    };
    actions.beginPull();
  }

  function movePull(event) {
    if (!pullRef.current) return;
    const t = axisDragFrom(event, pullRef.current.axisOrigin, pullRef.current.axisDir);
    if (t == null) return;
    actions.updatePull(t);
  }

  function endPull() {
    if (!pullRef.current) return;
    pullRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
    actions.endPull();
  }

  // ---- selecting faces / edges on the finished draft ----
  function handleSolidPointerDown(event) {
    if (state.mode !== "idle") return;
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    const edgeHit = pickEdge(event);
    if (edgeHit) {
      actions.selectEdge(edgeHit);
      return;
    }

    if (!event.face) return;
    const worldNormal = event.face.normal
      .clone()
      .transformDirection(event.object.matrixWorld)
      .normalize();

    const dotUp = worldNormal.dot(TOP_PLANE.normal);
    if (dotUp > 0.85) {
      actions.selectFace({ type: "cap", index: null });
      return;
    }

    // match against side-face outward normals of the base profile
    let bestIndex = null;
    let bestDot = -Infinity;
    state.draft.points.forEach((_, i) => {
      const outward = edgeOutwardNormal(state.draft.points, i);
      const worldOutward = TOP_PLANE.xAxis
        .clone()
        .multiplyScalar(outward.x)
        .addScaledVector(TOP_PLANE.yAxis, outward.y)
        .normalize();
      const dot = worldOutward.dot(worldNormal);
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = i;
      }
    });

    if (bestIndex != null && bestDot > 0.5) {
      actions.selectFace({ type: "side", index: bestIndex });
    } else {
      actions.clearSelection();
    }
  }

  function handleEmptyPointerDown() {
    actions.clearSelection();
  }

  const drawing = state.mode === "drawing-base" || state.mode === "drawing-feature";
  const pulling = state.mode === "pulling-base" || state.mode === "pulling-feature";
  const showDraftSolid =
    state.draft &&
    (state.mode === "idle" || state.mode === "drawing-feature" || state.mode === "pulling-feature");

  const pullOrigin = useMemo(() => {
    if (!pulling) return null;
    const pts = state.mode === "pulling-base" ? state.draft?.points : state.pendingProfile;
    if (!pts?.length) return null;
    const c = polygonCentroid(pts);
    const z = state.mode === "pulling-feature" ? 0 : state.draft?.height || 0;
    return worldFromLocalMM(activePlane, c.x, c.y, z);
  }, [pulling, state, activePlane]);

  return (
    <>
      <CameraRig requestRef={cameraRigRef} controlsRef={controlsRef} />

      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 6]} intensity={2.1} color="#dceeff" castShadow />
      <pointLight position={[-4, 2, 3]} intensity={0.9} color="#3fa9ff" />
      <Environment preset="city" environmentIntensity={0.2} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onPointerDown={handleEmptyPointerDown}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Grid
        position={[0, -0.002, 0]}
        args={[12, 12]}
        cellSize={0.1}
        cellThickness={0.4}
        cellColor="#203e56"
        sectionSize={0.5}
        sectionThickness={0.75}
        sectionColor="#2c5c7d"
        fadeDistance={9}
        fadeStrength={1}
        infiniteGrid
      />

      {ghostGeometries.map((geo, i) => (
        <GhostSolid key={i} geometry={geo} />
      ))}

      {drawing && (
        <SketchPlaneSurface
          plane={activePlane}
          onPick={handlePlanePointerDown}
          visible={state.mode === "drawing-feature"}
        />
      )}

      {drawing && !pulling && (
        <PendingProfileLine
          plane={activePlane}
          points={state.pendingProfile}
          cursor={null}
        />
      )}

      {(state.mode === "drawing-base-ready" ||
        state.mode === "drawing-feature-ready") && (
        <>
          <PendingProfileLine plane={activePlane} points={state.pendingProfile} />
          <mesh
            onPointerDown={beginPull}
            onPointerMove={movePull}
            onPointerUp={endPull}
          >
            <shapeGeometry
              args={[
                new THREE.Shape(
                  state.pendingProfile.map(
                    ([x, y]) => new THREE.Vector2(x * UNIT, y * UNIT)
                  )
                ),
              ]}
            />
            <meshBasicMaterial
              color={SELECT_COLOR}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {pulling && pullOrigin && (
        <>
          <mesh
            onPointerMove={movePull}
            onPointerUp={endPull}
            onPointerLeave={endPull}
          >
            <planeGeometry args={[40, 40]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          <PullHandle origin={pullOrigin} axis={activePlane.normal} active />
        </>
      )}

      {showDraftSolid && (
        <group onPointerDown={handleSolidPointerDown}>
          <CompositeSolid geometry={compositeGeometry} />
        </group>
      )}

      {showDraftSolid && state.mode === "idle" && (
        <EdgeOverlay segments={edgeSegments} selectedKey={state.selectedEdgeKey} />
      )}

      {showDraftSolid && state.mode === "idle" && state.selectedFace && (
        <FaceHighlight
          points={state.draft.points}
          height={state.draft.height}
          faceType={state.selectedFace.type === "cap" ? "cap" : "side"}
          faceIndex={state.selectedFace.index}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableRotate
        enableZoom
        screenSpacePanning
        minDistance={0.6}
        maxDistance={9}
        maxPolarAngle={Math.PI * 0.92}
      />
    </>
  );
}

/* ======================================================================
   View cube (ISO / TOP / FRONT / RIGHT) + FIT VIEW
   ====================================================================== */

const VIEW_PRESETS = {
  iso: { az: 45, pol: 55, dist: 3.2 },
  top: { az: 0, pol: 1, dist: 3.2 },
  front: { az: 0, pol: 82, dist: 3.2 },
  right: { az: 90, pol: 82, dist: 3.2 },
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

/* ======================================================================
   Context toolbar (floating, over-canvas)
   ====================================================================== */

function ContextToolbar({ state, actions, objectCount, maxObjects }) {
  const atLimit = objectCount >= maxObjects;

  if (state.mode === "drawing-base" || state.mode === "drawing-feature") {
    return (
      <div className="sketch3d-context-bar">
        <span>
          {state.pendingProfile.length < 3
            ? "Tap to place points"
            : "Tap the first point to close the profile"}
        </span>
        {state.pendingProfile.length > 0 && (
          <button type="button" onClick={actions.undoPoint}>
            <Undo2 size={14} /> Back
          </button>
        )}
        <button type="button" onClick={actions.cancelDrawing}>
          <X size={14} /> Cancel
        </button>
      </div>
    );
  }

  if (state.mode === "drawing-base-ready") {
    return (
      <div className="sketch3d-context-bar">
        <span>Drag the arrow to pull a solid</span>
        <button type="button" onClick={actions.cancelDrawing}>
          <X size={14} /> Cancel
        </button>
      </div>
    );
  }

  if (state.mode === "drawing-feature-ready") {
    return (
      <div className="sketch3d-context-bar">
        <span>Drag outward to add, inward to cut</span>
        <button type="button" onClick={actions.cancelDrawing}>
          <X size={14} /> Cancel
        </button>
      </div>
    );
  }

  if (state.mode === "pulling-base") {
    return (
      <div className="sketch3d-context-bar">
        <span>{Math.round(state.pendingHeight || 0)} mm</span>
      </div>
    );
  }

  if (state.mode === "pulling-feature") {
    return (
      <div className="sketch3d-context-bar">
        <span>
          {(state.pendingDepth || 0) >= 0 ? "Boss" : "Pocket"} ·{" "}
          {Math.round(Math.abs(state.pendingDepth || 0))} mm
        </span>
      </div>
    );
  }

  if (state.mode === "idle" && state.selectedFace) {
    return (
      <div className="sketch3d-context-bar">
        <span>Face selected</span>
        <button type="button" onClick={actions.startFeatureSketch}>
          Sketch on face
        </button>
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.selectedEdgeKey) {
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-edge">
        <span>Edge selected</span>
        <div className="sketch3d-amount-stepper">
          <button type="button" onClick={() => actions.setEdgeAmount(-0.5)}>–</button>
          <span>{state.edgeAmount.toFixed(1)} mm</span>
          <button type="button" onClick={() => actions.setEdgeAmount(0.5)}>+</button>
        </div>
        <button type="button" onClick={() => actions.applyEdgeTreatment("fillet")}>
          Fillet
        </button>
        <button type="button" onClick={() => actions.applyEdgeTreatment("chamfer")}>
          Chamfer
        </button>
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.draft) {
    return (
      <div className="sketch3d-context-bar">
        <span>Tap a face or edge, or start a new sketch</span>
        <button type="button" onClick={actions.startNewBase} disabled={atLimit}>
          New sketch
        </button>
        <button
          type="button"
          className="sketch3d-primary"
          onClick={actions.commitDraft}
          disabled={atLimit}
        >
          <Check size={14} /> Add to model
        </button>
      </div>
    );
  }

  return (
    <div className="sketch3d-context-bar">
      <span>
        {atLimit ? "Object limit reached" : "Draw a closed profile to begin"}
      </span>
      {!atLimit && (
        <button type="button" onClick={actions.startNewBase}>
          New sketch
        </button>
      )}
    </div>
  );
}

/* ======================================================================
   Top-level component
   ====================================================================== */

const initialState = {
  mode: "idle", // idle | drawing-base | drawing-base-ready | pulling-base
                // | drawing-feature | drawing-feature-ready | pulling-feature
  activePlane: TOP_PLANE,
  pendingProfile: [],
  pendingHeight: 0,
  pendingDepth: 0,
  activeFeatureFace: null, // { faceType, faceIndex }
  draft: null, // { points, height, features:[], edgeTreatments:[] }
  committed: [], // ghost solids already sent this session
  selectedFace: null,
  selectedEdgeKey: null,
  edgeAmount: 2,
};

function SketchWorkspace({
  active,
  engineStatus,
  onCreateSolid,
  onSwitchToStudio,
  objectCount,
  maxObjects,
}) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const controlsRef = useRef(null);
  const cameraRigRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setState(initialState);
      historyRef.current = [];
      redoRef.current = [];
    }
  }, [active]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  function pushHistory(snapshot) {
    historyRef.current.push(deepClone(snapshot));
    if (historyRef.current.length > 40) historyRef.current.shift();
    redoRef.current = [];
  }

  function snapshotOf(next) {
    return { draft: next.draft, committed: next.committed };
  }

  const actions = useMemo(
    () => ({
      startNewBase() {
        setState((s) => ({
          ...s,
          mode: "drawing-base",
          activePlane: TOP_PLANE,
          pendingProfile: [],
          draft: null,
          selectedFace: null,
          selectedEdgeKey: null,
        }));
      },

      addProfilePoint(point) {
        setState((s) => ({ ...s, pendingProfile: [...s.pendingProfile, point] }));
      },

      undoPoint() {
        setState((s) => ({ ...s, pendingProfile: s.pendingProfile.slice(0, -1) }));
      },

      cancelDrawing() {
        setState((s) => ({
          ...s,
          mode: s.draft ? "idle" : "idle",
          pendingProfile: [],
          activeFeatureFace: null,
          activePlane: TOP_PLANE,
        }));
      },

      closeProfile() {
        setState((s) => {
          if (s.pendingProfile.length < 3) return s;
          const readyMode =
            s.mode === "drawing-feature" ? "drawing-feature-ready" : "drawing-base-ready";
          return { ...s, mode: readyMode };
        });
      },

      beginPull() {
        setState((s) => ({
          ...s,
          mode: s.mode === "drawing-feature-ready" ? "pulling-feature" : "pulling-base",
        }));
      },

      updatePull(mmValue) {
        setState((s) => {
          if (s.mode === "pulling-base") {
            return { ...s, pendingHeight: Math.max(0, mmValue) };
          }
          if (s.mode === "pulling-feature") {
            return { ...s, pendingDepth: mmValue };
          }
          return s;
        });
      },

      endPull() {
        setState((s) => {
          if (s.mode === "pulling-base") {
            if (s.pendingHeight < MIN_PULL_MM) {
              return { ...s, mode: "idle", pendingProfile: [], pendingHeight: 0 };
            }
            const draft = {
              points: s.pendingProfile,
              height: s.pendingHeight,
              features: [],
              edgeTreatments: [],
            };
            pushHistory(snapshotOf({ ...s, draft }));
            return {
              ...s,
              mode: "idle",
              draft,
              pendingProfile: [],
              pendingHeight: 0,
            };
          }
          if (s.mode === "pulling-feature") {
            if (Math.abs(s.pendingDepth) < MIN_FEATURE_MM) {
              return {
                ...s,
                mode: "idle",
                pendingProfile: [],
                pendingDepth: 0,
                activeFeatureFace: null,
                activePlane: TOP_PLANE,
              };
            }
            const feature = {
              points: s.pendingProfile,
              depth: s.pendingDepth,
              faceType: s.activeFeatureFace?.faceType || "top",
              faceIndex: s.activeFeatureFace?.faceIndex ?? null,
            };
            const draft = {
              ...s.draft,
              features: [...(s.draft?.features || []), feature],
            };
            pushHistory(snapshotOf({ ...s, draft }));
            return {
              ...s,
              mode: "idle",
              draft,
              pendingProfile: [],
              pendingDepth: 0,
              activeFeatureFace: null,
              activePlane: TOP_PLANE,
            };
          }
          return s;
        });
      },

      selectFace(face) {
        setState((s) => ({ ...s, selectedFace: face, selectedEdgeKey: null }));
      },

      selectEdge(edgeHit) {
        setState((s) => ({
          ...s,
          selectedEdgeKey: edgeHit.key,
          selectedEdgeMeta: { edgeType: edgeHit.edgeType, edgeIndex: edgeHit.edgeIndex },
          selectedFace: null,
        }));
      },

      clearSelection() {
        setState((s) => ({ ...s, selectedFace: null, selectedEdgeKey: null, selectedEdgeMeta: null }));
      },

      setEdgeAmount(delta) {
        setState((s) => ({
          ...s,
          edgeAmount: Math.max(0.5, Math.round((s.edgeAmount + delta) * 10) / 10),
        }));
      },

      applyEdgeTreatment(mode) {
        setState((s) => {
          if (!s.selectedEdgeMeta) return s;
          const treatment = {
            edgeType: s.selectedEdgeMeta.edgeType,
            edgeIndex: s.selectedEdgeMeta.edgeIndex,
            amount: s.edgeAmount,
            mode,
          };
          const draft = {
            ...s.draft,
            edgeTreatments: [...(s.draft?.edgeTreatments || []), treatment],
          };
          pushHistory(snapshotOf({ ...s, draft }));
          setToast(`${mode === "fillet" ? "Fillet" : "Chamfer"} ${s.edgeAmount}mm added`);
          return { ...s, draft, selectedEdgeKey: null, selectedEdgeMeta: null };
        });
      },

      startFeatureSketch() {
        setState((s) => {
          if (!s.selectedFace || !s.draft) return s;
          const plane =
            s.selectedFace.type === "side"
              ? sideFacePlane(s.draft.points, s.selectedFace.index)
              : makePlane(
                  worldFromLocalMM(TOP_PLANE, 0, 0, s.draft.height),
                  TOP_PLANE.xAxis,
                  TOP_PLANE.yAxis,
                  TOP_PLANE.normal
                );
          if (!plane) return s;
          return {
            ...s,
            mode: "drawing-feature",
            activePlane: plane,
            pendingProfile: [],
            activeFeatureFace: {
              faceType: s.selectedFace.type === "side" ? "side" : "top",
              faceIndex: s.selectedFace.type === "side" ? s.selectedFace.index : null,
            },
            selectedFace: null,
          };
        });
      },

      deleteSelection() {
        setState((s) => {
          if (s.selectedEdgeMeta) {
            const draft = {
              ...s.draft,
              edgeTreatments: (s.draft?.edgeTreatments || []).filter(
                (t) =>
                  !(t.edgeType === s.selectedEdgeMeta.edgeType && t.edgeIndex === s.selectedEdgeMeta.edgeIndex)
              ),
            };
            pushHistory(snapshotOf({ ...s, draft }));
            return { ...s, draft, selectedEdgeKey: null, selectedEdgeMeta: null };
          }
          if (s.selectedFace) {
            return { ...s, selectedFace: null };
          }
          if (s.draft) {
            const next = { ...s, draft: null, selectedFace: null, selectedEdgeKey: null };
            pushHistory(snapshotOf(next));
            return { ...next, mode: "idle" };
          }
          return s;
        });
      },

      undo() {
        if (!historyRef.current.length) return;
        setState((s) => {
          redoRef.current.push(deepClone(snapshotOf(s)));
          const prev = historyRef.current.pop();
          return { ...s, ...prev, mode: "idle", selectedFace: null, selectedEdgeKey: null };
        });
      },

      redo() {
        if (!redoRef.current.length) return;
        setState((s) => {
          historyRef.current.push(deepClone(snapshotOf(s)));
          const next = redoRef.current.pop();
          return { ...s, ...next, mode: "idle", selectedFace: null, selectedEdgeKey: null };
        });
      },

      async commitDraft() {
        setState((s) => {
          if (!s.draft) return s;
          runCommit(s.draft);
          return s;
        });
      },
    }),
    []
  );

  async function runCommit(draft) {
    if (objectCount >= maxObjects) {
      setToast("Object limit reached");
      return;
    }
    setBusy(true);
    try {
      const engine = await onCreateSolid({
        points: draft.points,
        height: draft.height,
        twistDegrees: 0,
        scaleTop: 1,
        plane: "top",
        features: draft.features || [],
        edgeTreatments: draft.edgeTreatments || [],
      });
      setToast(`Added to model${engine ? ` · ${engine}` : ""}`);
      setState((s) => ({
        ...s,
        committed: [...s.committed, s.draft],
        draft: null,
        mode: "idle",
        selectedFace: null,
        selectedEdgeKey: null,
      }));
      historyRef.current = [];
      redoRef.current = [];
    } catch (err) {
      setToast(err?.message || "Could not add to model");
    } finally {
      setBusy(false);
    }
  }

  function handleView(preset) {
    const cfg = VIEW_PRESETS[preset];
    if (!cfg || !cameraRigRef.current) return;
    const az = THREE.MathUtils.degToRad(cfg.az);
    const pol = THREE.MathUtils.degToRad(cfg.pol);
    const target = controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0.3, 0);
    const pos = new THREE.Vector3(
      target.x + cfg.dist * Math.sin(pol) * Math.sin(az),
      target.y + cfg.dist * Math.cos(pol),
      target.z + cfg.dist * Math.sin(pol) * Math.cos(az)
    );
    cameraRigRef.current(pos, target);
  }

  function handleFit() {
    // Bounding box is computed lazily from current draft/committed dims;
    // a simple, reliable heuristic beats an exact fit here since draft
    // shapes are user-drawn and arbitrary in size.
    const pts = state.draft?.points || [];
    if (!pts.length || !cameraRigRef.current) {
      handleView("iso");
      return;
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...ys) - Math.min(...ys);
    const h = state.draft?.height || 0;
    const radius = Math.max(w, d, h, 40) * UNIT;
    const target = new THREE.Vector3(0, (h * UNIT) / 2, 0);
    const dist = Math.max(1.2, radius * 2.2);
    const az = THREE.MathUtils.degToRad(45);
    const pol = THREE.MathUtils.degToRad(55);
    const pos = new THREE.Vector3(
      target.x + dist * Math.sin(pol) * Math.sin(az),
      target.y + dist * Math.cos(pol),
      target.z + dist * Math.sin(pol) * Math.cos(az)
    );
    cameraRigRef.current(pos, target);
  }

  if (!active) return null;

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

        <span className="sketch3d-object-count">
          {objectCount} / {maxObjects} OBJECTS
        </span>

        <div className="sketch3d-topbar-actions">
          <button type="button" onClick={actions.undo} disabled={!historyRef.current.length}>
            <Undo2 size={16} />
          </button>
          <button type="button" onClick={actions.redo} disabled={!redoRef.current.length}>
            <Redo2 size={16} />
          </button>
          <button
            type="button"
            onClick={actions.deleteSelection}
            disabled={!state.draft && !state.selectedFace && !state.selectedEdgeKey}
          >
            <Trash2 size={16} />
          </button>
          <button type="button" onClick={onSwitchToStudio} className="sketch3d-studio-btn">
            Send to Studio
          </button>
        </div>
      </div>

      <div className="sketch3d-canvas-wrap">
        <Canvas
          shadows
          camera={{ position: [2.4, 1.9, 2.4], fov: 48, near: 0.01, far: 100 }}
          gl={{ antialias: true }}
        >
          <SketchScene
            state={state}
            actions={actions}
            cameraRigRef={cameraRigRef}
            controlsRef={controlsRef}
          />
        </Canvas>

        <ViewCube onView={handleView} onFit={handleFit} />

        <div className="sketch3d-floating-toolbar">
          <ContextToolbar
            state={state}
            actions={actions}
            objectCount={objectCount}
            maxObjects={maxObjects}
          />
        </div>

        {busy && (
          <div className="sketch3d-busy">Building…</div>
        )}

        {toast && <div className="sketch3d-toast">{toast}</div>}
      </div>
    </div>
  );
}

export default SketchWorkspace;
