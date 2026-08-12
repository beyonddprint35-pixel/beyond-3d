import * as THREE from "three";
import { CAD_KERNEL_API_VERSION } from "./CadKernelRuntime";

const SCENE_UNIT_PER_MM = 0.02;
const FACE_ENUM_CANDIDATES = ["TopAbs_FACE", "TopAbs_ShapeEnum_TopAbs_FACE"];
const EDGE_ENUM_CANDIDATES = ["TopAbs_EDGE", "TopAbs_ShapeEnum_TopAbs_EDGE"];
const SHAPE_ENUM_CANDIDATES = ["TopAbs_SHAPE", "TopAbs_ShapeEnum_TopAbs_SHAPE"];

function getEnum(oc, candidates) {
  for (const key of candidates) {
    if (oc[key] != null) return oc[key];
    if (oc.TopAbs_ShapeEnum?.[key]) return oc.TopAbs_ShapeEnum[key];
  }
  return undefined;
}

function ctorCandidates(oc, base) {
  const out = [];
  if (typeof oc[base] === "function") out.push(oc[base]);
  for (let i = 1; i <= 12; i += 1) {
    const candidate = oc[`${base}_${i}`];
    if (typeof candidate === "function") out.push(candidate);
  }
  return out;
}

function constructAny(oc, base, argumentSets) {
  const ctors = ctorCandidates(oc, base);
  let lastError = null;
  for (const Ctor of ctors) {
    for (const args of argumentSets) {
      try {
        return new Ctor(...args);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw new Error(`${base} constructor unavailable${lastError ? `: ${lastError.message}` : ""}`);
}

function callFirst(target, names, ...args) {
  for (const name of names) {
    if (typeof target?.[name] === "function") return target[name](...args);
  }
  throw new Error(`Missing method: ${names.join(" / ")}`);
}

function deleteSafe(value) {
  try {
    value?.delete?.();
  } catch {
    // Emscripten wrappers may already have been released by OCCT ownership.
  }
}

function point3(oc, x, y, z) {
  return constructAny(oc, "gp_Pnt", [[x, y, z], []]);
}

function vec3(oc, x, y, z) {
  return constructAny(oc, "gp_Vec", [[x, y, z], []]);
}

function dir3(oc, x, y, z) {
  return constructAny(oc, "gp_Dir", [[x, y, z], []]);
}

function axis1(oc, origin, direction) {
  return constructAny(oc, "gp_Ax1", [[origin, direction], []]);
}

function makeVertex(oc, x, y, z) {
  const p = point3(oc, x, y, z);
  const maker = constructAny(oc, "BRepBuilderAPI_MakeVertex", [[p]]);
  const vertex = callFirst(maker, ["Vertex", "Shape"]);
  deleteSafe(p);
  return { maker, vertex };
}

function makeWireFromPoints(oc, points, z = 0) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error("A native BRep profile needs at least 3 points");
  }

  const polygon = constructAny(oc, "BRepBuilderAPI_MakePolygon", [[]]);
  const vertexMakers = [];
  try {
    for (const [x, y] of points) {
      const { maker, vertex } = makeVertex(oc, x, y, z);
      vertexMakers.push(maker);
      callFirst(polygon, ["Add"], vertex);
    }
    callFirst(polygon, ["Close"]);
    if (typeof polygon.IsDone === "function" && !polygon.IsDone()) {
      throw new Error("OCCT could not close the sketch wire");
    }
    return { polygon, wire: callFirst(polygon, ["Wire"]) };
  } finally {
    vertexMakers.forEach(deleteSafe);
  }
}

function makePrism(oc, points, zStartMM, heightMM) {
  const { polygon, wire } = makeWireFromPoints(oc, points, zStartMM);
  const faceMaker = constructAny(oc, "BRepBuilderAPI_MakeFace", [
    [wire, true],
    [wire],
  ]);
  const face = callFirst(faceMaker, ["Face", "Shape"]);
  const vector = vec3(oc, 0, 0, heightMM);
  const prismMaker = constructAny(oc, "BRepPrimAPI_MakePrism", [
    [face, vector, false, true],
    [face, vector, false],
    [face, vector],
  ]);
  const shape = callFirst(prismMaker, ["Shape"]);
  deleteSafe(vector);
  deleteSafe(faceMaker);
  deleteSafe(polygon);
  return { maker: prismMaker, shape };
}

function makeRevolve(oc, points, axisName = "x", angleDegrees = 360) {
  const { polygon, wire } = makeWireFromPoints(oc, points, 0);
  const faceMaker = constructAny(oc, "BRepBuilderAPI_MakeFace", [[wire, true], [wire]]);
  const face = callFirst(faceMaker, ["Face", "Shape"]);
  const origin = point3(oc, 0, 0, 0);
  const direction = axisName === "y" ? dir3(oc, 0, 1, 0) : dir3(oc, 1, 0, 0);
  const axis = axis1(oc, origin, direction);
  const radians = Math.max(1, Math.min(360, Number(angleDegrees || 360))) * Math.PI / 180;
  let maker;
  try {
    // OpenCascade.js overloads expose the finite-angle constructor as a
    // generated BRepPrimAPI_MakeRevol_* class. constructAny probes those
    // variants so this remains compatible across beta wrapper revisions.
    maker = constructAny(oc, "BRepPrimAPI_MakeRevol", [
      [face, axis, radians, false],
      [face, axis, radians],
      [face, axis, false],
    ]);
    if (typeof maker.IsDone === "function" && !maker.IsDone()) {
      throw new Error("OCCT revolve failed");
    }
    return { maker, shape: callFirst(maker, ["Shape"]) };
  } finally {
    deleteSafe(axis);
    deleteSafe(direction);
    deleteSafe(origin);
    deleteSafe(faceMaker);
    deleteSafe(polygon);
  }
}



function makeEdge3D(oc, a, b) {
  const pa = point3(oc, Number(a[0]), Number(a[1]), Number(a[2] || 0));
  const pb = point3(oc, Number(b[0]), Number(b[1]), Number(b[2] || 0));
  try {
    const maker = constructAny(oc, "BRepBuilderAPI_MakeEdge", [[pa, pb]]);
    if (typeof maker.IsDone === "function" && !maker.IsDone()) throw new Error("OCCT could not build sweep path edge");
    return { maker, edge: callFirst(maker, ["Edge", "Shape"]) };
  } finally {
    deleteSafe(pa);
    deleteSafe(pb);
  }
}

function makeOpenWire3D(oc, points) {
  if (!Array.isArray(points) || points.length < 2) throw new Error("Sweep path needs at least two 3D points");
  const wireMaker = constructAny(oc, "BRepBuilderAPI_MakeWire", [[]]);
  const owned = [];
  try {
    for (let i = 0; i < points.length - 1; i += 1) {
      const edge = makeEdge3D(oc, points[i], points[i + 1]);
      owned.push(edge.maker);
      callFirst(wireMaker, ["Add"], edge.edge);
    }
    if (typeof wireMaker.IsDone === "function" && !wireMaker.IsDone()) throw new Error("OCCT could not build sweep path wire");
    return { maker: wireMaker, wire: callFirst(wireMaker, ["Wire"]), owned };
  } catch (error) {
    owned.forEach(deleteSafe);
    deleteSafe(wireMaker);
    throw error;
  }
}

function makeSweep(oc, profilePoints, path) {
  if (!profilePoints?.length || profilePoints.length < 3) throw new Error("Sweep needs a closed profile");
  if (!path?.length || path.length < 2) throw new Error("Sweep needs a path");

  const z0 = Number(path[0]?.[2] || 0);
  const { polygon, wire } = makeWireFromPoints(oc, profilePoints, z0);
  const faceMaker = constructAny(oc, "BRepBuilderAPI_MakeFace", [[wire, true], [wire]]);
  const profileFace = callFirst(faceMaker, ["Face", "Shape"]);
  const spine = makeOpenWire3D(oc, path);
  try {
    const maker = constructAny(oc, "BRepOffsetAPI_MakePipe", [
      [spine.wire, profileFace],
      [spine.wire, wire],
    ]);
    if (typeof maker.IsDone === "function" && !maker.IsDone()) throw new Error("OCCT sweep failed");
    return { maker, shape: callFirst(maker, ["Shape"]), owned: [polygon, faceMaker, spine.maker, ...spine.owned] };
  } catch (error) {
    deleteSafe(faceMaker);
    deleteSafe(polygon);
    spine.owned.forEach(deleteSafe);
    deleteSafe(spine.maker);
    throw error;
  }
}

function makeClosedWire3D(oc, points) {
  if (!Array.isArray(points) || points.length < 3) throw new Error("Section needs at least three 3D points");
  const wireMaker = constructAny(oc, "BRepBuilderAPI_MakeWire", [[]]);
  const owned = [];
  try {
    for (let i = 0; i < points.length; i += 1) {
      const edge = makeEdge3D(oc, points[i], points[(i + 1) % points.length]);
      owned.push(edge.maker);
      callFirst(wireMaker, ["Add"], edge.edge);
    }
    if (typeof wireMaker.IsDone === "function" && !wireMaker.IsDone()) throw new Error("OCCT could not build loft section wire");
    return { maker: wireMaker, wire: callFirst(wireMaker, ["Wire"]), owned };
  } catch (error) {
    owned.forEach(deleteSafe);
    deleteSafe(wireMaker);
    throw error;
  }
}

function sectionWorldPoints(section) {
  const ax = Number(section.angleX || 0) * Math.PI / 180;
  const ay = Number(section.angleY || 0) * Math.PI / 180;
  const z = Number(section.offset || 0);
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
  return (section.points || []).map(([x0, y0]) => {
    let x = Number(x0), y = Number(y0), zz = 0;
    // Rotate local section around X then Y, then translate along the base extrusion axis.
    let y1 = y * cx - zz * sx, z1 = y * sx + zz * cx;
    let x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    return [x2, y1, z + z2];
  });
}

function makeLoft(oc, sections, solid = true) {
  if (!Array.isArray(sections) || sections.length < 2) throw new Error("Loft needs at least two sections");
  const maker = constructAny(oc, "BRepOffsetAPI_ThruSections", [
    [Boolean(solid), false, 1e-4],
    [Boolean(solid), false],
    [],
  ]);
  const owned = [];
  try {
    for (const section of sections) {
      if (Number(section.angleX || 0) !== 0 || Number(section.angleY || 0) !== 0) {
        const built = makeClosedWire3D(oc, sectionWorldPoints(section));
        owned.push(built.maker, ...built.owned);
        callFirst(maker, ["AddWire"], built.wire);
      } else {
        const z = Number(section.offset || 0);
        const built = makeWireFromPoints(oc, section.points, z);
        owned.push(built.polygon);
        callFirst(maker, ["AddWire"], built.wire);
      }
    }
    if (typeof maker.CheckCompatibility === "function") maker.CheckCompatibility(true);
    if (typeof maker.Build === "function") maker.Build();
    if (typeof maker.IsDone === "function" && !maker.IsDone()) throw new Error("OCCT loft failed");
    return { maker, shape: callFirst(maker, ["Shape"]), owned };
  } catch (error) {
    owned.forEach(deleteSafe);
    deleteSafe(maker);
    throw error;
  }
}

function booleanShape(oc, mode, left, right) {
  const base = mode === "cut" ? "BRepAlgoAPI_Cut" : "BRepAlgoAPI_Fuse";
  const progress = ctorCandidates(oc, "Message_ProgressRange").length
    ? constructAny(oc, "Message_ProgressRange", [[]])
    : null;
  const argSets = progress
    ? [[left, right, progress], [left, right]]
    : [[left, right]];
  const op = constructAny(oc, base, argSets);
  if (typeof op.Build === "function") {
    try {
      progress ? op.Build(progress) : op.Build();
    } catch {
      op.Build();
    }
  }
  const shape = callFirst(op, ["Shape"]);
  deleteSafe(progress);
  return { op, shape };
}


function castEdge(oc, shape) {
  try {
    if (typeof oc.TopoDS?.Edge_1 === "function") return oc.TopoDS.Edge_1(shape);
    if (typeof oc.TopoDS?.Edge === "function") return oc.TopoDS.Edge(shape);
    if (typeof oc.TopoDS_Edge_1 === "function") return new oc.TopoDS_Edge_1(shape);
  } catch { /* keep generic wrapper */ }
  return shape;
}

function castFace(oc, shape) {
  try {
    if (typeof oc.TopoDS?.Face_1 === "function") return oc.TopoDS.Face_1(shape);
    if (typeof oc.TopoDS?.Face === "function") return oc.TopoDS.Face(shape);
    if (typeof oc.TopoDS_Face_1 === "function") return new oc.TopoDS_Face_1(shape);
  } catch { /* keep generic wrapper */ }
  return shape;
}

function edgeEndpointsMM(oc, edgeShape) {
  const edge = castEdge(oc, edgeShape);
  const adaptor = constructAny(oc, "BRepAdaptor_Curve", [[edge], []]);
  try {
    if (typeof adaptor.Initialize_1 === "function") adaptor.Initialize_1(edge);
    else if (typeof adaptor.Initialize === "function") adaptor.Initialize(edge);
    const first = adaptor.FirstParameter();
    const last = adaptor.LastParameter();
    const a = adaptor.Value(first);
    const b = adaptor.Value(last);
    return [
      { x: a.X(), y: a.Y(), z: a.Z() },
      { x: b.X(), y: b.Y(), z: b.Z() },
    ];
  } finally {
    deleteSafe(adaptor);
  }
}

function segmentDistance(a0, a1, b0, b1) {
  const d = (p, q) => Math.hypot(p.x-q.x, p.y-q.y, p.z-q.z);
  return Math.min(d(a0,b0)+d(a1,b1), d(a0,b1)+d(a1,b0));
}

function expectedTreatmentSegment(draft, treatment) {
  const key = treatment?.targetEdgeKey || "";
  let match = key.match(/^base-(vertical|top|bottom)-(\d+)$/);
  if (match) {
    const kind = match[1];
    const i = Number(match[2]);
    const a = draft.points[i];
    const b = draft.points[(i + 1) % draft.points.length];
    if (!a || !b) return null;
    if (kind === "vertical") return [{x:a[0],y:a[1],z:0},{x:a[0],y:a[1],z:draft.height}];
    const z = kind === "top" ? draft.height : 0;
    return [{x:a[0],y:a[1],z},{x:b[0],y:b[1],z}];
  }

  match = key.match(/^feature-(.+)-(mouth|cap|wall)-(\d+)$/);
  if (!match) return null;
  const feature = (draft.features || []).find((item) => item.id === match[1]);
  if (!feature || feature.faceType === "side") return null;
  const kind = match[2];
  const i = Number(match[3]);
  const a = feature.points[i];
  const b = feature.points[(i + 1) % feature.points.length];
  if (!a || !b) return null;
  const host = feature.hostFeatureId
    ? (draft.features || []).find((item) => item.id === feature.hostFeatureId)
    : null;
  const mouthZ = draft.height + Number(host?.depth || 0);
  const capZ = draft.height + Number(feature.depth || 0);
  if (kind === "mouth") return [{x:a[0],y:a[1],z:mouthZ},{x:b[0],y:b[1],z:mouthZ}];
  if (kind === "cap") return [{x:a[0],y:a[1],z:capZ},{x:b[0],y:b[1],z:capZ}];
  return [{x:a[0],y:a[1],z:mouthZ},{x:a[0],y:a[1],z:capZ}];
}

function findNativeEdgeForTreatment(oc, shape, draft, treatment) {
  const expected = expectedTreatmentSegment(draft, treatment);
  if (!expected) throw new Error(`native-unsupported:edge-key:${treatment?.targetEdgeKey || "unknown"}`);
  const edgeEnum = getEnum(oc, EDGE_ENUM_CANDIDATES);
  const shapeEnum = getEnum(oc, SHAPE_ENUM_CANDIDATES);
  const explorer = constructAny(oc, "TopExp_Explorer", [[shape, edgeEnum, shapeEnum],[shape,edgeEnum],[]]);
  if (typeof explorer.Init === "function" && typeof explorer.More === "function" && !explorer.More()) explorer.Init(shape, edgeEnum, shapeEnum);
  let best = null;
  let bestScore = Infinity;
  while (explorer.More()) {
    const raw = explorer.Current();
    try {
      const [a,b] = edgeEndpointsMM(oc, raw);
      const score = segmentDistance(expected[0], expected[1], a, b);
      if (score < bestScore) { bestScore = score; best = castEdge(oc, raw); }
    } catch { /* curved/degenerate edge not this target */ }
    explorer.Next();
  }
  deleteSafe(explorer);
  if (!best || bestScore > 1.5) throw new Error(`native-edge-match-failed:${treatment.targetEdgeKey}`);
  return best;
}

function applyEdgeTreatmentNative(oc, shape, draft, treatment) {
  const edge = findNativeEdgeForTreatment(oc, shape, draft, treatment);
  const amount = Math.max(0.01, Number(treatment.amount || 0));
  const base = treatment.mode === "chamfer" ? "BRepFilletAPI_MakeChamfer" : "BRepFilletAPI_MakeFillet";
  const maker = treatment.mode === "chamfer"
    ? constructAny(oc, base, [[shape]])
    : constructAny(oc, base, [[shape, oc.ChFi3d_FilletShape?.ChFi3d_Rational], [shape]]);
  if (treatment.mode === "chamfer") {
    if (typeof maker.Add_2 === "function") maker.Add_2(amount, edge);
    else callFirst(maker, ["Add"], amount, edge);
  } else {
    if (typeof maker.Add_2 === "function") maker.Add_2(amount, edge);
    else callFirst(maker, ["Add"], amount, edge);
  }
  const progress = ctorCandidates(oc, "Message_ProgressRange").length ? constructAny(oc, "Message_ProgressRange", [[]]) : null;
  try {
    if (typeof maker.Build === "function") progress ? maker.Build(progress) : maker.Build();
    if (typeof maker.IsDone === "function" && !maker.IsDone()) throw new Error(`${treatment.mode} failed`);
    return { maker, shape: callFirst(maker, ["Shape"]) };
  } finally { deleteSafe(progress); }
}

function faceMeshStats(oc, face) {
  const location = constructAny(oc, "TopLoc_Location", [[]]);
  const brepTool = typeof oc.BRep_Tool === "function" ? new oc.BRep_Tool() : oc.BRep_Tool;
  try {
    const handle = callFirst(brepTool, ["Triangulation"], face, location);
    if (!handle || (typeof handle.IsNull === "function" && handle.IsNull())) return null;
    const tri = typeof handle.get === "function" ? handle.get() : handle;
    const nodes = callFirst(tri, ["Nodes"]);
    const triangles = callFirst(tri, ["Triangles"]);
    let center = {x:0,y:0,z:0}, normal = {x:0,y:0,z:0}, count = 0;
    for (let i=1;i<=tri.NbTriangles();i+=1) {
      const t = triangles.Value(i);
      const ps = [1,2,3].map(k => {
        let p = nodes.Value(t.Value(k)); p = transformPointFromLocation(p, location);
        return {x:p.X(),y:p.Y(),z:p.Z()};
      });
      const ux=ps[1].x-ps[0].x, uy=ps[1].y-ps[0].y, uz=ps[1].z-ps[0].z;
      const vx=ps[2].x-ps[0].x, vy=ps[2].y-ps[0].y, vz=ps[2].z-ps[0].z;
      let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      if (shapeOrientationReversed(oc, face)) { nx=-nx; ny=-ny; nz=-nz; }
      const len=Math.hypot(nx,ny,nz)||1; nx/=len; ny/=len; nz/=len;
      normal.x+=nx; normal.y+=ny; normal.z+=nz;
      for (const p of ps) { center.x+=p.x; center.y+=p.y; center.z+=p.z; count++; }
    }
    if (!count) return null;
    center.x/=count; center.y/=count; center.z/=count;
    const nl=Math.hypot(normal.x,normal.y,normal.z)||1; normal.x/=nl;normal.y/=nl;normal.z/=nl;
    return {center, normal};
  } finally { deleteSafe(location); deleteSafe(brepTool); }
}

function findShellClosingFaces(oc, shape, draft, selectedFaceIds) {
  const wantsTop = (selectedFaceIds || []).some(id => id === "face:base:top" || /:cap$/.test(id));
  if (!wantsTop) throw new Error("native-unsupported:shell-face-selection");
  const faceEnum=getEnum(oc,FACE_ENUM_CANDIDATES), shapeEnum=getEnum(oc,SHAPE_ENUM_CANDIDATES);
  const explorer=constructAny(oc,"TopExp_Explorer",[[shape,faceEnum,shapeEnum],[shape,faceEnum],[]]);
  if (typeof explorer.Init === "function" && typeof explorer.More === "function" && !explorer.More()) explorer.Init(shape,faceEnum,shapeEnum);
  let best=null, bestZ=-Infinity;
  while (explorer.More()) {
    const face=castFace(oc,explorer.Current());
    const stats=faceMeshStats(oc,face);
    if (stats && stats.normal.z > 0.7 && stats.center.z > bestZ) { bestZ=stats.center.z; best=face; }
    explorer.Next();
  }
  deleteSafe(explorer);
  if (!best) throw new Error("native-shell-top-face-not-found");
  return [best];
}

function applyShellNative(oc, shape, draft, operation) {
  const faces=findShellClosingFaces(oc,shape,draft,operation.selectedFaceIds || []);
  const list=constructAny(oc,"TopTools_ListOfShape",[[]]);
  faces.forEach(face => callFirst(list,["Append"],face));
  const maker=constructAny(oc,"BRepOffsetAPI_MakeThickSolid",[[]]);
  const progress=ctorCandidates(oc,"Message_ProgressRange").length ? constructAny(oc,"Message_ProgressRange",[[]]) : null;
  const mode=oc.BRepOffset_Mode?.BRepOffset_Skin ?? oc.BRepOffset_Skin;
  const join=oc.GeomAbs_JoinType?.GeomAbs_Arc ?? oc.GeomAbs_Arc;
  const thickness=-Math.abs(Number(operation.thickness || 2));
  try {
    maker.MakeThickSolidByJoin(shape,list,thickness,0.01,mode,false,false,join,false,progress);
    if (typeof maker.IsDone === "function" && !maker.IsDone()) throw new Error("Shell failed");
    return {maker, shape:callFirst(maker,["Shape"]) };
  } finally { deleteSafe(progress); deleteSafe(list); }
}

function buildShapeForDraft(oc, draft) {
  if (!draft?.points?.length || !draft.height) {
    throw new Error("Draft has no closed base profile");
  }

  // V19 native path deliberately covers the common tablet-CAD flow first:
  // base prism + planar top-face add/cut features. Side-face features and
  // legacy edge treatments stay on the V18 fallback until their native OCCT
  // mapping is introduced in the next geometry checkpoint.
  if ((draft.features || []).some((feature) => feature.faceType === "side")) {
    throw new Error("native-unsupported:side-feature");
  }

  const generatorOperation = (draft.nativeOperations || []).find((operation) =>
    operation.type === "revolve" || operation.type === "sweep" || operation.type === "loft"
  );
  let current;
  let generatorOwned = [];
  if (generatorOperation?.type === "revolve") {
    current = makeRevolve(oc, draft.points, generatorOperation.axis || "x", generatorOperation.angleDegrees || 360);
  } else if (generatorOperation?.type === "sweep") {
    current = makeSweep(oc, generatorOperation.profile || draft.points, generatorOperation.path || []);
    generatorOwned = current.owned || [];
  } else if (generatorOperation?.type === "loft") {
    current = makeLoft(oc, generatorOperation.sections || [], generatorOperation.solid !== false);
    generatorOwned = current.owned || [];
  } else {
    current = makePrism(oc, draft.points, 0, draft.height);
  }
  const owned = [current.maker, ...generatorOwned];

  if (generatorOperation && (draft.features || []).length) {
    throw new Error(`native-unsupported:${generatorOperation.type}-with-extrude-features`);
  }

  for (const feature of draft.features || []) {
    const depth = Number(feature.depth || 0);
    if (Math.abs(depth) < 1e-8 || !feature.points?.length) continue;

    // Beyond V16+ flattens compatible stacked top features into an absolute
    // depth measured from the base top face. Building the full absolute tool
    // reproduces that same geometry natively and preserves parent compatibility.
    const zStart = depth >= 0 ? draft.height : draft.height + depth;
    const tool = makePrism(oc, feature.points, zStart, Math.abs(depth));
    owned.push(tool.maker);

    const combined = booleanShape(oc, depth >= 0 ? "fuse" : "cut", current.shape, tool.shape);
    owned.push(combined.op);
    current = { maker: combined.op, shape: combined.shape };
  }

  for (const treatment of draft.edgeTreatments || []) {
    const next = applyEdgeTreatmentNative(oc, current.shape, draft, treatment);
    owned.push(next.maker);
    current = next;
  }

  for (const operation of draft.nativeOperations || []) {
    if (operation.type === "revolve" || operation.type === "sweep" || operation.type === "loft") continue;
    if (operation.type === "shell") {
      const next = applyShellNative(oc, current.shape, draft, operation);
      owned.push(next.maker);
      current = next;
    }
  }

  return { shape: current.shape, owned };
}

function shapeOrientationReversed(oc, face) {
  const orientation = typeof face?.Orientation === "function" ? face.Orientation() : null;
  const reversed = oc.TopAbs_REVERSED ?? oc.TopAbs_Orientation?.TopAbs_REVERSED;
  return reversed != null && orientation === reversed;
}

function transformPointFromLocation(point, location) {
  if (!location || typeof location.Transformation !== "function") return point;
  const trsf = location.Transformation();
  try {
    if (typeof point.Transformed === "function") return point.Transformed(trsf);
    if (typeof point.Transform === "function") {
      point.Transform(trsf);
      return point;
    }
  } catch {
    return point;
  }
  return point;
}

function tessellateShape(oc, shape, { linearDeflection = 0.25, angularDeflection = 0.5 } = {}) {
  const mesher = constructAny(oc, "BRepMesh_IncrementalMesh", [
    [shape, linearDeflection, false, angularDeflection, false],
    [shape, linearDeflection, false, angularDeflection],
    [shape, linearDeflection],
  ]);
  try {
    mesher.Perform?.();
  } catch {
    // Constructors used by current OCCT builds already perform meshing.
  }

  const faceEnum = getEnum(oc, FACE_ENUM_CANDIDATES);
  const shapeEnum = getEnum(oc, SHAPE_ENUM_CANDIDATES);
  if (faceEnum == null) throw new Error("OCCT TopAbs_FACE enum is unavailable");

  const explorer = constructAny(oc, "TopExp_Explorer", [
    [shape, faceEnum, shapeEnum],
    [shape, faceEnum],
    [],
  ]);
  if (typeof explorer.Init === "function" && typeof explorer.More === "function" && !explorer.More()) {
    explorer.Init(shape, faceEnum, shapeEnum);
  }

  const positions = [];
  const normals = [];
  const brepTool = typeof oc.BRep_Tool === "function" ? new oc.BRep_Tool() : oc.BRep_Tool;

  while (explorer.More()) {
    const current = explorer.Current();
    let face = current;
    try {
      const topods = oc.TopoDS || oc.topods;
      if (typeof topods?.Face === "function") face = topods.Face(current);
      else if (typeof oc.TopoDS_Face_1 === "function") face = new oc.TopoDS_Face_1(current);
    } catch {
      face = current;
    }

    const location = constructAny(oc, "TopLoc_Location", [[]]);
    const handle = callFirst(brepTool, ["Triangulation"], face, location);
    if (handle && !(typeof handle.IsNull === "function" && handle.IsNull())) {
      const tri = typeof handle.get === "function" ? handle.get() : handle;
      const nodes = callFirst(tri, ["Nodes"]);
      const triangles = callFirst(tri, ["Triangles"]);
      const reversed = shapeOrientationReversed(oc, face);

      for (let i = 1; i <= tri.NbTriangles(); i += 1) {
        const triangle = triangles.Value(i);
        let ids = [triangle.Value(1), triangle.Value(2), triangle.Value(3)];
        if (reversed) ids = [ids[0], ids[2], ids[1]];

        const triPoints = ids.map((id) => {
          let p = nodes.Value(id);
          p = transformPointFromLocation(p, location);
          return new THREE.Vector3(
            p.X() * SCENE_UNIT_PER_MM,
            p.Z() * SCENE_UNIT_PER_MM,
            p.Y() * SCENE_UNIT_PER_MM
          );
        });
        const normal = triPoints[1]
          .clone()
          .sub(triPoints[0])
          .cross(triPoints[2].clone().sub(triPoints[0]))
          .normalize();
        for (const p of triPoints) {
          positions.push(p.x, p.y, p.z);
          normals.push(normal.x, normal.y, normal.z);
        }
      }
    }
    deleteSafe(location);
    explorer.Next();
  }

  deleteSafe(explorer);
  deleteSafe(mesher);
  deleteSafe(brepTool);

  if (!positions.length) throw new Error("OCCT produced no display triangles");
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function nativeTopology(oc, shape) {
  const result = [];
  const enumerate = (kind, enumValue, prefix) => {
    if (enumValue == null) return;
    const shapeEnum = getEnum(oc, SHAPE_ENUM_CANDIDATES);
    const explorer = constructAny(oc, "TopExp_Explorer", [
      [shape, enumValue, shapeEnum],
      [shape, enumValue],
      [],
    ]);
    if (typeof explorer.Init === "function" && typeof explorer.More === "function" && !explorer.More()) {
      explorer.Init(shape, enumValue, shapeEnum);
    }
    let index = 0;
    while (explorer.More()) {
      const subshape = explorer.Current();
      let hash = null;
      try {
        hash = typeof subshape.HashCode === "function" ? subshape.HashCode(2147483647) : null;
      } catch {
        hash = null;
      }
      result.push({
        id: hash != null ? `${prefix}:${hash}` : `${prefix}:${index}`,
        topologyId: hash != null ? `${prefix}:${hash}` : `${prefix}:${index}`,
        type: kind,
        nativeIndex: index,
      });
      index += 1;
      explorer.Next();
    }
    deleteSafe(explorer);
  };

  enumerate("face", getEnum(oc, FACE_ENUM_CANDIDATES), "occt:face");
  enumerate("edge", getEnum(oc, EDGE_ENUM_CANDIDATES), "occt:edge");
  return result;
}

export function createOpenCascadeKernelAdapter(oc, { fallbackBuildPreview, fallbackTopology } = {}) {
  if (!oc) throw new Error("An initialized OpenCascade module is required");

  let cachedDraftKey = null;
  let cachedShape = null;
  let cachedGeometry = null;
  let cachedTopology = null;
  let ownedObjects = [];

  const clearCache = () => {
    cachedGeometry?.dispose?.();
    cachedGeometry = null;
    cachedShape = null;
    cachedTopology = null;
    cachedDraftKey = null;
    ownedObjects.forEach(deleteSafe);
    ownedObjects = [];
  };

  const ensureNative = (draft) => {
    const key = JSON.stringify({
      points: draft?.points,
      height: draft?.height,
      features: draft?.features,
      edgeTreatments: draft?.edgeTreatments,
      nativeOperations: draft?.nativeOperations,
    });
    if (key === cachedDraftKey && cachedShape && cachedGeometry) return;
    clearCache();
    const built = buildShapeForDraft(oc, draft);
    cachedShape = built.shape;
    ownedObjects = built.owned;
    cachedGeometry = tessellateShape(oc, cachedShape);
    cachedTopology = nativeTopology(oc, cachedShape);
    cachedDraftKey = key;
  };

  return {
    apiVersion: CAD_KERNEL_API_VERSION,
    id: "opencascade-wasm-native-v23",
    name: "OpenCascade BRep V23",
    capabilities: {
      persistentTopology: true,
      featureFaceSketching: true,
      stackedSameDirectionFeatures: true,
      exactFeatureEdgeFillet: true,
      shell: true,
      revolve: true,
      sweep: true,
      loft: true,
      planarBodyTransform: true,
      multiFaceSelection: true,
      constructionReferences: true,
      brep: true,
      nativePrism: true,
      nativeBoolean: true,
      nativeTessellation: true,
      nativeFillet: true,
      nativeChamfer: true,
      nativeShell: true,
      nativeRevolve: true,
      nativeSweep: true,
      nativeLoft: true,
      stepExport: false,
    },

    buildPreview(draft) {
      try {
        ensureNative(draft);
        return cachedGeometry;
      } catch (error) {
        if (String(error?.message || "").startsWith("native-unsupported:") && fallbackBuildPreview) {
          return fallbackBuildPreview(draft);
        }
        throw error;
      }
    },

    topology(draft) {
      try {
        ensureNative(draft);
        return cachedTopology || [];
      } catch (error) {
        if (fallbackTopology) return fallbackTopology(draft);
        throw error;
      }
    },

    getNativeShape(draft) {
      ensureNative(draft);
      return cachedShape;
    },

    dispose() {
      clearCache();
    },

    async runTool(tool, context = {}) {
      if (tool === "shell") {
        const draft = context.draft;
        if (!draft) return { ok: false, message: "Create a solid before using Shell" };
        const selectedFaceIds = context.selectedFaceIds || [];
        if (!selectedFaceIds.length) return { ok: false, message: "Select the face you want to remove for Shell" };
        const thickness = Math.max(0.1, Number(context.shellThickness || 2));
        const nextDraft = {
          ...draft,
          nativeOperations: [
            ...(draft.nativeOperations || []).filter((item) => item.type !== "shell"),
            { id: "native-shell", type: "shell", thickness, selectedFaceIds },
          ],
        };
        // Validate immediately so a failed hollow never enters history.
        clearCache();
        ensureNative(nextDraft);
        return { ok: true, nextDraft, message: `Shell ${thickness.toFixed(1)} mm applied natively` };
      }
      if (tool === "revolve") {
        const draft = context.draft;
        if (!draft?.points?.length) return { ok: false, message: "Create a closed base profile before Revolve" };
        if ((draft.features || []).length) {
          return { ok: false, message: "V21 Revolve currently requires a base profile without extrude features" };
        }
        const angleDegrees = Math.max(1, Math.min(360, Number(context.revolveAngle || 360)));
        const axis = context.revolveAxis === "y" ? "y" : "x";
        const nextDraft = {
          ...draft,
          nativeOperations: [
            ...(draft.nativeOperations || []).filter((item) => item.type !== "revolve"),
            { id: "native-revolve", type: "revolve", axis, angleDegrees },
          ],
        };
        clearCache();
        ensureNative(nextDraft);
        return { ok: true, nextDraft, message: `Revolve ${angleDegrees.toFixed(0)}° around ${axis.toUpperCase()} axis applied natively` };
      }
      if (tool === "sweep") {
        const draft = context.draft;
        if (!draft?.points?.length) return { ok: false, message: "Create a closed base profile before Sweep" };
        if ((draft.features || []).length) return { ok: false, message: "V23 Sweep currently requires a clean base profile" };
        const length = Math.max(1, Number(context.sweepLength || 40));
        const first = draft.points[0];
        const customPath = Array.isArray(context.sweepPath) ? context.sweepPath : [];
        const path = customPath.length >= 2
          ? customPath.map((point) => [Number(point[0]), Number(point[1]), Number(point[2] || 0)])
          : [
              [Number(first[0]), Number(first[1]), 0],
              [Number(first[0]), Number(first[1]), length],
            ];
        const nextDraft = {
          ...draft,
          nativeOperations: [
            ...(draft.nativeOperations || []).filter((item) => !["revolve", "sweep", "loft"].includes(item.type)),
            { id: "native-sweep", type: "sweep", profile: draft.points, path, operation: "new-body" },
          ],
        };
        clearCache();
        ensureNative(nextDraft);
        return { ok: true, nextDraft, message: `Sweep ${path.length - 1} segment${path.length === 2 ? "" : "s"} applied natively` };
      }
      if (tool === "loft") {
        const draft = context.draft;
        if (!draft?.points?.length) return { ok: false, message: "Create a closed base profile before Loft" };
        if ((draft.features || []).length) return { ok: false, message: "V23 Loft currently requires a clean base profile" };
        const offset = Math.max(1, Number(context.loftOffset || 40));
        const scale = Math.max(0.05, Number(context.loftScale || 0.65));
        const capturedPlanes = (context.constructionPlanes || [])
          .filter((plane) => Array.isArray(plane.points) && plane.points.length >= 3)
          .sort((a, b) => context.loftManualOrder ? Number(a.order || 0) - Number(b.order || 0) : Number(a.offset || 0) - Number(b.offset || 0));
        let sections;
        if (capturedPlanes.length) {
          sections = [
            { plane: "top", offset: 0, points: draft.points },
            ...capturedPlanes.map((plane) => ({ plane: plane.id || "construction", offset: Number(plane.offset || 0), angleX: Number(plane.angleX || 0), angleY: Number(plane.angleY || 0), order: Number(plane.order || 0), points: plane.points })),
          ];
        } else {
          const cx = draft.points.reduce((sum, p) => sum + Number(p[0]), 0) / draft.points.length;
          const cy = draft.points.reduce((sum, p) => sum + Number(p[1]), 0) / draft.points.length;
          const top = draft.points.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
          sections = [
            { plane: "top", offset: 0, points: draft.points },
            { plane: "top", offset, points: top },
          ];
        }
        const nextDraft = {
          ...draft,
          nativeOperations: [
            ...(draft.nativeOperations || []).filter((item) => !["revolve", "sweep", "loft"].includes(item.type)),
            { id: "native-loft", type: "loft", sections, solid: true },
          ],
        };
        clearCache();
        ensureNative(nextDraft);
        return { ok: true, nextDraft, message: `Loft through ${sections.length} sections applied natively` };
      }
      return {
        ok: false,
        reason: "v25-tool-not-enabled",
        message: `${tool} is not enabled in the V25 native kernel`,
      };
    },
  };
}