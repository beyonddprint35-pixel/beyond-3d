/* ======================================================================
   BEYOND CREATOR — NATIVE CAD PAYLOAD V25
   ----------------------------------------------------------------------
   Versioned model envelope used when a Sketch draft contains geometry that
   cannot be faithfully represented by the legacy { points,height,features }
   payload (Shell, Revolve, future Sweep/Loft, etc.).

   This module intentionally contains no Three.js/OpenCascade dependency so
   BeyondCreator / Studio / persistence / export code can consume it safely.
   ====================================================================== */

export const BEYOND_CAD_SCHEMA = "beyond.cad-model";
export const BEYOND_CAD_SCHEMA_VERSION = 5;

const clonePoints = (points = []) => points.map((point) => [Number(point[0]), Number(point[1])]);

export function draftRequiresNativeCommit(draft) {
  return Boolean((draft?.nativeOperations || []).length);
}

export function createLegacySolidPayload(draft) {
  return {
    points: clonePoints(draft?.points),
    height: Number(draft?.height || 0),
    twistDegrees: 0,
    scaleTop: 1,
    plane: "top",
    features: (draft?.features || []).map((feature) => ({
      points: clonePoints(feature.points),
      depth: Number(feature.depth || 0),
      faceType: feature.faceType || "top",
      faceIndex: feature.faceIndex ?? null,
    })),
    edgeTreatments: (draft?.edgeTreatments || []).map((treatment) => ({
      edgeType: treatment.edgeType,
      edgeIndex: treatment.edgeIndex,
      amount: Number(treatment.amount || 0),
      mode: treatment.mode,
    })),
  };
}

function serializeFeature(feature) {
  return {
    id: feature.id,
    operation: feature.operation || (Number(feature.depth || 0) >= 0 ? "add" : "cut"),
    points: clonePoints(feature.points),
    depth: Number(feature.depth || 0),
    relativeDepth: feature.relativeDepth == null ? null : Number(feature.relativeDepth),
    faceType: feature.faceType || "top",
    faceIndex: feature.faceIndex ?? null,
    hostFeatureId: feature.hostFeatureId || null,
  };
}

function serializeTreatment(treatment) {
  return {
    id: treatment.id,
    edgeType: treatment.edgeType,
    edgeIndex: treatment.edgeIndex,
    amount: Number(treatment.amount || 0),
    mode: treatment.mode,
    featureId: treatment.featureId || null,
    topologyId: treatment.topologyId || null,
  };
}

function serializeNativeOperation(operation) {
  const base = {
    id: operation.id,
    type: operation.type,
  };

  if (operation.type === "shell") {
    return {
      ...base,
      thickness: Number(operation.thickness || 0),
      selectedFaceIds: [...(operation.selectedFaceIds || [])],
    };
  }

  if (operation.type === "revolve") {
    return {
      ...base,
      axis: operation.axis === "y" ? "y" : "x",
      angleDegrees: Number(operation.angleDegrees || 360),
    };
  }

  if (operation.type === "sweep") {
    return {
      ...base,
      profile: clonePoints(operation.profile),
      path: (operation.path || []).map((point) => [
        Number(point[0]),
        Number(point[1]),
        Number(point[2] || 0),
      ]),
      operation: operation.operation || "new-body",
    };
  }

  if (operation.type === "loft") {
    return {
      ...base,
      sections: (operation.sections || []).map((section) => ({
        plane: section.plane || "top",
        offset: Number(section.offset || 0),
        angleX: Number(section.angleX || 0),
        angleY: Number(section.angleY || 0),
        order: Number(section.order || 0),
        points: clonePoints(section.points),
      })),
      solid: operation.solid !== false,
    };
  }

  // Preserve future operation data while still making the envelope JSON-safe.
  return JSON.parse(JSON.stringify(operation));
}

export function createNativeCadPayload(draft) {
  return {
    schema: BEYOND_CAD_SCHEMA,
    schemaVersion: BEYOND_CAD_SCHEMA_VERSION,
    modelKind: "brep-feature-model",
    units: "mm",
    body: {
      id: draft?.id || null,
      baseFeatureId: draft?.baseFeatureId || null,
      baseSketch: {
        plane: "top",
        points: clonePoints(draft?.points),
      },
      baseExtrude: {
        height: Number(draft?.height || 0),
      },
      features: (draft?.features || []).map(serializeFeature),
      edgeTreatments: (draft?.edgeTreatments || []).map(serializeTreatment),
      nativeOperations: (draft?.nativeOperations || []).map(serializeNativeOperation),
    },
    compatibility: {
      legacySolid: createLegacySolidPayload(draft),
      requiresNativeKernel: draftRequiresNativeCommit(draft),
    },
  };
}

export function createCommitEnvelope(draft) {
  const legacy = createLegacySolidPayload(draft);
  const nativeCad = createNativeCadPayload(draft);
  return {
    mode: draftRequiresNativeCommit(draft) ? "native" : "legacy",
    legacy,
    nativeCad,
  };
}

// V22 schemas used by the next modeling tools. They are deliberately small,
// serializable contracts so Sweep/Loft can be created in SketchWorkspace and
// consumed by any BRep backend without coupling the UI to OpenCascade classes.
export function createSweepOperation({ id, profile, path, operation = "new-body" }) {
  if (!profile?.length || profile.length < 3) throw new Error("Sweep needs a closed profile");
  if (!path?.length || path.length < 2) throw new Error("Sweep needs a path with at least two points");
  return { id, type: "sweep", profile: clonePoints(profile), path, operation };
}

export function createLoftOperation({ id, sections, solid = true }) {
  if (!sections?.length || sections.length < 2) throw new Error("Loft needs at least two profile sections");
  return { id, type: "loft", sections, solid };
}