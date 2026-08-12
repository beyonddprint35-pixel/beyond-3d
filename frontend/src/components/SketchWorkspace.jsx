import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import {
  Check,
  Circle as CircleIcon,
  Maximize2,
  Minus,
  MousePointer2,
  Redo2,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import "./SketchWorkspace.css";

/* ======================================================================
   BEYOND CREATOR — SKETCH MODE V12
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

   V12 adds:
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
   ====================================================================== */

const UNIT = 0.02; // scene units per millimetre
const MIN_PULL_MM = 1;
const MIN_FEATURE_MM = 0.5;
const SNAP_MM = 2.2;
const GRID_MM = 1;
const CIRCLE_SEGMENTS = 48;

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

function buildCompositeGeometry(draft) {
  if (!draft?.points?.length) return null;

  let workingMesh = meshFromGeometry(
    placeGeometry(extrudeLocalGeometry(draft.points, draft.height), TOP_PLANE)
  );

  for (const feature of draft.features || []) {
    if (!feature.points?.length || Math.abs(feature.depth) < MIN_FEATURE_MM) continue;

    const featurePlane =
      feature.faceType === "side"
        ? sideFacePlane(draft.points, feature.faceIndex)
        : TOP_PLANE;
    if (!featurePlane) continue;

    const direction = feature.depth >= 0 ? 1 : -1;
    const magnitude = Math.abs(feature.depth);

    let toolGeometry;
    if (feature.faceType === "side") {
      toolGeometry = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        direction,
        0
      );
    } else {
      const normalOffset =
        direction >= 0 ? draft.height : draft.height - magnitude;
      toolGeometry = placeGeometry(
        extrudeLocalGeometry(feature.points, magnitude),
        featurePlane,
        1,
        normalOffset
      );
    }

    const toolMesh = meshFromGeometry(toolGeometry);

    try {
      const next =
        direction >= 0
          ? CSG.union(workingMesh, toolMesh)
          : CSG.subtract(workingMesh, toolMesh);
      next.material = workingMesh.material;
      workingMesh = next;
    } catch (error) {
      console.warn("Beyond Sketch preview boolean failed:", error);
    }
  }

  workingMesh.geometry.computeVertexNormals();
  return workingMesh.geometry;
}

function edgeSegmentsForDraft(draft) {
  if (!draft?.points?.length) return [];
  const { points, height } = draft;
  const segments = [];

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    segments.push({
      key: `v-${i}`,
      edgeType: "vertical",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
    });
    segments.push({
      key: `t-${i}`,
      edgeType: "top",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], height),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], height),
    });
    segments.push({
      key: `b-${i}`,
      edgeType: "bottom",
      edgeIndex: i,
      a: worldFromLocalMM(TOP_PLANE, a[0], a[1], 0),
      b: worldFromLocalMM(TOP_PLANE, b[0], b[1], 0),
    });
  }

  return segments;
}

/* ======================================================================
   Pointer / ray helpers
   ====================================================================== */

function isTouchPointer(event) {
  return event?.pointerType === "touch" || event?.nativeEvent?.pointerType === "touch";
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
      let bestDistance = 14;

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
          best = segment;
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

function getSnapCandidates(state) {
  const points = [];

  for (const entity of state.sketchEntities || []) {
    if (entity.type === "line") {
      points.push(entity.start, entity.end);
    }
  }

  for (const profile of state.sketchProfiles || []) {
    for (const [x, y] of profile.points) points.push({ x, y });
  }

  for (const point of state.lineChain || []) points.push(point);

  return points;
}

function snapSketchPoint(raw, state) {
  let point = {
    x: Math.round(raw.x / GRID_MM) * GRID_MM,
    y: Math.round(raw.y / GRID_MM) * GRID_MM,
  };
  let snap = "grid";

  const candidates = getSnapCandidates(state);
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
    snap = "endpoint";
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

/* ======================================================================
   Scene primitives
   ====================================================================== */

function CameraRig({ requestRef, controlsRef }) {
  const { camera } = useThree();
  const targetPosition = useRef(null);
  const targetLook = useRef(null);
  const targetUp = useRef(null);

  useEffect(() => {
    requestRef.current = (position, lookAt, up = null) => {
      targetPosition.current = position.clone();
      targetLook.current = lookAt.clone();
      targetUp.current = up ? up.clone().normalize() : null;
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

function SketchPlaneSurface({ plane, onPointerDown, onPointerMove, onPointerLeave }) {
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

function SketchEntityLines({ plane, entities, lineChain, previewPoint }) {
  return (
    <>
      {entities.map((entity) => {
        if (entity.type !== "line") return null;
        return (
          <Line
            key={entity.id}
            points={[
              worldFromLocalMM(plane, entity.start.x, entity.start.y, 0.05),
              worldFromLocalMM(plane, entity.end.x, entity.end.y, 0.05),
            ]}
            color="#80bce8"
            lineWidth={2.2}
          />
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

function ProfileRegion({ plane, profile, selected, onSelect }) {
  const geometry = useMemo(
    () => flatWorldGeometry(profile.points, plane, 0.025),
    [profile.points, plane]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      onPointerDown={(event) => {
        if (isTouchPointer(event)) return;
        event.stopPropagation();
        onSelect(profile.id);
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

function PullGizmo({ origin, axis, active, onPointerDown, onPointerMove, onPointerUp }) {
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
      if (isTouchPointer(event)) return;
      event.stopPropagation();
      event.target?.setPointerCapture?.(event.pointerId);
      onPointerDown(event);
    },
    onPointerMove: (event) => {
      if (isTouchPointer(event)) return;
      onPointerMove(event);
    },
    onPointerUp: (event) => {
      if (isTouchPointer(event)) return;
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
        <cylinderGeometry args={[0.045, 0.045, 0.46, 18]} />
        <meshBasicMaterial
          color={active ? SNAP_COLOR : SELECT_COLOR}
          transparent
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.55, 0]} {...handlers}>
        <coneGeometry args={[0.072, 0.16, 20]} />
        <meshBasicMaterial color={active ? SNAP_COLOR : SELECT_COLOR} />
      </mesh>
      <mesh position={[0, 0, 0]} {...handlers}>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshBasicMaterial color={active ? SNAP_COLOR : SELECT_COLOR} />
      </mesh>
    </group>
  );
}

function FaceHighlight({ draft, face }) {
  const geometry = useMemo(() => {
    if (!draft || !face) return null;
    if (face.type === "cap") {
      return flatWorldGeometry(draft.points, TOP_PLANE, draft.height + 0.03);
    }
    return null;
  }, [draft, face]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!draft || !face) return null;

  if (face.type === "cap" && geometry) {
    return (
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={SELECT_COLOR}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  if (face.type === "side" && face.index != null) {
    const a = draft.points[face.index];
    const b = draft.points[(face.index + 1) % draft.points.length];
    const p1 = worldFromLocalMM(TOP_PLANE, a[0], a[1], 0);
    const p2 = worldFromLocalMM(TOP_PLANE, b[0], b[1], 0);
    const p3 = worldFromLocalMM(TOP_PLANE, b[0], b[1], draft.height);
    const p4 = worldFromLocalMM(TOP_PLANE, a[0], a[1], draft.height);
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
      {segments.map((segment) => (
        <Line
          key={segment.key}
          points={[segment.a, segment.b]}
          color={segment.key === selectedKey ? SNAP_COLOR : "#132331"}
          lineWidth={segment.key === selectedKey ? 3.6 : 1.25}
        />
      ))}
    </>
  );
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

  const committedGeometries = useMemo(
    () => state.committed.map((item) => buildCompositeGeometry(item)),
    [state.committed]
  );

  useEffect(
    () => () => {
      committedGeometries.forEach((geo) => geo?.dispose?.());
    },
    [committedGeometries]
  );

  const draftForPreview = useMemo(() => {
    if (!state.draft) return null;

    if (state.mode === "pulling-face" && state.selectedFace) {
      if (state.selectedFace.type === "cap") {
        return {
          ...state.draft,
          height: Math.max(MIN_PULL_MM, state.draft.height + state.pendingPull),
        };
      }

      if (state.selectedFace.type === "side") {
        return {
          ...state.draft,
          points: offsetSideFacePoints(
            state.draft.points,
            state.selectedFace.index,
            state.pendingPull
          ),
        };
      }
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
            points: profile.points,
            depth: state.pendingPull,
            faceType: state.sketchContext.faceType,
            faceIndex: state.sketchContext.faceIndex,
          },
        ],
      };
    }

    return state.draft;
  }, [state]);

  const draftGeometry = useMemo(
    () => buildCompositeGeometry(draftForPreview),
    [draftForPreview]
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

  const profilePullOrigin = useMemo(() => {
    if (!selectedProfile) return null;
    const center = polygonCentroid(selectedProfile.points);
    return worldFromLocalMM(state.activePlane, center.x, center.y, 0.06);
  }, [selectedProfile, state.activePlane]);

  const facePull = useMemo(() => {
    if (!state.draft || !state.selectedFace) return null;

    if (state.selectedFace.type === "cap") {
      const center = polygonCentroid(state.draft.points);
      return {
        origin: worldFromLocalMM(
          TOP_PLANE,
          center.x,
          center.y,
          state.draft.height + 0.06
        ),
        axis: TOP_PLANE.normal.clone(),
      };
    }

    if (state.selectedFace.type === "side") {
      const i = state.selectedFace.index;
      const a = state.draft.points[i];
      const b = state.draft.points[(i + 1) % state.draft.points.length];
      const plane = sideFacePlane(state.draft.points, i);
      if (!plane) return null;
      const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return {
        origin: worldFromLocalMM(plane, edgeLength / 2, state.draft.height / 2, 0.06),
        axis: plane.normal.clone(),
      };
    }

    return null;
  }, [state.draft, state.selectedFace]);

  function handleSketchPointerMove(event) {
    if (isTouchPointer(event)) return;
    const raw = planeRaycast(event, state.activePlane);
    if (!raw) return;
    actions.setHoverPoint(snapSketchPoint(raw, state));
  }

  function handleSketchPointerDown(event) {
    if (isTouchPointer(event)) return;
    event.stopPropagation();
    const raw = planeRaycast(event, state.activePlane);
    if (!raw) return;
    actions.placeSketchPoint(snapSketchPoint(raw, state));
  }

  function beginProfilePull(event) {
    if (!selectedProfile || !profilePullOrigin) return;
    if (controlsRef.current) controlsRef.current.enabled = false;

    const axis = state.activePlane.normal.clone().normalize();
    const start = axisDragFrom(event, profilePullOrigin, axis) ?? 0;
    pullRef.current = {
      type: "profile",
      origin: profilePullOrigin.clone(),
      axis,
      start,
    };
    actions.beginProfilePull();
  }

  function beginFacePull(event) {
    if (!facePull) return;
    if (controlsRef.current) controlsRef.current.enabled = false;

    const start = axisDragFrom(event, facePull.origin, facePull.axis) ?? 0;
    pullRef.current = {
      type: "face",
      origin: facePull.origin.clone(),
      axis: facePull.axis.clone(),
      start,
    };
    actions.beginFacePull();
  }

  function movePull(event) {
    if (!pullRef.current) return;
    const current = axisDragFrom(
      event,
      pullRef.current.origin,
      pullRef.current.axis
    );
    if (current == null) return;
    actions.updatePull(current - pullRef.current.start);
  }

  function endPull() {
    if (!pullRef.current) return;
    const type = pullRef.current.type;
    pullRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;

    if (type === "profile") actions.endProfilePull();
    if (type === "face") actions.endFacePull();
  }

  function handleSolidPointerDown(event) {
    if (state.mode !== "idle") return;
    if (isTouchPointer(event)) return;
    event.stopPropagation();

    const edgeHit = pickEdge(event);
    if (edgeHit) {
      actions.selectEdge(edgeHit);
      return;
    }

    if (!event.face || !state.draft) return;

    const worldNormal = event.face.normal
      .clone()
      .transformDirection(event.object.matrixWorld)
      .normalize();

    const dotUp = worldNormal.dot(TOP_PLANE.normal);
    if (dotUp > 0.86) {
      actions.selectFace({ type: "cap", index: null });
      return;
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

    if (bestIndex != null && bestDot > 0.48) {
      actions.selectFace({ type: "side", index: bestIndex });
    } else {
      actions.clearSelection();
    }
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
      <Environment preset="city" environmentIntensity={0.18} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onPointerDown={(event) => {
          if (isTouchPointer(event)) return;
          if (state.mode === "idle") actions.clearSelection();
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

      {committedGeometries.map((geometry, index) => (
        <GhostSolid key={index} geometry={geometry} />
      ))}

      {draftGeometry && (
        <group onPointerDown={handleSolidPointerDown}>
          <CompositeSolid
            geometry={draftGeometry}
            preview={state.mode === "pulling-face" || state.mode === "pulling-profile"}
          />
        </group>
      )}

      {basePullGeometry && <CompositeSolid geometry={basePullGeometry} preview />}

      {state.draft && state.mode === "idle" && (
        <EdgeOverlay
          segments={edgeSegments}
          selectedKey={state.selectedEdgeKey}
        />
      )}

      {state.draft && state.selectedFace && state.mode !== "sketching" && (
        <FaceHighlight draft={state.draft} face={state.selectedFace} />
      )}

      {sketching && (
        <>
          <SketchPlaneSurface
            plane={state.activePlane}
            onPointerDown={handleSketchPointerDown}
            onPointerMove={handleSketchPointerMove}
            onPointerLeave={() => actions.setHoverPoint(null)}
          />

          <SketchEntityLines
            plane={state.activePlane}
            entities={state.sketchEntities}
            lineChain={state.lineChain}
            previewPoint={state.activeTool === "line" ? state.hoverPoint : null}
          />

          <ToolPreview plane={state.activePlane} state={state} />
          <SnapMarker plane={state.activePlane} hoverPoint={state.hoverPoint} />

          {state.sketchProfiles.map((profile) => (
            <ProfileRegion
              key={profile.id}
              plane={state.activePlane}
              profile={profile}
              selected={profile.id === state.activeProfileId}
              onSelect={actions.selectProfile}
            />
          ))}
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
        />
      )}

      {state.mode === "idle" && facePull && state.selectedFace && (
        <PullGizmo
          origin={facePull.origin}
          axis={facePull.axis}
          active={false}
          onPointerDown={beginFacePull}
          onPointerMove={movePull}
          onPointerUp={endPull}
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
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableRotate
        enableZoom
        screenSpacePanning
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

function ContextToolbar({ state, actions, objectCount, maxObjects }) {
  const atLimit = objectCount >= maxObjects;

  if (state.mode === "sketching") {
    let instruction = "Draw on the plane";
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
            ? "Profile selected · drag the arrow outward to add or inward to cut"
            : "Profile selected · drag the arrow to create the solid"}
        </span>
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

  if (state.mode === "idle" && state.selectedEdgeKey) {
    return (
      <div className="sketch3d-context-bar sketch3d-context-bar-edge">
        <span>Edge selected</span>
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
          Face selected · drag the arrow to offset, or choose a sketch tool
        </span>
        <NumericPull
          value={state.numericValue}
          onChange={actions.setNumericValue}
          onApply={actions.applyFaceNumeric}
          signed
        />
        <button type="button" onClick={actions.clearSelection}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (state.mode === "idle" && state.draft) {
    return (
      <div className="sketch3d-context-bar">
        <span>
          Tap a face to offset it · tap an edge for fillet/chamfer · choose a sketch tool to add a feature
        </span>
      </div>
    );
  }

  return (
    <div className="sketch3d-context-bar">
      <span>
        {atLimit
          ? "Object limit reached"
          : "Choose Line, Rectangle or Circle to begin a sketch"}
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
    activeProfileId: null,
    pendingPull: 0,
    numericValue: "10",
    draft: null,
    committed: [],
    selectedFace: null,
    selectedEdgeKey: null,
    selectedEdgeMeta: null,
    edgeAmount: 2,
  };
}

/* ======================================================================
   Top-level workspace
   ====================================================================== */

function SketchWorkspace({
  active,
  engineStatus,
  onCreateSolid,
  onSwitchToStudio,
  objectCount,
  maxObjects,
}) {
  const [state, setState] = useState(freshState);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const controlsRef = useRef(null);
  const cameraRigRef = useRef(null);

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
            activePlane: TOP_PLANE,
          }));
        } else {
          setState((s) => ({
            ...s,
            selectedFace: null,
            selectedEdgeKey: null,
            selectedEdgeMeta: null,
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
    activeProfileId: null,
    pendingPull: 0,
  });

  const actions = useMemo(() => {
    const api = {
      setHoverPoint(point) {
        setState((s) => ({ ...s, hoverPoint: point }));
      },

      setNumericValue(value) {
        setState((s) => ({ ...s, numericValue: value }));
      },

      activateTool(tool) {
        if (tool === "select") {
          setState((s) => {
            if (["sketching", "profile-ready"].includes(s.mode)) {
              return clearSketchFields(s);
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
            mode: "sketching",
            activeTool: tool,
            activePlane: plane,
            sketchContext: {
              kind: "feature",
              faceType: s.selectedFace.type === "side" ? "side" : "top",
              faceIndex: s.selectedFace.type === "side" ? s.selectedFace.index : null,
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
            };

            const shouldClose =
              s.lineChain.length >= 3 &&
              almostSamePoint(point, s.lineChain[0], 0.15);

            if (shouldClose) {
              const profilePoints = ensureCCW(
                s.lineChain.map((p) => [p.x, p.y])
              );
              const profile = {
                id: uid("profile"),
                type: "polyline",
                points: profilePoints,
              };

              return {
                ...s,
                sketchEntities: [...s.sketchEntities, entity],
                sketchProfiles: [...s.sketchProfiles, profile],
                lineChain: [],
                toolStart: null,
                hoverPoint: null,
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
            const entities = profilePoints.map((p, index) => ({
              id: uid("line"),
              type: "line",
              start: { x: p[0], y: p[1] },
              end: {
                x: profilePoints[(index + 1) % profilePoints.length][0],
                y: profilePoints[(index + 1) % profilePoints.length][1],
              },
            }));

            return {
              ...s,
              sketchEntities: [...s.sketchEntities, ...entities],
              sketchProfiles: [
                ...s.sketchProfiles,
                { id: uid("profile"), type: "rectangle", points: profilePoints },
              ],
              toolStart: null,
              hoverPoint: null,
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

            return {
              ...s,
              sketchProfiles: [
                ...s.sketchProfiles,
                {
                  id: uid("profile"),
                  type: "circle",
                  center: { ...s.toolStart },
                  radius,
                  points: circlePoints(s.toolStart, radius),
                },
              ],
              toolStart: null,
              hoverPoint: null,
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
        setState((s) => ({
          ...s,
          mode: "profile-ready",
          activeProfileId: profileId,
          activeTool: "select",
          lineChain: [],
          toolStart: null,
          hoverPoint: null,
          numericValue: s.sketchContext?.kind === "feature" ? "5" : "10",
        }));
      },

      backToSketch() {
        setState((s) => ({
          ...s,
          mode: "sketching",
          activeTool: "rectangle",
          activeProfileId: null,
          pendingPull: 0,
        }));
      },

      beginProfilePull() {
        setState((s) => ({
          ...s,
          mode: "pulling-profile",
          pendingPull: 0,
        }));
      },

      beginFacePull() {
        setState((s) => ({
          ...s,
          mode: "pulling-face",
          pendingPull: 0,
        }));
      },

      updatePull(value) {
        setState((s) => {
          if (s.mode === "pulling-profile") {
            if (s.sketchContext?.kind === "base") {
              return { ...s, pendingPull: Math.max(0, value) };
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

            const draft = {
              points: profile.points,
              height: s.pendingPull,
              features: [],
              edgeTreatments: [],
            };
            pushHistory(snapshotOf({ ...s, draft }));
            return clearSketchFields({ ...s, draft });
          }

          if (Math.abs(s.pendingPull) < MIN_FEATURE_MM) {
            return { ...s, mode: "profile-ready", pendingPull: 0 };
          }

          const feature = {
            points: profile.points,
            depth: s.pendingPull,
            faceType: s.sketchContext.faceType,
            faceIndex: s.sketchContext.faceIndex,
          };
          const draft = {
            ...s.draft,
            features: [...(s.draft?.features || []), feature],
          };
          pushHistory(snapshotOf({ ...s, draft }));
          return clearSketchFields({ ...s, draft });
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
            const draft = {
              points: profile.points,
              height: amount,
              features: [],
              edgeTreatments: [],
            };
            pushHistory(snapshotOf({ ...s, draft }));
            return clearSketchFields({ ...s, draft });
          }

          if (Math.abs(amount) < MIN_FEATURE_MM) {
            setToast(`Minimum feature depth is ${MIN_FEATURE_MM} mm`);
            return s;
          }

          const draft = {
            ...s.draft,
            features: [
              ...(s.draft?.features || []),
              {
                points: profile.points,
                depth: amount,
                faceType: s.sketchContext.faceType,
                faceIndex: s.sketchContext.faceIndex,
              },
            ],
          };
          pushHistory(snapshotOf({ ...s, draft }));
          return clearSketchFields({ ...s, draft });
        });
      },

      endFacePull() {
        setState((s) => {
          if (s.mode !== "pulling-face" || !s.selectedFace || !s.draft) return s;
          if (Math.abs(s.pendingPull) < 0.05) {
            return { ...s, mode: "idle", pendingPull: 0 };
          }

          let draft = s.draft;
          if (s.selectedFace.type === "cap") {
            draft = {
              ...s.draft,
              height: Math.max(MIN_PULL_MM, s.draft.height + s.pendingPull),
            };
          } else if (s.selectedFace.type === "side") {
            draft = {
              ...s.draft,
              points: offsetSideFacePoints(
                s.draft.points,
                s.selectedFace.index,
                s.pendingPull
              ),
            };
          }

          pushHistory(snapshotOf({ ...s, draft }));
          return {
            ...s,
            draft,
            mode: "idle",
            pendingPull: 0,
            numericValue: "5",
          };
        });
      },

      applyFaceNumeric() {
        setState((s) => {
          if (!s.selectedFace || !s.draft) return s;
          const amount = Number(s.numericValue);
          if (!Number.isFinite(amount) || Math.abs(amount) < 0.01) return s;

          let draft = s.draft;
          if (s.selectedFace.type === "cap") {
            draft = {
              ...s.draft,
              height: Math.max(MIN_PULL_MM, s.draft.height + amount),
            };
          } else {
            draft = {
              ...s.draft,
              points: offsetSideFacePoints(
                s.draft.points,
                s.selectedFace.index,
                amount
              ),
            };
          }

          pushHistory(snapshotOf({ ...s, draft }));
          return { ...s, draft };
        });
      },

      selectFace(face) {
        setState((s) => ({
          ...s,
          selectedFace: face,
          selectedEdgeKey: null,
          selectedEdgeMeta: null,
          activeTool: "select",
          numericValue: "5",
        }));
      },

      selectEdge(edge) {
        setState((s) => ({
          ...s,
          selectedEdgeKey: edge.key,
          selectedEdgeMeta: {
            edgeType: edge.edgeType,
            edgeIndex: edge.edgeIndex,
          },
          selectedFace: null,
          activeTool: "select",
        }));
      },

      clearSelection() {
        setState((s) => ({
          ...s,
          selectedFace: null,
          selectedEdgeKey: null,
          selectedEdgeMeta: null,
        }));
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
          const treatment = {
            edgeType: s.selectedEdgeMeta.edgeType,
            edgeIndex: s.selectedEdgeMeta.edgeIndex,
            amount: s.edgeAmount,
            mode,
          };
          const draft = {
            ...s.draft,
            edgeTreatments: [
              ...(s.draft.edgeTreatments || []),
              treatment,
            ],
          };
          pushHistory(snapshotOf({ ...s, draft }));
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
            pushHistory(snapshotOf({ ...s, draft }));
            return {
              ...s,
              draft,
              selectedEdgeKey: null,
              selectedEdgeMeta: null,
            };
          }

          if (s.selectedFace) {
            return { ...s, selectedFace: null };
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

    const draftToCommit = deepClone(state.draft);

    setBusy(true);
    try {
      const engine = await onCreateSolid({
        points: draftToCommit.points,
        height: draftToCommit.height,
        twistDegrees: 0,
        scaleTop: 1,
        plane: "top",
        features: draftToCommit.features || [],
        edgeTreatments: draftToCommit.edgeTreatments || [],
      });

      setToast(`Added to model${engine ? ` · ${engine}` : ""}`);
      setState((s) => ({
        ...s,
        committed: [...s.committed, draftToCommit],
        draft: null,
        mode: "idle",
        activeTool: "select",
        selectedFace: null,
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

        <span className="sketch3d-object-count">
          {objectCount} / {maxObjects} OBJECTS
        </span>

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
              !state.selectedEdgeKey
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
