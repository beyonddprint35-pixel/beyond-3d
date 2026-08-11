import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useThree,
} from "@react-three/fiber";

import {
  ContactShadows,
  Edges,
  Environment,
  Grid,
  Html,
  Line,
  OrbitControls,
  TransformControls,
} from "@react-three/drei";

import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  RoundedBoxGeometry,
} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import JSZip from "jszip";
import {
  CSG,
} from "three-csg-ts";

import {
  parseCreatorModelFile,
} from "./creatorImport";

import {
  analyzeEditableGeometry,
  buildFaceExtrusionGeometries,
  editableGeometryDimensions,
  editableSelectionCount,
  flattenEditableSelection,
  getSelectionPositions,
  growEditableSelection,
  mergeEditableSelection,
  mergeEditableSelections,
  moveEditableSelection,
  pickEditableElement,
  prepareEditableGeometry,
  repairEditableGeometry,
  selectAllEditableElements,
  selectBoundaryEditableEdges,
  selectConnectedEditableElements,
  selectEdgeChainEditableElements,
  selectEditableElementsInScreenBox,
  selectSharpEditableEdges,
  shrinkEditableSelection,
  smoothEditableSelection,
  fillSelectedBoundaryHole,
} from "./creatorMeshTools";

import {
  Box,
  Circle,
  Copy,
  Cylinder,
  Download,
  Eye,
  EyeOff,
  Lock,
  Maximize2,
  Minimize2,
  Move3D,
  Plus,
  Redo2,
  RefreshCcw,
  Rotate3D,
  Send,
  Trash2,
  Type,
  Undo2,
  Upload,
  Unlock,
} from "lucide-react";

import SketchExtrudeModal from "./SketchExtrudeModal";
import RevolveModal from "./RevolveModal";
import SketchWorkspace from "./SketchWorkspace";
import {
  cleanCreatorGeometryWithManifold,
  createExtrudedSketchGeometry,
  createRevolvedSketchGeometry,
  filletSelectedCreatorEdges,
  warmManifoldEngine,
} from "./manifoldEngine";

import "./BeyondCreator.css";
import "./SketchExtrudeModal.css";
import "./RevolveModal.css";

const SCENE_SCALE = 0.018;
const MAX_OBJECTS = 80;

const MATERIALS = [
  // ---------------------------------------------------------
  // COLOR PRESETS
  // ---------------------------------------------------------
  {
    id: "navy",
    label: "Navy",
    group: "color",
    color: "#245b87",
    roughness: 0.38,
    metalness: 0.08,
  },
  {
    id: "ice",
    label: "Ice Blue",
    group: "color",
    color: "#95c9ee",
    roughness: 0.34,
    metalness: 0.04,
  },
  {
    id: "graphite",
    label: "Graphite",
    group: "color",
    color: "#4d5965",
    roughness: 0.42,
    metalness: 0.1,
  },
  {
    id: "white",
    label: "White",
    group: "color",
    color: "#dce7ef",
    roughness: 0.42,
    metalness: 0.02,
  },
  {
    id: "black",
    label: "Black",
    group: "color",
    color: "#161b20",
    roughness: 0.4,
    metalness: 0.05,
  },
  {
    id: "red",
    label: "Red",
    group: "color",
    color: "#b84a4f",
    roughness: 0.4,
    metalness: 0.03,
  },
  {
    id: "orange",
    label: "Orange",
    group: "color",
    color: "#d07939",
    roughness: 0.42,
    metalness: 0.02,
  },
  {
    id: "yellow",
    label: "Yellow",
    group: "color",
    color: "#d4b447",
    roughness: 0.44,
    metalness: 0.02,
  },
  {
    id: "green",
    label: "Sage",
    group: "color",
    color: "#728f76",
    roughness: 0.46,
    metalness: 0.02,
  },
  {
    id: "blue",
    label: "Royal Blue",
    group: "color",
    color: "#456fae",
    roughness: 0.38,
    metalness: 0.04,
  },
  {
    id: "purple",
    label: "Purple",
    group: "color",
    color: "#75629a",
    roughness: 0.4,
    metalness: 0.03,
  },
  {
    id: "beige",
    label: "Warm Beige",
    group: "color",
    color: "#c4b49a",
    roughness: 0.48,
    metalness: 0,
  },

  // ---------------------------------------------------------
  // ARCHITECTURAL MATERIAL LOOKS
  // ---------------------------------------------------------
  {
    id: "concrete",
    label: "Concrete",
    group: "material",
    color: "#8f9391",
    roughness: 0.9,
    metalness: 0,
  },
  {
    id: "plaster",
    label: "White Plaster",
    group: "material",
    color: "#e4e0d8",
    roughness: 0.82,
    metalness: 0,
  },
  {
    id: "sandstone",
    label: "Sandstone",
    group: "material",
    color: "#b9a07a",
    roughness: 0.88,
    metalness: 0,
  },
  {
    id: "terracotta",
    label: "Terracotta",
    group: "material",
    color: "#a85d46",
    roughness: 0.8,
    metalness: 0,
  },
  {
    id: "brick",
    label: "Brick",
    group: "material",
    color: "#8f4c3d",
    roughness: 0.86,
    metalness: 0,
  },
  {
    id: "oak",
    label: "Oak Wood",
    group: "material",
    color: "#a97c4f",
    roughness: 0.7,
    metalness: 0,
  },
  {
    id: "walnut",
    label: "Walnut",
    group: "material",
    color: "#604330",
    roughness: 0.68,
    metalness: 0,
  },
  {
    id: "steel",
    label: "Steel",
    group: "material",
    color: "#8c969d",
    roughness: 0.28,
    metalness: 0.92,
  },
  {
    id: "aluminum",
    label: "Aluminum",
    group: "material",
    color: "#b8c0c5",
    roughness: 0.3,
    metalness: 0.8,
  },
  {
    id: "bronze",
    label: "Bronze",
    group: "material",
    color: "#9a7047",
    roughness: 0.34,
    metalness: 0.78,
  },
  {
    id: "glass-blue",
    label: "Blue Glass",
    group: "material",
    color: "#7bb5ca",
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.38,
  },
  {
    id: "glass-clear",
    label: "Clear Glass",
    group: "material",
    color: "#d8eef3",
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.24,
  },
];

const SHAPE_DEFAULTS = {
  cube: {
    label: "Cube",
    dimensions: {
      width: 60,
      depth: 60,
      height: 40,
    },
  },
  cylinder: {
    label: "Cylinder",
    dimensions: {
      width: 50,
      depth: 50,
      height: 70,
    },
  },
  sphere: {
    label: "Sphere",
    dimensions: {
      width: 55,
      depth: 55,
      height: 55,
    },
  },
  text: {
    label: "3D Text",
    dimensions: {
      width: 95,
      depth: 8,
      height: 28,
    },
  },
  cone: {
    label: "Cone",
    dimensions: {
      width: 60,
      depth: 60,
      height: 70,
    },
  },
  torus: {
    label: "Torus",
    dimensions: {
      width: 72,
      depth: 72,
      height: 18,
    },
  },
  tube: {
    label: "Tube",
    dimensions: {
      width: 72,
      depth: 72,
      height: 50,
    },
  },
  roundedBox: {
    label: "Rounded Box",
    dimensions: {
      width: 72,
      depth: 52,
      height: 32,
    },
  },
};


const ARCH_SCALE_OPTIONS = [
  50,
  75,
  100,
  150,
  200,
  500,
];

const ARCH_MIN_PRINT_WALL_MM =
  1.2;

const ARCH_DEFAULTS = {
  wall: {
    label: "Wall",
    width: 5200,
    depth: 200,
    height: 3000,
    materialId: "white",
    role: "solid",
  },
  floor: {
    label: "Floor / Slab",
    width: 5000,
    depth: 4000,
    height: 200,
    materialId: "graphite",
    role: "solid",
  },
  column: {
    label: "Column",
    width: 300,
    depth: 300,
    height: 3000,
    materialId: "white",
    role: "solid",
  },
  beam: {
    label: "Beam",
    width: 4000,
    depth: 300,
    height: 450,
    materialId: "white",
    role: "solid",
  },
  door: {
    label: "Door Opening",
    width: 900,
    depth: 500,
    height: 2100,
    materialId: "graphite",
    role: "hole",
    sill: 0,
  },
  window: {
    label: "Window Opening",
    width: 1200,
    depth: 500,
    height: 1200,
    materialId: "ice",
    role: "hole",
    sill: 900,
  },
  stair: {
    label: "Stair",
    width: 1100,
    depth: 280,
    height: 180,
    materialId: "concrete",
    role: "solid",
  },
  roof: {
    label: "Roof",
    width: 6000,
    depth: 5000,
    height: 180,
    materialId: "graphite",
    role: "solid",
  },
};

function architectureUnitFactor(
  unit
) {
  if (
    unit === "m"
  ) {
    return 1000;
  }

  if (
    unit === "cm"
  ) {
    return 10;
  }

  return 1;
}

function architectureFromMm(
  valueMm,
  unit
) {
  return (
    safeNumber(
      valueMm,
      0
    ) /
    architectureUnitFactor(
      unit
    )
  );
}

function architectureToMm(
  value,
  unit
) {
  return (
    safeNumber(
      value,
      0
    ) *
    architectureUnitFactor(
      unit
    )
  );
}

function architectureUnitDigits(
  unit
) {
  return unit ===
    "mm"
    ? 0
    : unit ===
        "cm"
      ? 1
      : 3;
}

function architectureFormat(
  valueMm,
  unit
) {
  return architectureFromMm(
    valueMm,
    unit
  ).toFixed(
    architectureUnitDigits(
      unit
    )
  );
}

function architectureObjectCount(
  objects,
  kind
) {
  return (
    objects.filter(
      (item) =>
        item.source ===
          "architecture" &&
        item.parameters
          ?.archType ===
          kind
    ).length +
    1
  );
}

function makeArchitectureObject(
  kind,
  index,
  scale,
  level,
  overrides = {}
) {
  const defaults =
    ARCH_DEFAULTS[
      kind
    ];

  if (!defaults) {
    throw new Error(
      `Unknown architecture object: ${kind}`
    );
  }

  const real = {
    width:
      safeNumber(
        overrides.width,
        defaults.width
      ),
    depth:
      safeNumber(
        overrides.depth,
        defaults.depth
      ),
    height:
      safeNumber(
        overrides.height,
        defaults.height
      ),
  };

  const safeScale =
    Math.max(
      1,
      safeNumber(
        scale,
        100
      )
    );

  const elevation =
    safeNumber(
      level?.elevation,
      0
    );

  const sill =
    safeNumber(
      overrides.sill,
      defaults.sill ||
        0
    );

  return {
    id: makeId(),
    type: "cube",
    role:
      overrides.role ||
      defaults.role ||
      "solid",
    visible: true,
    locked: false,
    groupId: null,
    groupName: null,
    name:
      `${defaults.label.toUpperCase()} ${index}`,
    text: "",
    dimensions: {
      width:
        real.width /
        safeScale,
      depth:
        real.depth /
        safeScale,
      height:
        real.height /
        safeScale,
    },
    baseDimensions: null,
    geometry: null,
    position: {
      x:
        safeNumber(
          overrides.x,
          0
        ) /
        safeScale,
      y:
        (
          elevation +
          sill
        ) /
        safeScale,
      z:
        safeNumber(
          overrides.z,
          0
        ) /
        safeScale,
    },
    rotation: {
      x: 0,
      y:
        safeNumber(
          overrides.rotationY,
          0
        ),
      z: 0,
    },
    materialId:
      overrides.materialId ||
      defaults.materialId ||
      "white",
    parameters: {
      archType:
        kind,
      archLevelId:
        level?.id ||
        "ground",
      archLevelName:
        level?.name ||
        "GROUND",
      archLevelElevation:
        elevation,
      archRealDimensions: {
        ...real,
      },
      archSill:
        sill,
      archScale:
        safeScale,
    },
    source:
      "architecture",
    engine:
      "ARCHITECT PARAMETRIC",
  };
}

function architectureWallFrameFor(
  wall,
  scale
) {
  if (!wall) {
    return null;
  }

  const safeScale =
    Math.max(
      1,
      safeNumber(
        scale,
        100
      )
    );

  const saved =
    wall.parameters
      ?.archWallFrame;

  if (
    wall.parameters
      ?.architectureCut &&
    saved
  ) {
    return {
      x:
        safeNumber(
          saved.x,
          0
        ),
      z:
        safeNumber(
          saved.z,
          0
        ),
      rotationY:
        safeNumber(
          saved.rotationY,
          0
        ),
      width:
        safeNumber(
          saved.width,
          wall.parameters
            ?.archRealDimensions
            ?.width ||
            wall.dimensions.width *
              safeScale
        ),
      depth:
        safeNumber(
          saved.depth,
          wall.parameters
            ?.archRealDimensions
            ?.depth ||
            wall.dimensions.depth *
              safeScale
        ),
      elevation:
        safeNumber(
          saved.elevation,
          wall.parameters
            ?.archLevelElevation ||
            0
        ),
    };
  }

  return {
    x:
      wall.position.x *
      safeScale,
    z:
      wall.position.z *
      safeScale,
    rotationY:
      safeNumber(
        wall.rotation.y,
        0
      ),
    width:
      safeNumber(
        wall.parameters
          ?.archRealDimensions
          ?.width,
        wall.dimensions.width *
          safeScale
      ),
    depth:
      safeNumber(
        wall.parameters
          ?.archRealDimensions
          ?.depth,
        wall.dimensions.depth *
          safeScale
      ),
    elevation:
      safeNumber(
        wall.parameters
          ?.archLevelElevation,
        wall.position.y *
          safeScale
      ),
  };
}

function architectureOpeningOnWall(
  opening,
  wall,
  scale,
  offsetMm,
  sillMm
) {
  if (
    !opening ||
    !wall
  ) {
    return opening;
  }

  const safeScale =
    Math.max(
      1,
      safeNumber(
        scale,
        100
      )
    );

  const frame =
    architectureWallFrameFor(
      wall,
      safeScale
    );

  const realDimensions = {
    ...(
      opening.parameters
        ?.archRealDimensions ||
      {
        width:
          opening.dimensions
            .width *
          safeScale,
        depth:
          opening.dimensions
            .depth *
          safeScale,
        height:
          opening.dimensions
            .height *
          safeScale,
      }
    ),
  };

  const maxOffset =
    Math.max(
      0,
      (
        frame.width -
        realDimensions.width
      ) /
        2 -
        50
    );

  const safeOffset =
    clamp(
      offsetMm,
      -maxOffset,
      maxOffset
    );

  const safeSill =
    clamp(
      sillMm,
      0,
      20000
    );

  const theta =
    THREE.MathUtils.degToRad(
      frame.rotationY
    );

  const xReal =
    frame.x +
    safeOffset *
      Math.cos(
        theta
      );

  const zReal =
    frame.z -
    safeOffset *
      Math.sin(
        theta
      );

  const depthReal =
    Math.max(
      realDimensions.depth,
      frame.depth +
        200
    );

  return {
    ...opening,
    position: {
      ...opening.position,
      x:
        xReal /
        safeScale,
      y:
        (
          frame.elevation +
          safeSill
        ) /
        safeScale,
      z:
        zReal /
        safeScale,
    },
    rotation: {
      ...opening.rotation,
      y:
        frame.rotationY,
    },
    dimensions: {
      ...opening.dimensions,
      depth:
        depthReal /
        safeScale,
    },
    parameters: {
      ...(opening.parameters ||
        {}),
      archHostWallId:
        wall.id,
      archHostWallName:
        wall.name,
      archWallOffsetMm:
        safeOffset,
      archSill:
        safeSill,
      archScale:
        safeScale,
      archLevelId:
        wall.parameters
          ?.archLevelId ||
        opening.parameters
          ?.archLevelId ||
        "ground",
      archLevelName:
        wall.parameters
          ?.archLevelName ||
        opening.parameters
          ?.archLevelName ||
        "GROUND",
      archLevelElevation:
        frame.elevation,
      archRealDimensions: {
        ...realDimensions,
        depth:
          depthReal,
      },
    },
  };
}

function architectureObjectBounds(
  item
) {
  const geometry =
    localGeometryForObject(
      item
    );

  try {
    const box =
      geometry.boundingBox
        ? geometry.boundingBox.clone()
        : new THREE.Box3()
            .setFromBufferAttribute(
              geometry.getAttribute(
                "position"
              )
            );

    box.applyMatrix4(
      creatorObjectWorldMatrix(
        item
      )
    );

    return box;
  } finally {
    geometry.dispose?.();
  }
}

function architecturePrintCheck(
  objects
) {
  const solids =
    objects.filter(
      (item) =>
        item.source ===
          "architecture" &&
        item.role ===
          "solid" &&
        item.visible !==
          false
    );

  if (
    solids.length ===
    0
  ) {
    return {
      objectCount: 0,
      width: 0,
      depth: 0,
      height: 0,
      thinWalls: 0,
      thinColumns: 0,
      outsideBed: false,
      status: "EMPTY",
    };
  }

  const bounds =
    new THREE.Box3();

  solids.forEach(
    (item) => {
      bounds.union(
        architectureObjectBounds(
          item
        )
      );
    }
  );

  const size =
    new THREE.Vector3();

  bounds.getSize(
    size
  );

  const width =
    size.x /
    SCENE_SCALE;

  const height =
    size.y /
    SCENE_SCALE;

  const depth =
    size.z /
    SCENE_SCALE;

  const thinWalls =
    solids.filter(
      (item) =>
        item.parameters
          ?.archType ===
          "wall" &&
        Math.min(
          item.dimensions
            .width,
          item.dimensions
            .depth
        ) <
          ARCH_MIN_PRINT_WALL_MM
    ).length;

  const thinColumns =
    solids.filter(
      (item) =>
        item.parameters
          ?.archType ===
          "column" &&
        Math.min(
          item.dimensions
            .width,
          item.dimensions
            .depth
        ) <
          ARCH_MIN_PRINT_WALL_MM
    ).length;

  return {
    objectCount:
      solids.length,
    width,
    depth,
    height,
    thinWalls,
    thinColumns,
    outsideBed:
      width >
        256 ||
      depth >
        256,
    status:
      thinWalls >
        0 ||
      thinColumns >
        0 ||
      width >
        256 ||
      depth >
        256
        ? "CHECK"
        : "READY",
  };
}

function architectureProductionCheck(
  objects,
  levels,
  printCheck
) {
  const architectureObjects =
    objects.filter(
      (item) =>
        item.source ===
        "architecture"
    );

  const architectureSolids =
    architectureObjects.filter(
      (item) =>
        item.role ===
          "solid"
    );

  const visibleSolids =
    architectureSolids.filter(
      (item) =>
        item.visible !==
          false
    );

  const levelIds =
    new Set(
      levels.map(
        (level) =>
          level.id
      )
    );

  const objectIds =
    new Set();

  const duplicateIds =
    [];

  architectureObjects.forEach(
    (item) => {
      if (
        objectIds.has(
          item.id
        )
      ) {
        duplicateIds.push(
          item.id
        );
      }

      objectIds.add(
        item.id
      );
    }
  );

  const invalidGeometryObjects =
    architectureObjects.filter(
      (item) => {
        const values = [
          item.dimensions
            ?.width,
          item.dimensions
            ?.depth,
          item.dimensions
            ?.height,
          item.position
            ?.x,
          item.position
            ?.y,
          item.position
            ?.z,
          item.rotation
            ?.x,
          item.rotation
            ?.y,
          item.rotation
            ?.z,
        ];

        if (
          values.some(
            (value) =>
              !Number.isFinite(
                Number(
                  value
                )
              )
          )
        ) {
          return true;
        }

        return (
          safeNumber(
            item.dimensions
              ?.width,
            0
          ) <=
            0 ||
          safeNumber(
            item.dimensions
              ?.depth,
            0
          ) <=
            0 ||
          safeNumber(
            item.dimensions
              ?.height,
            0
          ) <=
            0
        );
      }
    );

  const missingLevelObjects =
    architectureObjects.filter(
      (item) =>
        !levelIds.has(
          item.parameters
            ?.archLevelId
        )
    );

  const unappliedOpenings =
    architectureObjects.filter(
      (item) =>
        item.role ===
          "hole"
    );

  const orphanOpenings =
    unappliedOpenings.filter(
      (item) => {
        const hostId =
          item.parameters
            ?.archHostWallId;

        return (
          hostId &&
          !architectureObjects.some(
            (candidate) =>
              candidate.id ===
              hostId
          )
        );
      }
    );

  const cutWallsMissingFrame =
    architectureObjects.filter(
      (item) =>
        item.role ===
          "solid" &&
        item.parameters
          ?.archType ===
          "wall" &&
        item.parameters
          ?.architectureCut &&
        !item.parameters
          ?.archWallFrame
    );

  const hiddenSolids =
    architectureSolids.filter(
      (item) =>
        item.visible ===
          false
    );

  const emptyLevels =
    levels.filter(
      (level) =>
        !architectureObjects.some(
          (item) =>
            item.parameters
              ?.archLevelId ===
              level.id
        )
    );

  const levelStats =
    levels.map(
      (level) => {
        const levelObjects =
          architectureObjects.filter(
            (item) =>
              item.parameters
                ?.archLevelId ===
                level.id
          );

        const solids =
          levelObjects.filter(
            (item) =>
              item.role ===
              "solid"
          );

        const openings =
          levelObjects.filter(
            (item) =>
              item.role ===
              "hole"
          );

        let width =
          0;

        let depth =
          0;

        let height =
          0;

        if (
          solids.length >
          0
        ) {
          const bounds =
            new THREE.Box3();

          solids.forEach(
            (item) => {
              try {
                bounds.union(
                  architectureObjectBounds(
                    item
                  )
                );
              } catch {
                // The invalid object is already reported by integrity checks.
              }
            }
          );

          if (
            !bounds.isEmpty()
          ) {
            const size =
              new THREE.Vector3();

            bounds.getSize(
              size
            );

            width =
              size.x /
              SCENE_SCALE;

            height =
              size.y /
              SCENE_SCALE;

            depth =
              size.z /
              SCENE_SCALE;
          }
        }

        return {
          id:
            level.id,
          name:
            level.name ||
            "LEVEL",
          elevation:
            safeNumber(
              level.elevation,
              0
            ),
          objects:
            levelObjects.length,
          solids:
            solids.length,
          openings:
            openings.length,
          width,
          depth,
          height,
          outsideBed:
            width >
              256 ||
            depth >
              256,
        };
      }
    );

  const blockers = [];
  const warnings = [];
  const info = [];

  if (
    visibleSolids.length ===
    0
  ) {
    blockers.push({
      code:
        "NO_SOLIDS",
      title:
        "No printable Architect solids",
      detail:
        "Add at least one visible Architect solid before export.",
      objectId:
        null,
    });
  }

  if (
    duplicateIds.length >
    0
  ) {
    blockers.push({
      code:
        "DUPLICATE_IDS",
      title:
        `${duplicateIds.length} duplicate object ID(s)`,
      detail:
        "Duplicate IDs can corrupt selection, grouping and export.",
      objectId:
        duplicateIds[0],
    });
  }

  invalidGeometryObjects.forEach(
    (item) => {
      blockers.push({
        code:
          "INVALID_GEOMETRY",
        title:
          `Invalid geometry · ${item.name}`,
        detail:
          "Dimensions / position contain invalid or non-positive values.",
        objectId:
          item.id,
      });
    }
  );

  missingLevelObjects.forEach(
    (item) => {
      blockers.push({
        code:
          "MISSING_LEVEL",
        title:
          `Missing level · ${item.name}`,
        detail:
          "This Architect object references a level that no longer exists.",
        objectId:
          item.id,
      });
    }
  );

  orphanOpenings.forEach(
    (item) => {
      blockers.push({
        code:
          "ORPHAN_OPENING",
        title:
          `Orphan opening · ${item.name}`,
        detail:
          "The smart opening no longer has a valid host wall.",
        objectId:
          item.id,
      });
    }
  );

  unappliedOpenings
    .filter(
      (item) =>
        !orphanOpenings.some(
          (orphan) =>
            orphan.id ===
            item.id
        )
    )
    .forEach(
      (item) => {
        blockers.push({
          code:
            "UNAPPLIED_OPENING",
          title:
            `Opening not cut · ${item.name}`,
          detail:
            "HOLE objects are ignored by export. Use CUT OPENING before production export.",
          objectId:
            item.id,
        });
      }
    );

  if (
    printCheck
      .thinWalls >
    0
  ) {
    warnings.push({
      code:
        "THIN_WALLS",
      title:
        `${printCheck.thinWalls} thin wall(s)`,
      detail:
        `Below ${ARCH_MIN_PRINT_WALL_MM} mm at print scale.`,
      objectId:
        architectureObjects.find(
          (item) =>
            item.parameters
              ?.archType ===
              "wall" &&
            Math.min(
              item.dimensions
                .width,
              item.dimensions
                .depth
            ) <
              ARCH_MIN_PRINT_WALL_MM
        )?.id ||
        null,
    });
  }

  if (
    printCheck
      .thinColumns >
    0
  ) {
    warnings.push({
      code:
        "THIN_COLUMNS",
      title:
        `${printCheck.thinColumns} thin column(s)`,
      detail:
        `Below ${ARCH_MIN_PRINT_WALL_MM} mm at print scale.`,
      objectId:
        architectureObjects.find(
          (item) =>
            item.parameters
              ?.archType ===
              "column" &&
            Math.min(
              item.dimensions
                .width,
              item.dimensions
                .depth
            ) <
              ARCH_MIN_PRINT_WALL_MM
        )?.id ||
        null,
    });
  }

  if (
    printCheck
      .outsideBed
  ) {
    warnings.push({
      code:
        "OUTSIDE_BED",
      title:
        "Model exceeds 256 × 256 mm build plate",
      detail:
        "Use Split by Level, reduce scale, or divide the model before printing.",
      objectId:
        null,
    });
  }

  cutWallsMissingFrame.forEach(
    (item) => {
      warnings.push({
        code:
          "CUT_WALL_FRAME",
        title:
          `Cut wall metadata incomplete · ${item.name}`,
        detail:
          "The wall exports, but adding another smart opening may be unreliable.",
        objectId:
          item.id,
      });
    }
  );

  if (
    hiddenSolids.length >
    0
  ) {
    warnings.push({
      code:
        "HIDDEN_SOLIDS",
      title:
        `${hiddenSolids.length} hidden Architect solid(s)`,
      detail:
        "Hidden solids are excluded from the normal STL / 3MF export.",
      objectId:
        hiddenSolids[0].id,
    });
  }

  if (
    architectureObjects.length >=
    Math.floor(
      MAX_OBJECTS *
      0.85
    )
  ) {
    warnings.push({
      code:
        "OBJECT_LIMIT",
      title:
        `${architectureObjects.length} / ${MAX_OBJECTS} Architect objects`,
      detail:
        "The project is close to the Creator object limit. Performance may decrease.",
      objectId:
        null,
    });
  }

  if (
    emptyLevels.length >
    0
  ) {
    info.push({
      code:
        "EMPTY_LEVELS",
      title:
        `${emptyLevels.length} empty level(s)`,
      detail:
        "Empty levels are safe but will not create geometry in exports.",
    });
  }

  levelStats
    .filter(
      (level) =>
        level.outsideBed
    )
    .forEach(
      (level) => {
        info.push({
          code:
            "LEVEL_BED",
          title:
            `${level.name} footprint · ${level.width.toFixed(
              1
            )} × ${level.depth.toFixed(
              1
            )} mm`,
          detail:
            "This individual level exceeds the 256 × 256 mm build plate.",
        });
      }
    );

  const status =
    blockers.length >
    0
      ? "BLOCKED"
      : warnings.length >
          0
        ? "CHECK"
        : visibleSolids.length >
            0
          ? "READY"
          : "EMPTY";

  return {
    status,
    blockerCount:
      blockers.length,
    warningCount:
      warnings.length,
    infoCount:
      info.length,
    blockers,
    warnings,
    info,
    levelStats,
    architectureObjectCount:
      architectureObjects.length,
    visibleSolidCount:
      visibleSolids.length,
    hiddenSolidCount:
      hiddenSolids.length,
    unappliedOpeningCount:
      unappliedOpenings.length,
    orphanOpeningCount:
      orphanOpenings.length,
  };
}

const FONT_5X7 = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  J: ["00111","00010","00010","00010","10010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","10101","01010"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  0: ["01110","10001","10011","10101","11001","10001","01110"],
  1: ["00100","01100","00100","00100","00100","00100","01110"],
  2: ["01110","10001","00001","00010","00100","01000","11111"],
  3: ["11110","00001","00001","01110","00001","00001","11110"],
  4: ["00010","00110","01010","10010","11111","00010","00010"],
  5: ["11111","10000","10000","11110","00001","00001","11110"],
  6: ["01110","10000","10000","11110","10001","10001","01110"],
  7: ["11111","00001","00010","00100","01000","01000","01000"],
  8: ["01110","10001","10001","01110","10001","10001","01110"],
  9: ["01110","10001","10001","01111","00001","00001","01110"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
};

function safeNumber(
  value,
  fallback = 0
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      safeNumber(
        value,
        min
      )
    )
  );
}

function makeId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function objectName(
  type,
  index
) {
  if (
    type === "text"
  ) {
    return `TEXT ${index}`;
  }

  if (
    type === "mesh"
  ) {
    return `BOOLEAN ${index}`;
  }

  return `${SHAPE_DEFAULTS[
    type
  ].label.toUpperCase()} ${index}`;
}

function makeObject(
  type,
  index,
  offset = 0
) {
  const defaults =
    SHAPE_DEFAULTS[
      type
    ];

  return {
    id: makeId(),
    type,
    role: "solid",
    visible: true,
    locked: false,
    groupId: null,
    groupName: null,
    name:
      objectName(
        type,
        index
      ),
    text:
      type === "text"
        ? "BEYOND"
        : "",
    dimensions: {
      ...defaults.dimensions,
    },
    baseDimensions: null,
    geometry: null,
    position: {
      x: offset,
      y: 0,
      z:
        offset *
        0.35,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    materialId:
      type === "text"
        ? "ice"
        : "navy",
    parameters:
      type === "tube"
        ? {
            wallThickness: 4,
          }
        : type ===
            "roundedBox"
          ? {
              radius: 4,
              segments: 5,
            }
          : {},
    source: null,
    engine: null,
  };
}

function materialPreset(
  id
) {
  return (
    MATERIALS.find(
      (item) =>
        item.id === id
    ) ||
    MATERIALS[0]
  );
}

function materialColor(
  id
) {
  return materialPreset(
    id
  ).color;
}

function getPattern(
  character
) {
  if (
    character === " "
  ) {
    return [
      "00000",
      "00000",
      "00000",
      "00000",
      "00000",
      "00000",
      "00000",
    ];
  }

  return (
    FONT_5X7[
      character
    ] ||
    FONT_5X7["-"]
  );
}

function getTextCells(
  text
) {
  const characters =
    (
      text
        .toUpperCase()
        .slice(
          0,
          12
        ) || "TEXT"
    ).split("");

  const cells = [];
  const columnsPerCharacter =
    6;
  const totalColumns =
    Math.max(
      1,
      characters.length *
        columnsPerCharacter -
        1
    );

  characters.forEach(
    (
      character,
      characterIndex
    ) => {
      const pattern =
        getPattern(
          character
        );

      pattern.forEach(
        (
          row,
          rowIndex
        ) => {
          row
            .split("")
            .forEach(
              (
                value,
                columnIndex
              ) => {
                if (
                  value !== "1"
                ) {
                  return;
                }

                cells.push({
                  column:
                    characterIndex *
                      columnsPerCharacter +
                    columnIndex,
                  row:
                    rowIndex,
                });
              }
            );
        }
      );
    }
  );

  return {
    cells,
    totalColumns,
  };
}

function mergeGeometryList(
  geometries
) {
  const merge =
    BufferGeometryUtils
      .mergeGeometries ||
    BufferGeometryUtils
      .mergeBufferGeometries;

  if (!merge) {
    throw new Error(
      "Three.js geometry merge utility is unavailable."
    );
  }

  return merge(
    geometries,
    false
  );
}

function makeTextGeometry(
  item
) {
  const {
    cells,
    totalColumns,
  } =
    getTextCells(
      item.text
    );

  const width =
    item.dimensions
      .width *
    SCENE_SCALE;

  const depth =
    item.dimensions
      .depth *
    SCENE_SCALE;

  const height =
    item.dimensions
      .height *
    SCENE_SCALE;

  const cellWidth =
    width /
    totalColumns;

  const cellHeight =
    height / 7;

  const geometries =
    cells.map(
      (cell) => {
        const geometry =
          new THREE.BoxGeometry(
            Math.max(
              0.015,
              cellWidth *
                0.9
            ),
            Math.max(
              0.015,
              cellHeight *
                0.9
            ),
            Math.max(
              0.02,
              depth
            )
          );

        const x =
          -width /
            2 +
          cellWidth /
            2 +
          cell.column *
            cellWidth;

        const y =
          height -
          cellHeight /
            2 -
          cell.row *
            cellHeight;

        geometry.translate(
          x,
          y,
          0
        );

        return geometry;
      }
    );

  if (
    geometries.length ===
    0
  ) {
    return new THREE.BoxGeometry(
      0.02,
      0.02,
      0.02
    );
  }

  const merged =
    mergeGeometryList(
      geometries
    );

  geometries.forEach(
    (geometry) =>
      geometry.dispose()
  );

  merged.computeVertexNormals();

  return merged;
}

function makePrimitiveGeometry(
  item
) {
  const width =
    item.dimensions
      .width *
    SCENE_SCALE;

  const depth =
    item.dimensions
      .depth *
    SCENE_SCALE;

  const height =
    item.dimensions
      .height *
    SCENE_SCALE;

  if (
    item.type ===
    "sphere"
  ) {
    const geometry =
      new THREE.SphereGeometry(
        1,
        48,
        32
      );

    geometry.scale(
      Math.max(
        0.02,
        width / 2
      ),
      Math.max(
        0.02,
        height / 2
      ),
      Math.max(
        0.02,
        depth / 2
      )
    );

    geometry.translate(
      0,
      height / 2,
      0
    );

    return geometry;
  }

  if (
    item.type ===
    "cylinder"
  ) {
    const geometry =
      new THREE.CylinderGeometry(
        1,
        1,
        1,
        64
      );

    geometry.scale(
      Math.max(
        0.02,
        width / 2
      ),
      Math.max(
        0.02,
        height
      ),
      Math.max(
        0.02,
        depth / 2
      )
    );

    geometry.translate(
      0,
      height / 2,
      0
    );

    return geometry;
  }

  if (
    item.type ===
    "cone"
  ) {
    const geometry =
      new THREE.CylinderGeometry(
        0,
        1,
        1,
        64,
        1,
        false
      );

    geometry.scale(
      Math.max(
        0.02,
        width / 2
      ),
      Math.max(
        0.02,
        height
      ),
      Math.max(
        0.02,
        depth / 2
      )
    );

    geometry.translate(
      0,
      height / 2,
      0
    );

    return geometry;
  }

  if (
    item.type ===
    "torus"
  ) {
    const geometry =
      new THREE.TorusGeometry(
        1,
        0.25,
        24,
        72
      );

    geometry.rotateX(
      -Math.PI / 2
    );

    geometry.scale(
      Math.max(
        0.02,
        width / 2.5
      ),
      Math.max(
        0.02,
        height / 0.5
      ),
      Math.max(
        0.02,
        depth / 2.5
      )
    );

    geometry.translate(
      0,
      height / 2,
      0
    );

    return geometry;
  }

  if (
    item.type ===
    "tube"
  ) {
    const wallMm =
      clamp(
        item.parameters
          ?.wallThickness ||
          4,
        0.8,
        Math.max(
          0.8,
          Math.min(
            item.dimensions
              .width,
            item.dimensions
              .depth
          ) /
            2 -
            0.5
        )
      );

    const wall =
      wallMm *
      SCENE_SCALE;

    const outerX =
      Math.max(
        0.03,
        width / 2
      );

    const outerZ =
      Math.max(
        0.03,
        depth / 2
      );

    const innerX =
      Math.max(
        0.01,
        outerX - wall
      );

    const innerZ =
      Math.max(
        0.01,
        outerZ - wall
      );

    const shape =
      new THREE.Shape();

    shape.absellipse(
      0,
      0,
      outerX,
      outerZ,
      0,
      Math.PI * 2,
      false,
      0
    );

    const hole =
      new THREE.Path();

    hole.absellipse(
      0,
      0,
      innerX,
      innerZ,
      0,
      Math.PI * 2,
      true,
      0
    );

    shape.holes.push(
      hole
    );

    const geometry =
      new THREE.ExtrudeGeometry(
        shape,
        {
          depth:
            Math.max(
              0.02,
              height
            ),
          bevelEnabled:
            false,
          steps: 1,
          curveSegments: 64,
        }
      );

    geometry.rotateX(
      -Math.PI / 2
    );

    geometry.computeVertexNormals();

    return geometry;
  }

  if (
    item.type ===
    "roundedBox"
  ) {
    const radius =
      clamp(
        item.parameters
          ?.radius || 4,
        0.5,
        Math.max(
          0.5,
          Math.min(
            item.dimensions
              .width,
            item.dimensions
              .depth,
            item.dimensions
              .height
          ) /
            2 -
            0.2
        )
      ) *
      SCENE_SCALE;

    const segments =
      Math.round(
        clamp(
          item.parameters
            ?.segments || 5,
          1,
          10
        )
      );

    const geometry =
      new RoundedBoxGeometry(
        Math.max(
          0.02,
          width
        ),
        Math.max(
          0.02,
          height
        ),
        Math.max(
          0.02,
          depth
        ),
        segments,
        radius
      );

    geometry.translate(
      0,
      height / 2,
      0
    );

    return geometry;
  }

  const geometry =
    new THREE.BoxGeometry(
      Math.max(
        0.02,
        width
      ),
      Math.max(
        0.02,
        height
      ),
      Math.max(
        0.02,
        depth
      )
    );

  geometry.translate(
    0,
    height / 2,
    0
  );

  return geometry;
}

function generatedScale(
  item
) {
  if (
    item.type !==
      "mesh" ||
    !item.baseDimensions
  ) {
    return [
      1,
      1,
      1,
    ];
  }

  return [
    item.dimensions
      .width /
      Math.max(
        0.001,
        item.baseDimensions
          .width
      ),
    item.dimensions
      .height /
      Math.max(
        0.001,
        item.baseDimensions
          .height
      ),
    item.dimensions
      .depth /
      Math.max(
        0.001,
        item.baseDimensions
          .depth
      ),
  ];
}

function creatorObjectWorldMatrix(
  item
) {
  const scale =
    generatedScale(
      item
    );

  const position =
    new THREE.Vector3(
      item.position.x *
        SCENE_SCALE,
      item.position.y *
        SCENE_SCALE,
      item.position.z *
        SCENE_SCALE
    );

  const quaternion =
    new THREE.Quaternion()
      .setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(
            item.rotation.x
          ),
          THREE.MathUtils.degToRad(
            item.rotation.y
          ),
          THREE.MathUtils.degToRad(
            item.rotation.z
          ),
          "XYZ"
        )
      );

  return new THREE.Matrix4()
    .compose(
      position,
      quaternion,
      new THREE.Vector3(
        scale[0],
        scale[1],
        scale[2]
      )
    );
}

function localGeometryForObject(
  item
) {
  try {
    if (
      item.type ===
        "mesh" &&
      item.geometry
    ) {
      return item.geometry.clone();
    }

    if (
      item.type ===
      "text"
    ) {
      return makeTextGeometry(
        item
      );
    }

    // All built-in solids — including Cone, Torus, Tube and
    // Rounded Box — are real geometries created here.
    return makePrimitiveGeometry(
      item
    );
  } catch (error) {
    console.error(
      `BEYOND Creator geometry error for ${item?.type || "unknown"}:`,
      error
    );

    // Do not allow one invalid object to crash the whole website/canvas.
    const fallback =
      new THREE.BoxGeometry(
        0.18,
        0.18,
        0.18
      );

    fallback.translate(
      0,
      0.09,
      0
    );

    return fallback;
  }
}

function makeCSGMesh(
  item
) {
  const geometry =
    localGeometryForObject(
      item
    );

  const mesh =
    new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color:
          materialColor(
            item.materialId
          ),
      })
    );

  const scale =
    generatedScale(
      item
    );

  mesh.position.set(
    item.position.x *
      SCENE_SCALE,
    item.position.y *
      SCENE_SCALE,
    item.position.z *
      SCENE_SCALE
  );

  mesh.rotation.set(
    item.rotation.x *
      (Math.PI /
        180),
    item.rotation.y *
      (Math.PI /
        180),
    item.rotation.z *
      (Math.PI /
        180)
  );

  mesh.scale.set(
    scale[0],
    scale[1],
    scale[2]
  );

  mesh.updateMatrix();
  mesh.updateMatrixWorld(
    true
  );

  return mesh;
}

function disposeMesh(
  mesh
) {
  if (!mesh) {
    return;
  }

  mesh.geometry?.dispose?.();

  if (
    Array.isArray(
      mesh.material
    )
  ) {
    mesh.material.forEach(
      (material) =>
        material?.dispose?.()
    );
  } else {
    mesh.material?.dispose?.();
  }
}

function makeBooleanObject(
  resultMesh,
  label,
  materialId
) {
  resultMesh.updateMatrixWorld(
    true
  );

  const geometry =
    resultMesh.geometry.clone();

  geometry.applyMatrix4(
    resultMesh.matrixWorld
  );

  geometry.computeBoundingBox();

  const box =
    geometry.boundingBox;

  if (
    !box ||
    !Number.isFinite(
      box.min.x
    )
  ) {
    geometry.dispose();

    throw new Error(
      "Boolean operation returned invalid geometry."
    );
  }

  const centerX =
    (
      box.min.x +
      box.max.x
    ) / 2;

  const centerZ =
    (
      box.min.z +
      box.max.z
    ) / 2;

  const minY =
    box.min.y;

  const width =
    (
      box.max.x -
      box.min.x
    ) /
    SCENE_SCALE;

  const height =
    (
      box.max.y -
      box.min.y
    ) /
    SCENE_SCALE;

  const depth =
    (
      box.max.z -
      box.min.z
    ) /
    SCENE_SCALE;

  geometry.translate(
    -centerX,
    -minY,
    -centerZ
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const baseDimensions = {
    width:
      Math.max(
        0.1,
        width
      ),
    depth:
      Math.max(
        0.1,
        depth
      ),
    height:
      Math.max(
        0.1,
        height
      ),
  };

  return {
    id: makeId(),
    type: "mesh",
    role: "solid",
    visible: true,
    locked: false,
    groupId: null,
    groupName: null,
    name: label,
    text: "",
    geometry,
    baseDimensions: {
      ...baseDimensions,
    },
    dimensions: {
      ...baseDimensions,
    },
    position: {
      x:
        centerX /
        SCENE_SCALE,
      y:
        minY /
        SCENE_SCALE,
      z:
        centerZ /
        SCENE_SCALE,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    materialId,
  };
}

function creatorOrbitTargetFor(
  objects,
  primaryId
) {
  const target =
    new THREE.Vector3(
      0,
      0,
      0
    );

  const primary =
    objects.find(
      (item) =>
        item.id ===
          primaryId &&
        item.visible !==
          false
    );

  if (primary) {
    let geometry =
      null;

    try {
      geometry =
        localGeometryForObject(
          primary
        );

      geometry.computeBoundingBox();

      const box =
        geometry.boundingBox
          ?.clone();

      if (
        box &&
        Number.isFinite(
          box.min.x
        )
      ) {
        box.applyMatrix4(
          creatorObjectWorldMatrix(
            primary
          )
        );

        box.getCenter(
          target
        );

        return target;
      }
    } catch (
      error
    ) {
      console.warn(
        "Creator selected-object orbit target fallback:",
        error
      );
    } finally {
      geometry?.dispose?.();
    }

    target.set(
      primary.position.x *
        SCENE_SCALE,
      primary.position.y *
        SCENE_SCALE,
      primary.position.z *
        SCENE_SCALE
    );

    return target;
  }

  const visibleObjects =
    objects.filter(
      (item) =>
        item.visible !==
        false
    );

  if (
    visibleObjects.length ===
    0
  ) {
    return target;
  }

  const sceneBounds =
    new THREE.Box3();

  let hasBounds =
    false;

  visibleObjects.forEach(
    (item) => {
      let geometry =
        null;

      try {
        geometry =
          localGeometryForObject(
            item
          );

        geometry.computeBoundingBox();

        const box =
          geometry.boundingBox
            ?.clone();

        if (
          box &&
          Number.isFinite(
            box.min.x
          )
        ) {
          box.applyMatrix4(
            creatorObjectWorldMatrix(
              item
            )
          );

          sceneBounds.union(
            box
          );

          hasBounds =
            true;
        }
      } catch {
        // Ignore one invalid object while finding the visible-model center.
      } finally {
        geometry?.dispose?.();
      }
    }
  );

  if (
    hasBounds
  ) {
    sceneBounds.getCenter(
      target
    );
  }

  return target;
}

function CameraController({
  view,
  target,
}) {
  const {
    camera,
    controls,
  } = useThree();

  useEffect(() => {
    if (!camera) {
      return;
    }

    const safeTarget =
      target?.clone?.() ||
      new THREE.Vector3(
        0,
        0,
        0
      );

    const positions = {
      perspective: [
        5.2,
        4.1,
        6.2,
      ],
      front: [
        0,
        2.1,
        7.2,
      ],
      right: [
        7.2,
        2.1,
        0,
      ],
      top: [
        0,
        8.2,
        0.001,
      ],
    };

    const offset =
      positions[view] ||
      positions.perspective;

    camera.position.set(
      safeTarget.x +
        offset[0],
      safeTarget.y +
        offset[1],
      safeTarget.z +
        offset[2]
    );

    if (
      view ===
      "top"
    ) {
      camera.up.set(
        0,
        0,
        -1
      );
    } else {
      camera.up.set(
        0,
        1,
        0
      );
    }

    camera.lookAt(
      safeTarget
    );

    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    if (controls) {
      controls.target.copy(
        safeTarget
      );

      controls.update?.();
    }
  }, [
    camera,
    controls,
    target,
    view,
  ]);

  return null;
}

function SelectedObjectOrbitTarget({
  controlsRef,
  target,
}) {
  useEffect(() => {
    const controls =
      controlsRef.current;

    if (!controls) {
      return;
    }

    const safeTarget =
      target?.clone?.() ||
      new THREE.Vector3(
        0,
        0,
        0
      );

    // IMPORTANT:
    // Selection may change the future orbit pivot, but it must NEVER
    // reposition, rotate or focus the camera by itself.
    controls.target.copy(
      safeTarget
    );
  }, [
    controlsRef,
    target,
  ]);

  return null;
}

function MeshEditOverlay({
  geometry,
  selection,
}) {
  const data =
    useMemo(
      () =>
        getSelectionPositions(
          geometry,
          selection
        ),
      [
        geometry,
        selection,
      ]
    );

  const overlayGeometry =
    useMemo(
      () => {
        if (!data) {
          return null;
        }

        const elements =
          data.elements.slice(
            0,
            20000
          );

        const geometry =
          new THREE.BufferGeometry();

        if (
          data.kind ===
          "vertex"
        ) {
          geometry.setFromPoints(
            elements.map(
              (element) =>
                element.points[0]
            )
          );

          return geometry;
        }

        geometry.setFromPoints(
          elements.flatMap(
            (element) =>
              element.points.slice(
                0,
                data.kind ===
                  "edge"
                  ? 2
                  : 3
              )
          )
        );

        return geometry;
      },
      [data]
    );

  useEffect(
    () => () => {
      overlayGeometry
        ?.dispose?.();
    },
    [overlayGeometry]
  );

  if (
    !data ||
    !overlayGeometry
  ) {
    return null;
  }

  if (
    data.kind ===
    "vertex"
  ) {
    return (
      <points
        geometry={
          overlayGeometry
        }
        raycast={() => null}
      >
        <pointsMaterial
          color="#ffb45c"
          size={0.11}
          sizeAttenuation
          depthTest={false}
        />
      </points>
    );
  }

  if (
    data.kind ===
    "edge"
  ) {
    return (
      <lineSegments
        geometry={
          overlayGeometry
        }
        raycast={() => null}
      >
        <lineBasicMaterial
          color="#ffb45c"
          depthTest={false}
        />
      </lineSegments>
    );
  }

  return (
    <mesh
      geometry={
        overlayGeometry
      }
      raycast={() => null}
    >
      <meshBasicMaterial
        color="#ff9f43"
        transparent
        opacity={0.5}
        side={
          THREE.DoubleSide
        }
        depthTest={false}
        polygonOffset
        polygonOffsetFactor={
          -2
        }
      />
    </mesh>
  );
}

function CreatorMesh({
  item,
  selected,
  primary,
  onSelect,
  advanced,
  transformMode,
  transformSpace,
  snapEnabled,
  snapMm,
  onTransformStart,
  onTransformEnd,
  meshEditEnabled,
  meshSelection,
  onEditSelect,
  plan2D = false,
  elevation2D = null,
  presentationYOffset = 0,
}) {
  const groupRef =
    useRef(null);

  const geometry =
    useMemo(
      () =>
        localGeometryForObject(
          item
        ),
      [
        item.type,
        item.geometry,
        item.text,
        item.dimensions
          .width,
        item.dimensions
          .depth,
        item.dimensions
          .height,
        item.parameters
          ?.wallThickness,
        item.parameters
          ?.radius,
        item.parameters
          ?.segments,
      ]
    );

  const scale =
    generatedScale(
      item
    );

  const isHole =
    item.role ===
    "hole";

  const canTransform =
    advanced &&
    primary &&
    selected &&
    !item.locked &&
    item.visible !==
      false &&
    transformMode !==
      "select" &&
    !meshEditEnabled &&
    !elevation2D &&
    Math.abs(
      presentationYOffset
    ) <
      0.000001;

  function handleObjectClick(
    event
  ) {
    if (
      item.locked
    ) {
      return;
    }

    event
      .stopPropagation();

    if (
      meshEditEnabled &&
      primary &&
      item.type ===
        "mesh"
    ) {
      const localPoint =
        event.object
          .worldToLocal(
            event.point.clone()
          );

      onEditSelect(
        item.id,
        event.face,
        event.faceIndex,
        localPoint,
        geometry,
        Boolean(
          event.shiftKey ||
            event.ctrlKey ||
            event.metaKey
        )
      );

      return;
    }

    onSelect(
      item.id,
      Boolean(
        event.shiftKey ||
          event.ctrlKey ||
          event.metaKey
      )
    );
  }

  const isArchitecturePlanObject =
    plan2D &&
    item.source ===
      "architecture";

  const planFrame =
    isArchitecturePlanObject &&
    item.parameters
      ?.archType ===
      "wall"
      ? architectureWallFrameFor(
          item,
          item.parameters
            ?.archScale ||
            100
        )
      : null;

  const planWidth =
    Math.max(
      0.02,
      (
        planFrame
          ? planFrame.width /
            (
              item.parameters
                ?.archScale ||
              100
            )
          : item.dimensions.width
      ) *
        SCENE_SCALE
    );

  const planDepth =
    Math.max(
      0.02,
      (
        planFrame
          ? planFrame.depth /
            (
              item.parameters
                ?.archScale ||
              100
            )
          : item.dimensions.depth
      ) *
        SCENE_SCALE
    );

  const planX =
    (
      planFrame
        ? planFrame.x /
          (
            item.parameters
              ?.archScale ||
            100
          )
        : item.position.x
    ) *
    SCENE_SCALE;

  const planZ =
    (
      planFrame
        ? planFrame.z /
          (
            item.parameters
              ?.archScale ||
            100
          )
        : item.position.z
    ) *
    SCENE_SCALE;

  const planRotationY =
    THREE.MathUtils.degToRad(
      planFrame
        ? planFrame.rotationY
        : item.rotation.y
    );

  const planY =
    (
      safeNumber(
        item.parameters
          ?.archLevelElevation,
        0
      ) /
      Math.max(
        1,
        safeNumber(
          item.parameters
            ?.archScale,
          100
        )
      )
    ) *
      SCENE_SCALE +
    0.006;

  const planArchType =
    item.parameters
      ?.archType;

  const planOpeningLeaf =
    Math.max(
      0.02,
      planWidth *
        0.9
    );

  const planDoorArcPoints =
    planArchType ===
      "door"
      ? Array.from(
          {
            length: 13,
          },
          (
            _,
            index
          ) => {
            const angle =
              (
                Math.PI /
                2
              ) *
              (
                index /
                12
              );

            return [
              -planWidth /
                2 +
                Math.cos(
                  angle
                ) *
                  planOpeningLeaf,
              0.012,
              Math.sin(
                angle
              ) *
                planOpeningLeaf,
            ];
          }
        )
      : [];

  const planObjectGroup =
    isArchitecturePlanObject
      ? (
        <group
          ref={
            groupRef
          }
          position={[
            planX,
            planY,
            planZ,
          ]}
          rotation={[
            0,
            planRotationY,
            0,
          ]}
          onClick={
            handleObjectClick
          }
        >
          <mesh
            rotation={[
              -Math.PI /
                2,
              0,
              0,
            ]}
          >
            <planeGeometry
              args={[
                planWidth,
                planDepth,
              ]}
            />

            <meshBasicMaterial
              color={
                item.role ===
                  "hole"
                  ? "#b56572"
                  : materialColor(
                      item.materialId
                    )
              }
              transparent={
                item.role ===
                  "hole"
              }
              opacity={
                item.role ===
                  "hole"
                  ? 0.42
                  : selected
                    ? 0.98
                    : 0.86
              }
              side={
                THREE.DoubleSide
              }
              depthWrite
            />

            <Edges
              threshold={1}
              color={
                selected
                  ? "#83c8fa"
                  : item.role ===
                      "hole"
                    ? "#ef8998"
                    : "#6f91a8"
              }
            />
          </mesh>

          {planArchType ===
            "door" && (
            <>
              <Line
                points={[
                  [
                    -planWidth /
                      2,
                    0.012,
                    0,
                  ],
                  [
                    -planWidth /
                      2,
                    0.012,
                    planOpeningLeaf,
                  ],
                ]}
                color="#e4a0ab"
                lineWidth={1}
              />

              <Line
                points={
                  planDoorArcPoints
                }
                color="#d98c99"
                lineWidth={1}
              />
            </>
          )}

          {planArchType ===
            "window" && (
            <>
              <Line
                points={[
                  [
                    -planWidth /
                      2,
                    0.012,
                    -planDepth *
                      0.18,
                  ],
                  [
                    planWidth /
                      2,
                    0.012,
                    -planDepth *
                      0.18,
                  ],
                ]}
                color="#83c5e8"
                lineWidth={1}
              />

              <Line
                points={[
                  [
                    -planWidth /
                      2,
                    0.012,
                    planDepth *
                      0.18,
                  ],
                  [
                    planWidth /
                      2,
                    0.012,
                    planDepth *
                      0.18,
                  ],
                ]}
                color="#83c5e8"
                lineWidth={1}
              />
            </>
          )}
        </group>
      )
      : null;

  const isArchitectureElevationObject =
    Boolean(
      elevation2D
    ) &&
    item.source ===
      "architecture";

  const elevationBounds =
    useMemo(
      () =>
        isArchitectureElevationObject
          ? architectureObjectBounds(
              item
            )
          : null,
      [
        isArchitectureElevationObject,
        elevation2D,
        item,
      ]
    );

  const elevationProjection =
    elevationBounds
      ? (() => {
          const widthWorld =
            elevation2D ===
            "front"
              ? elevationBounds.max.x -
                elevationBounds.min.x
              : elevationBounds.max.z -
                elevationBounds.min.z;

          const heightWorld =
            elevationBounds.max.y -
            elevationBounds.min.y;

          const centerHorizontal =
            elevation2D ===
            "front"
              ? (
                  elevationBounds.min.x +
                  elevationBounds.max.x
                ) /
                2
              : (
                  elevationBounds.min.z +
                  elevationBounds.max.z
                ) /
                2;

          const centerY =
            (
              elevationBounds.min.y +
              elevationBounds.max.y
            ) /
            2;

          return {
            width:
              Math.max(
                0.012,
                widthWorld
              ),
            height:
              Math.max(
                0.012,
                heightWorld
              ),
            horizontal:
              centerHorizontal,
            y:
              centerY,
          };
        })()
      : null;

  const elevationObjectGroup =
    isArchitectureElevationObject &&
    elevationProjection
      ? (
        <group
          ref={
            groupRef
          }
          position={
            elevation2D ===
            "front"
              ? [
                  elevationProjection
                    .horizontal,
                  elevationProjection
                    .y,
                  0,
                ]
              : [
                  0,
                  elevationProjection
                    .y,
                  elevationProjection
                    .horizontal,
                ]
          }
          rotation={
            elevation2D ===
            "front"
              ? [
                  0,
                  0,
                  0,
                ]
              : [
                  0,
                  Math.PI /
                    2,
                  0,
                ]
          }
          onClick={
            handleObjectClick
          }
        >
          <mesh>
            <planeGeometry
              args={[
                elevationProjection
                  .width,
                elevationProjection
                  .height,
              ]}
            />

            <meshBasicMaterial
              color={
                item.role ===
                  "hole"
                  ? "#b56572"
                  : materialColor(
                      item.materialId
                    )
              }
              transparent={
                item.role ===
                  "hole"
              }
              opacity={
                item.role ===
                  "hole"
                  ? 0.28
                  : selected
                    ? 0.98
                    : 0.84
              }
              side={
                THREE.DoubleSide
              }
              depthWrite
            />

            <Edges
              threshold={1}
              color={
                selected
                  ? "#83c8fa"
                  : item.role ===
                      "hole"
                    ? "#ef8998"
                    : "#6f91a8"
              }
            />
          </mesh>
        </group>
      )
      : null;

  const objectGroup = (
    <group
      ref={groupRef}
      position={[
        item.position.x *
          SCENE_SCALE,
        item.position.y *
          SCENE_SCALE +
          presentationYOffset,
        item.position.z *
          SCENE_SCALE,
      ]}
      rotation={[
        item.rotation.x *
          (Math.PI /
            180),
        item.rotation.y *
          (Math.PI /
            180),
        item.rotation.z *
          (Math.PI /
            180),
      ]}
      scale={scale}
      onClick={
        handleObjectClick
      }
    >
      <mesh
        geometry={
          geometry
        }
        castShadow={
          !isHole
        }
        receiveShadow={
          !isHole
        }
      >
        <meshStandardMaterial
          color={
            isHole
              ? "#b56572"
              : materialColor(
                  item.materialId
                )
          }
          roughness={
            isHole
              ? 0.52
              : materialPreset(
                  item.materialId
                ).roughness ??
                0.36
          }
          metalness={
            isHole
              ? 0
              : materialPreset(
                  item.materialId
                ).metalness ??
                0.14
          }
          transparent={
            isHole ||
            Boolean(
              materialPreset(
                item.materialId
              ).transparent
            )
          }
          opacity={
            isHole
              ? 0.28
              : (
                  materialPreset(
                    item.materialId
                  ).opacity ??
                  1
                ) *
                (
                  item.locked
                    ? 0.82
                    : 1
                )
          }
          depthWrite={
            !isHole &&
            !Boolean(
              materialPreset(
                item.materialId
              ).transparent
            )
          }
          emissive={
            selected
              ? isHole
                ? "#4a1620"
                : "#0c2740"
              : "#000000"
          }
          emissiveIntensity={
            selected
              ? 0.55
              : 0
          }
        />

        {selected && (
          <Edges
            scale={1.01}
            threshold={15}
            color={
              item.locked
                ? "#788da0"
                : isHole
                  ? "#ef8998"
                  : "#83c8fa"
            }
          />
        )}
      </mesh>

      {meshEditEnabled &&
        primary &&
        item.type ===
          "mesh" && (
        <>
          <mesh
            geometry={
              geometry
            }
            raycast={() => null}
          >
            <meshBasicMaterial
              color="#78a9ca"
              wireframe
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>

          <MeshEditOverlay
            geometry={
              geometry
            }
            selection={
              meshSelection
            }
          />
        </>
      )}
    </group>
  );

  return (
    <>
      {isArchitecturePlanObject
        ? planObjectGroup
        : isArchitectureElevationObject
          ? elevationObjectGroup
          : objectGroup}

      {!isArchitecturePlanObject &&
        !isArchitectureElevationObject &&
        canTransform && (
        <TransformControls
          object={
            groupRef
          }
          mode={
            transformMode
          }
          space={
            transformSpace
          }
          size={0.78}
          translationSnap={
            snapEnabled
              ? snapMm *
                SCENE_SCALE
              : null
          }
          rotationSnap={
            snapEnabled
              ? THREE.MathUtils.degToRad(
                  15
                )
              : null
          }
          scaleSnap={
            snapEnabled
              ? 0.1
              : null
          }
          onMouseDown={() =>
            onTransformStart(
              item.id
            )
          }
          onMouseUp={() =>
            onTransformEnd(
              item.id,
              groupRef.current,
              scale
            )
          }
        />
      )}
    </>
  );
}

function PlanRoomLabels({
  objects,
  activeLevelId,
}) {
  const rooms =
    useMemo(
      () => {
        const grouped =
          new Map();

        objects.forEach(
          (item) => {
            const roomId =
              item.parameters
                ?.archRoomId;

            if (
              !roomId ||
              item.visible ===
                false ||
              (
                activeLevelId &&
                item.parameters
                  ?.archLevelId !==
                  activeLevelId
              )
            ) {
              return;
            }

            if (
              !grouped.has(
                roomId
              )
            ) {
              grouped.set(
                roomId,
                []
              );
            }

            grouped.get(
              roomId
            ).push(
              item
            );
          }
        );

        return Array.from(
          grouped.entries()
        ).map(
          ([
            roomId,
            roomObjects,
          ]) => {
            const floor =
              roomObjects.find(
                (item) =>
                  item.parameters
                    ?.archType ===
                  "floor"
              );

            const source =
              floor ||
              roomObjects[0];

            const centerX =
              floor
                ? floor.position.x
                : roomObjects.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      item.position.x,
                    0
                  ) /
                  roomObjects.length;

            const centerZ =
              floor
                ? floor.position.z
                : roomObjects.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      item.position.z,
                    0
                  ) /
                  roomObjects.length;

            return {
              id:
                roomId,
              name:
                source.parameters
                  ?.archRoomName ||
                source.groupName ||
                "ROOM",
              areaM2:
                roomObjects.reduce(
                  (
                    value,
                    item
                  ) =>
                    Math.max(
                      value,
                      safeNumber(
                        item.parameters
                          ?.archRoomAreaM2,
                        0
                      )
                    ),
                  0
                ),
              x:
                centerX *
                SCENE_SCALE,
              z:
                centerZ *
                SCENE_SCALE,
              y:
                (
                  safeNumber(
                    source.parameters
                      ?.archLevelElevation,
                    0
                  ) /
                  Math.max(
                    1,
                    safeNumber(
                      source.parameters
                        ?.archScale,
                      100
                    )
                  )
                ) *
                  SCENE_SCALE +
                0.018,
            };
          }
        );
      },
      [
        objects,
      ]
    );

  return (
    <>
      {rooms.map(
        (room) => (
          <Html
            key={
              room.id
            }
            position={[
              room.x,
              room.y,
              room.z,
            ]}
            center
            transform={false}
            zIndexRange={[
              20,
              0,
            ]}
          >
            <div className="creator-plan-room-label">
              <strong>
                {
                  room.name
                }
              </strong>

              {room.areaM2 >
                0 && (
                <span>
                  {room.areaM2.toFixed(
                    2
                  )} M²
                </span>
              )}
            </div>
          </Html>
        )
      )}
    </>
  );
}

function PlanMeasurement({
  measurement,
  scale,
  elevationMm,
}) {
  const safeScale =
    Math.max(
      1,
      safeNumber(
        scale,
        100
      )
    );

  const x1 =
    measurement.a.realX /
    safeScale *
    SCENE_SCALE;

  const z1 =
    measurement.a.realZ /
    safeScale *
    SCENE_SCALE;

  const x2 =
    measurement.b.realX /
    safeScale *
    SCENE_SCALE;

  const z2 =
    measurement.b.realZ /
    safeScale *
    SCENE_SCALE;

  const midX =
    (
      x1 +
      x2
    ) /
    2;

  const midZ =
    (
      z1 +
      z2
    ) /
    2;

  const length =
    Math.hypot(
      x2 -
      x1,
      z2 -
      z1
    );

  const angle =
    -Math.atan2(
      z2 -
      z1,
      x2 -
      x1
    );

  const y =
    (
      safeNumber(
        elevationMm,
        0
      ) /
      safeScale
    ) *
      SCENE_SCALE +
    0.025;

  return (
    <>
      <mesh
        position={[
          midX,
          y,
          midZ,
        ]}
        rotation={[
          -Math.PI /
            2,
          0,
          angle,
        ]}
        raycast={() =>
          null
        }
      >
        <planeGeometry
          args={[
            Math.max(
              0.01,
              length
            ),
            0.008,
          ]}
        />

        <meshBasicMaterial
          color="#72bce8"
          transparent
          opacity={0.9}
          side={
            THREE.DoubleSide
          }
          depthTest={false}
        />
      </mesh>

      <Html
        position={[
          midX,
          y +
            0.004,
          midZ,
        ]}
        center
        transform={false}
        zIndexRange={[
          24,
          0,
        ]}
      >
        <div className="creator-plan-dimension-label creator-plan-measure-label">
          {Math.round(
            measurement.distanceMm
          )} MM
        </div>
      </Html>
    </>
  );
}

function PlanArchitectureAnnotations({
  objects,
  measurements,
  activeLevel,
  architectureScale,
  showDimensions,
}) {
  const visible =
    objects.filter(
      (item) =>
        item.source ===
          "architecture" &&
        item.visible !==
          false &&
        (
          !activeLevel ||
          item.parameters
            ?.archLevelId ===
            activeLevel.id
        )
    );

  const walls =
    visible.filter(
      (item) =>
        item.parameters
          ?.archType ===
        "wall"
    );

  const openings =
    visible.filter(
      (item) =>
        [
          "door",
          "window",
        ].includes(
          item.parameters
            ?.archType
        )
    );

  if (
    !showDimensions
  ) {
    return null;
  }

  return (
    <>
      {walls.map(
        (wall) => {
          const frame =
            architectureWallFrameFor(
              wall,
              architectureScale
            );

          const x =
            frame.x /
            architectureScale *
            SCENE_SCALE;

          const z =
            frame.z /
            architectureScale *
            SCENE_SCALE;

          const y =
            (
              safeNumber(
                wall.parameters
                  ?.archLevelElevation,
                0
              ) /
              architectureScale
            ) *
              SCENE_SCALE +
            0.021;

          return (
            <Html
              key={
                `wall-dim-${wall.id}`
              }
              position={[
                x,
                y,
                z,
              ]}
              center
              transform={false}
              zIndexRange={[
                22,
                0,
              ]}
            >
              <div className="creator-plan-dimension-label">
                {Math.round(
                  frame.width
                )} MM
              </div>
            </Html>
          );
        }
      )}

      {openings.map(
        (opening) => {
          const type =
            opening.parameters
              ?.archType;

          const width =
            safeNumber(
              opening.parameters
                ?.archRealDimensions
                ?.width,
              opening.dimensions
                .width *
                architectureScale
            );

          const y =
            (
              safeNumber(
                opening.parameters
                  ?.archLevelElevation,
                0
              ) /
              architectureScale
            ) *
              SCENE_SCALE +
            0.023;

          return (
            <Html
              key={
                `opening-label-${opening.id}`
              }
              position={[
                opening.position.x *
                  SCENE_SCALE,
                y,
                opening.position.z *
                  SCENE_SCALE,
              ]}
              center
              transform={false}
              zIndexRange={[
                23,
                0,
              ]}
            >
              <div
                className={`creator-plan-opening-label ${type}`}
              >
                {type ===
                "door"
                  ? "D"
                  : "W"} · {Math.round(
                  width
                )}
              </div>
            </Html>
          );
        }
      )}

      {measurements
        .filter(
          (measurement) =>
            !activeLevel ||
            measurement.levelId ===
              activeLevel.id
        )
        .map(
          (measurement) => (
            <PlanMeasurement
              key={
                measurement.id
              }
              measurement={
                measurement
              }
              scale={
                architectureScale
              }
              elevationMm={
                activeLevel
                  ?.elevation ||
                0
              }
            />
          )
        )}
    </>
  );
}

function ElevationLevelMarkers({
  levels,
  scale,
  view,
}) {
  if (
    ![
      "front",
      "right",
    ].includes(
      view
    )
  ) {
    return null;
  }

  const safeScale =
    Math.max(
      1,
      safeNumber(
        scale,
        100
      )
    );

  return (
    <>
      {levels
        .filter(
          (level) =>
            level.visible !==
            false
        )
        .map(
          (level) => {
            const y =
              (
                safeNumber(
                  level.elevation,
                  0
                ) /
                safeScale
              ) *
              SCENE_SCALE;

            const points =
              view ===
              "front"
                ? [
                    [
                      -4.8,
                      y,
                      0.008,
                    ],
                    [
                      4.8,
                      y,
                      0.008,
                    ],
                  ]
                : [
                    [
                      0.008,
                      y,
                      -4.8,
                    ],
                    [
                      0.008,
                      y,
                      4.8,
                    ],
                  ];

            const labelPosition =
              view ===
              "front"
                ? [
                    -4.4,
                    y +
                      0.04,
                    0.015,
                  ]
                : [
                    0.015,
                    y +
                      0.04,
                    -4.4,
                  ];

            return (
              <group
                key={
                  `elevation-level-${level.id}`
                }
              >
                <Line
                  points={
                    points
                  }
                  color="#315f7c"
                  lineWidth={1}
                  dashed
                  dashSize={0.08}
                  gapSize={0.06}
                />

                <Html
                  position={
                    labelPosition
                  }
                  center
                  transform={false}
                  zIndexRange={[
                    18,
                    0,
                  ]}
                >
                  <div className="creator-elevation-level-label">
                    <strong>
                      {
                        level.name
                      }
                    </strong>

                    <span>
                      {safeNumber(
                        level.elevation,
                        0
                      ) >=
                      0
                        ? "+"
                        : ""}
                      {Math.round(
                        safeNumber(
                          level.elevation,
                          0
                        )
                      )} MM
                    </span>
                  </div>
                </Html>
              </group>
            );
          }
        )}
    </>
  );
}

function BuildPlate() {
  const size =
    256 *
    SCENE_SCALE;

  return (
    <mesh
      position={[
        0,
        -0.035,
        0,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      receiveShadow
    >
      <planeGeometry
        args={[
          size,
          size,
        ]}
      />

      <meshBasicMaterial
        color="#2d6f9e"
        transparent
        opacity={0.035}
        side={
          THREE.DoubleSide
        }
      />

      <Edges
        color="#3a789f"
        threshold={1}
      />
    </mesh>
  );
}

function ViewportStateBridge({
  apiRef,
}) {
  const {
    camera,
    gl,
  } = useThree();

  useEffect(() => {
    apiRef.current = {
      camera,
      gl,
    };

    return () => {
      if (
        apiRef.current?.camera ===
        camera
      ) {
        apiRef.current =
          null;
      }
    };
  }, [
    apiRef,
    camera,
    gl,
  ]);

  return null;
}

function CreatorScene({
  objects,
  selectedIds,
  primaryId,
  onSelect,
  autoRotate,
  advanced,
  transformMode,
  transformSpace,
  snapEnabled,
  snapMm,
  onTransformStart,
  onTransformEnd,
  cameraView,
  meshEditEnabled,
  meshSelection,
  onEditSelect,
  gridCellSize = 0.36,
  gridSectionSize = 1.8,
  plan2D = false,
  elevation2D = null,
  levelExplodeOffsets = {},
  planAnnotations = true,
  planMeasurements = [],
  architectureActiveLevel = null,
  architectureActiveLevelId = null,
  architectureLevels = [],
  architectureScale = 100,
}) {
  const orbitControlsRef =
    useRef(null);

  const cameraTarget =
    useMemo(
      () =>
        creatorOrbitTargetFor(
          objects,
          null
        ),
      [
        objects,
      ]
    );

  const orbitTarget =
    useMemo(
      () =>
        creatorOrbitTargetFor(
          objects,
          primaryId
        ),
      [
        objects,
        primaryId,
      ]
    );

  const flat2D =
    plan2D ||
    Boolean(
      elevation2D
    );

  const activeOrbitTarget =
    flat2D
      ? cameraTarget
      : orbitTarget;

  return (
    <>
      <CameraController
        view={
          cameraView
        }
        target={
          cameraTarget
        }
      />

      {!flat2D && (
        <>
          <ambientLight
            intensity={0.72}
          />

          <directionalLight
            position={[
              5,
              7,
              6,
            ]}
            intensity={2.05}
            color="#dceeff"
            castShadow
          />

          <pointLight
            position={[
              -4,
              2,
              3,
            ]}
            intensity={1.05}
            color="#238fe1"
          />
        </>
      )}

      {objects
        .filter(
          (item) =>
            item.visible !==
              false &&
            (
              !plan2D ||
              (
                item.source ===
                  "architecture" &&
                item.parameters
                  ?.archLevelId ===
                  architectureActiveLevelId
              )
            ) &&
            (
              !elevation2D ||
              item.source ===
                "architecture"
            )
        )
        .map(
          (item) => (
            <CreatorMesh
              key={
                item.id
              }
              item={item}
              selected={
                selectedIds.includes(
                  item.id
                )
              }
              primary={
                item.id ===
                primaryId
              }
              onSelect={
                onSelect
              }
              advanced={
                advanced
              }
              transformMode={
                transformMode
              }
              transformSpace={
                transformSpace
              }
              snapEnabled={
                snapEnabled
              }
              snapMm={
                snapMm
              }
              onTransformStart={
                onTransformStart
              }
              onTransformEnd={
                onTransformEnd
              }
              meshEditEnabled={
                meshEditEnabled &&
                item.id ===
                  primaryId
              }
              meshSelection={
                item.id ===
                primaryId
                  ? meshSelection
                  : null
              }
              onEditSelect={
                onEditSelect
              }
              plan2D={
                plan2D
              }
              elevation2D={
                elevation2D
              }
              presentationYOffset={
                plan2D
                  ? 0
                  : safeNumber(
                      levelExplodeOffsets[
                        item.parameters
                          ?.archLevelId
                      ],
                      0
                    )
              }
            />
          )
        )}

      {plan2D && (
        <>
          <PlanRoomLabels
            objects={
              objects
            }
            activeLevelId={
              architectureActiveLevelId
            }
          />

          <PlanArchitectureAnnotations
            objects={
              objects
            }
            measurements={
              planMeasurements
            }
            activeLevel={
              architectureActiveLevel
            }
            architectureScale={
              architectureScale
            }
            showDimensions={
              planAnnotations
            }
          />
        </>
      )}

      {elevation2D && (
        <ElevationLevelMarkers
          levels={
            architectureLevels
          }
          scale={
            architectureScale
          }
          view={
            elevation2D
          }
        />
      )}

      {!elevation2D && (
        <BuildPlate />
      )}

      {!flat2D && (
        <ContactShadows
          position={[
            0,
            -0.02,
            0,
          ]}
          opacity={0.2}
          scale={10}
          blur={3.4}
          far={6}
        />
      )}

      {!elevation2D && (
        <Grid
          position={[
            0,
            -0.04,
            0,
          ]}
          args={[
            12,
            12,
          ]}
          cellSize={
            gridCellSize
          }
          cellThickness={0.45}
          cellColor="#203e56"
          sectionSize={
            gridSectionSize
          }
          sectionThickness={0.75}
          sectionColor="#2c5c7d"
          fadeDistance={11}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      {!flat2D && (
        <Environment
          preset="city"
          environmentIntensity={
            0.22
          }
        />
      )}

      <OrbitControls
        ref={
          orbitControlsRef
        }
        makeDefault
        enabled
        enablePan
        enableRotate={
          !flat2D
        }
        enableZoom
        screenSpacePanning
        mouseButtons={{
          LEFT:
            flat2D
              ? THREE.MOUSE.PAN
              : THREE.MOUSE.ROTATE,
          MIDDLE:
            THREE.MOUSE.PAN,
          RIGHT:
            null,
        }}
        minDistance={3}
        maxDistance={11}
        autoRotate={
          flat2D
            ? false
            : advanced
              ? false
              : autoRotate
        }
        autoRotateSpeed={0.45}
      />

      <SelectedObjectOrbitTarget
        controlsRef={
          orbitControlsRef
        }
        target={
          activeOrbitTarget
        }
      />
    </>
  );
}

function objectVolume(
  item
) {
  const {
    width,
    depth,
    height,
  } = item.dimensions;

  if (
    item.type ===
    "sphere"
  ) {
    return (
      (4 / 3) *
      Math.PI *
      (width / 2) *
      (depth / 2) *
      (height / 2)
    );
  }

  if (
    item.type ===
    "cylinder"
  ) {
    return (
      Math.PI *
      (width / 2) *
      (depth / 2) *
      height
    );
  }

  if (
    item.type ===
    "cone"
  ) {
    return (
      Math.PI *
      (width / 2) *
      (depth / 2) *
      height /
      3
    );
  }

  if (
    item.type ===
    "tube"
  ) {
    const wall =
      clamp(
        item.parameters
          ?.wallThickness ||
          4,
        0.8,
        Math.max(
          0.8,
          Math.min(
            width,
            depth
          ) /
            2 -
            0.5
        )
      );

    const outerArea =
      Math.PI *
      (width / 2) *
      (depth / 2);

    const innerArea =
      Math.PI *
      Math.max(
        0,
        width / 2 -
          wall
      ) *
      Math.max(
        0,
        depth / 2 -
          wall
      );

    return (
      Math.max(
        0,
        outerArea -
          innerArea
      ) *
      height
    );
  }

  if (
    item.type ===
    "torus"
  ) {
    const tubeRadius =
      height / 2;

    const majorRadius =
      Math.max(
        0,
        (
          Math.min(
            width,
            depth
          ) /
            2
        ) -
          tubeRadius
      );

    return (
      2 *
      Math.PI *
      Math.PI *
      majorRadius *
      tubeRadius *
      tubeRadius
    );
  }

  if (
    item.type ===
    "text"
  ) {
    const {
      cells,
      totalColumns,
    } =
      getTextCells(
        item.text
      );

    const occupancy =
      cells.length /
      Math.max(
        1,
        totalColumns *
          7
      );

    return (
      width *
      depth *
      height *
      occupancy *
      0.82
    );
  }

  return (
    width *
    depth *
    height
  );
}


function collectExportData(
  objects
) {
  const solids =
    objects.filter(
      (item) =>
        item.role ===
          "solid" &&
        item.visible !==
          false
    );

  const holes =
    objects.filter(
      (item) =>
        item.role ===
          "hole" &&
        item.visible !==
          false
    );

  if (
    solids.length === 0
  ) {
    throw new Error(
      "Add at least one SOLID object before exporting."
    );
  }

  const vertices = [];

  solids.forEach(
    (item) => {
      const mesh =
        makeCSGMesh(
          item
        );

      mesh.updateMatrixWorld(
        true
      );

      let geometry =
        mesh.geometry.clone();

      geometry.applyMatrix4(
        mesh.matrixWorld
      );

      if (
        geometry.index
      ) {
        const nonIndexed =
          geometry.toNonIndexed();

        geometry.dispose();

        geometry =
          nonIndexed;
      }

      const position =
        geometry.getAttribute(
          "position"
        );

      for (
        let index = 0;
        index <
        position.count;
        index += 1
      ) {
        const sourceX =
          position.getX(
            index
          );

        const sourceY =
          position.getY(
            index
          );

        const sourceZ =
          position.getZ(
            index
          );

        // Creator uses Three.js Y-up coordinates.
        // Export files use Z-up coordinates and millimeters.
        vertices.push({
          x:
            sourceX /
            SCENE_SCALE,
          y:
            -sourceZ /
            SCENE_SCALE,
          z:
            sourceY /
            SCENE_SCALE,
        });
      }

      geometry.dispose();

      disposeMesh(
        mesh
      );
    }
  );

  if (
    vertices.length <
      3 ||
    vertices.length %
      3 !==
      0
  ) {
    throw new Error(
      "The current model could not be converted into printable triangles."
    );
  }

  let minX =
    Infinity;
  let minY =
    Infinity;
  let minZ =
    Infinity;

  let maxX =
    -Infinity;
  let maxY =
    -Infinity;
  let maxZ =
    -Infinity;

  vertices.forEach(
    (vertex) => {
      minX =
        Math.min(
          minX,
          vertex.x
        );

      minY =
        Math.min(
          minY,
          vertex.y
        );

      minZ =
        Math.min(
          minZ,
          vertex.z
        );

      maxX =
        Math.max(
          maxX,
          vertex.x
        );

      maxY =
        Math.max(
          maxY,
          vertex.y
        );

      maxZ =
        Math.max(
          maxZ,
          vertex.z
        );
    }
  );

  // Place the exported model in the positive octant,
  // with its lowest point on the print bed.
  vertices.forEach(
    (vertex) => {
      vertex.x -=
        minX;

      vertex.y -=
        minY;

      vertex.z -=
        minZ;
    }
  );

  return {
    vertices,
    triangleCount:
      vertices.length /
      3,
    solidCount:
      solids.length,
    holeCount:
      holes.length,
    bounds: {
      width:
        maxX -
        minX,
      depth:
        maxY -
        minY,
      height:
        maxZ -
        minZ,
    },
  };
}

function triangleNormal(
  a,
  b,
  c
) {
  const ab = {
    x:
      b.x -
      a.x,
    y:
      b.y -
      a.y,
    z:
      b.z -
      a.z,
  };

  const ac = {
    x:
      c.x -
      a.x,
    y:
      c.y -
      a.y,
    z:
      c.z -
      a.z,
  };

  const normal = {
    x:
      ab.y *
        ac.z -
      ab.z *
        ac.y,
    y:
      ab.z *
        ac.x -
      ab.x *
        ac.z,
    z:
      ab.x *
        ac.y -
      ab.y *
        ac.x,
  };

  const length =
    Math.hypot(
      normal.x,
      normal.y,
      normal.z
    ) || 1;

  return {
    x:
      normal.x /
      length,
    y:
      normal.y /
      length,
    z:
      normal.z /
      length,
  };
}

function makeBinarySTLBlob(
  exportData
) {
  const {
    vertices,
    triangleCount,
  } = exportData;

  const buffer =
    new ArrayBuffer(
      84 +
        triangleCount *
          50
    );

  const view =
    new DataView(
      buffer
    );

  const header =
    new TextEncoder()
      .encode(
        "BEYOND Creator binary STL · millimeters"
      );

  for (
    let index = 0;
    index <
      Math.min(
        80,
        header.length
      );
    index += 1
  ) {
    view.setUint8(
      index,
      header[index]
    );
  }

  view.setUint32(
    80,
    triangleCount,
    true
  );

  let offset = 84;

  for (
    let triangle = 0;
    triangle <
      triangleCount;
    triangle += 1
  ) {
    const base =
      triangle * 3;

    const a =
      vertices[
        base
      ];

    const b =
      vertices[
        base + 1
      ];

    const c =
      vertices[
        base + 2
      ];

    const normal =
      triangleNormal(
        a,
        b,
        c
      );

    [
      normal,
      a,
      b,
      c,
    ].forEach(
      (vector) => {
        view.setFloat32(
          offset,
          vector.x,
          true
        );

        view.setFloat32(
          offset + 4,
          vector.y,
          true
        );

        view.setFloat32(
          offset + 8,
          vector.z,
          true
        );

        offset +=
          12;
      }
    );

    view.setUint16(
      offset,
      0,
      true
    );

    offset += 2;
  }

  return new Blob(
    [
      buffer,
    ],
    {
      type:
        "model/stl",
    }
  );
}

function format3MFNumber(
  value
) {
  return Number(
    value.toFixed(
      5
    )
  ).toString();
}

async function make3MFBlob(
  exportData
) {
  const {
    vertices,
    triangleCount,
  } = exportData;

  const vertexXml =
    vertices
      .map(
        (
          vertex
        ) =>
          `<vertex x="${format3MFNumber(
            vertex.x
          )}" y="${format3MFNumber(
            vertex.y
          )}" z="${format3MFNumber(
            vertex.z
          )}" />`
      )
      .join("");

  const triangles = [];

  for (
    let triangle = 0;
    triangle <
      triangleCount;
    triangle += 1
  ) {
    const first =
      triangle * 3;

    triangles.push(
      `<triangle v1="${first}" v2="${
        first + 1
      }" v3="${
        first + 2
      }" />`
    );
  }

  const modelXml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">` +
    `<metadata name="Application">BEYOND Creator</metadata>` +
    `<metadata name="Title">BEYOND Creator Model</metadata>` +
    `<resources>` +
    `<object id="1" type="model">` +
    `<mesh>` +
    `<vertices>${vertexXml}</vertices>` +
    `<triangles>${triangles.join(
      ""
    )}</triangles>` +
    `</mesh>` +
    `</object>` +
    `</resources>` +
    `<build><item objectid="1" /></build>` +
    `</model>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />` +
    `<Override PartName="/3D/3dmodel.model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />` +
    `</Types>`;

  const relationships =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />` +
    `</Relationships>`;

  const zip =
    new JSZip();

  zip.file(
    "[Content_Types].xml",
    contentTypes
  );

  zip.file(
    "_rels/.rels",
    relationships
  );

  zip.file(
    "3D/3dmodel.model",
    modelXml
  );

  return zip.generateAsync({
    type:
      "blob",
    compression:
      "DEFLATE",
    compressionOptions: {
      level: 6,
    },
    mimeType:
      "model/3mf",
  });
}

function downloadBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    filename;

  document.body
    .appendChild(
      anchor
    );

  anchor.click();

  anchor.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );
}


function cloneCreatorObject(
  item
) {
  let parameters = {};

  try {
    parameters =
      typeof structuredClone ===
      "function"
        ? structuredClone(
            item.parameters ||
              {}
          )
        : JSON.parse(
            JSON.stringify(
              item.parameters ||
                {}
            )
          );
  } catch {
    parameters = {
      ...(item.parameters ||
        {}),
    };
  }

  return {
    ...item,
    dimensions: {
      ...item.dimensions,
    },
    baseDimensions:
      item.baseDimensions
        ? {
            ...item.baseDimensions,
          }
        : null,
    position: {
      ...item.position,
    },
    rotation: {
      ...item.rotation,
    },
    parameters,
    geometry:
      item.geometry
        ? item.geometry.clone()
        : null,
  };
}

function cloneSceneObjects(
  objects
) {
  return objects.map(
    cloneCreatorObject
  );
}

function isTypingTarget(
  target
) {
  if (!target) {
    return false;
  }

  const tagName =
    target.tagName
      ?.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function BeyondCreator() {
  const creatorSectionRef =
    useRef(null);

  const creatorCanvasWrapRef =
    useRef(null);

  const viewportApiRef =
    useRef(null);

  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);

  const initial =
    useMemo(
      () =>
        makeObject(
          "cube",
          1,
          0
        ),
      []
    );

  const [
    objects,
    setObjects,
  ] = useState([
    initial,
  ]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState([
    initial.id,
  ]);

  const [
    primaryId,
    setPrimaryId,
  ] = useState(
    initial.id
  );

  const [
    autoRotate,
    setAutoRotate,
  ] = useState(false);

  const [
    operationMessage,
    setOperationMessage,
  ] = useState("");

  const [
    exportMessage,
    setExportMessage,
  ] = useState("");

  const [
    exporting,
    setExporting,
  ] = useState(false);

  const [
    creatorMode,
    setCreatorMode,
  ] = useState(
    "advanced"
  );

  const [
    architectureUnit,
    setArchitectureUnit,
  ] = useState(
    "mm"
  );

  const [
    architectureScale,
    setArchitectureScale,
  ] = useState(
    100
  );

  const [
    architectureView,
    setArchitectureView,
  ] = useState(
    "plan"
  );

  const [
    architectureGridMm,
    setArchitectureGridMm,
  ] = useState(
    1000
  );

  const [
    architectureSnapMm,
    setArchitectureSnapMm,
  ] = useState(
    100
  );

  const [
    architectureSmartWallSnap,
    setArchitectureSmartWallSnap,
  ] = useState(
    true
  );

  const [
    architectureWallChain,
    setArchitectureWallChain,
  ] = useState(
    true
  );

  const [
    architectureAngleSnapDeg,
    setArchitectureAngleSnapDeg,
  ] = useState(
    45
  );

  const [
    architectureLevels,
    setArchitectureLevels,
  ] = useState([
    {
      id: "ground",
      name: "GROUND",
      elevation: 0,
      visible: true,
    },
  ]);

  const [
    architectureActiveLevelId,
    setArchitectureActiveLevelId,
  ] = useState(
    "ground"
  );

  const [
    architectureWallHeightMm,
    setArchitectureWallHeightMm,
  ] = useState(
    3000
  );

  const [
    architectureWallThicknessMm,
    setArchitectureWallThicknessMm,
  ] = useState(
    200
  );

  const [
    architectureFloorThicknessMm,
    setArchitectureFloorThicknessMm,
  ] = useState(
    180
  );

  const [
    architectureRoomFloor,
    setArchitectureRoomFloor,
  ] = useState(
    true
  );

  const [
    architectureStairWidthMm,
    setArchitectureStairWidthMm,
  ] = useState(
    1100
  );

  const [
    architectureStairRunMm,
    setArchitectureStairRunMm,
  ] = useState(
    3200
  );

  const [
    architectureStairRiseMm,
    setArchitectureStairRiseMm,
  ] = useState(
    3000
  );

  const [
    architectureStairSteps,
    setArchitectureStairSteps,
  ] = useState(
    16
  );

  const [
    architectureStairDirectionDeg,
    setArchitectureStairDirectionDeg,
  ] = useState(
    0
  );

  const [
    architectureExplodedLevels,
    setArchitectureExplodedLevels,
  ] = useState(
    false
  );

  const [
    architectureExplodeGapMm,
    setArchitectureExplodeGapMm,
  ] = useState(
    1200
  );

  const [
    architectureRoofWidthMm,
    setArchitectureRoofWidthMm,
  ] = useState(
    6000
  );

  const [
    architectureRoofDepthMm,
    setArchitectureRoofDepthMm,
  ] = useState(
    5000
  );

  const [
    architectureRoofThicknessMm,
    setArchitectureRoofThicknessMm,
  ] = useState(
    180
  );

  const [
    architectureRoofOverhangMm,
    setArchitectureRoofOverhangMm,
  ] = useState(
    300
  );

  const [
    architectureRoofPitchDeg,
    setArchitectureRoofPitchDeg,
  ] = useState(
    25
  );

  const [
    architectureRoofRidgeDirection,
    setArchitectureRoofRidgeDirection,
  ] = useState(
    "z"
  );

  const [
    architectureRoofCenterXmm,
    setArchitectureRoofCenterXmm,
  ] = useState(
    0
  );

  const [
    architectureRoofCenterZmm,
    setArchitectureRoofCenterZmm,
  ] = useState(
    0
  );

  const [
    architecturePlanAnnotations,
    setArchitecturePlanAnnotations,
  ] = useState(
    true
  );

  const [
    architectureMeasurements,
    setArchitectureMeasurements,
  ] = useState([]);

  const [
    architectureMeasureStart,
    setArchitectureMeasureStart,
  ] = useState(null);

  const [
    architectureMeasurePointer,
    setArchitectureMeasurePointer,
  ] = useState(null);

  const [
    architectureDrawTool,
    setArchitectureDrawTool,
  ] = useState(null);

  const [
    architectureWallStart,
    setArchitectureWallStart,
  ] = useState(null);

  const [
    architecturePointer,
    setArchitecturePointer,
  ] = useState(null);

  const [
    transformMode,
    setTransformMode,
  ] = useState(
    "select"
  );

  const [
    transformSpace,
    setTransformSpace,
  ] = useState(
    "world"
  );

  const [
    snapEnabled,
    setSnapEnabled,
  ] = useState(true);

  const [
    snapMm,
    setSnapMm,
  ] = useState(1);

  const [
    cameraView,
    setCameraView,
  ] = useState(
    "perspective"
  );

  const [
    sketchOpen,
    setSketchOpen,
  ] = useState(false);

  const [
    manifoldStatus,
    setManifoldStatus,
  ] = useState(
    "idle"
  );

  const [
    revolveOpen,
    setRevolveOpen,
  ] = useState(false);

  const [
    mirrorAxis,
    setMirrorAxis,
  ] = useState("x");

  const [
    arrayAxis,
    setArrayAxis,
  ] = useState("x");

  const [
    arrayCount,
    setArrayCount,
  ] = useState(3);

  const [
    arraySpacing,
    setArraySpacing,
  ] = useState(25);

  const [
    shellWall,
    setShellWall,
  ] = useState(2);

  const [
    bevelRadius,
    setBevelRadius,
  ] = useState(3);

  const [
    bevelSegments,
    setBevelSegments,
  ] = useState(5);

  const [
    libraryTab,
    setLibraryTab,
  ] = useState("create");

  const [
    inspectorTab,
    setInspectorTab,
  ] = useState("transform");

  const [
    meshEditMode,
    setMeshEditMode,
  ] = useState(false);

  const [
    meshSelectionMode,
    setMeshSelectionMode,
  ] = useState("face");

  const [
    meshSelection,
    setMeshSelection,
  ] = useState(null);

  const [
    editNudgeMm,
    setEditNudgeMm,
  ] = useState(1);

  const [
    faceExtrudeMm,
    setFaceExtrudeMm,
  ] = useState(5);

  const [
    faceInsetPercent,
    setFaceInsetPercent,
  ] = useState(0);

  const [
    importingModel,
    setImportingModel,
  ] = useState(false);

  const [
    importMessage,
    setImportMessage,
  ] = useState("");

  const [
    proportionalEdit,
    setProportionalEdit,
  ] = useState(false);

  const [
    proportionalRadiusMm,
    setProportionalRadiusMm,
  ] = useState(20);

  const [
    smoothStrength,
    setSmoothStrength,
  ] = useState(35);

  const [
    meshAnalysis,
    setMeshAnalysis,
  ] = useState(null);

  const [
    boxSelectActive,
    setBoxSelectActive,
  ] = useState(false);

  const [
    boxDrag,
    setBoxDrag,
  ] = useState(null);

  const [
    edgeChainAngle,
    setEdgeChainAngle,
  ] = useState(35);

  const [
    manifoldToleranceMm,
    setManifoldToleranceMm,
  ] = useState(0.05);

  const [
    manifoldCleaning,
    setManifoldCleaning,
  ] = useState(false);

  const [
    sharpEdgeAngle,
    setSharpEdgeAngle,
  ] = useState(45);

  const [
    edgeFilletSmoothness,
    setEdgeFilletSmoothness,
  ] = useState(72);

  const [
    edgeFilletRefine,
    setEdgeFilletRefine,
  ] = useState(2);

  const [
    edgeFilletWorking,
    setEdgeFilletWorking,
  ] = useState(false);

  const pastRef =
    useRef([]);

  const futureRef =
    useRef([]);

  const [
    historyVersion,
    setHistoryVersion,
  ] = useState(0);

  const selected =
    objects.find(
      (item) =>
        item.id ===
        primaryId
    ) || null;

  const architectureActiveLevel =
    architectureLevels.find(
      (level) =>
        level.id ===
        architectureActiveLevelId
    ) ||
    architectureLevels[0];

  const architectureCheck =
    useMemo(
      () =>
        architecturePrintCheck(
          objects
        ),
      [
        objects,
      ]
    );

  const architectureProductionQA =
    useMemo(
      () =>
        architectureProductionCheck(
          objects,
          architectureLevels,
          architectureCheck
        ),
      [
        objects,
        architectureLevels,
        architectureCheck,
      ]
    );

  const architectureExportBlocked =
    creatorMode ===
      "architecture" &&
    architectureProductionQA
      .blockerCount >
      0;

  const architectureLevelExplodeOffsets =
    useMemo(
      () => {
        if (
          !architectureExplodedLevels
        ) {
          return {};
        }

        const sorted =
          [...architectureLevels]
            .sort(
              (
                first,
                second
              ) =>
                safeNumber(
                  first.elevation,
                  0
                ) -
                safeNumber(
                  second.elevation,
                  0
                )
            );

        const offsets = {};

        sorted.forEach(
          (
            level,
            index
          ) => {
            offsets[
              level.id
            ] =
              (
                architectureExplodeGapMm *
                index /
                architectureScale
              ) *
              SCENE_SCALE;
          }
        );

        return offsets;
      },
      [
        architectureExplodedLevels,
        architectureExplodeGapMm,
        architectureLevels,
        architectureScale,
      ]
    );

  const architectureObjects =
    objects.filter(
      (item) =>
        item.source ===
        "architecture"
    );

  const selectedArchitectureOpening =
    selected &&
    selected.source ===
      "architecture" &&
    selected.role ===
      "hole" &&
    [
      "door",
      "window",
    ].includes(
      selected.parameters
        ?.archType
    )
      ? selected
      : null;

  const architectureOpeningHost =
    selectedArchitectureOpening
      ? objects.find(
          (item) =>
            item.id ===
            selectedArchitectureOpening
              .parameters
              ?.archHostWallId
        ) ||
        null
      : null;

  const architectureRooms =
    useMemo(
      () => {
        const roomMap =
          new Map();

        objects.forEach(
          (item) => {
            const roomId =
              item.parameters
                ?.archRoomId;

            if (!roomId) {
              return;
            }

            const existing =
              roomMap.get(
                roomId
              ) || {
                id:
                  roomId,
                name:
                  item.parameters
                    ?.archRoomName ||
                  item.groupName ||
                  "ROOM",
                areaM2: 0,
                levelName:
                  item.parameters
                    ?.archLevelName ||
                  "GROUND",
                objectIds: [],
              };

            existing.objectIds.push(
              item.id
            );

            existing.areaM2 =
              Math.max(
                existing.areaM2,
                safeNumber(
                  item.parameters
                    ?.archRoomAreaM2,
                  0
                )
              );

            roomMap.set(
              roomId,
              existing
            );
          }
        );

        return Array.from(
          roomMap.values()
        ).sort(
          (
            first,
            second
          ) =>
            first.levelName.localeCompare(
              second.levelName
            ) ||
            first.name.localeCompare(
              second.name
            )
        );
      },
      [
        objects,
      ]
    );

  const selectedObjects =
    objects.filter(
      (item) =>
        selectedIds.includes(
          item.id
        )
    );

  const selectedSolids =
    selectedObjects.filter(
      (item) =>
        item.role ===
        "solid"
    );

  const selectedHoles =
    selectedObjects.filter(
      (item) =>
        item.role ===
        "hole"
    );

  const selectedArchitectureWalls =
    selectedObjects.filter(
      (item) =>
        item.source ===
          "architecture" &&
        item.parameters
          ?.archType ===
          "wall" &&
        item.role ===
          "solid"
    );

  const canJoinArchitectureWalls =
    selectedArchitectureWalls.length ===
      2 &&
    selectedArchitectureWalls.every(
      (item) =>
        !item.locked &&
        !item.parameters
          ?.architectureCut
    );

  const selectedEditableArchitectureWall =
    selected &&
    selected.source ===
      "architecture" &&
    selected.parameters
      ?.archType ===
      "wall" &&
    selected.role ===
      "solid" &&
    !selected.parameters
      ?.architectureCut
      ? selected
      : null;

  const selectedWallEndpoints =
    selectedEditableArchitectureWall
      ? (() => {
          const frame =
            architectureWallFrameFor(
              selectedEditableArchitectureWall,
              architectureScale
            );

          const theta =
            THREE.MathUtils.degToRad(
              frame.rotationY
            );

          const half =
            frame.width /
            2;

          const dx =
            Math.cos(
              theta
            ) *
            half;

          const dz =
            -Math.sin(
              theta
            ) *
            half;

          return {
            start: {
              x:
                frame.x -
                dx,
              z:
                frame.z -
                dz,
            },
            end: {
              x:
                frame.x +
                dx,
              z:
                frame.z +
                dz,
            },
          };
        })()
      : null;

  const canCombine =
    selectedObjects.length >=
      2 &&
    selectedHoles.length ===
      0 &&
    selectedObjects.every(
      (item) =>
        !item.locked
    );

  const canCut =
    selectedSolids.length ===
      1 &&
    selectedHoles.length >=
      1 &&
    selectedObjects.every(
      (item) =>
        !item.locked
    );

  const totalVolume =
    useMemo(
      () => {
        const signed =
          objects.reduce(
            (
              total,
              item
            ) => {
              const value =
                objectVolume(
                  item
                );

              return (
                total +
                (
                  item.role ===
                  "hole"
                    ? -value
                    : value
                )
              );
            },
            0
          );

        return (
          Math.max(
            0,
            signed
          ) / 1000
        );
      },
      [objects]
    );

  const sceneStructure =
    useMemo(
      () => {
        const grouped =
          new Map();

        const ungrouped =
          [];

        objects.forEach(
          (
            item,
            index
          ) => {
            const entry = {
              item,
              index,
            };

            if (
              !item.groupId
            ) {
              ungrouped.push(
                entry
              );

              return;
            }

            if (
              !grouped.has(
                item.groupId
              )
            ) {
              grouped.set(
                item.groupId,
                {
                  id:
                    item.groupId,
                  name:
                    item.groupName ||
                    "GROUP",
                  items: [],
                }
              );
            }

            grouped
              .get(
                item.groupId
              )
              .items.push(
                entry
              );
          }
        );

        return {
          groups:
            Array.from(
              grouped.values()
            ),
          ungrouped,
        };
      },
      [objects]
    );

  const canUndo =
    historyVersion >= 0 &&
    pastRef.current
      .length > 0;

  const canRedo =
    historyVersion >= 0 &&
    futureRef.current
      .length > 0;

  useEffect(() => {
    let active = true;

    setManifoldStatus(
      "loading"
    );

    warmManifoldEngine()
      .then(() => {
        if (active) {
          setManifoldStatus(
            "ready"
          );
        }
      })
      .catch((error) => {
        console.warn(
          "Manifold WASM unavailable; sketch extrusion will use the Three.js fallback.",
          error
        );

        if (active) {
          setManifoldStatus(
            "fallback"
          );
        }
      });

    return () => {
      active = false;
    };
  }, [creatorMode]);

  useEffect(() => {
    if (
      creatorMode !==
        "architecture" ||
      ![
        "wall",
        "room",
        "measure",
      ].includes(
        architectureDrawTool
      )
    ) {
      return undefined;
    }

    const canvas =
      creatorCanvasWrapRef.current
        ?.querySelector(
          "canvas"
        );

    if (!canvas) {
      return undefined;
    }

    let leftPress =
      null;

    function handleDrawPointerDown(
      event
    ) {
      if (
        event.button !==
        0
      ) {
        return;
      }

      leftPress = {
        pointerId:
          event.pointerId,
        x:
          event.clientX,
        y:
          event.clientY,
      };
    }

    function handleDrawPointerMove(
      event
    ) {
      if (
        architectureDrawTool ===
          "measure" &&
        architectureMeasureStart
      ) {
        handleArchitectureMeasurePointerMove(
          event
        );

        return;
      }

      if (
        architectureWallStart
      ) {
        handleArchitectureDrawPointerMove(
          event
        );
      }
    }

    function handleDrawPointerUp(
      event
    ) {
      if (
        event.button !==
          0 ||
        !leftPress ||
        (
          leftPress.pointerId !==
            undefined &&
          event.pointerId !==
            leftPress.pointerId
        )
      ) {
        return;
      }

      const distance =
        Math.hypot(
          event.clientX -
            leftPress.x,
          event.clientY -
            leftPress.y
        );

      leftPress =
        null;

      // Drag = navigation. Do not interfere with OrbitControls.
      if (
        distance >
        6
      ) {
        return;
      }

      // Click = architectural placement.
      // Do NOT prevent or stop the pointer event: OrbitControls must receive
      // the same pointer lifecycle as the regular workspace.
      if (
        architectureDrawTool ===
        "room"
      ) {
        handleArchitectureRoomPointerDown(
          event
        );

        return;
      }

      if (
        architectureDrawTool ===
        "measure"
      ) {
        handleArchitectureMeasurePointerDown(
          event
        );

        return;
      }

      handleArchitectureDrawPointerDown(
        event
      );
    }

    function handleDrawContextMenu(
      event
    ) {
      event.preventDefault();
      event.stopPropagation();

      setArchitectureDrawTool(
        null
      );

      setArchitectureWallStart(
        null
      );

      setArchitecturePointer(
        null
      );

      setArchitectureMeasureStart(
        null
      );

      setArchitectureMeasurePointer(
        null
      );

      setOperationMessage(
        "Architect drawing cancelled. Regular mouse navigation was unchanged."
      );
    }

    canvas.addEventListener(
      "pointerdown",
      handleDrawPointerDown,
      {
        passive: true,
      }
    );

    canvas.addEventListener(
      "pointermove",
      handleDrawPointerMove,
      {
        passive: true,
      }
    );

    canvas.addEventListener(
      "pointerup",
      handleDrawPointerUp,
      {
        passive: true,
      }
    );

    canvas.addEventListener(
      "contextmenu",
      handleDrawContextMenu,
      {
        capture: true,
        passive: false,
      }
    );

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        handleDrawPointerDown
      );

      canvas.removeEventListener(
        "pointermove",
        handleDrawPointerMove
      );

      canvas.removeEventListener(
        "pointerup",
        handleDrawPointerUp
      );

      canvas.removeEventListener(
        "contextmenu",
        handleDrawContextMenu,
        true
      );
    };
  }, [
    architectureDrawTool,
    architectureMeasureStart,
    architectureWallStart,
    creatorMode,
  ]);

  function snapshotScene() {
    return {
      objects:
        cloneSceneObjects(
          objects
        ),
      selectedIds: [
        ...selectedIds,
      ],
      primaryId,
    };
  }

  function recordHistory() {
    pastRef.current.push(
      snapshotScene()
    );

    if (
      pastRef.current
        .length > 40
    ) {
      const removed =
        pastRef.current.shift();

      removed?.objects
        ?.forEach(
          (item) =>
            item.geometry
              ?.dispose?.()
        );
    }

    futureRef.current
      .forEach(
        (snapshot) =>
          snapshot.objects
            .forEach(
              (item) =>
                item.geometry
                  ?.dispose?.()
            )
      );

    futureRef.current =
      [];

    setHistoryVersion(
      (value) =>
        value + 1
    );
  }

  function restoreSnapshot(
    snapshot
  ) {
    if (!snapshot) {
      return;
    }

    setObjects(
      cloneSceneObjects(
        snapshot.objects
      )
    );

    setSelectedIds([
      ...snapshot.selectedIds,
    ]);

    setPrimaryId(
      snapshot.primaryId
    );

    setOperationMessage(
      ""
    );

    setExportMessage(
      ""
    );

    setMeshSelection(
      null
    );

    setMeshEditMode(
      false
    );

    setMeshAnalysis(
      null
    );
  }

  function undoScene() {
    if (
      pastRef.current
        .length === 0
    ) {
      return;
    }

    const previous =
      pastRef.current.pop();

    futureRef.current.push(
      snapshotScene()
    );

    restoreSnapshot(
      previous
    );

    setHistoryVersion(
      (value) =>
        value + 1
    );
  }

  function redoScene() {
    if (
      futureRef.current
        .length === 0
    ) {
      return;
    }

    const next =
      futureRef.current.pop();

    pastRef.current.push(
      snapshotScene()
    );

    restoreSnapshot(
      next
    );

    setHistoryVersion(
      (value) =>
        value + 1
    );
  }

  function handleSelect(
    id,
    multi = false
  ) {
    setOperationMessage(
      ""
    );

    if (
      meshEditMode &&
      id !== primaryId
    ) {
      setMeshEditMode(
        false
      );

      setMeshSelection(
        null
      );
    }

    if (!multi) {
      setSelectedIds([
        id,
      ]);

      setPrimaryId(
        id
      );

      return;
    }

    setSelectedIds(
      (
        current
      ) => {
        if (
          current.includes(
            id
          )
        ) {
          const next =
            current.filter(
              (
                currentId
              ) =>
                currentId !==
                id
            );

          if (
            primaryId ===
            id
          ) {
            setPrimaryId(
              next[
                next.length -
                  1
              ] ||
                null
            );
          }

          return next;
        }

        setPrimaryId(
          id
        );

        return [
          ...current,
          id,
        ];
      }
    );
  }

  function clearSelection() {
    setMeshEditMode(
      false
    );

    setMeshSelection(
      null
    );

    setSelectedIds(
      []
    );

    setPrimaryId(
      null
    );

    setOperationMessage(
      ""
    );
  }

  function updateSelected(
    updater
  ) {
    if (!primaryId) {
      return;
    }

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            primaryId
              ? updater(
                  item
                )
              : item
        )
    );
  }

  function updateParameter(
    key,
    value,
    min = 0,
    max = 300
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        parameters: {
          ...(item.parameters || {}),
          [key]:
            clamp(
              value,
              min,
              max
            ),
        },
      })
    );
  }

  function createSketchHorizontalEdgeCutGeometry(points, edgeIndex, amountMm, mode, boundaryZ, edgeType = "top") {
    if (!Array.isArray(points) || points.length < 3) return null;

    const index = Math.max(0, Math.min(Number(edgeIndex) || 0, points.length - 1));
    const a = points[index];
    const b = points[(index + 1) % points.length];
    if (!a || !b) return null;

    const ax = Number(a[0]) * SCENE_SCALE;
    const ay = Number(a[1]) * SCENE_SCALE;
    const bx = Number(b[0]) * SCENE_SCALE;
    const by = Number(b[1]) * SCENE_SCALE;
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (length < 0.00001) return null;

    const ex = dx / length;
    const ey = dy / length;
    const signedArea = points.reduce((total, point, pointIndex) => {
      const next = points[(pointIndex + 1) % points.length];
      return total + Number(point[0]) * Number(next[1]) - Number(next[0]) * Number(point[1]);
    }, 0) / 2;
    const nx = signedArea >= 0 ? -ey : ey;
    const ny = signedArea >= 0 ? ex : -ex;
    const amount = Math.max(0.001, Number(amountMm) * SCENE_SCALE);
    const epsilon = Math.max(0.00002, amount * 0.002);
    const zSign = edgeType === "bottom" ? 1 : -1;
    const outsideZ = boundaryZ - zSign * epsilon;
    const insideZ = boundaryZ + zSign * amount;

    let crossSection;
    if (mode === "fillet") {
      const segments = 12;
      crossSection = [
        [0, outsideZ],
        [-epsilon, insideZ],
      ];
      for (let i = 0; i <= segments; i += 1) {
        const theta = Math.PI - (Math.PI / 2) * (i / segments);
        const n = amount + Math.cos(theta) * amount;
        const z = boundaryZ + zSign * (amount - Math.sin(theta) * amount);
        crossSection.push([n, z]);
      }
    } else {
      crossSection = [
        [-epsilon, outsideZ],
        [-epsilon, insideZ],
        [amount, outsideZ],
      ];
    }

    const count = crossSection.length;
    const positions = [];
    const indices = [];
    const s0 = -epsilon;
    const s1 = length + epsilon;
    const pushVertex = (sAlong, nIn, z) => {
      positions.push(
        ax + ex * sAlong + nx * nIn,
        ay + ey * sAlong + ny * nIn,
        z
      );
    };

    for (const [nIn, z] of crossSection) pushVertex(s0, nIn, z);
    for (const [nIn, z] of crossSection) pushVertex(s1, nIn, z);
    for (let i = 1; i < count - 1; i += 1) {
      indices.push(0, i + 1, i);
      indices.push(count, count + i, count + i + 1);
    }
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      indices.push(i, j, count + j);
      indices.push(i, count + j, count + i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function createSketchVerticalEdgeCutGeometry(points, edgeIndex, amountMm, mode, minZ, maxZ) {
    if (!Array.isArray(points) || points.length < 3) return null;
    const count = points.length;
    const index = ((Number(edgeIndex) || 0) % count + count) % count;
    const prev = points[(index - 1 + count) % count];
    const corner = points[index];
    const next = points[(index + 1) % count];
    if (!prev || !corner || !next) return null;

    const c = { x: Number(corner[0]) * SCENE_SCALE, y: Number(corner[1]) * SCENE_SCALE };
    const p = { x: Number(prev[0]) * SCENE_SCALE, y: Number(prev[1]) * SCENE_SCALE };
    const n = { x: Number(next[0]) * SCENE_SCALE, y: Number(next[1]) * SCENE_SCALE };
    const pv = { x: p.x - c.x, y: p.y - c.y };
    const nv = { x: n.x - c.x, y: n.y - c.y };
    const pl = Math.hypot(pv.x, pv.y);
    const nl = Math.hypot(nv.x, nv.y);
    if (pl < 0.00001 || nl < 0.00001) return null;
    const up = { x: pv.x / pl, y: pv.y / pl };
    const un = { x: nv.x / nl, y: nv.y / nl };
    const amount = Math.min(
      Math.max(0.001, Number(amountMm) * SCENE_SCALE),
      Math.max(0.001, Math.min(pl, nl) * 0.46)
    );
    const tangentPrev = { x: c.x + up.x * amount, y: c.y + up.y * amount };
    const tangentNext = { x: c.x + un.x * amount, y: c.y + un.y * amount };

    const section = [c, tangentPrev];
    if (mode === "fillet") {
      const segments = 12;
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        const mt = 1 - t;
        // Quadratic arc from one tangent to the other, biased toward the original corner.
        section.push({
          x: mt * mt * tangentPrev.x + 2 * mt * t * c.x + t * t * tangentNext.x,
          y: mt * mt * tangentPrev.y + 2 * mt * t * c.y + t * t * tangentNext.y,
        });
      }
    }
    section.push(tangentNext);

    const z0 = minZ - Math.max(0.00002, amount * 0.002);
    const z1 = maxZ + Math.max(0.00002, amount * 0.002);
    const positions = [];
    const indices = [];
    section.forEach((point) => positions.push(point.x, point.y, z0));
    section.forEach((point) => positions.push(point.x, point.y, z1));
    const m = section.length;
    for (let i = 1; i < m - 1; i += 1) {
      indices.push(0, i + 1, i);
      indices.push(m, m + i, m + i + 1);
    }
    for (let i = 0; i < m; i += 1) {
      const j = (i + 1) % m;
      indices.push(i, j, m + j);
      indices.push(i, m + j, m + i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  async function applySketchEdgeTreatments(workingGeometry, sketch) {
    const treatments = Array.isArray(sketch.edgeTreatments)
      ? sketch.edgeTreatments.filter((item) => Number(item?.amount) > 0)
      : [];
    if (!treatments.length) return workingGeometry;

    let workingMesh = new THREE.Mesh(
      workingGeometry,
      new THREE.MeshStandardMaterial({ color: materialColor("navy") })
    );
    workingMesh.updateMatrix();
    workingMesh.updateMatrixWorld(true);

    for (const treatment of treatments) {
      workingMesh.geometry.computeBoundingBox?.();
      const box = workingMesh.geometry.boundingBox;
      if (!box) continue;

      const maxSafe = Math.max(
        0.05,
        Math.min(
          Number(sketch.height) * 0.48,
          50
        )
      );
      const amountMm = Math.min(Math.max(0.05, Number(treatment.amount) || 0), maxSafe);
      const edgeType = treatment.edgeType || "top";
      const cutterGeometry = edgeType === "vertical"
        ? createSketchVerticalEdgeCutGeometry(
            sketch.points,
            treatment.edgeIndex,
            amountMm,
            treatment.mode === "fillet" ? "fillet" : "chamfer",
            box.min.z,
            box.max.z
          )
        : createSketchHorizontalEdgeCutGeometry(
            sketch.points,
            treatment.edgeIndex,
            amountMm,
            treatment.mode === "fillet" ? "fillet" : "chamfer",
            edgeType === "bottom" ? box.min.z : box.max.z,
            edgeType
          );
      if (!cutterGeometry) continue;

      const cutterMesh = new THREE.Mesh(
        cutterGeometry,
        new THREE.MeshStandardMaterial({ color: materialColor("navy") })
      );
      cutterMesh.updateMatrix();
      cutterMesh.updateMatrixWorld(true);

      try {
        const nextMesh = CSG.subtract(workingMesh, cutterMesh);
        nextMesh.updateMatrix();
        if (workingMesh.geometry !== workingGeometry) workingMesh.geometry.dispose?.();
        workingMesh.material?.dispose?.();
        cutterMesh.geometry?.dispose?.();
        cutterMesh.material?.dispose?.();
        workingMesh = nextMesh;
      } catch (error) {
        console.warn("Sketch edge treatment failed:", treatment, error);
        cutterMesh.geometry?.dispose?.();
        cutterMesh.material?.dispose?.();
      }
    }

    return workingMesh.geometry;
  }

  async function createSketchSolid(
    sketch
  ) {
    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      throw new Error(
        `Creator supports up to ${MAX_OBJECTS} objects in this build.`
      );
    }

    const result =
      await createExtrudedSketchGeometry(
        sketch.points,
        {
          height:
            sketch.height,
          twistDegrees:
            sketch.twistDegrees,
          scaleTop:
            sketch.scaleTop,
          sceneScale:
            SCENE_SCALE,
        }
      );

    recordHistory();

    let workingGeometry = result.geometry;

    if (Array.isArray(sketch.features) && sketch.features.length) {
      let workingMesh = new THREE.Mesh(
        workingGeometry,
        new THREE.MeshStandardMaterial({ color: materialColor("navy") })
      );
      workingMesh.updateMatrix();
      workingMesh.updateMatrixWorld(true);

      for (const feature of sketch.features) {
        if (!feature?.points?.length || Math.abs(Number(feature.depth) || 0) < 0.5) continue;

        const featureResult = await createExtrudedSketchGeometry(
          feature.points,
          {
            height: Math.abs(feature.depth),
            twistDegrees: 0,
            scaleTop: 1,
            sceneScale: SCENE_SCALE,
          }
        );

        workingMesh.geometry.computeBoundingBox?.();
        const baseBox = workingMesh.geometry.boundingBox;
        if (!baseBox) {
          featureResult.geometry.dispose?.();
          continue;
        }

        const epsilon = 0.00001;

        if (feature.faceType === "side") {
          const sideIndex = Math.max(0, Math.min(
            Number(feature.faceIndex) || 0,
            Math.max(0, sketch.points.length - 1)
          ));
          const a = sketch.points[sideIndex];
          const b = sketch.points[(sideIndex + 1) % sketch.points.length];
          if (!a || !b) {
            featureResult.geometry.dispose?.();
            continue;
          }

          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const edgeLength = Math.hypot(dx, dy);
          if (edgeLength < 0.0001) {
            featureResult.geometry.dispose?.();
            continue;
          }

          const ex = dx / edgeLength;
          const ey = dy / edgeLength;
          const signedArea = sketch.points.reduce((total, point, index) => {
            const next = sketch.points[(index + 1) % sketch.points.length];
            return total + point[0] * next[1] - next[0] * point[1];
          }, 0) / 2;
          const nx = signedArea >= 0 ? ey : -ey;
          const ny = signedArea >= 0 ? -ex : ex;
          const direction = (feature.depth || 0) >= 0 ? 1 : -1;

          const transform = new THREE.Matrix4();
          transform.set(
            ex, 0, nx * direction, a[0] * SCENE_SCALE - nx * direction * epsilon,
            ey, 0, ny * direction, a[1] * SCENE_SCALE - ny * direction * epsilon,
            0, 1, 0, baseBox.min.z,
            0, 0, 0, 1
          );
          featureResult.geometry.applyMatrix4(transform);
        }

        featureResult.geometry.computeBoundingBox?.();
        const toolBox = featureResult.geometry.boundingBox;
        if (!toolBox) {
          featureResult.geometry.dispose?.();
          continue;
        }

        const toolMesh = new THREE.Mesh(
          featureResult.geometry,
          new THREE.MeshStandardMaterial({ color: materialColor("navy") })
        );

        if (feature.faceType !== "side") {
          if ((feature.depth || 0) >= 0) {
            toolMesh.position.z = baseBox.max.z - toolBox.min.z - epsilon;
          } else {
            toolMesh.position.z = baseBox.max.z - toolBox.max.z + epsilon;
          }
        }
        toolMesh.updateMatrix();
        toolMesh.updateMatrixWorld(true);

        const nextMesh = (feature.depth || 0) >= 0
          ? CSG.union(workingMesh, toolMesh)
          : CSG.subtract(workingMesh, toolMesh);
        nextMesh.updateMatrix();

        if (workingMesh.geometry !== workingGeometry) {
          workingMesh.geometry.dispose?.();
        }
        workingMesh.material?.dispose?.();
        toolMesh.geometry?.dispose?.();
        toolMesh.material?.dispose?.();
        workingMesh = nextMesh;
      }

      workingGeometry = workingMesh.geometry;
    }

    if (Array.isArray(sketch.edgeTreatments) && sketch.edgeTreatments.length) {
      workingGeometry = await applySketchEdgeTreatments(workingGeometry, sketch);
    }

    if (
      sketch.plane ===
      "front"
    ) {
      workingGeometry.rotateX(
        Math.PI / 2
      );
    } else if (
      sketch.plane ===
      "right"
    ) {
      workingGeometry.rotateZ(
        -Math.PI / 2
      );
    }

    workingGeometry.computeVertexNormals?.();
    workingGeometry.computeBoundingBox?.();
    workingGeometry.computeBoundingSphere?.();

    const tempMesh =
      new THREE.Mesh(
        workingGeometry,
        new THREE.MeshStandardMaterial({
          color:
            materialColor(
              "navy"
            ),
        })
      );

    tempMesh.updateMatrixWorld(
      true
    );

    const resultObject =
      makeBooleanObject(
        tempMesh,
        `SKETCH ${
          objects.filter(
            (item) =>
              item.source ===
              "sketch"
          ).length +
          1
        }`,
        "navy"
      );

    resultObject.source =
      "sketch";

    resultObject.engine =
      result.engine;

    resultObject.parameters = {
      ...(resultObject.parameters || {}),
      sketchPoints:
        sketch.points.map(
          (point) => [
            point[0],
            point[1],
          ]
        ),
      extrusionHeight:
        sketch.height,
      twistDegrees:
        sketch.twistDegrees,
      scaleTop:
        sketch.scaleTop,
      sketchPlane:
        sketch.plane ||
        "top",
      sketchFeatures:
        (sketch.features || []).map((feature) => ({
          ...feature,
          points: feature.points?.map((point) => [point[0], point[1]]) || [],
        })),
      sketchEdgeTreatments:
        (sketch.edgeTreatments || []).map((treatment) => ({
          ...treatment,
          amount: Number(treatment.amount) || 0,
        })),
    };

    workingGeometry.dispose();
    disposeMesh(
      tempMesh
    );

    setObjects(
      (current) => [
        ...current,
        resultObject,
      ]
    );

    setSelectedIds([
      resultObject.id,
    ]);

    setPrimaryId(
      resultObject.id
    );

    setTransformMode(
      "translate"
    );

    setOperationMessage(
      `Sketch extruded with ${result.engine}.`
    );

    setSketchOpen(
      false
    );

    return result.engine;
  }

  async function createSketchWorkspaceSolid(
    sketch
  ) {
    const engine =
      await createSketchSolid(
        sketch
      );

    setCreatorMode(
      "advanced"
    );

    setArchitectureDrawTool(
      null
    );

    setArchitectureView(
      "3d"
    );

    setCameraView(
      "perspective"
    );

    setLibraryTab(
      "scene"
    );

    setInspectorTab(
      "transform"
    );

    return engine;
  }

  function switchSketchToStudio() {
    setCreatorMode(
      "advanced"
    );

    setArchitectureDrawTool(
      null
    );

    setArchitectureView(
      "3d"
    );

    setCameraView(
      "perspective"
    );
  }

  async function createRevolveSolid(
    revolve
  ) {
    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      throw new Error(
        `Creator supports up to ${MAX_OBJECTS} objects in this build.`
      );
    }

    const result =
      await createRevolvedSketchGeometry(
        revolve.points,
        {
          circularSegments:
            revolve.segments,
          revolveDegrees:
            revolve.degrees,
          sceneScale:
            SCENE_SCALE,
        }
      );

    recordHistory();

    const tempMesh =
      new THREE.Mesh(
        result.geometry,
        new THREE.MeshStandardMaterial({
          color:
            materialColor(
              "navy"
            ),
        })
      );

    tempMesh.updateMatrixWorld(
      true
    );

    const resultObject =
      makeBooleanObject(
        tempMesh,
        `REVOLVE ${
          objects.filter(
            (item) =>
              item.source ===
              "revolve"
          ).length +
          1
        }`,
        "navy"
      );

    resultObject.source =
      "revolve";

    resultObject.engine =
      result.engine;

    resultObject.parameters = {
      ...(resultObject.parameters ||
        {}),
      revolveProfile:
        revolve.profilePoints.map(
          (point) => [
            point[0],
            point[1],
          ]
        ),
      revolveDegrees:
        revolve.degrees,
      revolveSegments:
        revolve.segments,
    };

    result.geometry.dispose();

    disposeMesh(
      tempMesh
    );

    setObjects(
      (current) => [
        ...current,
        resultObject,
      ]
    );

    setSelectedIds([
      resultObject.id,
    ]);

    setPrimaryId(
      resultObject.id
    );

    setTransformMode(
      "translate"
    );

    setOperationMessage(
      `Profile revolved with ${result.engine}.`
    );

    setRevolveOpen(
      false
    );

    return result.engine;
  }

  function architectureSetView(
    view
  ) {
    setArchitectureView(
      view
    );

    const cameraByView = {
      plan:
        "top",
      "3d":
        "perspective",
      front:
        "front",
      right:
        "right",
    };

    setCameraView(
      cameraByView[
        view
      ] ||
      "perspective"
    );

    if (
      view !==
      "3d"
    ) {
      setTransformMode(
        "select"
      );
    }

    setArchitectureDrawTool(
      null
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    setArchitectureMeasureStart(
      null
    );

    setArchitectureMeasurePointer(
      null
    );
  }

  function changeArchitectureScale(
    nextScale
  ) {
    const safeNext =
      clamp(
        nextScale,
        10,
        1000
      );

    if (
      safeNext ===
      architectureScale
    ) {
      return;
    }

    const factor =
      architectureScale /
      safeNext;

    recordHistory();

    setObjects(
      (current) =>
        current.map(
          (item) => {
            if (
              item.source !==
              "architecture"
            ) {
              return item;
            }

            return {
              ...item,
              dimensions: {
                width:
                  item.dimensions
                    .width *
                  factor,
                depth:
                  item.dimensions
                    .depth *
                  factor,
                height:
                  item.dimensions
                    .height *
                  factor,
              },
              position: {
                x:
                  item.position.x *
                  factor,
                y:
                  item.position.y *
                  factor,
                z:
                  item.position.z *
                  factor,
              },
              parameters: {
                ...(item.parameters ||
                  {}),
                archScale:
                  safeNext,
              },
            };
          }
        )
    );

    setArchitectureScale(
      safeNext
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    setOperationMessage(
      `Architect model changed to 1:${safeNext}. Geometry was rescaled for print.`
    );
  }

  function addArchitectureLevel() {
    const highest =
      architectureLevels.reduce(
        (
          value,
          level
        ) =>
          Math.max(
            value,
            safeNumber(
              level.elevation,
              0
            )
          ),
        0
      );

    const levelNumber =
      architectureLevels.length;

    const next = {
      id:
        `level-${makeId()}`,
      name:
        `LEVEL ${String(
          levelNumber
        ).padStart(
          2,
          "0"
        )}`,
      elevation:
        highest +
        3000,
      visible: true,
    };

    setArchitectureLevels(
      (current) => [
        ...current,
        next,
      ]
    );

    setArchitectureActiveLevelId(
      next.id
    );

    setOperationMessage(
      `${next.name} added at +${next.elevation} mm.`
    );
  }

  function duplicateArchitectureActiveLevel() {
    const sourceLevel =
      architectureActiveLevel;

    if (!sourceLevel) {
      return;
    }

    const sourceObjects =
      objects.filter(
        (item) =>
          item.source ===
            "architecture" &&
          item.parameters
            ?.archLevelId ===
            sourceLevel.id
      );

    let targetElevation =
      safeNumber(
        sourceLevel.elevation,
        0
      ) +
      3000;

    const usedElevations =
      new Set(
        architectureLevels.map(
          (level) =>
            Math.round(
              safeNumber(
                level.elevation,
                0
              )
            )
        )
      );

    while (
      usedElevations.has(
        Math.round(
          targetElevation
        )
      )
    ) {
      targetElevation +=
        3000;
    }

    const levelNumber =
      architectureLevels.length;

    const nextLevel = {
      id:
        `level-${makeId()}`,
      name:
        `LEVEL ${String(
          levelNumber
        ).padStart(
          2,
          "0"
        )}`,
      elevation:
        targetElevation,
      visible: true,
    };

    if (
      sourceObjects.length ===
      0
    ) {
      setArchitectureLevels(
        (current) => [
          ...current,
          nextLevel,
        ]
      );

      setArchitectureActiveLevelId(
        nextLevel.id
      );

      setOperationMessage(
        `${nextLevel.name} created at +${nextLevel.elevation} mm. The source level was empty.`
      );

      return;
    }

    if (
      objects.length +
        sourceObjects.length >
      MAX_OBJECTS
    ) {
      setOperationMessage(
        `Duplicating this level needs ${sourceObjects.length} more objects and would exceed the ${MAX_OBJECTS}-object Creator limit.`
      );

      return;
    }

    recordHistory();

    const objectIdMap =
      new Map();

    const groupIdMap =
      new Map();

    const roomIdMap =
      new Map();

    const stairIdMap =
      new Map();

    const roofIdMap =
      new Map();

    sourceObjects.forEach(
      (item) => {
        objectIdMap.set(
          item.id,
          makeId()
        );

        if (
          item.groupId &&
          !groupIdMap.has(
            item.groupId
          )
        ) {
          groupIdMap.set(
            item.groupId,
            `group-${makeId()}`
          );
        }

        const roomId =
          item.parameters
            ?.archRoomId;

        if (
          roomId &&
          !roomIdMap.has(
            roomId
          )
        ) {
          roomIdMap.set(
            roomId,
            `room-${makeId()}`
          );
        }

        const stairId =
          item.parameters
            ?.archStairId;

        if (
          stairId &&
          !stairIdMap.has(
            stairId
          )
        ) {
          stairIdMap.set(
            stairId,
            `stair-${makeId()}`
          );
        }

        const roofId =
          item.parameters
            ?.archRoofId;

        if (
          roofId &&
          !roofIdMap.has(
            roofId
          )
        ) {
          roofIdMap.set(
            roofId,
            `roof-${makeId()}`
          );
        }
      }
    );

    const elevationDelta =
      targetElevation -
      safeNumber(
        sourceLevel.elevation,
        0
      );

    const duplicated =
      sourceObjects.map(
        (source) => {
          const next =
            cloneCreatorObject(
              source
            );

          next.id =
            objectIdMap.get(
              source.id
            );

          next.groupId =
            source.groupId
              ? groupIdMap.get(
                  source.groupId
                ) ||
                null
              : null;

          next.position = {
            ...next.position,
            y:
              next.position.y +
              elevationDelta /
                architectureScale,
          };

          next.parameters = {
            ...(next.parameters ||
              {}),
            archLevelId:
              nextLevel.id,
            archLevelName:
              nextLevel.name,
            archLevelElevation:
              nextLevel.elevation,
          };

          if (
            next.parameters
              .archHostWallId
          ) {
            next.parameters
              .archHostWallId =
              objectIdMap.get(
                next.parameters
                  .archHostWallId
              ) ||
              next.parameters
                .archHostWallId;
          }

          if (
            next.parameters
              .archRoomId
          ) {
            next.parameters
              .archRoomId =
              roomIdMap.get(
                next.parameters
                  .archRoomId
              ) ||
              next.parameters
                .archRoomId;
          }

          if (
            next.parameters
              .archStairId
          ) {
            next.parameters
              .archStairId =
              stairIdMap.get(
                next.parameters
                  .archStairId
              ) ||
              next.parameters
                .archStairId;
          }

          if (
            next.parameters
              .archRoofId
          ) {
            next.parameters
              .archRoofId =
              roofIdMap.get(
                next.parameters
                  .archRoofId
              ) ||
              next.parameters
                .archRoofId;
          }

          if (
            next.parameters
              .archWallFrame
          ) {
            next.parameters
              .archWallFrame = {
              ...next.parameters
                .archWallFrame,
              elevation:
                nextLevel.elevation,
            };
          }

          return next;
        }
      );

    setArchitectureLevels(
      (current) => [
        ...current,
        nextLevel,
      ]
    );

    setObjects(
      (current) => [
        ...current,
        ...duplicated,
      ]
    );

    setArchitectureActiveLevelId(
      nextLevel.id
    );

    setSelectedIds(
      duplicated.map(
        (item) =>
          item.id
      )
    );

    setPrimaryId(
      duplicated[0]?.id ||
        null
    );

    setOperationMessage(
      `${sourceLevel.name} duplicated to ${nextLevel.name} at +${nextLevel.elevation} mm · ${duplicated.length} objects copied.`
    );
  }

  function updateArchitectureLevelName(
    levelId,
    nextName
  ) {
    const cleanName =
      String(
        nextName ||
        ""
      )
        .trimStart()
        .slice(
          0,
          24
        );

    setArchitectureLevels(
      (current) =>
        current.map(
          (level) =>
            level.id ===
              levelId
              ? {
                  ...level,
                  name:
                    cleanName,
                }
              : level
        )
    );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.source ===
              "architecture" &&
            item.parameters
              ?.archLevelId ===
              levelId
              ? {
                  ...item,
                  parameters: {
                    ...(item.parameters ||
                      {}),
                    archLevelName:
                      cleanName,
                  },
                }
              : item
        )
    );
  }

  function updateArchitectureLevelElevation(
    levelId,
    nextElevation
  ) {
    const currentLevel =
      architectureLevels.find(
        (level) =>
          level.id ===
          levelId
      );

    if (!currentLevel) {
      return;
    }

    const safeElevation =
      clamp(
        nextElevation,
        -20000,
        200000
      );

    const deltaMm =
      safeElevation -
      safeNumber(
        currentLevel.elevation,
        0
      );

    if (
      Math.abs(
        deltaMm
      ) <
      0.001
    ) {
      return;
    }

    recordHistory();

    setArchitectureLevels(
      (current) =>
        current.map(
          (level) =>
            level.id ===
              levelId
              ? {
                  ...level,
                  elevation:
                    safeElevation,
                }
              : level
        )
    );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.source ===
              "architecture" &&
            item.parameters
              ?.archLevelId ===
              levelId
              ? {
                  ...item,
                  position: {
                    ...item.position,
                    y:
                      item.position.y +
                      deltaMm /
                        architectureScale,
                  },
                  parameters: {
                    ...(item.parameters ||
                      {}),
                    archLevelElevation:
                      safeElevation,
                  },
                }
              : item
        )
    );

    setOperationMessage(
      `${currentLevel.name} moved to ${safeElevation >= 0 ? "+" : ""}${safeElevation} mm. Objects on this level moved with it.`
    );
  }

  function setArchitectureLevelVisibility(
    levelId,
    visible
  ) {
    setArchitectureLevels(
      (current) =>
        current.map(
          (level) =>
            level.id ===
              levelId
              ? {
                  ...level,
                  visible,
                }
              : level
        )
    );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.source ===
              "architecture" &&
            item.parameters
              ?.archLevelId ===
              levelId
              ? {
                  ...item,
                  visible,
                }
              : item
        )
    );

    if (
      !visible &&
      selected?.parameters
        ?.archLevelId ===
        levelId
    ) {
      setSelectedIds(
        []
      );

      setPrimaryId(
        null
      );
    }
  }

  function isolateArchitectureLevel(
    levelId
  ) {
    setArchitectureLevels(
      (current) =>
        current.map(
          (level) => ({
            ...level,
            visible:
              level.id ===
              levelId,
          })
        )
    );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.source ===
              "architecture"
              ? {
                  ...item,
                  visible:
                    item.parameters
                      ?.archLevelId ===
                    levelId,
                }
              : item
        )
    );

    setArchitectureActiveLevelId(
      levelId
    );

    setOperationMessage(
      "Active level isolated."
    );
  }

  function showAllArchitectureLevels() {
    setArchitectureLevels(
      (current) =>
        current.map(
          (level) => ({
            ...level,
            visible: true,
          })
        )
    );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.source ===
              "architecture"
              ? {
                  ...item,
                  visible: true,
                }
              : item
        )
    );

    setOperationMessage(
      "All architecture levels visible."
    );
  }

  function updateArchitectureRoomName(
    roomId,
    nextName
  ) {
    const cleanName =
      String(
        nextName ||
        ""
      )
        .trimStart()
        .slice(
          0,
          28
        );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.parameters
              ?.archRoomId ===
              roomId
              ? {
                  ...item,
                  groupName:
                    cleanName,
                  parameters: {
                    ...(item.parameters ||
                      {}),
                    archRoomName:
                      cleanName,
                  },
                }
              : item
        )
    );
  }

  function selectArchitectureRoom(
    roomId
  ) {
    const roomObjects =
      objects.filter(
        (item) =>
          item.parameters
            ?.archRoomId ===
          roomId
      );

    if (
      roomObjects.length ===
      0
    ) {
      return;
    }

    setSelectedIds(
      roomObjects.map(
        (item) =>
          item.id
      )
    );

    setPrimaryId(
      roomObjects[0].id
    );

    setOperationMessage(
      `${roomObjects[0].parameters?.archRoomName || "Room"} selected · ${roomObjects.length} objects.`
    );
  }

  function joinSelectedArchitectureWalls() {
    if (
      !canJoinArchitectureWalls
    ) {
      setOperationMessage(
        "Select exactly two uncut Architect walls to join their corner."
      );

      return;
    }

    const [
      first,
      second,
    ] =
      selectedArchitectureWalls;

    const firstFrame =
      architectureWallFrameFor(
        first,
        architectureScale
      );

    const secondFrame =
      architectureWallFrameFor(
        second,
        architectureScale
      );

    const firstAngle =
      THREE.MathUtils.degToRad(
        firstFrame.rotationY
      );

    const secondAngle =
      THREE.MathUtils.degToRad(
        secondFrame.rotationY
      );

    const firstDirection = {
      x:
        Math.cos(
          firstAngle
        ),
      z:
        -Math.sin(
          firstAngle
        ),
    };

    const secondDirection = {
      x:
        Math.cos(
          secondAngle
        ),
      z:
        -Math.sin(
          secondAngle
        ),
    };

    const cross =
      firstDirection.x *
        secondDirection.z -
      firstDirection.z *
        secondDirection.x;

    if (
      Math.abs(
        cross
      ) <
      0.0001
    ) {
      setOperationMessage(
        "These two walls are parallel, so there is no corner intersection to join."
      );

      return;
    }

    const delta = {
      x:
        secondFrame.x -
        firstFrame.x,
      z:
        secondFrame.z -
        firstFrame.z,
    };

    const t =
      (
        delta.x *
          secondDirection.z -
        delta.z *
          secondDirection.x
      ) /
      cross;

    const intersection = {
      x:
        firstFrame.x +
        firstDirection.x *
          t,
      z:
        firstFrame.z +
        firstDirection.z *
          t,
    };

    function joinedWall(
      wall,
      frame,
      direction
    ) {
      const half =
        frame.width /
        2;

      const start = {
        x:
          frame.x -
          direction.x *
            half,
        z:
          frame.z -
          direction.z *
            half,
      };

      const end = {
        x:
          frame.x +
          direction.x *
            half,
        z:
          frame.z +
          direction.z *
            half,
      };

      const startDistance =
        Math.hypot(
          intersection.x -
            start.x,
          intersection.z -
            start.z
        );

      const endDistance =
        Math.hypot(
          intersection.x -
            end.x,
          intersection.z -
            end.z
        );

      const nearestDistance =
        Math.min(
          startDistance,
          endDistance
        );

      if (
        nearestDistance >
        1500
      ) {
        throw new Error(
          "The wall intersection is too far from the wall ends. Move the walls closer before joining."
        );
      }

      const farPoint =
        startDistance >
        endDistance
          ? start
          : end;

      const newWidth =
        Math.hypot(
          intersection.x -
            farPoint.x,
          intersection.z -
            farPoint.z
        );

      if (
        newWidth <
        100
      ) {
        throw new Error(
          "Joining these walls would make one wall too short."
        );
      }

      const center = {
        x:
          (
            intersection.x +
            farPoint.x
          ) /
          2,
        z:
          (
            intersection.z +
            farPoint.z
          ) /
          2,
      };

      return {
        ...wall,
        dimensions: {
          ...wall.dimensions,
          width:
            newWidth /
            architectureScale,
        },
        position: {
          ...wall.position,
          x:
            center.x /
            architectureScale,
          z:
            center.z /
            architectureScale,
        },
        parameters: {
          ...(wall.parameters ||
            {}),
          archRealDimensions: {
            ...(
              wall.parameters
                ?.archRealDimensions ||
              {}
            ),
            width:
              newWidth,
          },
          archWallFrame: {
            ...frame,
            x:
              center.x,
            z:
              center.z,
            width:
              newWidth,
          },
        },
      };
    }

    recordHistory();

    try {
      const joinedFirst =
        joinedWall(
          first,
          firstFrame,
          firstDirection
        );

      const joinedSecond =
        joinedWall(
          second,
          secondFrame,
          secondDirection
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              first.id
                ? joinedFirst
                : item.id ===
                    second.id
                  ? joinedSecond
                  : item
          )
      );

      setOperationMessage(
        "Wall corner joined. Both wall centerlines now meet at one clean intersection."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to join these walls."
      );
    }
  }

  function addArchitectureStairs() {
    const stepCount =
      Math.round(
        clamp(
          architectureStairSteps,
          3,
          24
        )
      );

    if (
      objects.length +
        stepCount >
      MAX_OBJECTS
    ) {
      setOperationMessage(
        `Stairs need ${stepCount} objects, but the Creator object limit would be exceeded.`
      );

      return;
    }

    const stairIndex =
      architectureObjectCount(
        objects,
        "stair"
      );

    const groupId =
      `group-${makeId()}`;

    const groupName =
      `STAIR ${stairIndex}`;

    const treadDepth =
      architectureStairRunMm /
      stepCount;

    const riserHeight =
      architectureStairRiseMm /
      stepCount;

    const stairs = [];

    for (
      let index = 0;
      index <
        stepCount;
      index += 1
    ) {
      const currentHeight =
        riserHeight *
        (
          index +
          1
        );

      const zReal =
        -architectureStairRunMm /
          2 +
        treadDepth *
          (
            index +
            0.5
          );

      const step =
        makeArchitectureObject(
          "stair",
          index +
            1,
          architectureScale,
          architectureActiveLevel,
          {
            width:
              architectureStairWidthMm,
            depth:
              treadDepth,
            height:
              currentHeight,
            z:
              zReal,
            materialId:
              "concrete",
          }
        );

      step.name =
        `${groupName} · STEP ${String(
          index +
          1
        ).padStart(
          2,
          "0"
        )}`;

      step.groupId =
        groupId;

      step.groupName =
        groupName;

      step.rotation.y =
        architectureStairDirectionDeg;

      step.parameters = {
        ...(step.parameters ||
          {}),
        archStairId:
          groupId,
        archStairName:
          groupName,
        archStairStep:
          index +
          1,
        archStairSteps:
          stepCount,
        archStairRunMm:
          architectureStairRunMm,
        archStairRiseMm:
          architectureStairRiseMm,
        archStairWidthMm:
          architectureStairWidthMm,
        archStairDirectionDeg:
          architectureStairDirectionDeg,
      };

      stairs.push(
        step
      );
    }

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        ...stairs,
      ]
    );

    setSelectedIds(
      stairs.map(
        (item) =>
          item.id
      )
    );

    setPrimaryId(
      stairs[0].id
    );

    setOperationMessage(
      `${groupName} created · ${stepCount} steps · ${architectureStairRunMm} mm run · ${architectureStairRiseMm} mm rise.`
    );
  }

  function fitArchitectureRoofToModel() {
    const selectedArchitecture =
      selectedObjects.filter(
        (item) =>
          item.source ===
            "architecture" &&
          item.role ===
            "solid" &&
          item.visible !==
            false
      );

    const activeLevelObjects =
      objects.filter(
        (item) =>
          item.source ===
            "architecture" &&
          item.role ===
            "solid" &&
          item.visible !==
            false &&
          item.parameters
            ?.archLevelId ===
            architectureActiveLevelId &&
          ![
            "roof",
            "stair",
          ].includes(
            item.parameters
              ?.archType
          )
      );

    const sourceObjects =
      selectedArchitecture.length >
        0
        ? selectedArchitecture
        : activeLevelObjects;

    if (
      sourceObjects.length ===
      0
    ) {
      setOperationMessage(
        "Select Architect objects or add walls/floors on the active level before fitting a roof."
      );

      return;
    }

    const bounds =
      new THREE.Box3();

    sourceObjects.forEach(
      (item) => {
        bounds.union(
          architectureObjectBounds(
            item
          )
        );
      }
    );

    if (
      bounds.isEmpty()
    ) {
      return;
    }

    const size =
      new THREE.Vector3();

    const center =
      new THREE.Vector3();

    bounds.getSize(
      size
    );

    bounds.getCenter(
      center
    );

    const realWidth =
      size.x /
      SCENE_SCALE *
      architectureScale;

    const realDepth =
      size.z /
      SCENE_SCALE *
      architectureScale;

    const realCenterX =
      center.x /
      SCENE_SCALE *
      architectureScale;

    const realCenterZ =
      center.z /
      SCENE_SCALE *
      architectureScale;

    setArchitectureRoofWidthMm(
      Math.round(
        realWidth
      )
    );

    setArchitectureRoofDepthMm(
      Math.round(
        realDepth
      )
    );

    setArchitectureRoofCenterXmm(
      Math.round(
        realCenterX
      )
    );

    setArchitectureRoofCenterZmm(
      Math.round(
        realCenterZ
      )
    );

    setOperationMessage(
      `Roof fitted to ${selectedArchitecture.length > 0 ? "selection" : architectureActiveLevel?.name || "active level"} · ${Math.round(realWidth)} × ${Math.round(realDepth)} mm.`
    );
  }

  function addArchitectureFlatRoof() {
    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      return;
    }

    const roof =
      makeArchitectureObject(
        "roof",
        architectureObjectCount(
          objects,
          "roof"
        ),
        architectureScale,
        architectureActiveLevel,
        {
          width:
            architectureRoofWidthMm +
            architectureRoofOverhangMm *
              2,
          depth:
            architectureRoofDepthMm +
            architectureRoofOverhangMm *
              2,
          height:
            architectureRoofThicknessMm,
          sill:
            architectureWallHeightMm,
          x:
            architectureRoofCenterXmm,
          z:
            architectureRoofCenterZmm,
          materialId:
            "graphite",
        }
      );

    roof.name =
      `FLAT ROOF ${architectureObjectCount(
        objects,
        "roof"
      )}`;

    roof.parameters = {
      ...(roof.parameters ||
        {}),
      archRoofType:
        "flat",
      archRoofBuildingWidthMm:
        architectureRoofWidthMm,
      archRoofBuildingDepthMm:
        architectureRoofDepthMm,
      archRoofOverhangMm:
        architectureRoofOverhangMm,
    };

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        roof,
      ]
    );

    setSelectedIds([
      roof.id,
    ]);

    setPrimaryId(
      roof.id
    );

    setOperationMessage(
      `Flat roof added · ${architectureRoofWidthMm} × ${architectureRoofDepthMm} mm building footprint · ${architectureRoofOverhangMm} mm overhang.`
    );
  }

  function addArchitectureGableRoof() {
    if (
      objects.length +
        2 >
      MAX_OBJECTS
    ) {
      return;
    }

    const pitch =
      clamp(
        architectureRoofPitchDeg,
        5,
        60
      );

    const totalWidth =
      architectureRoofWidthMm +
      architectureRoofOverhangMm *
        2;

    const totalDepth =
      architectureRoofDepthMm +
      architectureRoofOverhangMm *
        2;

    const ridgeAlongZ =
      architectureRoofRidgeDirection ===
      "z";

    const span =
      ridgeAlongZ
        ? totalWidth
        : totalDepth;

    const ridgeLength =
      ridgeAlongZ
        ? totalDepth
        : totalWidth;

    const halfSpan =
      span /
      2;

    const pitchRadians =
      THREE.MathUtils.degToRad(
        pitch
      );

    const panelSlope =
      halfSpan /
      Math.cos(
        pitchRadians
      );

    const ridgeRise =
      halfSpan *
      Math.tan(
        pitchRadians
      );

    const roofIndex =
      architectureObjectCount(
        objects,
        "roof"
      );

    const groupId =
      `group-${makeId()}`;

    const groupName =
      `GABLE ROOF ${roofIndex}`;

    const baseSill =
      architectureWallHeightMm +
      ridgeRise /
        2;

    const first =
      makeArchitectureObject(
        "roof",
        roofIndex,
        architectureScale,
        architectureActiveLevel,
        {
          width:
            ridgeAlongZ
              ? panelSlope
              : ridgeLength,
          depth:
            ridgeAlongZ
              ? ridgeLength
              : panelSlope,
          height:
            architectureRoofThicknessMm,
          x:
            architectureRoofCenterXmm +
            (
              ridgeAlongZ
                ? -halfSpan /
                  2
                : 0
            ),
          z:
            architectureRoofCenterZmm +
            (
              ridgeAlongZ
                ? 0
                : -halfSpan /
                  2
            ),
          sill:
            baseSill,
          materialId:
            "graphite",
        }
      );

    const second =
      makeArchitectureObject(
        "roof",
        roofIndex +
          1,
        architectureScale,
        architectureActiveLevel,
        {
          width:
            ridgeAlongZ
              ? panelSlope
              : ridgeLength,
          depth:
            ridgeAlongZ
              ? ridgeLength
              : panelSlope,
          height:
            architectureRoofThicknessMm,
          x:
            architectureRoofCenterXmm +
            (
              ridgeAlongZ
                ? halfSpan /
                  2
                : 0
            ),
          z:
            architectureRoofCenterZmm +
            (
              ridgeAlongZ
                ? 0
                : halfSpan /
                  2
            ),
          sill:
            baseSill,
          materialId:
            "graphite",
        }
      );

    if (
      ridgeAlongZ
    ) {
      first.rotation.z =
        pitch;

      second.rotation.z =
        -pitch;
    } else {
      first.rotation.x =
        -pitch;

      second.rotation.x =
        pitch;
    }

    [
      first,
      second,
    ].forEach(
      (
        panel,
        index
      ) => {
        panel.name =
          `${groupName} · ${index === 0 ? "A" : "B"}`;

        panel.groupId =
          groupId;

        panel.groupName =
          groupName;

        panel.parameters = {
          ...(panel.parameters ||
            {}),
          archRoofType:
            "gable",
          archRoofId:
            groupId,
          archRoofPitchDeg:
            pitch,
          archRoofRidgeDirection:
            architectureRoofRidgeDirection,
          archRoofBuildingWidthMm:
            architectureRoofWidthMm,
          archRoofBuildingDepthMm:
            architectureRoofDepthMm,
          archRoofOverhangMm:
            architectureRoofOverhangMm,
          archRoofRidgeRiseMm:
            ridgeRise,
          archRoofCenterXmm:
            architectureRoofCenterXmm,
          archRoofCenterZmm:
            architectureRoofCenterZmm,
        };
      }
    );

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        first,
        second,
      ]
    );

    setSelectedIds([
      first.id,
      second.id,
    ]);

    setPrimaryId(
      first.id
    );

    setOperationMessage(
      `${groupName} added · ${pitch}° · ridge ${architectureRoofRidgeDirection.toUpperCase()} · rise ${Math.round(
        ridgeRise
      )} mm.`
    );
  }

  function addArchitecturePrimitive(
    kind
  ) {
    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      setOperationMessage(
        `Creator supports up to ${MAX_OBJECTS} objects.`
      );

      return;
    }

    const level =
      architectureActiveLevel;

    const count =
      architectureObjectCount(
        objects,
        kind
      );

    let overrides = {};

    if (
      kind ===
      "wall"
    ) {
      overrides = {
        width:
          5200,
        depth:
          architectureWallThicknessMm,
        height:
          architectureWallHeightMm,
      };
    }

    const newObject =
      makeArchitectureObject(
        kind,
        count,
        architectureScale,
        level,
        overrides
      );

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        newObject,
      ]
    );

    setSelectedIds([
      newObject.id,
    ]);

    setPrimaryId(
      newObject.id
    );

    setTransformMode(
      "translate"
    );

    setOperationMessage(
      `${newObject.name} added on ${level?.name || "GROUND"}.`
    );
  }

  function addArchitectureOpening(
    kind
  ) {
    if (
      ![
        "door",
        "window",
      ].includes(
        kind
      )
    ) {
      return;
    }

    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      return;
    }

    const wall =
      selected &&
      selected.source ===
        "architecture" &&
      selected.parameters
        ?.archType ===
        "wall" &&
      selected.role ===
        "solid"
        ? selected
        : null;

    if (!wall) {
      setOperationMessage(
        "Select one Architect WALL first, then choose DOOR or WINDOW."
      );

      return;
    }

    const level =
      architectureLevels.find(
        (candidate) =>
          candidate.id ===
          wall.parameters
            ?.archLevelId
      ) ||
      architectureActiveLevel;

    const defaults =
      ARCH_DEFAULTS[
        kind
      ];

    let opening =
      makeArchitectureObject(
        kind,
        architectureObjectCount(
          objects,
          kind
        ),
        architectureScale,
        level,
        {
          depth:
            Math.max(
              defaults.depth,
              safeNumber(
                wall.parameters
                  ?.archRealDimensions
                  ?.depth,
                architectureWallThicknessMm
              ) +
                200
            ),
          sill:
            defaults.sill ||
            0,
        }
      );

    opening =
      architectureOpeningOnWall(
        opening,
        wall,
        architectureScale,
        0,
        defaults.sill ||
          0
      );

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        opening,
      ]
    );

    setSelectedIds([
      wall.id,
      opening.id,
    ]);

    setPrimaryId(
      opening.id
    );

    setLibraryTab(
      "create"
    );

    setInspectorTab(
      "object"
    );

    setOperationMessage(
      `${defaults.label} attached to ${wall.name}. Adjust OFFSET / SILL if needed, then press CUT OPENING.`
    );
  }

  function updateHostedOpening(
    key,
    nextValue
  ) {
    if (
      !selectedArchitectureOpening ||
      !architectureOpeningHost ||
      selectedArchitectureOpening.locked
    ) {
      return;
    }

    const currentOffset =
      safeNumber(
        selectedArchitectureOpening
          .parameters
          ?.archWallOffsetMm,
        0
      );

    const currentSill =
      safeNumber(
        selectedArchitectureOpening
          .parameters
          ?.archSill,
        0
      );

    recordHistory();

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            selectedArchitectureOpening.id
              ? architectureOpeningOnWall(
                  item,
                  architectureOpeningHost,
                  architectureScale,
                  key ===
                    "offset"
                    ? nextValue
                    : currentOffset,
                  key ===
                    "sill"
                    ? nextValue
                    : currentSill
                )
              : item
        )
    );
  }

  function centerHostedOpening() {
    updateHostedOpening(
      "offset",
      0
    );
  }

  function selectHostedOpeningPair() {
    if (
      !selectedArchitectureOpening ||
      !architectureOpeningHost
    ) {
      return;
    }

    setSelectedIds([
      architectureOpeningHost.id,
      selectedArchitectureOpening.id,
    ]);

    setPrimaryId(
      selectedArchitectureOpening.id
    );
  }

  function cutHostedOpening() {
    if (
      !selectedArchitectureOpening ||
      !architectureOpeningHost ||
      selectedArchitectureOpening.locked ||
      architectureOpeningHost.locked
    ) {
      return;
    }

    const wall =
      architectureOpeningHost;

    const opening =
      selectedArchitectureOpening;

    const wallFrame =
      architectureWallFrameFor(
        wall,
        architectureScale
      );

    let wallMesh =
      null;

    let holeMesh =
      null;

    let resultMesh =
      null;

    recordHistory();

    try {
      wallMesh =
        makeCSGMesh(
          wall
        );

      holeMesh =
        makeCSGMesh(
          opening
        );

      resultMesh =
        CSG.subtract(
          wallMesh,
          holeMesh
        );

      resultMesh.updateMatrix();

      const resultObject =
        makeBooleanObject(
          resultMesh,
          wall.name,
          wall.materialId
        );

      resultObject.source =
        "architecture";

      resultObject.name =
        wall.name;

      resultObject.groupId =
        wall.groupId ||
        null;

      resultObject.groupName =
        wall.groupName ||
        null;

      resultObject.engine =
        "ARCHITECT SMART OPENING";

      resultObject.parameters = {
        ...(wall.parameters ||
          {}),
        architectureCut:
          true,
        archScale:
          architectureScale,
        archWallFrame:
          wallFrame,
        archLastOpening: {
          type:
            opening.parameters
              ?.archType,
          width:
            opening.parameters
              ?.archRealDimensions
              ?.width,
          height:
            opening.parameters
              ?.archRealDimensions
              ?.height,
          sill:
            opening.parameters
              ?.archSill,
          offset:
            opening.parameters
              ?.archWallOffsetMm,
        },
      };

      const hostIndex =
        objects.findIndex(
          (item) =>
            item.id ===
            wall.id
        );

      setObjects(
        (current) => {
          const next =
            current.filter(
              (item) =>
                item.id !==
                  wall.id &&
                item.id !==
                  opening.id
            );

          next.splice(
            Math.max(
              0,
              Math.min(
                hostIndex,
                next.length
              )
            ),
            0,
            resultObject
          );

          return next;
        }
      );

      setSelectedIds([
        resultObject.id,
      ]);

      setPrimaryId(
        resultObject.id
      );

      setOperationMessage(
        `${opening.parameters?.archType === "door" ? "Door" : "Window"} opening cut into ${wall.name}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Architecture smart opening cut error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to cut this opening."
      );
    } finally {
      disposeMesh(
        wallMesh
      );

      disposeMesh(
        holeMesh
      );

      disposeMesh(
        resultMesh
      );
    }
  }

  function toggleArchitectureRoomTool() {
    const nextActive =
      architectureDrawTool ===
      "room"
        ? null
        : "room";

    setArchitectureDrawTool(
      nextActive
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    if (nextActive) {
      setArchitectureDrawTool(
        "room"
      );

      setOperationMessage(
        "Room Draw active. Mouse controls stay exactly like the regular workspace: left drag orbit, middle drag pan, wheel zoom; short left clicks place the two room corners."
      );
    } else {
      setOperationMessage(
        "Room Draw cancelled."
      );
    }
  }

  function handleArchitectureRoomPointerDown(
    event
  ) {
    if (
      architectureDrawTool !==
        "room" ||
      event.button !==
        0
    ) {
      return;
    }

    const rawPoint =
      architecturePointerToReal(
        event
      );

    const point =
      architectureSmartSnapPoint(
        rawPoint,
        architectureWallStart
      );

    if (!point) {
      return;
    }

    if (
      !architectureWallStart
    ) {
      setArchitectureWallStart(
        point
      );

      setArchitecturePointer(
        point
      );

      setOperationMessage(
        `Room corner 1 · X ${point.realX} mm · Z ${point.realZ} mm. Click the opposite corner.`
      );

      return;
    }

    const x1 =
      architectureWallStart
        .realX;

    const z1 =
      architectureWallStart
        .realZ;

    const x2 =
      point.realX;

    const z2 =
      point.realZ;

    const roomWidth =
      Math.abs(
        x2 -
        x1
      );

    const roomDepth =
      Math.abs(
        z2 -
        z1
      );

    const minimumRoom =
      Math.max(
        500,
        architectureWallThicknessMm *
          3
      );

    if (
      roomWidth <
        minimumRoom ||
      roomDepth <
        minimumRoom
    ) {
      setOperationMessage(
        `Room must be at least ${minimumRoom} mm in both directions.`
      );

      return;
    }

    const requiredObjects =
      architectureRoomFloor
        ? 5
        : 4;

    if (
      objects.length +
        requiredObjects >
      MAX_OBJECTS
    ) {
      setOperationMessage(
        `Not enough object slots. Room needs ${requiredObjects} objects.`
      );

      return;
    }

    const centerX =
      (
        x1 +
        x2
      ) /
      2;

    const centerZ =
      (
        z1 +
        z2
      ) /
      2;

    const minX =
      Math.min(
        x1,
        x2
      );

    const maxX =
      Math.max(
        x1,
        x2
      );

    const minZ =
      Math.min(
        z1,
        z2
      );

    const maxZ =
      Math.max(
        z1,
        z2
      );

    const roomIndex =
      new Set(
        objects
          .map(
            (item) =>
              item.parameters
                ?.archRoomId
          )
          .filter(
            Boolean
          )
      ).size +
      1;

    const roomId =
      `room-${makeId()}`;

    const groupId =
      `group-${makeId()}`;

    const groupName =
      `ROOM ${roomIndex}`;

    const wallBaseCount =
      architectureObjectCount(
        objects,
        "wall"
      );

    const wallOverrides = [
      {
        width:
          roomWidth +
          architectureWallThicknessMm,
        x:
          centerX,
        z:
          minZ,
        rotationY: 0,
      },
      {
        width:
          roomWidth +
          architectureWallThicknessMm,
        x:
          centerX,
        z:
          maxZ,
        rotationY: 0,
      },
      {
        width:
          roomDepth +
          architectureWallThicknessMm,
        x:
          minX,
        z:
          centerZ,
        rotationY: 90,
      },
      {
        width:
          roomDepth +
          architectureWallThicknessMm,
        x:
          maxX,
        z:
          centerZ,
        rotationY: 90,
      },
    ];

    const roomWalls =
      wallOverrides.map(
        (
          override,
          index
        ) => {
          const wall =
            makeArchitectureObject(
              "wall",
              wallBaseCount +
                index,
              architectureScale,
              architectureActiveLevel,
              {
                ...override,
                depth:
                  architectureWallThicknessMm,
                height:
                  architectureWallHeightMm,
              }
            );

          wall.groupId =
            groupId;

          wall.groupName =
            groupName;

          wall.parameters = {
            ...(wall.parameters ||
              {}),
            archRoomId:
              roomId,
            archRoomName:
              groupName,
            archRoomAreaM2:
              (
                roomWidth *
                roomDepth
              ) /
              1000000,
          };

          return wall;
        }
      );

    const roomObjects = [
      ...roomWalls,
    ];

    if (
      architectureRoomFloor
    ) {
      const floor =
        makeArchitectureObject(
          "floor",
          architectureObjectCount(
            objects,
            "floor"
          ),
          architectureScale,
          architectureActiveLevel,
          {
            width:
              Math.max(
                100,
                roomWidth -
                architectureWallThicknessMm
              ),
            depth:
              Math.max(
                100,
                roomDepth -
                architectureWallThicknessMm
              ),
            height:
              architectureFloorThicknessMm,
            x:
              centerX,
            z:
              centerZ,
          }
        );

      floor.groupId =
        groupId;

      floor.groupName =
        groupName;

      floor.parameters = {
        ...(floor.parameters ||
          {}),
        archRoomId:
          roomId,
        archRoomName:
          groupName,
        archRoomAreaM2:
          (
            roomWidth *
            roomDepth
          ) /
          1000000,
      };

      roomObjects.push(
        floor
      );
    }

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        ...roomObjects,
      ]
    );

    setSelectedIds(
      roomObjects.map(
        (item) =>
          item.id
      )
    );

    setPrimaryId(
      roomWalls[0].id
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    if (
      architectureView ===
      "plan"
    ) {
      setArchitectureDrawTool(
        "room"
      );

      setOperationMessage(
        `${groupName} created · ${Math.round(roomWidth)} × ${Math.round(roomDepth)} mm · ${(roomWidth * roomDepth / 1000000).toFixed(2)} m². PLAN stays 2D and ROOM DRAW remains active. Click the next first corner.`
      );
    } else {
      setArchitectureDrawTool(
        null
      );

      setOperationMessage(
        `${groupName} created · ${Math.round(roomWidth)} × ${Math.round(roomDepth)} mm · ${(roomWidth * roomDepth / 1000000).toFixed(2)} m²${architectureRoomFloor ? " · floor included" : ""}. Regular mouse navigation remains unchanged.`
      );
    }
  }

  function toggleArchitectureMeasureTool() {
    if (
      architectureView !==
      "plan"
    ) {
      setOperationMessage(
        "MEASURE is available in PLAN view. Switch to PLAN first."
      );

      return;
    }

    const nextActive =
      architectureDrawTool ===
      "measure"
        ? null
        : "measure";

    setArchitectureDrawTool(
      nextActive
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    setArchitectureMeasureStart(
      null
    );

    setArchitectureMeasurePointer(
      null
    );

    setOperationMessage(
      nextActive
        ? "Measure active. Short-click point A, then point B. Left drag still pans; wheel still zooms."
        : "Measure cancelled."
    );
  }

  function clearArchitectureMeasurements() {
    setArchitectureMeasurements(
      []
    );

    setArchitectureMeasureStart(
      null
    );

    setArchitectureMeasurePointer(
      null
    );

    setOperationMessage(
      "Plan measurements cleared."
    );
  }

  function handleArchitectureMeasurePointerDown(
    event
  ) {
    if (
      architectureDrawTool !==
        "measure" ||
      architectureView !==
        "plan" ||
      event.button !==
        0
    ) {
      return;
    }

    const point =
      architecturePointerToReal(
        event
      );

    if (!point) {
      return;
    }

    if (
      !architectureMeasureStart
    ) {
      setArchitectureMeasureStart(
        point
      );

      setArchitectureMeasurePointer(
        point
      );

      setOperationMessage(
        `Measure A · X ${point.realX} · Z ${point.realZ} mm. Click point B.`
      );

      return;
    }

    const distanceMm =
      Math.hypot(
        point.realX -
          architectureMeasureStart.realX,
        point.realZ -
          architectureMeasureStart.realZ
      );

    if (
      distanceMm <
      1
    ) {
      return;
    }

    const measurement = {
      id:
        `measure-${makeId()}`,
      levelId:
        architectureActiveLevel
          ?.id ||
        "ground",
      a: {
        realX:
          architectureMeasureStart
            .realX,
        realZ:
          architectureMeasureStart
            .realZ,
      },
      b: {
        realX:
          point.realX,
        realZ:
          point.realZ,
      },
      distanceMm,
    };

    setArchitectureMeasurements(
      (current) => [
        ...current,
        measurement,
      ]
    );

    setArchitectureMeasureStart(
      null
    );

    setArchitectureMeasurePointer(
      null
    );

    setOperationMessage(
      `Dimension added · ${Math.round(distanceMm)} mm. Measure remains active.`
    );
  }

  function handleArchitectureMeasurePointerMove(
    event
  ) {
    if (
      architectureDrawTool !==
        "measure" ||
      !architectureMeasureStart
    ) {
      return;
    }

    const point =
      architecturePointerToReal(
        event
      );

    if (point) {
      setArchitectureMeasurePointer(
        point
      );
    }
  }

  function toggleArchitectureWallTool() {
    const nextActive =
      architectureDrawTool ===
      "wall"
        ? null
        : "wall";

    setArchitectureDrawTool(
      nextActive
    );

    setArchitectureWallStart(
      null
    );

    setArchitecturePointer(
      null
    );

    if (nextActive) {
      setArchitectureDrawTool(
        "wall"
      );

      setOperationMessage(
        "Wall Draw active. Mouse controls stay exactly like the regular workspace: left drag orbit, middle drag pan, wheel zoom; short left clicks place start and end."
      );
    } else {
      setOperationMessage(
        "Wall Draw cancelled."
      );
    }
  }

  function architectureWallEndpointsFor(
    wall
  ) {
    if (!wall) {
      return null;
    }

    const frame =
      architectureWallFrameFor(
        wall,
        architectureScale
      );

    const theta =
      THREE.MathUtils.degToRad(
        frame.rotationY
      );

    const half =
      frame.width /
      2;

    const dx =
      Math.cos(
        theta
      ) *
      half;

    const dz =
      -Math.sin(
        theta
      ) *
      half;

    return {
      frame,
      start: {
        x:
          frame.x -
          dx,
        z:
          frame.z -
          dz,
      },
      end: {
        x:
          frame.x +
          dx,
        z:
          frame.z +
          dz,
      },
    };
  }

  function architectureSmartSnapPoint(
    point,
    startPoint = null
  ) {
    if (
      !point ||
      !architectureSmartWallSnap
    ) {
      return point;
    }

    const snapDistance =
      Math.max(
        180,
        architectureSnapMm *
          2
      );

    const wallCandidates =
      objects.filter(
        (item) =>
          item.source ===
            "architecture" &&
          item.role ===
            "solid" &&
          item.parameters
            ?.archType ===
            "wall" &&
          item.visible !==
            false &&
          item.parameters
            ?.archLevelId ===
            architectureActiveLevelId
      );

    let best =
      null;

    wallCandidates.forEach(
      (wall) => {
        const endpoints =
          architectureWallEndpointsFor(
            wall
          );

        if (!endpoints) {
          return;
        }

        [
          [
            "ENDPOINT",
            endpoints.start,
          ],
          [
            "ENDPOINT",
            endpoints.end,
          ],
        ].forEach(
          ([
            kind,
            candidate,
          ]) => {
            const distance =
              Math.hypot(
                point.realX -
                  candidate.x,
                point.realZ -
                  candidate.z
              );

            if (
              distance <=
                snapDistance &&
              (
                !best ||
                distance <
                  best.distance
              )
            ) {
              best = {
                kind,
                distance,
                x:
                  candidate.x,
                z:
                  candidate.z,
                wallId:
                  wall.id,
              };
            }
          }
        );

        const a =
          endpoints.start;

        const b =
          endpoints.end;

        const vx =
          b.x -
          a.x;

        const vz =
          b.z -
          a.z;

        const lengthSq =
          vx *
            vx +
          vz *
            vz;

        if (
          lengthSq >
          0.0001
        ) {
          const t =
            clamp(
              (
                (
                  point.realX -
                  a.x
                ) *
                  vx +
                (
                  point.realZ -
                  a.z
                ) *
                  vz
              ) /
              lengthSq,
              0,
              1
            );

          const projected = {
            x:
              a.x +
              vx *
                t,
            z:
              a.z +
              vz *
                t,
          };

          const distance =
            Math.hypot(
              point.realX -
                projected.x,
              point.realZ -
                projected.z
            );

          const lineThreshold =
            Math.max(
              120,
              snapDistance *
                0.7
            );

          if (
            distance <=
              lineThreshold &&
            (
              !best ||
              distance <
                best.distance
            )
          ) {
            best = {
              kind:
                "WALL",
              distance,
              x:
                projected.x,
              z:
                projected.z,
              wallId:
                wall.id,
            };
          }
        }
      }
    );

    if (best) {
      return {
        ...point,
        realX:
          Math.round(
            best.x
          ),
        realZ:
          Math.round(
            best.z
          ),
        smartSnapKind:
          best.kind,
        smartSnapWallId:
          best.wallId,
      };
    }

    if (
      startPoint &&
      architectureAngleSnapDeg >
        0
    ) {
      const dx =
        point.realX -
        startPoint.realX;

      const dz =
        point.realZ -
        startPoint.realZ;

      const length =
        Math.hypot(
          dx,
          dz
        );

      if (
        length >
        0.0001
      ) {
        const step =
          THREE.MathUtils.degToRad(
            architectureAngleSnapDeg
          );

        const angle =
          Math.atan2(
            dz,
            dx
          );

        const snappedAngle =
          Math.round(
            angle /
            step
          ) *
          step;

        return {
          ...point,
          realX:
            architectureSnapReal(
              startPoint.realX +
              Math.cos(
                snappedAngle
              ) *
                length
            ),
          realZ:
            architectureSnapReal(
              startPoint.realZ +
              Math.sin(
                snappedAngle
              ) *
                length
            ),
          smartSnapKind:
            `ANGLE ${architectureAngleSnapDeg}°`,
        };
      }
    }

    return point;
  }

  function architectureSnapReal(
    value
  ) {
    const snap =
      Math.max(
        1,
        safeNumber(
          architectureSnapMm,
          100
        )
      );

    return (
      Math.round(
        value /
        snap
      ) *
      snap
    );
  }

  function architecturePointerToReal(
    event
  ) {
    const rect =
      creatorCanvasWrapRef.current
        ?.getBoundingClientRect();

    const api =
      viewportApiRef.current;

    if (
      !rect ||
      !api?.camera
    ) {
      return null;
    }

    const ndc =
      new THREE.Vector2(
        (
          (
            event.clientX -
            rect.left
          ) /
          Math.max(
            1,
            rect.width
          )
        ) *
          2 -
          1,
        -(
          (
            event.clientY -
            rect.top
          ) /
          Math.max(
            1,
            rect.height
          )
        ) *
          2 +
          1
      );

    const raycaster =
      new THREE.Raycaster();

    raycaster.setFromCamera(
      ndc,
      api.camera
    );

    const levelY =
      (
        safeNumber(
          architectureActiveLevel
            ?.elevation,
          0
        ) /
        architectureScale
      ) *
      SCENE_SCALE;

    const plane =
      new THREE.Plane(
        new THREE.Vector3(
          0,
          1,
          0
        ),
        -levelY
      );

    const world =
      new THREE.Vector3();

    if (
      !raycaster.ray
        .intersectPlane(
          plane,
          world
        )
    ) {
      return null;
    }

    return {
      realX:
        architectureSnapReal(
          (
            world.x /
            SCENE_SCALE
          ) *
          architectureScale
        ),
      realZ:
        architectureSnapReal(
          (
            world.z /
            SCENE_SCALE
          ) *
          architectureScale
        ),
      screenX:
        event.clientX -
        rect.left,
      screenY:
        event.clientY -
        rect.top,
    };
  }

  function handleArchitectureDrawPointerDown(
    event
  ) {
    if (
      architectureDrawTool !==
        "wall" ||
      event.button !==
        0
    ) {
      return;
    }

    const rawPoint =
      architecturePointerToReal(
        event
      );

    const point =
      architectureSmartSnapPoint(
        rawPoint,
        architectureWallStart
      );

    if (!point) {
      return;
    }

    if (
      !architectureWallStart
    ) {
      setArchitectureWallStart(
        point
      );

      setArchitecturePointer(
        point
      );

      setOperationMessage(
        `Wall start · X ${point.realX} mm · Z ${point.realZ} mm. Click the end point.`
      );

      return;
    }

    const deltaX =
      point.realX -
      architectureWallStart.realX;

    const deltaZ =
      point.realZ -
      architectureWallStart.realZ;

    const length =
      Math.hypot(
        deltaX,
        deltaZ
      );

    if (
      length <
      Math.max(
        50,
        architectureSnapMm *
          0.5
      )
    ) {
      setOperationMessage(
        "Wall is too short. Choose a farther end point."
      );

      return;
    }

    const midpointX =
      (
        point.realX +
        architectureWallStart.realX
      ) /
      2;

    const midpointZ =
      (
        point.realZ +
        architectureWallStart.realZ
      ) /
      2;

    const angle =
      -THREE.MathUtils.radToDeg(
        Math.atan2(
          deltaZ,
          deltaX
        )
      );

    const wall =
      makeArchitectureObject(
        "wall",
        architectureObjectCount(
          objects,
          "wall"
        ),
        architectureScale,
        architectureActiveLevel,
        {
          width:
            length,
          depth:
            architectureWallThicknessMm,
          height:
            architectureWallHeightMm,
          x:
            midpointX,
          z:
            midpointZ,
          rotationY:
            angle,
        }
      );

    wall.parameters = {
      ...(wall.parameters ||
        {}),
      archWallStartPoint: {
        x:
          architectureWallStart.realX,
        z:
          architectureWallStart.realZ,
      },
      archWallEndPoint: {
        x:
          point.realX,
        z:
          point.realZ,
      },
      archSmartSnap:
        point.smartSnapKind ||
        architectureWallStart
          .smartSnapKind ||
        null,
    };

    recordHistory();

    setObjects(
      (current) => [
        ...current,
        wall,
      ]
    );

    setSelectedIds([
      wall.id,
    ]);

    setPrimaryId(
      wall.id
    );

    if (
      architectureView ===
        "plan" &&
      architectureWallChain
    ) {
      setArchitectureWallStart(
        point
      );

      setArchitecturePointer(
        point
      );
    } else {
      setArchitectureWallStart(
        null
      );

      setArchitecturePointer(
        null
      );
    }

    if (
      architectureView ===
      "plan"
    ) {
      setArchitectureDrawTool(
        "wall"
      );

      setOperationMessage(
        architectureWallChain
          ? `Wall created · ${Math.round(length)} mm${point.smartSnapKind ? ` · ${point.smartSnapKind} SNAP` : ""}. CHAIN continues from this endpoint.`
          : `Wall created · ${Math.round(length)} mm${point.smartSnapKind ? ` · ${point.smartSnapKind} SNAP` : ""}. Click the next start point.`
      );
    } else {
      setArchitectureDrawTool(
        null
      );

      setOperationMessage(
        `Wall created · ${Math.round(length)} × ${architectureWallThicknessMm} × ${architectureWallHeightMm} mm real size. Wall Draw closed; regular mouse navigation remains unchanged.`
      );
    }
  }

  function handleArchitectureDrawPointerMove(
    event
  ) {
    if (
      ![
        "wall",
        "room",
      ].includes(
        architectureDrawTool
      ) ||
      !architectureWallStart
    ) {
      return;
    }

    const rawPoint =
      architecturePointerToReal(
        event
      );

    const point =
      architectureDrawTool ===
      "wall"
        ? architectureSmartSnapPoint(
            rawPoint,
            architectureWallStart
          )
        : rawPoint;

    if (point) {
      setArchitecturePointer(
        point
      );
    }
  }

  function updateArchitectureWallFromEndpoints(
    start,
    end
  ) {
    if (
      !selectedEditableArchitectureWall ||
      selectedEditableArchitectureWall.locked
    ) {
      return;
    }

    const dx =
      end.x -
      start.x;

    const dz =
      end.z -
      start.z;

    const length =
      Math.hypot(
        dx,
        dz
      );

    if (
      length <
      50
    ) {
      setOperationMessage(
        "Wall endpoints must be at least 50 mm apart."
      );

      return;
    }

    const centerX =
      (
        start.x +
        end.x
      ) /
      2;

    const centerZ =
      (
        start.z +
        end.z
      ) /
      2;

    const rotationY =
      -THREE.MathUtils.radToDeg(
        Math.atan2(
          dz,
          dx
        )
      );

    recordHistory();

    setObjects(
      (current) =>
        current.map(
          (item) => {
            if (
              item.id !==
              selectedEditableArchitectureWall.id
            ) {
              return item;
            }

            const frame =
              architectureWallFrameFor(
                item,
                architectureScale
              );

            return {
              ...item,
              dimensions: {
                ...item.dimensions,
                width:
                  length /
                  architectureScale,
              },
              position: {
                ...item.position,
                x:
                  centerX /
                  architectureScale,
                z:
                  centerZ /
                  architectureScale,
              },
              rotation: {
                ...item.rotation,
                y:
                  rotationY,
              },
              parameters: {
                ...(item.parameters ||
                  {}),
                archRealDimensions: {
                  ...(
                    item.parameters
                      ?.archRealDimensions ||
                    {}
                  ),
                  width:
                    length,
                },
                archWallFrame: {
                  ...frame,
                  x:
                    centerX,
                  z:
                    centerZ,
                  rotationY,
                  width:
                    length,
                },
                archWallStartPoint: {
                  x:
                    start.x,
                  z:
                    start.z,
                },
                archWallEndPoint: {
                  x:
                    end.x,
                  z:
                    end.z,
                },
              },
            };
          }
        )
    );

    setOperationMessage(
      `Wall endpoints updated · ${Math.round(length)} mm.`
    );
  }

  function updateArchitectureWallEndpoint(
    endpoint,
    axis,
    value
  ) {
    if (
      !selectedWallEndpoints
    ) {
      return;
    }

    const nextStart = {
      ...selectedWallEndpoints.start,
    };

    const nextEnd = {
      ...selectedWallEndpoints.end,
    };

    const target =
      endpoint ===
      "start"
        ? nextStart
        : nextEnd;

    target[
      axis
    ] =
      architectureSnapReal(
        safeNumber(
          value,
          target[
            axis
          ]
        )
      );

    updateArchitectureWallFromEndpoints(
      nextStart,
      nextEnd
    );
  }

  function snapSelectedArchitectureWallEndpoints() {
    if (
      !selectedWallEndpoints
    ) {
      return;
    }

    updateArchitectureWallFromEndpoints(
      {
        x:
          architectureSnapReal(
            selectedWallEndpoints
              .start.x
          ),
        z:
          architectureSnapReal(
            selectedWallEndpoints
              .start.z
          ),
      },
      {
        x:
          architectureSnapReal(
            selectedWallEndpoints
              .end.x
          ),
        z:
          architectureSnapReal(
            selectedWallEndpoints
              .end.z
          ),
      }
    );
  }

  function updateArchitectureRealDimension(
    key,
    value
  ) {
    if (
      !selected ||
      selected.source !==
        "architecture" ||
      selected.locked
    ) {
      return;
    }

    const realValue =
      clamp(
        architectureToMm(
          value,
          architectureUnit
        ),
        1,
        200000
      );

    recordHistory();

    updateSelected(
      (item) => {
        const nextReal = {
          ...(
            item.parameters
              ?.archRealDimensions ||
            {
              width:
                item.dimensions
                  .width *
                architectureScale,
              depth:
                item.dimensions
                  .depth *
                architectureScale,
              height:
                item.dimensions
                  .height *
                architectureScale,
            }
          ),
          [key]:
            realValue,
        };

        return {
          ...item,
          dimensions: {
            ...item.dimensions,
            [key]:
              realValue /
              architectureScale,
          },
          parameters: {
            ...(item.parameters ||
              {}),
            archRealDimensions:
              nextReal,
            archScale:
              architectureScale,
          },
        };
      }
    );
  }

  function focusArchitectureQAIssue(
    issue
  ) {
    if (!issue) {
      return;
    }

    if (
      issue.objectId
    ) {
      const item =
        objects.find(
          (candidate) =>
            candidate.id ===
            issue.objectId
        );

      if (item) {
        const levelId =
          item.parameters
            ?.archLevelId;

        if (
          levelId &&
          architectureLevels.some(
            (level) =>
              level.id ===
              levelId
          )
        ) {
          setArchitectureActiveLevelId(
            levelId
          );
        }

        setSelectedIds([
          item.id,
        ]);

        setPrimaryId(
          item.id
        );

        setInspectorTab(
          "object"
        );
      }
    }

    setOperationMessage(
      `${issue.title} · ${issue.detail}`
    );
  }

  function runArchitectureProductionCheck() {
    setInspectorTab(
      "output"
    );

    if (
      architectureProductionQA
        .status ===
      "READY"
    ) {
      setOperationMessage(
        `Production check READY · ${architectureProductionQA.visibleSolidCount} printable solids · 0 blockers · 0 warnings.`
      );

      return;
    }

    if (
      architectureProductionQA
        .status ===
      "BLOCKED"
    ) {
      setOperationMessage(
        `Production check BLOCKED · ${architectureProductionQA.blockerCount} blocker(s) · ${architectureProductionQA.warningCount} warning(s). Resolve blockers before Architect export.`
      );

      return;
    }

    setOperationMessage(
      `Production check needs review · ${architectureProductionQA.warningCount} warning(s) · no export blockers.`
    );
  }

  function downloadArchitectureQAReport() {
    const qa =
      architectureProductionQA;

    const lines = [
      "BEYOND CREATOR — ARCHITECT PRODUCTION REPORT",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Status: ${qa.status}`,
      `Scale: 1:${architectureScale}`,
      `Architect objects: ${qa.architectureObjectCount}`,
      `Visible printable solids: ${qa.visibleSolidCount}`,
      `Blockers: ${qa.blockerCount}`,
      `Warnings: ${qa.warningCount}`,
      `Information: ${qa.infoCount}`,
      "",
      "MODEL PRINT SIZE",
      `${architectureCheck.width.toFixed(2)} × ${architectureCheck.depth.toFixed(2)} × ${architectureCheck.height.toFixed(2)} mm`,
      "",
      "BLOCKERS",
      ...(qa.blockers.length
        ? qa.blockers.map(
            (
              issue,
              index
            ) =>
              `${index + 1}. ${issue.title} — ${issue.detail}`
          )
        : [
            "None",
          ]),
      "",
      "WARNINGS",
      ...(qa.warnings.length
        ? qa.warnings.map(
            (
              issue,
              index
            ) =>
              `${index + 1}. ${issue.title} — ${issue.detail}`
          )
        : [
            "None",
          ]),
      "",
      "LEVELS",
      ...qa.levelStats.map(
        (level) =>
          `${level.name} @ ${level.elevation >= 0 ? "+" : ""}${level.elevation} mm · ${level.solids} solids · ${level.openings} unapplied opening(s) · ${level.width.toFixed(2)} × ${level.depth.toFixed(2)} × ${level.height.toFixed(2)} mm`
      ),
      "",
      "NOTE",
      "READY means BEYOND Creator found no blocking architecture-integrity issues and no current print warnings. Final slicer verification is still required before physical production.",
    ];

    const blob =
      new Blob(
        [
          lines.join(
            "\n"
          ),
        ],
        {
          type:
            "text/plain;charset=utf-8",
        }
      );

    downloadBlob(
      blob,
      "beyond-architecture-production-report.txt"
    );

    setExportMessage(
      "Architect production report downloaded."
    );
  }

  function architecturePreparePrint() {
    if (
      architectureCheck
        .objectCount ===
      0
    ) {
      setOperationMessage(
        "Add architecture solids before running the print check."
      );

      return;
    }

    setInspectorTab(
      "output"
    );

    setOperationMessage(
      architectureProductionQA.status ===
        "READY"
        ? `Architect production check READY · ${architectureCheck.width.toFixed(
            1
          )} × ${architectureCheck.depth.toFixed(
            1
          )} × ${architectureCheck.height.toFixed(
            1
          )} mm at 1:${architectureScale}.`
        : architectureProductionQA.status ===
            "BLOCKED"
          ? `Architect production check BLOCKED · ${architectureProductionQA.blockerCount} blocker(s) · ${architectureProductionQA.warningCount} warning(s).`
          : `Architect production check needs review · ${architectureProductionQA.warningCount} warning(s) · no export blockers.`
    );
  }

  function addObject(
    type
  ) {
    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      return;
    }

    recordHistory();

    const countOfType =
      objects.filter(
        (item) =>
          item.type ===
          type
      ).length + 1;

    const newObject =
      makeObject(
        type,
        countOfType,
        Math.min(
          30,
          objects.length *
            8
        )
      );

    setObjects(
      (current) => [
        ...current,
        newObject,
      ]
    );

    setSelectedIds([
      newObject.id,
    ]);

    setPrimaryId(
      newObject.id
    );

    setOperationMessage(
      ""
    );
  }

  function duplicateSelected() {
    if (
      !selected ||
      selected.locked ||
      objects.length >=
        MAX_OBJECTS
    ) {
      return;
    }

    recordHistory();

    const clone = {
      ...selected,
      id: makeId(),
      name:
        `${selected.name} COPY`,
      geometry:
        selected.geometry
          ? selected.geometry.clone()
          : null,
      baseDimensions:
        selected.baseDimensions
          ? {
              ...selected.baseDimensions,
            }
          : null,
      dimensions: {
        ...selected.dimensions,
      },
      position: {
        ...selected.position,
        x:
          selected.position
            .x + 12,
        z:
          selected.position
            .z + 8,
      },
      rotation: {
        ...selected.rotation,
      },
    };

    setObjects(
      (current) => [
        ...current,
        clone,
      ]
    );

    setSelectedIds([
      clone.id,
    ]);

    setPrimaryId(
      clone.id
    );

    setOperationMessage(
      ""
    );
  }

  function deleteSelected() {
    if (
      selectedIds.length ===
      0
    ) {
      return;
    }

    const deletableIds =
      selectedObjects
        .filter(
          (item) =>
            !item.locked
        )
        .map(
          (item) =>
            item.id
        );

    if (
      deletableIds.length ===
      0
    ) {
      return;
    }

    recordHistory();

    const next =
      objects.filter(
        (item) =>
          !deletableIds.includes(
            item.id
          )
      );

    const nextId =
      next[0]?.id ||
      null;

    setObjects(
      next
    );

    setSelectedIds(
      nextId
        ? [
            nextId,
          ]
        : []
    );

    setPrimaryId(
      nextId
    );

    setOperationMessage(
      ""
    );
  }

  function updateDimension(
    key,
    value
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        dimensions: {
          ...item.dimensions,
          [key]:
            clamp(
              value,
              1,
              300
            ),
        },
      })
    );
  }

  function updatePosition(
    key,
    value
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        position: {
          ...item.position,
          [key]:
            clamp(
              value,
              -200,
              200
            ),
        },
      })
    );
  }

  function updateRotation(
    key,
    value
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        rotation: {
          ...item.rotation,
          [key]:
            clamp(
              value,
              -360,
              360
            ),
        },
      })
    );
  }

  function setMaterial(
    materialId
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        materialId,
      })
    );
  }

  function setRole(
    role
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        role,
      })
    );

    setOperationMessage(
      ""
    );
  }

  function updateName(
    value
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        name:
          String(
            value
          )
            .slice(
              0,
              36
            )
            .toUpperCase(),
      })
    );
  }

  function updateText(
    value
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    updateSelected(
      (item) => ({
        ...item,
        text:
          String(
            value
          )
            .slice(
              0,
              12
            )
            .toUpperCase(),
      })
    );
  }

  function toggleObjectVisibility(
    id
  ) {
    recordHistory();

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            id
              ? {
                  ...item,
                  visible:
                    item.visible ===
                    false,
                }
              : item
        )
    );
  }

  function toggleObjectLock(
    id
  ) {
    recordHistory();

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            id
              ? {
                  ...item,
                  locked:
                    !item.locked,
                }
              : item
        )
    );
  }

  function groupSelected() {
    if (
      selectedIds.length <
      2
    ) {
      return;
    }

    recordHistory();

    const groupId =
      makeId();

    const groupName =
      `GROUP ${
        sceneStructure
          .groups.length +
        1
      }`;

    const selectedSet =
      new Set(
        selectedIds
      );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            selectedSet.has(
              item.id
            )
              ? {
                  ...item,
                  groupId,
                  groupName,
                }
              : item
        )
    );
  }

  function ungroupSelected() {
    const groupedIds =
      selectedObjects
        .filter(
          (item) =>
            item.groupId
        )
        .map(
          (item) =>
            item.id
        );

    if (
      groupedIds.length ===
      0
    ) {
      return;
    }

    recordHistory();

    const groupedSet =
      new Set(
        groupedIds
      );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            groupedSet.has(
              item.id
            )
              ? {
                  ...item,
                  groupId: null,
                  groupName:
                    null,
                }
              : item
        )
    );
  }

  function selectGroup(
    groupId
  ) {
    const ids =
      objects
        .filter(
          (item) =>
            item.groupId ===
            groupId
        )
        .map(
          (item) =>
            item.id
        );

    setSelectedIds(
      ids
    );

    setPrimaryId(
      ids[
        ids.length - 1
      ] || null
    );
  }

  function toggleGroupVisibility(
    groupId
  ) {
    const members =
      objects.filter(
        (item) =>
          item.groupId ===
          groupId
      );

    if (
      members.length ===
      0
    ) {
      return;
    }

    recordHistory();

    const allVisible =
      members.every(
        (item) =>
          item.visible !==
          false
      );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.groupId ===
            groupId
              ? {
                  ...item,
                  visible:
                    !allVisible,
                }
              : item
        )
    );
  }

  function toggleGroupLock(
    groupId
  ) {
    const members =
      objects.filter(
        (item) =>
          item.groupId ===
          groupId
      );

    if (
      members.length ===
      0
    ) {
      return;
    }

    recordHistory();

    const allLocked =
      members.every(
        (item) =>
          item.locked
      );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.groupId ===
            groupId
              ? {
                  ...item,
                  locked:
                    !allLocked,
                }
              : item
        )
    );
  }

  function handleTransformStart(
    id
  ) {
    const item =
      objects.find(
        (candidate) =>
          candidate.id ===
          id
      );

    if (
      !item ||
      item.locked
    ) {
      return;
    }

    recordHistory();
  }

  function handleTransformEnd(
    id,
    object3D,
    baseScale
  ) {
    if (!object3D) {
      return;
    }

    setObjects(
      (current) =>
        current.map(
          (item) => {
            if (
              item.id !==
                id ||
              item.locked
            ) {
              return item;
            }

            const factorX =
              object3D
                .scale.x /
              Math.max(
                0.0001,
                baseScale[0]
              );

            const factorY =
              object3D
                .scale.y /
              Math.max(
                0.0001,
                baseScale[1]
              );

            const factorZ =
              object3D
                .scale.z /
              Math.max(
                0.0001,
                baseScale[2]
              );

            return {
              ...item,
              position: {
                x:
                  clamp(
                    object3D
                      .position.x /
                      SCENE_SCALE,
                    -200,
                    200
                  ),
                y:
                  clamp(
                    object3D
                      .position.y /
                      SCENE_SCALE,
                    -200,
                    200
                  ),
                z:
                  clamp(
                    object3D
                      .position.z /
                      SCENE_SCALE,
                    -200,
                    200
                  ),
              },
              rotation: {
                x:
                  THREE.MathUtils.radToDeg(
                    object3D
                      .rotation.x
                  ),
                y:
                  THREE.MathUtils.radToDeg(
                    object3D
                      .rotation.y
                  ),
                z:
                  THREE.MathUtils.radToDeg(
                    object3D
                      .rotation.z
                  ),
              },
              dimensions: {
                width:
                  clamp(
                    item.dimensions
                      .width *
                      factorX,
                    1,
                    300
                  ),
                height:
                  clamp(
                    item.dimensions
                      .height *
                      factorY,
                    1,
                    300
                  ),
                depth:
                  clamp(
                    item.dimensions
                      .depth *
                      factorZ,
                    1,
                    300
                  ),
              },
            };
          }
        )
    );

    setOperationMessage(
      "Transform applied."
    );

    setExportMessage(
      ""
    );
  }

  function replaceSelectionWithResult(
    resultObject
  ) {
    const selectedSet =
      new Set(
        selectedIds
      );

    setObjects(
      (current) => [
        ...current.filter(
          (item) =>
            !selectedSet.has(
              item.id
            )
        ),
        resultObject,
      ]
    );

    setSelectedIds([
      resultObject.id,
    ]);

    setPrimaryId(
      resultObject.id
    );
  }

  function combineSelected() {
    if (!canCombine) {
      setOperationMessage(
        "Select at least two SOLID objects to combine."
      );

      return;
    }

    let resultMesh =
      null;

    const temporary =
      [];

    try {
      selectedSolids.forEach(
        (
          item,
          index
        ) => {
          const mesh =
            makeCSGMesh(
              item
            );

          temporary.push(
            mesh
          );

          if (
            index === 0
          ) {
            resultMesh =
              mesh;

            return;
          }

          const nextResult =
            CSG.union(
              resultMesh,
              mesh
            );

          nextResult.updateMatrix();

          if (
            resultMesh !==
            temporary[0]
          ) {
            disposeMesh(
              resultMesh
            );
          }

          resultMesh =
            nextResult;
        }
      );

      const resultObject =
        makeBooleanObject(
          resultMesh,
          `COMBINED ${
            objects.filter(
              (item) =>
                item.type ===
                "mesh"
            ).length +
            1
          }`,
          selectedSolids[0]
            .materialId
        );

      recordHistory();

      recordHistory();

      replaceSelectionWithResult(
        resultObject
      );

      setOperationMessage(
        "Objects combined into one solid."
      );
    } catch (
      error
    ) {
      console.error(
        "Creator combine error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to combine these objects. Make sure they overlap."
      );
    } finally {
      temporary.forEach(
        (mesh) => {
          if (
            mesh !==
            resultMesh
          ) {
            disposeMesh(
              mesh
            );
          }
        }
      );

      if (
        resultMesh &&
        !temporary.includes(
          resultMesh
        )
      ) {
        disposeMesh(
          resultMesh
        );
      }
    }
  }

  function cutSelected() {
    if (!canCut) {
      setOperationMessage(
        "Select exactly one SOLID and at least one HOLE object."
      );

      return;
    }

    let resultMesh =
      makeCSGMesh(
        selectedSolids[0]
      );

    const temporaryHoles =
      [];

    try {
      selectedHoles.forEach(
        (item) => {
          const holeMesh =
            makeCSGMesh(
              item
            );

          temporaryHoles.push(
            holeMesh
          );

          const nextResult =
            CSG.subtract(
              resultMesh,
              holeMesh
            );

          nextResult.updateMatrix();

          disposeMesh(
            resultMesh
          );

          resultMesh =
            nextResult;
        }
      );

      const resultObject =
        makeBooleanObject(
          resultMesh,
          `CUT ${
            objects.filter(
              (item) =>
                item.type ===
                "mesh"
            ).length +
            1
          }`,
          selectedSolids[0]
            .materialId
        );

      if (
        selectedSolids[0]
          .source ===
        "architecture"
      ) {
        resultObject.source =
          "architecture";

        resultObject.name =
          selectedSolids[0]
            .name;

        resultObject.engine =
          "ARCHITECT CSG";

        resultObject.parameters = {
          ...(selectedSolids[0]
            .parameters ||
            {}),
          architectureCut:
            true,
          archScale:
            architectureScale,
          archWallFrame:
            selectedSolids[0]
              .parameters
              ?.archType ===
              "wall"
              ? architectureWallFrameFor(
                  selectedSolids[0],
                  architectureScale
                )
              : selectedSolids[0]
                  .parameters
                  ?.archWallFrame,
        };
      }

      replaceSelectionWithResult(
        resultObject
      );

      setOperationMessage(
        "Hole geometry cut from the solid."
      );
    } catch (
      error
    ) {
      console.error(
        "Creator cut error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to cut these objects. Make sure the hole overlaps the solid."
      );
    } finally {
      disposeMesh(
        resultMesh
      );

      temporaryHoles.forEach(
        disposeMesh
      );
    }
  }

  function describeExport(
    exportData,
    format
  ) {
    const size =
      `${exportData.bounds.width.toFixed(
        1
      )} × ${exportData.bounds.depth.toFixed(
        1
      )} × ${exportData.bounds.height.toFixed(
        1
      )} mm`;

    const holes =
      exportData.holeCount >
      0
        ? ` ${exportData.holeCount} unapplied HOLE object${
            exportData.holeCount ===
            1
              ? ""
              : "s"
          } were excluded.`
        : "";

    return `${format} ready · ${exportData.solidCount} solid object${
      exportData.solidCount ===
      1
        ? ""
        : "s"
    } · ${size}.${holes}`;
  }

  function downloadSTL() {
    if (
      architectureExportBlocked
    ) {
      setInspectorTab(
        "output"
      );

      setExportMessage(
        `Architect export blocked: resolve ${architectureProductionQA.blockerCount} production issue(s) first.`
      );

      return;
    }

    setExporting(
      true
    );

    setExportMessage(
      ""
    );

    try {
      const exportData =
        collectExportData(
          objects
        );

      const blob =
        makeBinarySTLBlob(
          exportData
        );

      downloadBlob(
        blob,
        "beyond-creator.stl"
      );

      setExportMessage(
        describeExport(
          exportData,
          "STL"
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Creator STL export error:",
        error
      );

      setExportMessage(
        error?.message ||
          "Unable to export STL."
      );
    } finally {
      setExporting(
        false
      );
    }
  }

  async function download3MF() {
    if (
      architectureExportBlocked
    ) {
      setInspectorTab(
        "output"
      );

      setExportMessage(
        `Architect export blocked: resolve ${architectureProductionQA.blockerCount} production issue(s) first.`
      );

      return;
    }

    setExporting(
      true
    );

    setExportMessage(
      ""
    );

    try {
      const exportData =
        collectExportData(
          objects
        );

      const blob =
        await make3MFBlob(
          exportData
        );

      downloadBlob(
        blob,
        "beyond-creator.model.3mf"
      );

      setExportMessage(
        describeExport(
          exportData,
          "3MF"
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Creator 3MF export error:",
        error
      );

      setExportMessage(
        error?.message ||
          "Unable to export 3MF."
      );
    } finally {
      setExporting(
        false
      );
    }
  }

  async function downloadArchitectureLevelsZip() {
    if (
      architectureProductionQA
        .blockerCount >
      0
    ) {
      setInspectorTab(
        "output"
      );

      setExportMessage(
        `Split export blocked: resolve ${architectureProductionQA.blockerCount} production issue(s) first.`
      );

      return;
    }

    setExporting(
      true
    );

    setExportMessage(
      "Preparing 3MF files by architecture level…"
    );

    try {
      const zip =
        new JSZip();

      let exportedLevels =
        0;

      for (
        const level
        of architectureLevels
      ) {
        const levelObjects =
          objects.filter(
            (item) =>
              item.source ===
                "architecture" &&
              item.parameters
                ?.archLevelId ===
                level.id
          );

        const solidCount =
          levelObjects.filter(
            (item) =>
              item.role ===
              "solid"
          ).length;

        if (
          solidCount ===
          0
        ) {
          continue;
        }

        const exportData =
          collectExportData(
            levelObjects.map(
              (item) => ({
                ...item,
                visible: true,
              })
            )
          );

        const blob =
          await make3MFBlob(
            exportData
          );

        const safeName =
          String(
            level.name ||
            level.id
          )
            .trim()
            .replace(
              /[^a-z0-9_-]+/gi,
              "-"
            )
            .replace(
              /^-+|-+$/g,
              ""
            ) ||
          level.id;

        zip.file(
          `${String(
            exportedLevels +
            1
          ).padStart(
            2,
            "0"
          )}-${safeName}.3mf`,
          await blob.arrayBuffer()
        );

        exportedLevels +=
          1;
      }

      if (
        exportedLevels ===
        0
      ) {
        throw new Error(
          "No architecture levels contain printable solids."
        );
      }

      zip.file(
        "README.txt",
        `BEYOND Architect\nScale: 1:${architectureScale}\nLevels exported: ${exportedLevels}\nEach 3MF contains one architecture level at print scale.`
      );

      const zipBlob =
        await zip.generateAsync({
          type: "blob",
          compression:
            "DEFLATE",
          compressionOptions: {
            level: 6,
          },
        });

      downloadBlob(
        zipBlob,
        "beyond-architecture-levels.zip"
      );

      setExportMessage(
        `${exportedLevels} architecture level${exportedLevels === 1 ? "" : "s"} exported as separate 3MF files.`
      );
    } catch (
      error
    ) {
      console.error(
        "Architecture split-by-level export error:",
        error
      );

      setExportMessage(
        error?.message ||
          "Unable to export architecture levels."
      );
    } finally {
      setExporting(
        false
      );
    }
  }

  async function sendToProject() {
    if (
      architectureExportBlocked
    ) {
      setInspectorTab(
        "output"
      );

      setExportMessage(
        `Architect project transfer blocked: resolve ${architectureProductionQA.blockerCount} production issue(s) first.`
      );

      return;
    }

    setExporting(
      true
    );

    setExportMessage(
      "Preparing Creator model for Start Project…"
    );

    try {
      const exportData =
        collectExportData(
          objects
        );

      const blob =
        await make3MFBlob(
          exportData
        );

      const file =
        new File(
          [
            blob,
          ],
          "beyond-creator.model.3mf",
          {
            type:
              "model/3mf",
            lastModified:
              Date.now(),
          }
        );

      window.dispatchEvent(
        new CustomEvent(
          "beyond-creator-model-selected",
          {
            detail: {
              file,
              format:
                "3MF",
              objectCount:
                exportData.solidCount,
              holeCount:
                exportData.holeCount,
              bounds:
                exportData.bounds,
              summary:
                describeExport(
                  exportData,
                  "BEYOND Creator"
                ),
            },
          }
        )
      );

      setExportMessage(
        "Creator model attached to Start Project."
      );

      const projectSection =
        document.getElementById(
          "start"
        ) ||
        document.getElementById(
          "upload"
        );

      projectSection
        ?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        });
    } catch (
      error
    ) {
      console.error(
        "Creator project transfer error:",
        error
      );

      setExportMessage(
        error?.message ||
          "Unable to send this model to Start Project."
      );
    } finally {
      setExporting(
        false
      );
    }
  }

  function replaceSingleObjectWithResult(
    originalId,
    resultObject
  ) {
    setObjects(
      (current) => [
        ...current.filter(
          (item) =>
            item.id !==
            originalId
        ),
        resultObject,
      ]
    );

    setSelectedIds([
      resultObject.id,
    ]);

    setPrimaryId(
      resultObject.id
    );
  }

  function applyMirrorCopy() {
    if (
      !selected ||
      selected.locked ||
      selected.visible ===
        false ||
      objects.length >=
        MAX_OBJECTS
    ) {
      return;
    }

    recordHistory();

    let sourceMesh =
      null;

    let worldGeometry =
      null;

    let tempMesh =
      null;

    try {
      sourceMesh =
        makeCSGMesh(
          selected
        );

      sourceMesh.updateMatrixWorld(
        true
      );

      worldGeometry =
        sourceMesh.geometry.clone();

      worldGeometry.applyMatrix4(
        sourceMesh.matrixWorld
      );

      const mirrorMatrix =
        new THREE.Matrix4();

      mirrorMatrix.makeScale(
        mirrorAxis ===
        "x"
          ? -1
          : 1,
        mirrorAxis ===
        "y"
          ? -1
          : 1,
        mirrorAxis ===
        "z"
          ? -1
          : 1
      );

      worldGeometry.applyMatrix4(
        mirrorMatrix
      );

      worldGeometry.computeVertexNormals();

      tempMesh =
        new THREE.Mesh(
          worldGeometry,
          new THREE.MeshStandardMaterial({
            color:
              materialColor(
                selected.materialId
              ),
          })
        );

      tempMesh.updateMatrixWorld(
        true
      );

      const mirrored =
        makeBooleanObject(
          tempMesh,
          `${selected.name} MIRROR ${mirrorAxis.toUpperCase()}`,
          selected.materialId
        );

      mirrored.source =
        "mirror";

      mirrored.parameters = {
        mirrorAxis,
        mirroredFrom:
          selected.name,
      };

      if (
        mirrorAxis ===
        "y"
      ) {
        mirrored.position.y =
          0;
      }

      setObjects(
        (current) => [
          ...current,
          mirrored,
        ]
      );

      setSelectedIds([
        mirrored.id,
      ]);

      setPrimaryId(
        mirrored.id
      );

      setOperationMessage(
        `Mirrored copy created across global ${mirrorAxis.toUpperCase()} plane.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator mirror error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to mirror this object."
      );
    } finally {
      if (
        tempMesh
      ) {
        // makeBooleanObject clones the geometry, so the temporary is safe to dispose.
        disposeMesh(
          tempMesh
        );
      } else {
        worldGeometry?.dispose?.();
      }

      disposeMesh(
        sourceMesh
      );
    }
  }

  function applyArray() {
    if (
      !selected ||
      selected.locked ||
      selected.visible ===
        false
    ) {
      return;
    }

    const requested =
      Math.round(
        clamp(
          arrayCount,
          2,
          10
        )
      );

    const capacity =
      Math.max(
        0,
        MAX_OBJECTS -
          objects.length
      );

    const copiesToCreate =
      Math.min(
        requested - 1,
        capacity
      );

    if (
      copiesToCreate <=
      0
    ) {
      setOperationMessage(
        "No object capacity remains for an array."
      );

      return;
    }

    recordHistory();

    const spacing =
      clamp(
        arraySpacing,
        1,
        300
      );

    const created = [];

    for (
      let index = 1;
      index <=
      copiesToCreate;
      index += 1
    ) {
      const clone =
        cloneCreatorObject(
          selected
        );

      clone.id =
        makeId();

      clone.name =
        `${selected.name} ARRAY ${index + 1}`;

      clone.groupId =
        null;

      clone.groupName =
        null;

      clone.position = {
        ...selected.position,
        [arrayAxis]:
          selected.position[
            arrayAxis
          ] +
          spacing *
            index,
      };

      created.push(
        clone
      );
    }

    setObjects(
      (current) => [
        ...current,
        ...created,
      ]
    );

    setSelectedIds(
      created.map(
        (item) =>
          item.id
      )
    );

    setPrimaryId(
      created[
        created.length -
          1
      ]?.id ||
        selected.id
    );

    setOperationMessage(
      `${created.length} array cop${
        created.length ===
        1
          ? "y"
          : "ies"
      } created on ${arrayAxis.toUpperCase()}.`
    );
  }

  function applyOpenShell() {
    if (
      !selected ||
      selected.locked ||
      selected.visible ===
        false ||
      selected.role !==
        "solid"
    ) {
      return;
    }

    if (
      selected.type ===
        "tube" ||
      selected.type ===
        "torus" ||
      selected.type ===
        "text"
    ) {
      setOperationMessage(
        "Open Shell in V7 supports solid primitives, sketch/revolve solids and boolean meshes. Tube, Torus and Text are excluded."
      );

      return;
    }

    const wall =
      clamp(
        shellWall,
        0.8,
        Math.max(
          0.8,
          Math.min(
            selected.dimensions
              .width,
            selected.dimensions
              .depth,
            selected.dimensions
              .height
          ) /
            3
        )
      );

    if (
      selected.dimensions
        .width <=
        wall * 2 ||
      selected.dimensions
        .depth <=
        wall * 2 ||
      selected.dimensions
        .height <=
        wall
    ) {
      setOperationMessage(
        "Wall thickness is too large for this object."
      );

      return;
    }

    recordHistory();

    let outerMesh =
      null;

    let innerMesh =
      null;

    let resultMesh =
      null;

    try {
      outerMesh =
        makeCSGMesh(
          selected
        );

      const inner =
        cloneCreatorObject(
          selected
        );

      inner.role =
        "solid";

      inner.dimensions = {
        width:
          selected.dimensions
            .width -
          wall * 2,
        depth:
          selected.dimensions
            .depth -
          wall * 2,
        // Keep the inner full-height and lift it by wall:
        // this preserves a bottom and opens the top.
        height:
          selected.dimensions
            .height,
      };

      const localLift =
        new THREE.Vector3(
          0,
          wall,
          0
        );

      const euler =
        new THREE.Euler(
          THREE.MathUtils
            .degToRad(
              selected.rotation
                .x
            ),
          THREE.MathUtils
            .degToRad(
              selected.rotation
                .y
            ),
          THREE.MathUtils
            .degToRad(
              selected.rotation
                .z
            ),
          "XYZ"
        );

      localLift.applyEuler(
        euler
      );

      inner.position = {
        x:
          selected.position
            .x +
          localLift.x,
        y:
          selected.position
            .y +
          localLift.y,
        z:
          selected.position
            .z +
          localLift.z,
      };

      innerMesh =
        makeCSGMesh(
          inner
        );

      resultMesh =
        CSG.subtract(
          outerMesh,
          innerMesh
        );

      resultMesh.updateMatrix();

      const resultObject =
        makeBooleanObject(
          resultMesh,
          `SHELL ${
            objects.filter(
              (item) =>
                item.source ===
                "shell"
            ).length +
            1
          }`,
          selected.materialId
        );

      resultObject.source =
        "shell";

      resultObject.engine =
        "CSG SHELL";

      resultObject.parameters = {
        wallThickness:
          wall,
        openTop: true,
      };

      replaceSingleObjectWithResult(
        selected.id,
        resultObject
      );

      setOperationMessage(
        `Open-top shell applied · ${wall.toFixed(
          1
        )} mm wall.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator shell error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to hollow this object."
      );
    } finally {
      disposeMesh(
        outerMesh
      );

      disposeMesh(
        innerMesh
      );

      if (
        resultMesh &&
        resultMesh !==
          outerMesh &&
        resultMesh !==
          innerMesh
      ) {
        disposeMesh(
          resultMesh
        );
      }
    }
  }

  function applyBevel() {
    if (
      !selected ||
      selected.locked ||
      selected.visible ===
        false ||
      selected.role !==
        "solid"
    ) {
      return;
    }

    if (
      ![
        "cube",
        "roundedBox",
      ].includes(
        selected.type
      )
    ) {
      setOperationMessage(
        "V7 Bevel is currently available for Cube and Rounded Box objects. Generic mesh bevel comes in the next topology-editing phase."
      );

      return;
    }

    const radius =
      clamp(
        bevelRadius,
        0.5,
        Math.max(
          0.5,
          Math.min(
            selected.dimensions
              .width,
            selected.dimensions
              .depth,
            selected.dimensions
              .height
          ) /
            2 -
            0.2
        )
      );

    const segments =
      Math.round(
        clamp(
          bevelSegments,
          1,
          10
        )
      );

    recordHistory();

    let mesh =
      null;

    try {
      const beveled =
        cloneCreatorObject(
          selected
        );

      beveled.type =
        "roundedBox";

      beveled.geometry =
        null;

      beveled.baseDimensions =
        null;

      beveled.parameters = {
        radius,
        segments,
      };

      mesh =
        makeCSGMesh(
          beveled
        );

      const resultObject =
        makeBooleanObject(
          mesh,
          `BEVEL ${
            objects.filter(
              (item) =>
                item.source ===
                "bevel"
            ).length +
            1
          }`,
          selected.materialId
        );

      resultObject.source =
        "bevel";

      resultObject.engine =
        "ROUNDED BOX";

      resultObject.parameters = {
        bevelRadius:
          radius,
        bevelSegments:
          segments,
      };

      replaceSingleObjectWithResult(
        selected.id,
        resultObject
      );

      setOperationMessage(
        `Bevel applied · ${radius.toFixed(
          1
        )} mm radius.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator bevel error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to bevel this object."
      );
    } finally {
      disposeMesh(
        mesh
      );
    }
  }

  function enterMeshEditMode() {
    if (
      !selected ||
      selected.locked ||
      selected.visible ===
        false
    ) {
      return;
    }

    if (
      selected.role !==
      "solid"
    ) {
      setOperationMessage(
        "Convert HOLE objects to SOLID before entering Mesh Edit Mode."
      );

      return;
    }

    if (
      selected.type ===
        "mesh" &&
      selected.parameters
        ?.meshEditable
    ) {
      setMeshEditMode(
        true
      );

      setTransformMode(
        "select"
      );

      setMeshSelection(
        null
      );

      setInspectorTab(
        "edit"
      );

      setMeshAnalysis(
        analyzeEditableGeometry(
          selected.geometry
        )
      );

      return;
    }

    recordHistory();

    try {
      const raw =
        localGeometryForObject(
          selected
        );

      const scale =
        generatedScale(
          selected
        );

      raw.scale(
        scale[0],
        scale[1],
        scale[2]
      );

      const editable =
        prepareEditableGeometry(
          raw
        );

      raw.dispose();

      const dimensions =
        editableGeometryDimensions(
          editable,
          SCENE_SCALE
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    type:
                      "mesh",
                    geometry:
                      editable,
                    baseDimensions: {
                      ...dimensions,
                    },
                    dimensions: {
                      ...dimensions,
                    },
                    source:
                      item.source ||
                      "editable",
                    engine:
                      item.engine ||
                      "MESH EDIT",
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                      editableFrom:
                        item.type,
                    },
                  }
                : item
          )
      );

      setMeshEditMode(
        true
      );

      setTransformMode(
        "select"
      );

      setMeshSelection(
        null
      );

      setInspectorTab(
        "edit"
      );

      setMeshAnalysis(
        analyzeEditableGeometry(
          editable
        )
      );

      setOperationMessage(
        "Mesh Edit Mode ready. Shift-click adds/removes elements; proportional and repair tools are available in Edit."
      );
    } catch (
      error
    ) {
      console.error(
        "Creator mesh edit preparation error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to convert this object into an editable mesh."
      );
    }
  }

  function exitMeshEditMode() {
    setMeshEditMode(
      false
    );

    setBoxSelectActive(
      false
    );

    setBoxDrag(
      null
    );

    setMeshSelection(
      null
    );

    setTransformMode(
      "select"
    );
  }

  function changeMeshSelectionMode(
    mode
  ) {
    setMeshSelectionMode(
      mode
    );

    setBoxSelectActive(
      false
    );

    setBoxDrag(
      null
    );

    setMeshSelection(
      null
    );
  }

  function handleEditElementSelect(
    itemId,
    face,
    faceIndex,
    localPoint,
    displayGeometry,
    multi = false
  ) {
    if (
      !meshEditMode ||
      itemId !==
        primaryId ||
      !face
    ) {
      return;
    }

    try {
      const selection =
        pickEditableElement(
          displayGeometry,
          face,
          localPoint,
          meshSelectionMode
        );

      const normalized = {
        ...selection,
        faceIndex:
          Number.isFinite(
            faceIndex
          )
            ? faceIndex
            : 0,
        objectId:
          itemId,
      };

      setMeshSelection(
        (current) => {
          const merged =
            mergeEditableSelection(
              current?.objectId ===
                itemId
                ? current
                : null,
              normalized,
              multi
            );

          return merged
            ? {
                ...merged,
                objectId:
                  itemId,
              }
            : null;
        }
      );
    } catch (
      error
    ) {
      console.warn(
        "Mesh element selection failed:",
        error
      );

      setMeshSelection(
        null
      );
    }
  }

  function selectConnectedMeshElements() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection
    ) {
      return;
    }

    try {
      const connected =
        selectConnectedEditableElements(
          selected.geometry,
          meshSelection
        );

      setMeshSelection(
        connected
          ? {
              ...connected,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        connected
          ? `Connected selection · ${editableSelectionCount(
              connected
            ).toLocaleString()} ${meshSelection.mode} elements.`
          : "No connected elements found."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to select connected geometry."
      );
    }
  }

  function shrinkMeshSelection() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection
    ) {
      return;
    }

    try {
      const shrunk =
        shrinkEditableSelection(
          selected.geometry,
          meshSelection
        );

      setMeshSelection(
        shrunk
          ? {
              ...shrunk,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        shrunk
          ? `Selection shrunk to ${editableSelectionCount(
              shrunk
            ).toLocaleString()} elements.`
          : "Selection shrink reached the center / empty selection."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to shrink selection."
      );
    }
  }

  function toggleBoxSelect() {
    if (
      !meshEditMode ||
      !selected ||
      selected.type !==
        "mesh"
    ) {
      return;
    }

    setBoxDrag(
      null
    );

    setBoxSelectActive(
      (value) =>
        !value
    );

    setOperationMessage(
      boxSelectActive
        ? "Box Select cancelled."
        : "Box Select: drag a rectangle over the viewport. Hold Shift to add to the existing selection."
    );
  }

  function beginBoxSelect(
    event
  ) {
    if (
      !boxSelectActive ||
      event.button !==
        0
    ) {
      return;
    }

    const rect =
      creatorCanvasWrapRef.current
        ?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const x =
      event.clientX -
      rect.left;

    const y =
      event.clientY -
      rect.top;

    setBoxDrag({
      pointerId:
        event.pointerId,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      additive:
        Boolean(
          event.shiftKey
        ),
    });

    event.currentTarget
      .setPointerCapture?.(
        event.pointerId
      );
  }

  function moveBoxSelect(
    event
  ) {
    if (
      !boxSelectActive ||
      !boxDrag ||
      (
        boxDrag.pointerId !==
        undefined &&
        event.pointerId !==
          boxDrag.pointerId
      )
    ) {
      return;
    }

    const rect =
      creatorCanvasWrapRef.current
        ?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();

    setBoxDrag(
      (current) =>
        current
          ? {
              ...current,
              x2:
                event.clientX -
                rect.left,
              y2:
                event.clientY -
                rect.top,
            }
          : current
    );
  }

  function finishBoxSelect(
    event
  ) {
    if (
      !boxSelectActive ||
      !boxDrag ||
      !selected ||
      selected.type !==
        "mesh"
    ) {
      return;
    }

    const rect =
      creatorCanvasWrapRef.current
        ?.getBoundingClientRect();

    const api =
      viewportApiRef.current;

    if (
      !rect ||
      !api?.camera
    ) {
      setBoxSelectActive(
        false
      );

      setBoxDrag(
        null
      );

      return;
    }

    const finalBox = {
      ...boxDrag,
      x2:
        event.clientX -
        rect.left,
      y2:
        event.clientY -
        rect.top,
    };

    const width =
      Math.abs(
        finalBox.x2 -
        finalBox.x1
      );

    const height =
      Math.abs(
        finalBox.y2 -
        finalBox.y1
      );

    try {
      if (
        width < 4 ||
        height < 4
      ) {
        setOperationMessage(
          "Box Select needs a larger rectangle."
        );
      } else {
        const next =
          selectEditableElementsInScreenBox(
            selected.geometry,
            meshSelectionMode,
            creatorObjectWorldMatrix(
              selected
            ),
            api.camera,
            {
              width:
                rect.width,
              height:
                rect.height,
            },
            finalBox
          );

        const merged =
          finalBox.additive
            ? mergeEditableSelections(
                meshSelection,
                next
              )
            : next;

        setMeshSelection(
          merged
            ? {
                ...merged,
                objectId:
                  selected.id,
              }
            : null
        );

        setOperationMessage(
          merged
            ? `Box Select · ${editableSelectionCount(
                merged
              ).toLocaleString()} ${meshSelectionMode} elements selected.`
            : "Box Select found no elements."
        );
      }
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to complete Box Select."
      );
    } finally {
      setBoxSelectActive(
        false
      );

      setBoxDrag(
        null
      );
    }
  }

  function selectBoundaryEdges() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode
    ) {
      return;
    }

    try {
      const boundary =
        selectBoundaryEditableEdges(
          selected.geometry,
          meshSelection?.mode ===
            "edge"
            ? meshSelection
            : null
        );

      setMeshSelectionMode(
        "edge"
      );

      setMeshSelection(
        boundary
          ? {
              ...boundary,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        boundary
          ? `Boundary selected · ${editableSelectionCount(
              boundary
            ).toLocaleString()} open edge${
              editableSelectionCount(
                boundary
              ) === 1
                ? ""
                : "s"
            }.`
          : "No open boundary edges found. This mesh appears closed."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to select boundary edges."
      );
    }
  }

  function selectEdgeChain() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection ||
      meshSelection.mode !==
        "edge"
    ) {
      return;
    }

    try {
      const chain =
        selectEdgeChainEditableElements(
          selected.geometry,
          meshSelection,
          clamp(
            edgeChainAngle,
            1,
            89
          )
        );

      setMeshSelection(
        chain
          ? {
              ...chain,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        chain
          ? `Edge Chain · ${editableSelectionCount(
              chain
            ).toLocaleString()} edge${
              editableSelectionCount(
                chain
              ) === 1
                ? ""
                : "s"
            } · max turn ${edgeChainAngle}°.`
          : "No continuous edge chain found."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to follow this edge chain."
      );
    }
  }

  function fillSelectedHole() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection ||
      meshSelection.mode !==
        "edge" ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    try {
      const result =
        fillSelectedBoundaryHole(
          selected.geometry,
          meshSelection
        );

      const dimensions =
        editableGeometryDimensions(
          result.geometry,
          SCENE_SCALE
        );

      const analysis =
        analyzeEditableGeometry(
          result.geometry
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    geometry:
                      result.geometry,
                    dimensions: {
                      ...dimensions,
                    },
                    baseDimensions: {
                      ...dimensions,
                    },
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                      lastHoleFill:
                        new Date()
                          .toISOString(),
                    },
                  }
                : item
          )
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        analysis
      );

      setOperationMessage(
        `Hole filled · ${result.loopVertices} boundary vertices · ${result.addedTriangles} triangle${
          result.addedTriangles ===
          1
            ? ""
            : "s"
        } added. ${
          analysis.boundaryEdges ===
          0
            ? "Mesh is now closed."
            : `${analysis.boundaryEdges} open boundary edges remain elsewhere.`
        }`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator hole-fill error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to fill this boundary. Use BOUNDARY on one clean hole first."
      );
    }
  }

  async function manifoldCleanSelectedMesh() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      selected.locked ||
      manifoldCleaning
    ) {
      return;
    }

    recordHistory();

    setManifoldCleaning(
      true
    );

    setOperationMessage(
      "Manifold Clean is rebuilding the mesh…"
    );

    try {
      const result =
        await cleanCreatorGeometryWithManifold(
          selected.geometry,
          {
            tolerance:
              clamp(
                manifoldToleranceMm,
                0.001,
                2
              ) *
              SCENE_SCALE,
          }
        );

      const editable =
        prepareEditableGeometry(
          result.geometry
        );

      result.geometry.dispose();

      const dimensions =
        editableGeometryDimensions(
          editable,
          SCENE_SCALE
        );

      const analysis =
        analyzeEditableGeometry(
          editable
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    geometry:
                      editable,
                    dimensions: {
                      ...dimensions,
                    },
                    baseDimensions: {
                      ...dimensions,
                    },
                    source:
                      "editable",
                    engine:
                      "MANIFOLD CLEAN",
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                      manifoldClean:
                        true,
                      manifoldToleranceMm:
                        clamp(
                          manifoldToleranceMm,
                          0.001,
                          2
                        ),
                    },
                  }
                : item
          )
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        analysis
      );

      setOperationMessage(
        `Manifold Clean complete · ${analysis.vertices.toLocaleString()} vertices · ${analysis.triangles.toLocaleString()} triangles · genus ${result.info.genus}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator Manifold Clean error:",
        error
      );

      setOperationMessage(
        `${error?.message || "Manifold Clean failed."} If the mesh is open, select BOUNDARY and fill the visible hole first.`
      );
    } finally {
      setManifoldCleaning(
        false
      );
    }
  }

  function selectSharpEdges() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode
    ) {
      return;
    }

    try {
      const sharp =
        selectSharpEditableEdges(
          selected.geometry,
          clamp(
            sharpEdgeAngle,
            1,
            179
          )
        );

      setMeshSelectionMode(
        "edge"
      );

      setMeshSelection(
        sharp
          ? {
              ...sharp,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        sharp
          ? `Sharp edges · ${editableSelectionCount(
              sharp
            ).toLocaleString()} edge${
              editableSelectionCount(
                sharp
              ) === 1
                ? ""
                : "s"
            } at ≥ ${sharpEdgeAngle}°.`
          : `No edges found at ≥ ${sharpEdgeAngle}°.`
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to select sharp edges."
      );
    }
  }

  async function applySelectedEdgeFillet() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection ||
      meshSelection.mode !==
        "edge" ||
      selected.locked ||
      edgeFilletWorking
    ) {
      return;
    }

    const analysis =
      analyzeEditableGeometry(
        selected.geometry
      );

    if (
      analysis.boundaryEdges >
        0 ||
      analysis.nonManifoldEdges >
        0
    ) {
      setMeshAnalysis(
        analysis
      );

      setOperationMessage(
        "Selected-edge fillet requires a closed manifold mesh. Fill open boundaries / run Manifold Clean first."
      );

      return;
    }

    recordHistory();

    setEdgeFilletWorking(
      true
    );

    setOperationMessage(
      "Building selected-edge fillet…"
    );

    try {
      const result =
        await filletSelectedCreatorEdges(
          selected.geometry,
          meshSelection,
          {
            smoothness:
              clamp(
                edgeFilletSmoothness,
                5,
                100
              ) /
              100,
            refine:
              Math.round(
                clamp(
                  edgeFilletRefine,
                  2,
                  4
                )
              ),
            tolerance:
              clamp(
                manifoldToleranceMm,
                0.001,
                2
              ) *
              SCENE_SCALE,
          }
        );

      const editable =
        prepareEditableGeometry(
          result.geometry
        );

      result.geometry.dispose();

      const dimensions =
        editableGeometryDimensions(
          editable,
          SCENE_SCALE
        );

      const nextAnalysis =
        analyzeEditableGeometry(
          editable
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    geometry:
                      editable,
                    dimensions: {
                      ...dimensions,
                    },
                    baseDimensions: {
                      ...dimensions,
                    },
                    source:
                      "editable",
                    engine:
                      "MANIFOLD EDGE FILLET",
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                      edgeFillet: {
                        selectedEdges:
                          result.info
                            .selectedEdges,
                        smoothness:
                          result.info
                            .smoothness,
                        refine:
                          result.info
                            .refine,
                      },
                    },
                  }
                : item
          )
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        nextAnalysis
      );

      setOperationMessage(
        `Selected-edge fillet complete · ${result.info.selectedEdges} edge${
          result.info.selectedEdges ===
          1
            ? ""
            : "s"
        } · ${result.info.outputTriangles.toLocaleString()} triangles.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator edge fillet error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to fillet these edges."
      );
    } finally {
      setEdgeFilletWorking(
        false
      );
    }
  }

  function nudgeEditableSelection(
    axis,
    direction
  ) {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshSelection ||
      meshSelection.objectId !==
        selected.id ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    const delta =
      new THREE.Vector3();

    delta[
      axis
    ] =
      direction *
      clamp(
        editNudgeMm,
        0.1,
        50
      ) *
      SCENE_SCALE;

    try {
      const geometry =
        moveEditableSelection(
          selected.geometry,
          meshSelection,
          delta,
          {
            proportional:
              proportionalEdit,
            radius:
              clamp(
                proportionalRadiusMm,
                1,
                200
              ) *
              SCENE_SCALE,
          }
        );

      const dimensions =
        editableGeometryDimensions(
          geometry,
          SCENE_SCALE
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    geometry,
                    dimensions: {
                      ...dimensions,
                    },
                    baseDimensions: {
                      ...dimensions,
                    },
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                    },
                  }
                : item
          )
      );

      setMeshAnalysis(
        null
      );

      setOperationMessage(
        `${editableSelectionCount(
          meshSelection
        )} ${meshSelection.mode}${
          editableSelectionCount(
            meshSelection
          ) === 1
            ? ""
            : "s"
        } moved ${direction > 0 ? "+" : "-"}${editNudgeMm} mm on local ${axis.toUpperCase()}${proportionalEdit ? ` · proportional ${proportionalRadiusMm} mm` : ""}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator mesh nudge error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to move the selected mesh element."
      );
    }
  }

  function applyEditableFaceExtrude() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshSelection ||
      meshSelection.mode !==
        "face" ||
      meshSelection.objectId !==
        selected.id ||
      selected.locked
    ) {
      return;
    }

    const selectedFaceCount =
      editableSelectionCount(
        meshSelection
      );

    if (
      selectedFaceCount >
      24
    ) {
      setOperationMessage(
        "V10 multi-face Push / Pull supports up to 24 selected faces per operation."
      );

      return;
    }

    const amountMm =
      clamp(
        faceExtrudeMm,
        -80,
        80
      );

    if (
      Math.abs(
        amountMm
      ) < 0.2
    ) {
      setOperationMessage(
        "Face extrusion must be at least 0.2 mm."
      );

      return;
    }

    recordHistory();

    let baseMesh =
      null;

    let resultMesh =
      null;

    const temporaryTools =
      [];

    try {
      const effectiveInset =
        selectedFaceCount ===
        1
          ? clamp(
              faceInsetPercent,
              0,
              75
            )
          : 0;

      const toolGeometries =
        buildFaceExtrusionGeometries(
          selected.geometry,
          meshSelection,
          amountMm *
            SCENE_SCALE,
          effectiveInset,
          24
        );

      baseMesh =
        makeCSGMesh(
          selected
        );

      let workingMesh =
        baseMesh;

      const scale =
        generatedScale(
          selected
        );

      for (
        const toolGeometry
        of toolGeometries
      ) {
        const toolMesh =
          new THREE.Mesh(
            toolGeometry,
            new THREE.MeshStandardMaterial({
              color:
                materialColor(
                  selected.materialId
                ),
            })
          );

        temporaryTools.push(
          toolMesh
        );

        toolMesh.position.set(
          selected.position.x *
            SCENE_SCALE,
          selected.position.y *
            SCENE_SCALE,
          selected.position.z *
            SCENE_SCALE
        );

        toolMesh.rotation.set(
          THREE.MathUtils.degToRad(
            selected.rotation.x
          ),
          THREE.MathUtils.degToRad(
            selected.rotation.y
          ),
          THREE.MathUtils.degToRad(
            selected.rotation.z
          )
        );

        toolMesh.scale.set(
          scale[0],
          scale[1],
          scale[2]
        );

        toolMesh.updateMatrix();
        toolMesh.updateMatrixWorld(
          true
        );

        const nextMesh =
          amountMm > 0
            ? CSG.union(
                workingMesh,
                toolMesh
              )
            : CSG.subtract(
                workingMesh,
                toolMesh
              );

        nextMesh.updateMatrix();

        if (
          workingMesh !==
          baseMesh
        ) {
          disposeMesh(
            workingMesh
          );
        }

        workingMesh =
          nextMesh;
      }

      resultMesh =
        workingMesh;

      const resultObject =
        makeBooleanObject(
          resultMesh,
          amountMm > 0
            ? selectedFaceCount ===
                1
              ? "FACE EXTRUDE"
              : "MULTI FACE EXTRUDE"
            : selectedFaceCount ===
                1
              ? "FACE POCKET"
              : "MULTI FACE POCKET",
          selected.materialId
        );

      const editable =
        prepareEditableGeometry(
          resultObject.geometry
        );

      resultObject.geometry.dispose();

      const dimensions =
        editableGeometryDimensions(
          editable,
          SCENE_SCALE
        );

      resultObject.geometry =
        editable;

      resultObject.baseDimensions = {
        ...dimensions,
      };

      resultObject.dimensions = {
        ...dimensions,
      };

      resultObject.source =
        "editable";

      resultObject.engine =
        amountMm > 0
          ? "CSG MULTI FACE EXTRUDE"
          : "CSG MULTI FACE POCKET";

      resultObject.parameters = {
        meshEditable: true,
        faceExtrudeMm:
          amountMm,
        faceInsetPercent:
          effectiveInset,
        faceCount:
          selectedFaceCount,
      };

      replaceSingleObjectWithResult(
        selected.id,
        resultObject
      );

      setMeshEditMode(
        true
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        analyzeEditableGeometry(
          editable
        )
      );

      setOperationMessage(
        amountMm > 0
          ? `${selectedFaceCount} face${
              selectedFaceCount ===
              1
                ? ""
                : "s"
            } extruded ${amountMm} mm.${
              selectedFaceCount > 1 &&
              faceInsetPercent > 0
                ? " Multi-face inset is intentionally ignored to prevent gaps between adjacent triangles."
                : ""
            }`
          : `${selectedFaceCount} face pocket${
              selectedFaceCount ===
              1
                ? ""
                : "s"
            } cut ${Math.abs(
              amountMm
            )} mm deep.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator multi-face extrusion error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to push / pull the selected faces. Try fewer faces or a smaller amount."
      );
    } finally {
      temporaryTools.forEach(
        (mesh) =>
          disposeMesh(
            mesh
          )
      );

      if (
        resultMesh &&
        resultMesh !==
          baseMesh
      ) {
        disposeMesh(
          resultMesh
        );
      }

      disposeMesh(
        baseMesh
      );
    }
  }

  function selectAllMeshElements() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode
    ) {
      return;
    }

    try {
      const selection =
        selectAllEditableElements(
          selected.geometry,
          meshSelectionMode
        );

      setMeshSelection(
        selection
          ? {
              ...selection,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        selection
          ? `${editableSelectionCount(
              selection
            ).toLocaleString()} ${meshSelectionMode} elements selected.`
          : "Nothing to select."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to select all mesh elements."
      );
    }
  }

  function growMeshSelection() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshEditMode ||
      !meshSelection
    ) {
      return;
    }

    try {
      const grown =
        growEditableSelection(
          selected.geometry,
          meshSelection
        );

      setMeshSelection(
        grown
          ? {
              ...grown,
              objectId:
                selected.id,
            }
          : null
      );

      setOperationMessage(
        grown
          ? `Selection grown to ${editableSelectionCount(
              grown
            ).toLocaleString()} elements.`
          : "Selection could not be grown."
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to grow selection."
      );
    }
  }

  function applySelectionGeometry(
    geometry,
    message
  ) {
    const dimensions =
      editableGeometryDimensions(
        geometry,
        SCENE_SCALE
      );

    setObjects(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            selected.id
              ? {
                  ...item,
                  geometry,
                  dimensions: {
                    ...dimensions,
                  },
                  baseDimensions: {
                    ...dimensions,
                  },
                  parameters: {
                    ...(item.parameters ||
                      {}),
                    meshEditable:
                      true,
                  },
                }
              : item
        )
    );

    setMeshAnalysis(
      null
    );

    setOperationMessage(
      message
    );
  }

  function smoothMeshSelection() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshSelection ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    try {
      const geometry =
        smoothEditableSelection(
          selected.geometry,
          meshSelection,
          clamp(
            smoothStrength,
            1,
            100
          ) / 100
        );

      applySelectionGeometry(
        geometry,
        `Smoothed ${editableSelectionCount(
          meshSelection
        )} selected ${meshSelection.mode} element${
          editableSelectionCount(
            meshSelection
          ) === 1
            ? ""
            : "s"
        }.`
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to smooth this selection."
      );
    }
  }

  function flattenMeshSelection(
    axis
  ) {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      !meshSelection ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    try {
      const geometry =
        flattenEditableSelection(
          selected.geometry,
          meshSelection,
          axis
        );

      applySelectionGeometry(
        geometry,
        `Selection flattened on local ${axis.toUpperCase()}.`
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to flatten this selection."
      );
    }
  }

  function analyzeSelectedMesh() {
    if (
      !selected ||
      selected.type !==
        "mesh"
    ) {
      return;
    }

    try {
      const analysis =
        analyzeEditableGeometry(
          selected.geometry
        );

      setMeshAnalysis(
        analysis
      );

      setOperationMessage(
        analysis.status ===
          "MANIFOLD"
          ? "Mesh health check passed: closed manifold geometry."
          : `Mesh health: ${analysis.status}. Basic Repair can weld vertices and remove degenerate / duplicate faces.`
      );
    } catch (
      error
    ) {
      setOperationMessage(
        error?.message ||
          "Unable to analyze this mesh."
      );
    }
  }

  function repairSelectedMesh() {
    if (
      !selected ||
      selected.type !==
        "mesh" ||
      selected.locked
    ) {
      return;
    }

    recordHistory();

    try {
      const repaired =
        repairEditableGeometry(
          selected.geometry
        );

      const dimensions =
        editableGeometryDimensions(
          repaired.geometry,
          SCENE_SCALE
        );

      setObjects(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selected.id
                ? {
                    ...item,
                    geometry:
                      repaired.geometry,
                    dimensions: {
                      ...dimensions,
                    },
                    baseDimensions: {
                      ...dimensions,
                    },
                    parameters: {
                      ...(item.parameters ||
                        {}),
                      meshEditable:
                        true,
                      lastRepair:
                        new Date()
                          .toISOString(),
                    },
                  }
                : item
          )
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        repaired.analysis
      );

      setOperationMessage(
        `Basic Repair complete · removed ${repaired.removedDegenerate} degenerate triangle${
          repaired.removedDegenerate === 1
            ? ""
            : "s"
        } and ${repaired.removedDuplicateFaces} duplicate face${
          repaired.removedDuplicateFaces === 1
            ? ""
            : "s"
        }. ${
          repaired.analysis.boundaryEdges > 0
            ? `${repaired.analysis.boundaryEdges} open boundary edges remain; V9 does not auto-fill arbitrary holes.`
            : repaired.analysis.nonManifoldEdges > 0
              ? `${repaired.analysis.nonManifoldEdges} non-manifold edges remain.`
              : "Mesh is closed."
        }`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator mesh repair error:",
        error
      );

      setOperationMessage(
        error?.message ||
          "Unable to repair this mesh."
      );
    }
  }

  async function handleCreatorImport(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    if (
      file.size >
      50 *
        1024 *
        1024
    ) {
      setImportMessage(
        "Maximum import size is 50 MB."
      );

      return;
    }

    if (
      objects.length >=
      MAX_OBJECTS
    ) {
      setImportMessage(
        `Creator supports up to ${MAX_OBJECTS} objects.`
      );

      return;
    }

    setImportingModel(
      true
    );

    setImportMessage(
      `Reading ${file.name}…`
    );

    try {
      const imported =
        await parseCreatorModelFile(
          file,
          SCENE_SCALE
        );

      const editable =
        prepareEditableGeometry(
          imported.geometry
        );

      imported.geometry.dispose();

      const tempMesh =
        new THREE.Mesh(
          editable,
          new THREE.MeshStandardMaterial({
            color:
              materialColor(
                "navy"
              ),
          })
        );

      tempMesh.updateMatrixWorld(
        true
      );

      const resultObject =
        makeBooleanObject(
          tempMesh,
          `IMPORT ${
            objects.filter(
              (item) =>
                item.source ===
                "import"
            ).length +
            1
          }`,
          "navy"
        );

      disposeMesh(
        tempMesh
      );

      const resultEditable =
        prepareEditableGeometry(
          resultObject.geometry
        );

      resultObject.geometry.dispose();

      const dimensions =
        editableGeometryDimensions(
          resultEditable,
          SCENE_SCALE
        );

      resultObject.geometry =
        resultEditable;

      resultObject.baseDimensions = {
        ...dimensions,
      };

      resultObject.dimensions = {
        ...dimensions,
      };

      resultObject.source =
        "import";

      resultObject.engine =
        imported.engine;

      resultObject.parameters = {
        meshEditable: true,
        importName:
          file.name,
        importFormat:
          imported.format,
        triangleCount:
          imported.triangleCount,
      };

      recordHistory();

      setObjects(
        (current) => [
          ...current,
          resultObject,
        ]
      );

      setSelectedIds([
        resultObject.id,
      ]);

      setPrimaryId(
        resultObject.id
      );

      setCreatorMode(
        "advanced"
      );

      setLibraryTab(
        "scene"
      );

      setInspectorTab(
        "edit"
      );

      setMeshEditMode(
        false
      );

      setMeshSelection(
        null
      );

      setMeshAnalysis(
        analyzeEditableGeometry(
          resultEditable
        )
      );

      setImportMessage(
        `${file.name} imported · ${imported.triangleCount.toLocaleString()} triangles · assumed ${imported.unitsLabel}.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator import error:",
        error
      );

      setImportMessage(
        error?.message ||
          "Unable to import this model."
      );
    } finally {
      setImportingModel(
        false
      );
    }
  }

  function handleCanvasMiss() {
    if (
      meshEditMode
    ) {
      setMeshSelection(
        null
      );

      return;
    }

    clearSelection();
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(
        document.fullscreenElement ===
          creatorSectionRef.current
      );
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  async function toggleCreatorFullscreen() {
    const target =
      creatorSectionRef.current;

    if (!target) {
      return;
    }

    try {
      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();

        return;
      }

      if (
        target.requestFullscreen
      ) {
        await target.requestFullscreen();
      } else {
        setOperationMessage(
          "Fullscreen is not supported by this browser."
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Creator fullscreen error:",
        error
      );

      setOperationMessage(
        "Unable to enter fullscreen mode."
      );
    }
  }

  function resetScene() {
    recordHistory();

    const first =
      makeObject(
        "cube",
        1,
        0
      );

    setObjects([
      first,
    ]);

    setSelectedIds([
      first.id,
    ]);

    setPrimaryId(
      first.id
    );

    setAutoRotate(
      false
    );

    setOperationMessage(
      ""
    );

    setExportMessage(
      ""
    );

    setMeshEditMode(
      false
    );

    setMeshSelection(
      null
    );

    setMeshAnalysis(
      null
    );

    setMeshSelectionMode(
      "face"
    );

    setImportMessage(
      ""
    );
  }

  function scrollToProject() {
    const projectSection =
      document.getElementById(
        "start"
      ) ||
      document.getElementById(
        "upload"
      );

    projectSection
      ?.scrollIntoView({
        behavior:
          "smooth",
        block:
          "start",
      });
  }

  function renderObjectRow(
    entry
  ) {
    const {
      item,
      index,
    } = entry;

    const active =
      selectedIds.includes(
        item.id
      );

    return (
      <div
        className={`creator-tree-row ${
          active
            ? "active"
            : ""
        } ${
          item.visible ===
          false
            ? "hidden-object"
            : ""
        } ${
          item.locked
            ? "locked-object"
            : ""
        }`}
        key={
          item.id
        }
      >
        <button
          type="button"
          className="creator-tree-main"
          onClick={(
            event
          ) =>
            handleSelect(
              item.id,
              Boolean(
                event.shiftKey ||
                  event.ctrlKey ||
                  event.metaKey
              )
            )
          }
        >
          <span className="creator-object-index">
            {
              String(
                index + 1
              ).padStart(
                2,
                "0"
              )
            }
          </span>

          <span className="creator-object-name">
            <strong>
              {
                item.name
              }
            </strong>

            <small>
              {
                item.type ===
                "text"
                  ? `"${
                      item.text
                    }"`
                  : item.type.toUpperCase()
              }
            </small>
          </span>

          <span
            className={
              item.role ===
              "hole"
                ? "creator-role-dot hole"
                : "creator-role-dot solid"
            }
          />
        </button>

        <button
          type="button"
          className="creator-tree-icon"
          onClick={() =>
            toggleObjectVisibility(
              item.id
            )
          }
          title={
            item.visible ===
            false
              ? "Show object"
              : "Hide object"
          }
        >
          {item.visible ===
          false ? (
            <EyeOff
              size={12}
              strokeWidth={1.5}
            />
          ) : (
            <Eye
              size={12}
              strokeWidth={1.5}
            />
          )}
        </button>

        <button
          type="button"
          className="creator-tree-icon"
          onClick={() =>
            toggleObjectLock(
              item.id
            )
          }
          title={
            item.locked
              ? "Unlock object"
              : "Lock object"
          }
        >
          {item.locked ? (
            <Lock
              size={12}
              strokeWidth={1.5}
            />
          ) : (
            <Unlock
              size={12}
              strokeWidth={1.5}
            />
          )}
        </button>
      </div>
    );
  }

  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        isTypingTarget(
          event.target
        )
      ) {
        return;
      }

      // Sketch owns its Pencil/keyboard interaction layer.
      // Avoid Studio shortcuts (Delete, Cmd+Z, etc.) firing behind it.
      if (
        creatorMode ===
        "sketch"
      ) {
        return;
      }

      const key =
        event.key
          .toLowerCase();

      const command =
        event.metaKey ||
        event.ctrlKey;

      if (
        command &&
        key === "z"
      ) {
        event.preventDefault();

        if (
          event.shiftKey
        ) {
          redoScene();
        } else {
          undoScene();
        }

        return;
      }

      if (
        command &&
        key === "d"
      ) {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (
        command &&
        key === "g"
      ) {
        event.preventDefault();

        if (
          event.shiftKey
        ) {
          ungroupSelected();
        } else {
          groupSelected();
        }

        return;
      }

      if (
        meshEditMode &&
        (
          key === "delete" ||
          key === "backspace"
        )
      ) {
        event.preventDefault();

        setMeshSelection(
          null
        );

        return;
      }

      if (
        key === "delete" ||
        key === "backspace"
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (
        creatorMode !==
        "advanced"
      ) {
        return;
      }

      if (
        key === "tab"
      ) {
        event.preventDefault();

        if (
          meshEditMode
        ) {
          exitMeshEditMode();
        } else {
          enterMeshEditMode();
        }

        return;
      }

      if (
        meshEditMode &&
        key === "h"
      ) {
        event.preventDefault();
        selectBoundaryEdges();
        return;
      }

      if (
        meshEditMode &&
        key === "k"
      ) {
        event.preventDefault();
        selectEdgeChain();
        return;
      }

      if (
        meshEditMode &&
        key === "b"
      ) {
        event.preventDefault();
        toggleBoxSelect();
        return;
      }

      if (
        meshEditMode &&
        key === "l"
      ) {
        event.preventDefault();
        selectConnectedMeshElements();
        return;
      }

      if (
        meshEditMode &&
        key === "["
      ) {
        event.preventDefault();
        shrinkMeshSelection();
        return;
      }

      if (
        meshEditMode &&
        key === "a"
      ) {
        event.preventDefault();
        selectAllMeshElements();
        return;
      }

      if (
        meshEditMode &&
        key === "]"
      ) {
        event.preventDefault();
        growMeshSelection();
        return;
      }

      if (
        meshEditMode &&
        [
          "v",
          "e",
          "f",
        ].includes(
          key
        )
      ) {
        changeMeshSelectionMode(
          key === "v"
            ? "vertex"
            : key === "e"
              ? "edge"
              : "face"
        );

        return;
      }

      if (
        !meshEditMode &&
        key === "g"
      ) {
        setTransformMode(
          "translate"
        );
        return;
      }

      if (
        !meshEditMode &&
        key === "r"
      ) {
        setTransformMode(
          "rotate"
        );
        return;
      }

      if (
        !meshEditMode &&
        key === "s"
      ) {
        setTransformMode(
          "scale"
        );
        return;
      }

      if (
        key === "escape"
      ) {
        if (
          boxSelectActive
        ) {
          setBoxSelectActive(
            false
          );

          setBoxDrag(
            null
          );

          return;
        }

        if (
          meshEditMode
        ) {
          setMeshSelection(
            null
          );
        } else {
          setTransformMode(
            "select"
          );
        }

        return;
      }

      if (
        key === "1"
      ) {
        setCameraView(
          "front"
        );
        return;
      }

      if (
        key === "3"
      ) {
        setCameraView(
          "right"
        );
        return;
      }

      if (
        key === "7"
      ) {
        setCameraView(
          "top"
        );
        return;
      }

      if (
        key === "5"
      ) {
        setCameraView(
          "perspective"
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    creatorMode,
    historyVersion,
    objects,
    primaryId,
    selectedIds,
    meshEditMode,
    meshSelectionMode,
    boxSelectActive,
  ]);

  return (
    <section
      ref={
        creatorSectionRef
      }
      className={
        isFullscreen
          ? "beyond-creator creator-fullscreen-active"
          : "beyond-creator"
      }
      id="creator"
    >
      <div className="creator-side-label">
        CREATE
      </div>

      <div className="creator-heading">
        <div>
          <div className="creator-index">
            03 / BEYOND CREATOR
          </div>

          <h2>
            Build it
            <br />

            <span>
              directly in 3D.
            </span>
          </h2>
        </div>

        <p>
          Use Studio for precision solid
          and mesh modeling, Sketch for a
          Pencil-first CAD workflow, or
          Architect for printable scale
          models, plans and buildings.
        </p>
      </div>

      <div className="creator-mode-row">
        <div className="creator-mode-switch creator-mode-switch-v11">
          <button
            type="button"
            className={
              creatorMode ===
              "advanced"
                ? "active"
                : ""
            }
            onClick={() => {
              setArchitectureDrawTool(
                null
              );

              setArchitectureWallStart(
                null
              );

              setArchitecturePointer(
                null
              );

              setArchitectureView(
                "3d"
              );

              setCameraView(
                "perspective"
              );

              setCreatorMode(
                "advanced"
              );
            }}
          >
            STUDIO
          </button>

          <button
            type="button"
            className={
              creatorMode ===
              "sketch"
                ? "active"
                : ""
            }
            onClick={() => {
              const onlyStarterCube =
                objects.length ===
                  1 &&
                objects[0].id ===
                  initial.id &&
                objects[0].type ===
                  "cube";

              if (onlyStarterCube) {
                setObjects([]);
                setSelectedIds([]);
                setPrimaryId(null);
              }

              setArchitectureDrawTool(
                null
              );

              setArchitectureWallStart(
                null
              );

              setArchitecturePointer(
                null
              );

              setTransformMode(
                "select"
              );

              setCreatorMode(
                "sketch"
              );

              setOperationMessage(
                "Sketch workspace ready. Apple Pencil draws; touch navigates."
              );
            }}
          >
            SKETCH
          </button>

          <button
            type="button"
            className={
              creatorMode ===
              "architecture"
                ? "active"
                : ""
            }
            onClick={() => {
              const onlyStarterCube =
                objects.length ===
                  1 &&
                objects[0].id ===
                  initial.id &&
                objects[0].type ===
                  "cube";

              if (onlyStarterCube) {
                setObjects([]);
                setSelectedIds([]);
                setPrimaryId(null);

                setOperationMessage(
                  "Architect workspace ready. Draw a wall or add an architectural object."
                );
              }

              setArchitectureDrawTool(
                null
              );

              setArchitectureWallStart(
                null
              );

              setArchitecturePointer(
                null
              );

              setArchitectureView(
                "3d"
              );

              setCameraView(
                "perspective"
              );

              setCreatorMode(
                "architecture"
              );

              setLibraryTab(
                "create"
              );

              setInspectorTab(
                "object"
              );
            }}
          >
            ARCHITECT
          </button>
        </div>

        <span>
          {creatorMode ===
          "advanced"
            ? "SOLIDS · BOOLEAN · REVOLVE · MIRROR · ARRAY · SHELL · FILLET · PRECISION MESH EDIT"
            : creatorMode ===
                "sketch"
              ? "APPLE PENCIL · LINE · RECTANGLE · CIRCLE · ARC · SPLINE · CONSTRAINTS · DIMENSIONS · EXTRUDE"
              : `PLAN · 3D · ELEVATIONS · WALLS · OPENINGS · LEVELS · SCALE 1:${architectureScale}`}
        </span>
      </div>

      {creatorMode ===
        "architecture" && (
        <div className="creator-architecture-strip">
          <div className="creator-architecture-strip-group">
            <span>
              VIEW
            </span>

            <button
              type="button"
              className={
                architectureView ===
                "plan"
                  ? "active"
                  : ""
              }
              onClick={() =>
                architectureSetView(
                  "plan"
                )
              }
            >
              PLAN
            </button>

            <button
              type="button"
              className={
                architectureView ===
                "3d"
                  ? "active"
                  : ""
              }
              onClick={() =>
                architectureSetView(
                  "3d"
                )
              }
            >
              3D
            </button>

            <button
              type="button"
              className={
                architectureView ===
                "front"
                  ? "active"
                  : ""
              }
              onClick={() =>
                architectureSetView(
                  "front"
                )
              }
            >
              FRONT
            </button>

            <button
              type="button"
              className={
                architectureView ===
                "right"
                  ? "active"
                  : ""
              }
              onClick={() =>
                architectureSetView(
                  "right"
                )
              }
            >
              RIGHT
            </button>
          </div>

          <div className="creator-architecture-explode-control">
            <span>
              LEVELS
            </span>

            <button
              type="button"
              className={
                architectureExplodedLevels
                  ? "active"
                  : ""
              }
              disabled={
                architectureView !==
                "3d"
              }
              onClick={() =>
                setArchitectureExplodedLevels(
                  (value) =>
                    !value
                )
              }
            >
              {architectureExplodedLevels
                ? "EXPLODED"
                : "STACKED"}
            </button>
          </div>

          <label className="creator-architecture-strip-field">
            <span>
              UNITS
            </span>

            <select
              value={
                architectureUnit
              }
              onChange={(
                event
              ) =>
                setArchitectureUnit(
                  event.target
                    .value
                )
              }
            >
              <option value="mm">
                MM
              </option>

              <option value="cm">
                CM
              </option>

              <option value="m">
                M
              </option>
            </select>
          </label>

          <label className="creator-architecture-strip-field">
            <span>
              MODEL SCALE
            </span>

            <select
              value={
                architectureScale
              }
              onChange={(
                event
              ) =>
                changeArchitectureScale(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              {ARCH_SCALE_OPTIONS.map(
                (scale) => (
                  <option
                    key={
                      scale
                    }
                    value={
                      scale
                    }
                  >
                    1:{
                      scale
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label className="creator-architecture-strip-field">
            <span>
              GRID
            </span>

            <select
              value={
                architectureGridMm
              }
              onChange={(
                event
              ) =>
                setArchitectureGridMm(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value="100">
                100 MM
              </option>

              <option value="500">
                500 MM
              </option>

              <option value="1000">
                1 M
              </option>

              <option value="5000">
                5 M
              </option>
            </select>
          </label>

          <label className="creator-architecture-strip-field">
            <span>
              SNAP
            </span>

            <select
              value={
                architectureSnapMm
              }
              onChange={(
                event
              ) =>
                setArchitectureSnapMm(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value="10">
                10 MM
              </option>

              <option value="50">
                50 MM
              </option>

              <option value="100">
                100 MM
              </option>

              <option value="500">
                500 MM
              </option>
            </select>
          </label>

          <div className="creator-architecture-annotation-control">
            <span>
              ANNOTATIONS
            </span>

            <button
              type="button"
              className={
                architecturePlanAnnotations
                  ? "active"
                  : ""
              }
              disabled={
                architectureView !==
                "plan"
              }
              onClick={() =>
                setArchitecturePlanAnnotations(
                  (value) =>
                    !value
                )
              }
            >
              {architecturePlanAnnotations
                ? "ON"
                : "OFF"}
            </button>
          </div>

          <div className="creator-architecture-scale-readout">
            <span>
              PRINT FOOTPRINT
            </span>

            <strong>
              {architectureCheck
                .objectCount
                ? `${architectureCheck.width.toFixed(
                    1
                  )} × ${architectureCheck.depth.toFixed(
                    1
                  )} MM`
                : "NO ARCH MODEL"}
            </strong>
          </div>
        </div>
      )}

      <SketchWorkspace
        active={
          creatorMode ===
          "sketch"
        }
        engineStatus={
          manifoldStatus
        }
        onCreateSolid={
          createSketchWorkspaceSolid
        }
        onSwitchToStudio={
          switchSketchToStudio
        }
        objectCount={
          objects.length
        }
        maxObjects={
          MAX_OBJECTS
        }
      />

      <div
        className="creator-shell creator-shell-v2 creator-shell-v3 creator-shell-v5"
        style={{
          display:
            creatorMode ===
            "sketch"
              ? "none"
              : undefined,
        }}
      >
        <aside
          className={`creator-library creator-library-tab-${libraryTab}`}
        >
          <div className="creator-compact-tabs creator-library-tabs">
            <button
              type="button"
              className={
                libraryTab ===
                "create"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLibraryTab(
                  "create"
                )
              }
            >
              CREATE
            </button>

            <button
              type="button"
              className={
                libraryTab ===
                "scene"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLibraryTab(
                  "scene"
                )
              }
            >
              SCENE
            </button>

            <button
              type="button"
              className={
                libraryTab ===
                "boolean"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setLibraryTab(
                  "boolean"
                )
              }
            >
              BOOLEAN
            </button>
          </div>

          <div className="creator-panel-heading creator-library-create">
            <span>
              01
            </span>

            <strong>
              ADD OBJECT
            </strong>
          </div>

          {creatorMode !==
            "architecture" && (
            <>
          <div className="creator-add-grid creator-library-create">
            <button
              type="button"
              onClick={() =>
                addObject(
                  "cube"
                )
              }
            >
              <Box
                size={20}
                strokeWidth={
                  1.35
                }
              />

              <span>
                Cube
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                addObject(
                  "cylinder"
                )
              }
            >
              <Cylinder
                size={20}
                strokeWidth={
                  1.35
                }
              />

              <span>
                Cylinder
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                addObject(
                  "sphere"
                )
              }
            >
              <Circle
                size={20}
                strokeWidth={
                  1.35
                }
              />

              <span>
                Sphere
              </span>
            </button>

            <button
              type="button"
              className="creator-add-text"
              onClick={() =>
                addObject(
                  "text"
                )
              }
            >
              <Type
                size={20}
                strokeWidth={
                  1.35
                }
              />

              <span>
                3D Text
              </span>
            </button>
          </div>
            </>
          )}


          {creatorMode ===
            "architecture" && (
            <div className="creator-architecture-library creator-library-create">
              <div className="creator-architecture-library-title">
                <span>
                  ARCHITECT V11
                </span>

                <strong>
                  {
                    architectureActiveLevel
                      ?.name ||
                    "GROUND"
                  }
                </strong>
              </div>

              <button
                type="button"
                className={
                  architectureDrawTool ===
                  "wall"
                    ? "creator-architecture-wall-draw active"
                    : "creator-architecture-wall-draw"
                }
                onClick={
                  toggleArchitectureWallTool
                }
              >
                <b>
                  ╱
                </b>

                <span>
                  <strong>
                    DRAW WALL
                  </strong>

                  <small>
                    Two clicks in PLAN view
                  </small>
                </span>

                <i>
                  {architectureDrawTool ===
                  "wall"
                    ? "ON"
                    : "W"}
                </i>
              </button>

              <button
                type="button"
                className={
                  architectureDrawTool ===
                  "room"
                    ? "creator-architecture-room-draw active"
                    : "creator-architecture-room-draw"
                }
                onClick={
                  toggleArchitectureRoomTool
                }
              >
                <b>
                  □
                </b>

                <span>
                  <strong>
                    DRAW ROOM
                  </strong>

                  <small>
                    Rectangle · walls + floor
                  </small>
                </span>

                <i>
                  {architectureDrawTool ===
                  "room"
                    ? "ON"
                    : "R"}
                </i>
              </button>

              <div className="creator-architecture-plan-tools">
                <button
                  type="button"
                  className={
                    architectureDrawTool ===
                    "measure"
                      ? "active"
                      : ""
                  }
                  disabled={
                    architectureView !==
                    "plan"
                  }
                  onClick={
                    toggleArchitectureMeasureTool
                  }
                >
                  MEASURE
                </button>

                <button
                  type="button"
                  disabled={
                    architectureMeasurements.length ===
                    0
                  }
                  onClick={
                    clearArchitectureMeasurements
                  }
                >
                  CLEAR DIMS
                </button>
              </div>

              <div className="creator-architecture-wall-settings">
                <label>
                  <span>
                    WALL
                  </span>

                  <input
                    type="number"
                    min="50"
                    max="2000"
                    step="10"
                    value={
                      architectureWallThicknessMm
                    }
                    onChange={(
                      event
                    ) =>
                      setArchitectureWallThicknessMm(
                        clamp(
                          event.target
                            .value,
                          50,
                          2000
                        )
                      )
                    }
                  />

                  <small>
                    MM
                  </small>
                </label>

                <label>
                  <span>
                    HEIGHT
                  </span>

                  <input
                    type="number"
                    min="500"
                    max="20000"
                    step="100"
                    value={
                      architectureWallHeightMm
                    }
                    onChange={(
                      event
                    ) =>
                      setArchitectureWallHeightMm(
                        clamp(
                          event.target
                            .value,
                          500,
                          20000
                        )
                      )
                    }
                  />

                  <small>
                    MM
                  </small>
                </label>
              </div>

              <details className="creator-architecture-wall-draw-settings">
                <summary>
                  <span>
                    WALL DRAW SETTINGS
                  </span>

                  <b>
                    ▾
                  </b>
                </summary>

                <div className="creator-architecture-wall-draw-settings-body">
                  <label>
                    <span>
                      SMART SNAP
                    </span>

                    <button
                      type="button"
                      className={
                        architectureSmartWallSnap
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setArchitectureSmartWallSnap(
                          (value) =>
                            !value
                        )
                      }
                    >
                      {architectureSmartWallSnap
                        ? "ON"
                        : "OFF"}
                    </button>
                  </label>

                  <label>
                    <span>
                      CHAIN
                    </span>

                    <button
                      type="button"
                      className={
                        architectureWallChain
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setArchitectureWallChain(
                          (value) =>
                            !value
                        )
                      }
                    >
                      {architectureWallChain
                        ? "ON"
                        : "OFF"}
                    </button>
                  </label>

                  <label>
                    <span>
                      ANGLE
                    </span>

                    <select
                      value={
                        architectureAngleSnapDeg
                      }
                      onChange={(
                        event
                      ) =>
                        setArchitectureAngleSnapDeg(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                    >
                      <option value="0">
                        FREE
                      </option>

                      <option value="15">
                        15°
                      </option>

                      <option value="30">
                        30°
                      </option>

                      <option value="45">
                        45°
                      </option>

                      <option value="90">
                        90°
                      </option>
                    </select>
                  </label>
                </div>
              </details>

              <div className="creator-architecture-room-settings">
                <label>
                  <span>
                    FLOOR
                  </span>

                  <button
                    type="button"
                    className={
                      architectureRoomFloor
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setArchitectureRoomFloor(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {architectureRoomFloor
                      ? "ON"
                      : "OFF"}
                  </button>
                </label>

                <label>
                  <span>
                    SLAB
                  </span>

                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="10"
                    value={
                      architectureFloorThicknessMm
                    }
                    onChange={(
                      event
                    ) =>
                      setArchitectureFloorThicknessMm(
                        clamp(
                          event.target
                            .value,
                          50,
                          1000
                        )
                      )
                    }
                  />

                  <small>
                    MM
                  </small>
                </label>
              </div>

              <div className="creator-architecture-primitive-grid">
                <button
                  type="button"
                  onClick={() =>
                    addArchitecturePrimitive(
                      "wall"
                    )
                  }
                >
                  <b>▯</b>
                  <span>Wall</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addArchitecturePrimitive(
                      "floor"
                    )
                  }
                >
                  <b>▰</b>
                  <span>Floor</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addArchitecturePrimitive(
                      "column"
                    )
                  }
                >
                  <b>▥</b>
                  <span>Column</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addArchitecturePrimitive(
                      "beam"
                    )
                  }
                >
                  <b>━</b>
                  <span>Beam</span>
                </button>

                <button
                  type="button"
                  onClick={
                    addArchitectureStairs
                  }
                >
                  <b>▟</b>
                  <span>Stairs</span>
                </button>

                <button
                  type="button"
                  onClick={
                    addArchitectureFlatRoof
                  }
                >
                  <b>⌂</b>
                  <span>Flat Roof</span>
                </button>

                <button
                  type="button"
                  onClick={
                    addArchitectureGableRoof
                  }
                >
                  <b>△</b>
                  <span>Gable Roof</span>
                </button>
              </div>

              <div className="creator-architecture-openings">
                <button
                  type="button"
                  onClick={() =>
                    addArchitectureOpening(
                      "door"
                    )
                  }
                >
                  <b>⌑</b>

                  <span>
                    <strong>
                      DOOR
                    </strong>

                    <small>
                      900 × 2100
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addArchitectureOpening(
                      "window"
                    )
                  }
                >
                  <b>▣</b>

                  <span>
                    <strong>
                      WINDOW
                    </strong>

                    <small>
                      1200 × 1200
                    </small>
                  </span>
                </button>
              </div>

              <small className="creator-field-note">
                Select a WALL before adding a door or window. Smart openings attach to the selected wall.
              </small>

              <button
                type="button"
                className="creator-architecture-join-walls"
                onClick={
                  joinSelectedArchitectureWalls
                }
                disabled={
                  !canJoinArchitectureWalls
                }
              >
                JOIN 2 WALLS · CLEAN CORNER
              </button>

              <details className="creator-architecture-component-settings">
                <summary>
                  <span>
                    COMPONENT SETTINGS
                  </span>

                  <b>
                    ▾
                  </b>
                </summary>

                <div className="creator-architecture-component-body">
                  <div className="creator-architecture-component-title">
                    STAIRS
                  </div>

                  <div className="creator-architecture-component-grid">
                    <label>
                      <span>
                        WIDTH
                      </span>

                      <input
                        type="number"
                        min="500"
                        max="5000"
                        step="50"
                        value={
                          architectureStairWidthMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureStairWidthMm(
                            clamp(
                              event.target
                                .value,
                              500,
                              5000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        RUN
                      </span>

                      <input
                        type="number"
                        min="1000"
                        max="20000"
                        step="100"
                        value={
                          architectureStairRunMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureStairRunMm(
                            clamp(
                              event.target
                                .value,
                              1000,
                              20000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        RISE
                      </span>

                      <input
                        type="number"
                        min="500"
                        max="10000"
                        step="100"
                        value={
                          architectureStairRiseMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureStairRiseMm(
                            clamp(
                              event.target
                                .value,
                              500,
                              10000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        STEPS
                      </span>

                      <input
                        type="number"
                        min="3"
                        max="24"
                        step="1"
                        value={
                          architectureStairSteps
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureStairSteps(
                            Math.round(
                              clamp(
                                event.target
                                  .value,
                                3,
                                24
                              )
                            )
                          )
                        }
                      />

                      <small>
                        #
                      </small>
                    </label>

                    <label>
                      <span>
                        DIR
                      </span>

                      <select
                        value={
                          architectureStairDirectionDeg
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureStairDirectionDeg(
                            Number(
                              event.target
                                .value
                            )
                          )
                        }
                      >
                        <option value="0">
                          NORTH
                        </option>

                        <option value="90">
                          EAST
                        </option>

                        <option value="180">
                          SOUTH
                        </option>

                        <option value="270">
                          WEST
                        </option>
                      </select>

                      <small>
                        ↗
                      </small>
                    </label>
                  </div>

                  <div className="creator-architecture-component-title creator-architecture-roof-title">
                    ROOF
                  </div>

                  <div className="creator-architecture-component-grid">
                    <label>
                      <span>
                        WIDTH
                      </span>

                      <input
                        type="number"
                        min="1000"
                        max="50000"
                        step="100"
                        value={
                          architectureRoofWidthMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofWidthMm(
                            clamp(
                              event.target
                                .value,
                              1000,
                              50000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        DEPTH
                      </span>

                      <input
                        type="number"
                        min="1000"
                        max="50000"
                        step="100"
                        value={
                          architectureRoofDepthMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofDepthMm(
                            clamp(
                              event.target
                                .value,
                              1000,
                              50000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        THICK
                      </span>

                      <input
                        type="number"
                        min="50"
                        max="1000"
                        step="10"
                        value={
                          architectureRoofThicknessMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofThicknessMm(
                            clamp(
                              event.target
                                .value,
                              50,
                              1000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        OVER
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="3000"
                        step="50"
                        value={
                          architectureRoofOverhangMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofOverhangMm(
                            clamp(
                              event.target
                                .value,
                              0,
                              3000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <label>
                      <span>
                        PITCH
                      </span>

                      <input
                        type="number"
                        min="5"
                        max="60"
                        step="1"
                        value={
                          architectureRoofPitchDeg
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofPitchDeg(
                            clamp(
                              event.target
                                .value,
                              5,
                              60
                            )
                          )
                        }
                      />

                      <small>
                        °
                      </small>
                    </label>

                    <label>
                      <span>
                        RIDGE
                      </span>

                      <select
                        value={
                          architectureRoofRidgeDirection
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureRoofRidgeDirection(
                            event.target
                              .value
                          )
                        }
                      >
                        <option value="z">
                          N–S
                        </option>

                        <option value="x">
                          E–W
                        </option>
                      </select>

                      <small>
                        AXIS
                      </small>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="creator-architecture-fit-roof"
                    onClick={
                      fitArchitectureRoofToModel
                    }
                  >
                    FIT ROOF TO SELECTION / LEVEL
                  </button>

                  <div className="creator-architecture-component-title creator-architecture-roof-title">
                    3D PRESENTATION
                  </div>

                  <div className="creator-architecture-component-grid">
                    <label>
                      <span>
                        GAP
                      </span>

                      <input
                        type="number"
                        min="200"
                        max="10000"
                        step="100"
                        value={
                          architectureExplodeGapMm
                        }
                        onChange={(
                          event
                        ) =>
                          setArchitectureExplodeGapMm(
                            clamp(
                              event.target
                                .value,
                              200,
                              10000
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>
                  </div>
                </div>
              </details>

              <div className="creator-architecture-levels">
                <div className="creator-architecture-section-head">
                  <span>
                    LEVELS
                  </span>

                  <button
                    type="button"
                    onClick={
                      addArchitectureLevel
                    }
                  >
                    + LEVEL
                  </button>
                </div>

                <button
                  type="button"
                  className="creator-architecture-duplicate-level"
                  onClick={
                    duplicateArchitectureActiveLevel
                  }
                >
                  DUPLICATE ACTIVE LEVEL
                </button>

                <div className="creator-architecture-level-tools">
                  <button
                    type="button"
                    onClick={() =>
                      isolateArchitectureLevel(
                        architectureActiveLevelId
                      )
                    }
                  >
                    ISOLATE
                  </button>

                  <button
                    type="button"
                    onClick={
                      showAllArchitectureLevels
                    }
                  >
                    SHOW ALL
                  </button>
                </div>

                <div className="creator-architecture-level-list creator-architecture-level-list-v2">
                  {architectureLevels.map(
                    (level) => (
                      <div
                        key={
                          level.id
                        }
                        className={
                          architectureActiveLevelId ===
                          level.id
                            ? "creator-architecture-level-row active"
                            : "creator-architecture-level-row"
                        }
                      >
                        <button
                          type="button"
                          className="creator-architecture-level-select"
                          onClick={() =>
                            setArchitectureActiveLevelId(
                              level.id
                            )
                          }
                        >
                          <span>
                            {
                              level.name ||
                              "LEVEL"
                            }
                          </span>
                        </button>

                        <input
                          className="creator-architecture-level-elevation"
                          type="number"
                          step="100"
                          value={
                            level.elevation
                          }
                          onChange={(
                            event
                          ) =>
                            updateArchitectureLevelElevation(
                              level.id,
                              event.target
                                .value
                            )
                          }
                          title="Elevation mm"
                        />

                        <button
                          type="button"
                          className={
                            level.visible ===
                            false
                              ? "creator-architecture-level-eye hidden"
                              : "creator-architecture-level-eye"
                          }
                          onClick={() =>
                            setArchitectureLevelVisibility(
                              level.id,
                              level.visible ===
                                false
                            )
                          }
                          title={
                            level.visible ===
                            false
                              ? "Show level"
                              : "Hide level"
                          }
                        >
                          {level.visible ===
                          false
                            ? "○"
                            : "●"}
                        </button>
                      </div>
                    )
                  )}
                </div>

                {architectureActiveLevel && (
                  <label className="creator-architecture-level-name-editor">
                    <span>
                      ACTIVE LEVEL NAME
                    </span>

                    <input
                      type="text"
                      value={
                        architectureActiveLevel
                          .name
                      }
                      onChange={(
                        event
                      ) =>
                        updateArchitectureLevelName(
                          architectureActiveLevel
                            .id,
                          event.target
                            .value
                        )
                      }
                    />
                  </label>
                )}
              </div>

              <details className="creator-architecture-room-schedule">
                <summary>
                  <span>
                    ROOMS
                  </span>

                  <strong>
                    {
                      architectureRooms.length
                    }
                  </strong>

                  <b>
                    ▾
                  </b>
                </summary>

                <div className="creator-architecture-room-schedule-body">
                  {architectureRooms.length ===
                  0 ? (
                    <small>
                      Draw a room to build the room schedule.
                    </small>
                  ) : (
                    architectureRooms.map(
                      (room) => (
                        <div
                          className="creator-architecture-room-schedule-row"
                          key={
                            room.id
                          }
                        >
                          <input
                            type="text"
                            value={
                              room.name
                            }
                            onChange={(
                              event
                            ) =>
                              updateArchitectureRoomName(
                                room.id,
                                event.target
                                  .value
                              )
                            }
                          />

                          <span>
                            {room.areaM2.toFixed(
                              2
                            )} M²
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              selectArchitectureRoom(
                                room.id
                              )
                            }
                          >
                            SELECT
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
              </details>

            </div>
          )}

          {creatorMode ===
            "advanced" && (
            <div className="creator-v6-add-tools creator-library-create">
              <div className="creator-v6-add-label">
                STUDIO SOLIDS

                <span
                  className={`creator-manifold-state ${manifoldStatus}`}
                >
                  {manifoldStatus ===
                  "ready"
                    ? "MANIFOLD READY"
                    : manifoldStatus ===
                        "loading"
                      ? "LOADING WASM"
                      : manifoldStatus ===
                          "fallback"
                        ? "FALLBACK READY"
                        : "ENGINE IDLE"}
                </span>
              </div>

              <div className="creator-v6-primitive-grid">
                <button
                  type="button"
                  onClick={() =>
                    addObject(
                      "cone"
                    )
                  }
                >
                  <b>△</b>
                  <span>Cone</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addObject(
                      "torus"
                    )
                  }
                >
                  <b>◎</b>
                  <span>Torus</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addObject(
                      "tube"
                    )
                  }
                >
                  <b>◉</b>
                  <span>Tube</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addObject(
                      "roundedBox"
                    )
                  }
                >
                  <b>▣</b>
                  <span>Round Box</span>
                </button>
              </div>

              <button
                type="button"
                className="creator-sketch-launch"
                onClick={() =>
                  setSketchOpen(
                    true
                  )
                }
              >
                <span className="creator-sketch-launch-icon">
                  ✎
                </span>

                <span>
                  <strong>
                    QUICK EXTRUDE
                  </strong>

                  <small>
                    Draw a quick polygon profile and turn it into a solid
                  </small>
                </span>

                <i>↗</i>
              </button>

              <button
                type="button"
                className="creator-sketch-launch creator-revolve-launch"
                onClick={() =>
                  setRevolveOpen(
                    true
                  )
                }
              >
                <span className="creator-sketch-launch-icon">
                  ◒
                </span>

                <span>
                  <strong>
                    REVOLVE PROFILE
                  </strong>

                  <small>
                    Draw a side profile and spin it into a vase, knob, chess piece or custom solid
                  </small>
                </span>

                <i>↗</i>
              </button>
              <label className="creator-import-launch">
                <Upload
                  size={18}
                  strokeWidth={1.45}
                />

                <span>
                  <strong>
                    IMPORT MODEL
                  </strong>

                  <small>
                    STL · 3MF · OBJ
                  </small>
                </span>

                <i>
                  {importingModel
                    ? "…"
                    : "+"}
                </i>

                <input
                  type="file"
                  accept=".stl,.3mf,.obj,model/stl,model/3mf,text/plain"
                  hidden
                  disabled={
                    importingModel
                  }
                  onChange={
                    handleCreatorImport
                  }
                />
              </label>

              {importMessage && (
                <div className="creator-import-message">
                  {
                    importMessage
                  }
                </div>
              )}

              
            </div>
          )}

          <div className="creator-object-limit creator-library-create">
            <Plus
              size={13}
              strokeWidth={
                1.5
              }
            />

            {
              objects.length
            } / {
              MAX_OBJECTS
            } OBJECTS
          </div>

          <div className="creator-divider creator-library-divider" />

          <div className="creator-panel-heading creator-library-scene">
            <span>
              02
            </span>

            <strong>
              SCENE OBJECTS
            </strong>
          </div>

          <div className="creator-multi-select-note creator-library-scene">
            CTRL / CMD / SHIFT +
            CLICK TO MULTI-SELECT
          </div>

          <div className="creator-scene-tree creator-library-scene">
            {sceneStructure.groups.map(
              (group) => {
                const allVisible =
                  group.items.every(
                    ({
                      item,
                    }) =>
                      item.visible !==
                      false
                  );

                const allLocked =
                  group.items.every(
                    ({
                      item,
                    }) =>
                      item.locked
                  );

                return (
                  <div
                    className="creator-group-block"
                    key={
                      group.id
                    }
                  >
                    <div className="creator-group-header">
                      <button
                        type="button"
                        className="creator-group-select"
                        onClick={() =>
                          selectGroup(
                            group.id
                          )
                        }
                      >
                        <span>
                          ▾
                        </span>

                        <strong>
                          {
                            group.name
                          }
                        </strong>

                        <small>
                          {
                            group.items.length
                          }
                        </small>
                      </button>

                      <button
                        type="button"
                        className="creator-tree-icon"
                        onClick={() =>
                          toggleGroupVisibility(
                            group.id
                          )
                        }
                        title={
                          allVisible
                            ? "Hide group"
                            : "Show group"
                        }
                      >
                        {allVisible ? (
                          <Eye
                            size={12}
                            strokeWidth={1.5}
                          />
                        ) : (
                          <EyeOff
                            size={12}
                            strokeWidth={1.5}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        className="creator-tree-icon"
                        onClick={() =>
                          toggleGroupLock(
                            group.id
                          )
                        }
                        title={
                          allLocked
                            ? "Unlock group"
                            : "Lock group"
                        }
                      >
                        {allLocked ? (
                          <Lock
                            size={12}
                            strokeWidth={1.5}
                          />
                        ) : (
                          <Unlock
                            size={12}
                            strokeWidth={1.5}
                          />
                        )}
                      </button>
                    </div>

                    <div className="creator-group-children">
                      {group.items.map(
                        renderObjectRow
                      )}
                    </div>
                  </div>
                );
              }
            )}

            {sceneStructure.ungrouped.map(
              renderObjectRow
            )}
          </div>

          <div className="creator-object-actions creator-library-scene">
            <button
              type="button"
              onClick={
                duplicateSelected
              }
              disabled={
                !selected ||
                selected.locked ||
                objects.length >=
                  MAX_OBJECTS
              }
            >
              <Copy
                size={14}
                strokeWidth={
                  1.4
                }
              />

              Duplicate
            </button>

            <button
              type="button"
              className="danger"
              onClick={
                deleteSelected
              }
              disabled={
                selectedIds.length ===
                  0 ||
                selectedObjects.every(
                  (item) =>
                    item.locked
                )
              }
            >
              <Trash2
                size={14}
                strokeWidth={
                  1.4
                }
              />

              Delete
            </button>
          </div>

          {creatorMode !==
            "simple" && (
            <div className="creator-group-actions creator-library-scene">
              <button
                type="button"
                onClick={
                  groupSelected
                }
                disabled={
                  selectedIds.length <
                  2
                }
              >
                Group Selected
              </button>

              <button
                type="button"
                onClick={
                  ungroupSelected
                }
                disabled={
                  !selectedObjects.some(
                    (item) =>
                      item.groupId
                  )
                }
              >
                Ungroup
              </button>
            </div>
          )}

          <div className="creator-boolean-panel creator-library-boolean">
            <div className="creator-panel-heading">
              <span>
                03
              </span>

              <strong>
                BOOLEAN TOOLS
              </strong>
            </div>

            <button
              type="button"
              className="creator-boolean-button"
              disabled={
                !canCombine
              }
              onClick={
                combineSelected
              }
            >
              <span>
                ∪
              </span>

              <strong>
                COMBINE
              </strong>

              <small>
                {
                  selectedSolids.length
                } solids
              </small>
            </button>

            <button
              type="button"
              className="creator-boolean-button cut"
              disabled={
                !canCut
              }
              onClick={
                cutSelected
              }
            >
              <span>
                −
              </span>

              <strong>
                CUT / HOLE
              </strong>

              <small>
                {
                  selectedHoles.length
                } holes
              </small>
            </button>

            {operationMessage && (
              <div className="creator-operation-message">
                {
                  operationMessage
                }
              </div>
            )}
          </div>
        </aside>

        <div className="creator-viewport">
          <div className="creator-viewport-top">
            <div>
              <span className="creator-live-dot" />

              LIVE 3D WORKSPACE
            </div>

            <div className="creator-viewport-controls">
              <span>
                {
                  selectedIds.length
                } SELECTED
              </span>

              <button
                type="button"
                className={
                  isFullscreen
                    ? "creator-icon-button creator-fullscreen-button active"
                    : "creator-icon-button creator-fullscreen-button"
                }
                onClick={
                  toggleCreatorFullscreen
                }
                title={
                  isFullscreen
                    ? "Exit fullscreen · Esc"
                    : "Fullscreen workspace"
                }
              >
                {isFullscreen ? (
                  <Minimize2
                    size={15}
                    strokeWidth={
                      1.45
                    }
                  />
                ) : (
                  <Maximize2
                    size={15}
                    strokeWidth={
                      1.45
                    }
                  />
                )}

                {isFullscreen
                  ? "EXIT"
                  : "FULL"}
              </button>

              {creatorMode ===
                "simple" && (
                <button
                  type="button"
                  className={
                    autoRotate
                      ? "creator-icon-button active"
                      : "creator-icon-button"
                  }
                  onClick={() =>
                    setAutoRotate(
                      (value) =>
                        !value
                    )
                  }
                >
                  <Rotate3D
                    size={15}
                    strokeWidth={
                      1.45
                    }
                  />

                  AUTO
                </button>
              )}
            </div>
          </div>

          {creatorMode !==
            "simple" && (
            <div
              className={
                meshEditMode
                  ? "creator-advanced-toolbar creator-edit-mode-active"
                  : creatorMode ===
                      "architecture"
                    ? "creator-advanced-toolbar creator-architecture-toolbar"
                    : "creator-advanced-toolbar"
              }
            >
              <div className="creator-tool-cluster creator-object-tools">
                {[
                  [
                    "select",
                    "SELECT",
                    "ESC",
                  ],
                  [
                    "translate",
                    "MOVE",
                    "G",
                  ],
                  [
                    "rotate",
                    "ROTATE",
                    "R",
                  ],
                  [
                    "scale",
                    "SCALE",
                    "S",
                  ],
                ].map(
                  ([
                    mode,
                    label,
                    shortcut,
                  ]) => (
                    <button
                      type="button"
                      key={
                        mode
                      }
                      className={
                        transformMode ===
                        mode
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setTransformMode(
                          mode
                        )
                      }
                    >
                      <strong>
                        {
                          label
                        }
                      </strong>

                      <small>
                        {
                          shortcut
                        }
                      </small>
                    </button>
                  )
                )}

                {creatorMode ===
                  "advanced" && (
                  <button
                    type="button"
                    className={
                      meshEditMode
                        ? "active creator-edit-mode-button"
                        : "creator-edit-mode-button"
                    }
                    onClick={
                      enterMeshEditMode
                    }
                    disabled={
                      !selected ||
                      selected.locked
                    }
                    title="Mesh Edit Mode · Tab"
                  >
                    <strong>
                      EDIT
                    </strong>

                    <small>
                      TAB
                    </small>
                  </button>
                )}
              </div>

              <div className="creator-tool-cluster creator-mesh-edit-tools">
                {[
                  [
                    "vertex",
                    "VERTEX",
                    "V",
                  ],
                  [
                    "edge",
                    "EDGE",
                    "E",
                  ],
                  [
                    "face",
                    "FACE",
                    "F",
                  ],
                ].map(
                  ([
                    mode,
                    label,
                    shortcut,
                  ]) => (
                    <button
                      type="button"
                      key={
                        mode
                      }
                      className={
                        meshSelectionMode ===
                        mode
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        changeMeshSelectionMode(
                          mode
                        )
                      }
                    >
                      <strong>
                        {
                          label
                        }
                      </strong>

                      <small>
                        {
                          shortcut
                        }
                      </small>
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="creator-exit-edit-mode"
                  onClick={
                    exitMeshEditMode
                  }
                >
                  <strong>
                    OBJECT
                  </strong>

                  <small>
                    TAB
                  </small>
                </button>
              </div>

              <div className="creator-toolbar-divider" />

              <div className="creator-toolbar-settings">
                <button
                  type="button"
                  className="creator-setting-button"
                  onClick={() =>
                    setTransformSpace(
                      (value) =>
                        value ===
                        "world"
                          ? "local"
                          : "world"
                    )
                  }
                >
                  <span>
                    SPACE
                  </span>

                  <strong>
                    {
                      transformSpace.toUpperCase()
                    }
                  </strong>
                </button>

                <button
                  type="button"
                  className={
                    snapEnabled
                      ? "creator-setting-button active"
                      : "creator-setting-button"
                  }
                  onClick={() =>
                    setSnapEnabled(
                      (value) =>
                        !value
                    )
                  }
                >
                  <span>
                    SNAP
                  </span>

                  <strong>
                    {snapEnabled
                      ? "ON"
                      : "OFF"}
                  </strong>
                </button>

                <label className="creator-snap-select">
                  <span>
                    GRID
                  </span>

                  <select
                    value={
                      creatorMode ===
                      "architecture"
                        ? architectureSnapMm /
                          architectureScale
                        : snapMm
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        Number(
                          event.target
                            .value
                        );

                      if (
                        creatorMode ===
                        "architecture"
                      ) {
                        setArchitectureSnapMm(
                          Math.max(
                            1,
                            value *
                              architectureScale
                          )
                        );
                      } else {
                        setSnapMm(
                          value
                        );
                      }
                    }}
                    disabled={
                      !snapEnabled
                    }
                  >
                    <option value="1">
                      1 MM
                    </option>

                    <option value="5">
                      5 MM
                    </option>

                    <option value="10">
                      10 MM
                    </option>

                    {creatorMode ===
                      "architecture" && (
                      <>
                        <option
                          value={
                            50 /
                            architectureScale
                          }
                        >
                          50 MM REAL
                        </option>

                        <option
                          value={
                            100 /
                            architectureScale
                          }
                        >
                          100 MM REAL
                        </option>

                        <option
                          value={
                            500 /
                            architectureScale
                          }
                        >
                          500 MM REAL
                        </option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              <div className="creator-toolbar-divider" />

              <div className="creator-history-controls">
                <button
                  type="button"
                  onClick={
                    undoScene
                  }
                  disabled={
                    !canUndo
                  }
                  title="Undo · Ctrl/Cmd + Z"
                >
                  <Undo2
                    size={14}
                    strokeWidth={1.5}
                  />
                </button>

                <button
                  type="button"
                  onClick={
                    redoScene
                  }
                  disabled={
                    !canRedo
                  }
                  title="Redo · Ctrl/Cmd + Shift + Z"
                >
                  <Redo2
                    size={14}
                    strokeWidth={1.5}
                  />
                </button>
              </div>

              <div className="creator-view-controls">
                {[
                  [
                    "perspective",
                    "P",
                    "5",
                  ],
                  [
                    "front",
                    "F",
                    "1",
                  ],
                  [
                    "right",
                    "R",
                    "3",
                  ],
                  [
                    "top",
                    "T",
                    "7",
                  ],
                ].map(
                  ([
                    view,
                    label,
                    shortcut,
                  ]) => (
                    <button
                      type="button"
                      key={
                        view
                      }
                      className={
                        cameraView ===
                        view
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCameraView(
                          view
                        )
                      }
                      title={`${view} view · ${shortcut}`}
                    >
                      {
                        label
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <div
            ref={
              creatorCanvasWrapRef
            }
            className={
              boxSelectActive
                ? "creator-canvas-wrap creator-box-select-active"
                : "creator-canvas-wrap"
            }
          >
            <Canvas
              camera={{
                position: [
                  5.2,
                  4.1,
                  6.2,
                ],
                fov: 42,
              }}
              dpr={[
                1,
                1.6,
              ]}
              shadows
              gl={{
                antialias:
                  true,
                alpha:
                  true,
              }}
              onPointerMissed={
                handleCanvasMiss
              }
            >
              <ViewportStateBridge
                apiRef={
                  viewportApiRef
                }
              />

              <CreatorScene
                objects={
                  objects
                }
                selectedIds={
                  selectedIds
                }
                primaryId={
                  primaryId
                }
                onSelect={
                  handleSelect
                }
                autoRotate={
                  autoRotate
                }
                advanced={
                  creatorMode !==
                  "simple"
                }
                transformMode={
                  transformMode
                }
                transformSpace={
                  transformSpace
                }
                snapEnabled={
                  snapEnabled
                }
                snapMm={
                  creatorMode ===
                  "architecture"
                    ? architectureSnapMm /
                      architectureScale
                    : snapMm
                }
                onTransformStart={
                  handleTransformStart
                }
                onTransformEnd={
                  handleTransformEnd
                }
                cameraView={
                  cameraView
                }
                meshEditEnabled={
                  meshEditMode
                }
                meshSelection={
                  meshSelection
                }
                onEditSelect={
                  handleEditElementSelect
                }
                gridCellSize={
                  creatorMode ===
                  "architecture"
                    ? Math.max(
                        0.018,
                        (
                          architectureGridMm /
                          architectureScale
                        ) *
                          SCENE_SCALE
                      )
                    : 0.36
                }
                gridSectionSize={
                  creatorMode ===
                  "architecture"
                    ? Math.max(
                        0.09,
                        (
                          architectureGridMm *
                          5 /
                          architectureScale
                        ) *
                          SCENE_SCALE
                      )
                    : 1.8
                }
                plan2D={
                  creatorMode ===
                    "architecture" &&
                  architectureView ===
                    "plan"
                }
                elevation2D={
                  creatorMode ===
                    "architecture" &&
                  [
                    "front",
                    "right",
                  ].includes(
                    architectureView
                  )
                    ? architectureView
                    : null
                }
                levelExplodeOffsets={
                  creatorMode ===
                    "architecture" &&
                  architectureView ===
                    "3d"
                    ? architectureLevelExplodeOffsets
                    : {}
                }
                planAnnotations={
                  architecturePlanAnnotations
                }
                planMeasurements={
                  architectureMeasurements
                }
                architectureActiveLevel={
                  architectureActiveLevel
                }
                architectureActiveLevelId={
                  architectureActiveLevelId
                }
                architectureLevels={
                  architectureLevels
                }
                architectureScale={
                  architectureScale
                }
              />
            </Canvas>

            {creatorMode ===
              "architecture" &&
              [
                "wall",
                "room",
                "measure",
              ].includes(
                architectureDrawTool
              ) && (
              <div
                className="creator-architecture-draw-layer creator-architecture-draw-layer-passive"
              >
                <div className="creator-architecture-draw-badge">
                  {architectureDrawTool ===
                  "room"
                    ? "ROOM DRAW"
                    : architectureDrawTool ===
                        "measure"
                      ? "MEASURE"
                      : "WALL DRAW"} · {
                    architectureDrawTool ===
                    "measure"
                      ? architectureMeasureStart
                        ? "CLICK B"
                        : "CLICK A"
                      : architectureWallStart
                        ? "CLICK END"
                        : "CLICK START"
                  } · RIGHT CLICK CANCEL
                </div>

                {architectureDrawTool ===
                  "wall" &&
                  architectureWallStart &&
                  architecturePointer && (
                  <div
                    className={
                      architecturePointer
                        ?.smartSnapKind
                        ? "creator-architecture-preview-line smart-snap"
                        : "creator-architecture-preview-line"
                    }
                    style={{
                      left:
                        architectureWallStart.screenX,
                      top:
                        architectureWallStart.screenY,
                      width:
                        Math.hypot(
                          architecturePointer.screenX -
                            architectureWallStart.screenX,
                          architecturePointer.screenY -
                            architectureWallStart.screenY
                        ),
                      transform:
                        `rotate(${Math.atan2(
                          architecturePointer.screenY -
                            architectureWallStart.screenY,
                          architecturePointer.screenX -
                            architectureWallStart.screenX
                        )}rad)`,
                    }}
                  >
                    <span>
                      {Math.round(
                        Math.hypot(
                          architecturePointer.realX -
                            architectureWallStart.realX,
                          architecturePointer.realZ -
                            architectureWallStart.realZ
                        )
                      )} MM
                    </span>
                  </div>
                )}

                {architectureDrawTool ===
                  "room" &&
                  architectureWallStart &&
                  architecturePointer && (
                  <div
                    className="creator-architecture-room-preview"
                    style={{
                      left:
                        Math.min(
                          architectureWallStart.screenX,
                          architecturePointer.screenX
                        ),
                      top:
                        Math.min(
                          architectureWallStart.screenY,
                          architecturePointer.screenY
                        ),
                      width:
                        Math.abs(
                          architecturePointer.screenX -
                          architectureWallStart.screenX
                        ),
                      height:
                        Math.abs(
                          architecturePointer.screenY -
                          architectureWallStart.screenY
                        ),
                    }}
                  >
                    <span>
                      {Math.round(
                        Math.abs(
                          architecturePointer.realX -
                          architectureWallStart.realX
                        )
                      )} × {Math.round(
                        Math.abs(
                          architecturePointer.realZ -
                          architectureWallStart.realZ
                        )
                      )} MM
                    </span>

                    <small>
                      {(
                        Math.abs(
                          architecturePointer.realX -
                          architectureWallStart.realX
                        ) *
                        Math.abs(
                          architecturePointer.realZ -
                          architectureWallStart.realZ
                        ) /
                        1000000
                      ).toFixed(
                        2
                      )} M²
                    </small>
                  </div>
                )}

                {architectureDrawTool ===
                  "measure" &&
                  architectureMeasureStart &&
                  architectureMeasurePointer && (
                  <div
                    className="creator-architecture-measure-preview"
                    style={{
                      left:
                        architectureMeasureStart.screenX,
                      top:
                        architectureMeasureStart.screenY,
                      width:
                        Math.hypot(
                          architectureMeasurePointer.screenX -
                            architectureMeasureStart.screenX,
                          architectureMeasurePointer.screenY -
                            architectureMeasureStart.screenY
                        ),
                      transform:
                        `rotate(${Math.atan2(
                          architectureMeasurePointer.screenY -
                            architectureMeasureStart.screenY,
                          architectureMeasurePointer.screenX -
                            architectureMeasureStart.screenX
                        )}rad)`,
                    }}
                  >
                    <span>
                      {Math.round(
                        Math.hypot(
                          architectureMeasurePointer.realX -
                            architectureMeasureStart.realX,
                          architectureMeasurePointer.realZ -
                            architectureMeasureStart.realZ
                        )
                      )} MM
                    </span>
                  </div>
                )}
              </div>
            )}

            {boxSelectActive && (
              <div
                className="creator-box-select-layer"
                onPointerDown={
                  beginBoxSelect
                }
                onPointerMove={
                  moveBoxSelect
                }
                onPointerUp={
                  finishBoxSelect
                }
                onPointerCancel={() => {
                  setBoxSelectActive(
                    false
                  );

                  setBoxDrag(
                    null
                  );
                }}
              >
                <div className="creator-box-select-badge">
                  BOX SELECT · DRAG · SHIFT = ADD
                </div>

                {boxDrag && (
                  <div
                    className="creator-box-selection-rect"
                    style={{
                      left:
                        Math.min(
                          boxDrag.x1,
                          boxDrag.x2
                        ),
                      top:
                        Math.min(
                          boxDrag.y1,
                          boxDrag.y2
                        ),
                      width:
                        Math.abs(
                          boxDrag.x2 -
                          boxDrag.x1
                        ),
                      height:
                        Math.abs(
                          boxDrag.y2 -
                          boxDrag.y1
                        ),
                    }}
                  />
                )}
              </div>
            )}

            {creatorMode ===
              "architecture" &&
              selected &&
              selected.source ===
                "architecture" && (
              <div className="creator-architecture-dimension-hud">
                <span>
                  {
                    selected.parameters
                      ?.archType
                      ?.toUpperCase() ||
                    "OBJECT"
                  }
                </span>

                <strong>
                  {architectureFormat(
                    selected.parameters
                      ?.archRealDimensions
                      ?.width ??
                      selected.dimensions
                        .width *
                        architectureScale,
                    architectureUnit
                  )} × {architectureFormat(
                    selected.parameters
                      ?.archRealDimensions
                      ?.depth ??
                      selected.dimensions
                        .depth *
                        architectureScale,
                    architectureUnit
                  )} × {architectureFormat(
                    selected.parameters
                      ?.archRealDimensions
                      ?.height ??
                      selected.dimensions
                        .height *
                        architectureScale,
                    architectureUnit
                  )} {architectureUnit.toUpperCase()}
                </strong>

                <small>
                  {
                    selected.parameters
                      ?.archLevelName ||
                    "GROUND"
                  } · 1:{
                    architectureScale
                  }
                </small>
              </div>
            )}

            <div className="creator-view-hint">
              <Move3D
                size={15}
                strokeWidth={
                  1.45
                }
              />

              {creatorMode ===
              "advanced"
                ? meshEditMode
                  ? "EDIT · B BOX · H BOUNDARY · K CHAIN · SHARP/FILLET · [/] SHRINK/GROW"
                  : "G MOVE · R ROTATE · S SCALE · TAB EDIT MODE"
                : creatorMode ===
                    "architecture"
                  ? architectureDrawTool ===
                      "wall"
                    ? "WALL DRAW · CLICK START + END · RIGHT CLICK CANCEL"
                    : architectureDrawTool ===
                        "room"
                      ? "ROOM DRAW · CLICK TWO OPPOSITE CORNERS · RIGHT CLICK CANCEL"
                      : architectureDrawTool ===
                          "measure"
                        ? "MEASURE · CLICK A + B · LEFT DRAG PAN · SCROLL ZOOM"
                        : architectureView ===
                          "plan"
                        ? `PLAN 2D · ${architectureActiveLevel?.name || "GROUND"} ONLY · DRAW CONTINUES · LEFT DRAG PAN · SCROLL ZOOM`
                        : architectureView ===
                            "front"
                          ? "FRONT ELEVATION · FLAT 2D · LEFT DRAG PAN · SCROLL ZOOM"
                          : architectureView ===
                              "right"
                            ? "RIGHT ELEVATION · FLAT 2D · LEFT DRAG PAN · SCROLL ZOOM"
                            : "3D · LEFT DRAG ORBIT · MIDDLE PAN · SCROLL ZOOM"
                  : "LEFT CLICK SELECT · LEFT DRAG ORBIT · PRESS WHEEL + DRAG PAN · SCROLL ZOOM · CLICK TO SELECT"}
            </div>
          </div>

          <div className="creator-stats">
            <div>
              <span>
                OBJECTS
              </span>

              <strong>
                {
                  objects.length
                }
              </strong>
            </div>

            <div>
              <span>
                EST. VOLUME
              </span>

              <strong>
                {
                  totalVolume.toFixed(
                    1
                  )
                } CM³
              </strong>
            </div>

            <div>
              <span>
                SELECTED
              </span>

              <strong>
                {
                  selectedIds.length
                }
              </strong>
            </div>
          </div>
        </div>

        <aside
          className={`creator-inspector creator-inspector-tab-${inspectorTab}`}
        >
          <div className="creator-inspector-top">
            <div className="creator-panel-heading">
              <span>
                04
              </span>

              <strong>
                OBJECT INSPECTOR
              </strong>
            </div>

            {selected ? (
              <div className="creator-selected-summary">
                <strong className="creator-selected-name">
                  {
                    selected.name
                  }
                </strong>

                <div className="creator-selected-badges">
                  <span>
                    {selected.visible ===
                    false
                      ? "HIDDEN"
                      : "VISIBLE"}
                  </span>

                  {selected.locked && (
                    <span className="locked">
                      LOCKED
                    </span>
                  )}

                  {meshEditMode && (
                    <span className="creator-edit-badge">
                      EDIT MODE
                    </span>
                  )}

                  {selected.groupName && (
                    <span>
                      {
                        selected.groupName
                      }
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="creator-no-selection">
                Select an object
                in the scene or
                object list.
              </p>
            )}
          </div>

          <div className="creator-compact-tabs creator-inspector-tabs">
            <button
              type="button"
              className={
                inspectorTab ===
                "object"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setInspectorTab(
                  "object"
                )
              }
            >
              OBJECT
            </button>

            <button
              type="button"
              className={
                inspectorTab ===
                "transform"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setInspectorTab(
                  "transform"
                )
              }
            >
              TRANSFORM
            </button>

            <button
              type="button"
              className={
                inspectorTab ===
                "edit"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setInspectorTab(
                  "edit"
                )
              }
            >
              EDIT
            </button>

            <button
              type="button"
              className={
                inspectorTab ===
                "modify"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setInspectorTab(
                  "modify"
                )
              }
            >
              MODIFY
            </button>

            <button
              type="button"
              className={
                inspectorTab ===
                "output"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setInspectorTab(
                  "output"
                )
              }
            >
              OUTPUT
            </button>
          </div>

          {selected && (
            <>
              {creatorMode !==
                "simple" && (
                <div className="creator-inspector-block creator-advanced-object-block creator-tab-object">
                  <label className="creator-text-field">
                    <span>
                      OBJECT NAME
                    </span>

                    <input
                      type="text"
                      maxLength={36}
                      value={
                        selected.name
                      }
                      disabled={
                        selected.locked
                      }
                      onChange={(
                        event
                      ) =>
                        updateName(
                          event.target
                            .value
                        )
                      }
                    />
                  </label>

                  <div className="creator-object-quick-actions">
                    <button
                      type="button"
                      onClick={() =>
                        updatePosition(
                          "y",
                          0
                        )
                      }
                      disabled={
                        selected.locked
                      }
                    >
                      DROP TO BED
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleObjectVisibility(
                          selected.id
                        )
                      }
                    >
                      {selected.visible ===
                      false
                        ? "SHOW"
                        : "HIDE"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleObjectLock(
                          selected.id
                        )
                      }
                    >
                      {selected.locked
                        ? "UNLOCK"
                        : "LOCK"}
                    </button>
                  </div>

                  {selected.locked && (
                    <small className="creator-field-note creator-locked-note">
                      Unlock this object to edit or transform it.
                    </small>
                  )}
                </div>
              )}

              {creatorMode ===
                "architecture" &&
                selected.source ===
                  "architecture" && (
                <div className="creator-inspector-block creator-architecture-inspector creator-tab-object">
                  <div className="creator-inspector-title">
                    ARCHITECT
                    <span>
                      {
                        selected.parameters
                          ?.archType
                          ?.toUpperCase() ||
                        "OBJECT"
                      }
                    </span>
                  </div>

                  <div className="creator-architecture-object-meta">
                    <span>
                      LEVEL
                      <strong>
                        {selected.parameters
                          ?.archLevelName ||
                          "GROUND"}
                      </strong>
                    </span>

                    <span>
                      SCALE
                      <strong>
                        1:{
                          architectureScale
                        }
                      </strong>
                    </span>
                  </div>

                  <div className="creator-architecture-real-fields">
                    {[
                      [
                        "width",
                        "L / W",
                      ],
                      [
                        "depth",
                        "DEPTH",
                      ],
                      [
                        "height",
                        "HEIGHT",
                      ],
                    ].map(
                      ([
                        key,
                        label,
                      ]) => (
                        <label
                          key={
                            key
                          }
                        >
                          <span>
                            {
                              label
                            }
                          </span>

                          <input
                            type="number"
                            step={
                              architectureUnit ===
                              "mm"
                                ? 10
                                : architectureUnit ===
                                    "cm"
                                  ? 1
                                  : 0.1
                            }
                            value={
                              architectureFormat(
                                selected.parameters
                                  ?.archRealDimensions?.[
                                  key
                                ] ??
                                  selected.dimensions[
                                    key
                                  ] *
                                    architectureScale,
                                architectureUnit
                              )
                            }
                            disabled={
                              selected.locked
                            }
                            onChange={(
                              event
                            ) =>
                              updateArchitectureRealDimension(
                                key,
                                event.target
                                  .value
                              )
                            }
                          />

                          <small>
                            {architectureUnit.toUpperCase()}
                          </small>
                        </label>
                      )
                    )}
                  </div>

                  <div className="creator-architecture-print-size">
                    <span>
                      PRINT SIZE @ 1:{
                        architectureScale
                      }
                    </span>

                    <strong>
                      {selected.dimensions.width.toFixed(
                        1
                      )} × {selected.dimensions.depth.toFixed(
                        1
                      )} × {selected.dimensions.height.toFixed(
                        1
                      )} MM
                    </strong>
                  </div>

                  {selectedEditableArchitectureWall &&
                    selectedWallEndpoints && (
                    <details className="creator-architecture-wall-endpoints">
                      <summary>
                        <span>
                          WALL ENDPOINTS
                        </span>

                        <b>
                          ▾
                        </b>
                      </summary>

                      <div className="creator-architecture-wall-endpoints-body">
                        {[
                          [
                            "start",
                            "START",
                            selectedWallEndpoints.start,
                          ],
                          [
                            "end",
                            "END",
                            selectedWallEndpoints.end,
                          ],
                        ].map(
                          ([
                            endpointKey,
                            label,
                            point,
                          ]) => (
                            <div
                              className="creator-architecture-wall-endpoint-row"
                              key={
                                endpointKey
                              }
                            >
                              <strong>
                                {
                                  label
                                }
                              </strong>

                              <label>
                                <span>
                                  X
                                </span>

                                <input
                                  type="number"
                                  step={
                                    architectureSnapMm
                                  }
                                  value={
                                    Math.round(
                                      point.x
                                    )
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateArchitectureWallEndpoint(
                                      endpointKey,
                                      "x",
                                      event.target
                                        .value
                                    )
                                  }
                                />
                              </label>

                              <label>
                                <span>
                                  Z
                                </span>

                                <input
                                  type="number"
                                  step={
                                    architectureSnapMm
                                  }
                                  value={
                                    Math.round(
                                      point.z
                                    )
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateArchitectureWallEndpoint(
                                      endpointKey,
                                      "z",
                                      event.target
                                        .value
                                    )
                                  }
                                />
                              </label>
                            </div>
                          )
                        )}

                        <button
                          type="button"
                          onClick={
                            snapSelectedArchitectureWallEndpoints
                          }
                        >
                          SNAP ENDPOINTS TO GRID
                        </button>
                      </div>
                    </details>
                  )}

                  {selectedArchitectureOpening &&
                    architectureOpeningHost && (
                    <div className="creator-architecture-smart-opening">
                      <div className="creator-architecture-smart-opening-head">
                        <span>
                          SMART {
                            selectedArchitectureOpening
                              .parameters
                              ?.archType
                              ?.toUpperCase()
                          }
                        </span>

                        <strong>
                          {
                            architectureOpeningHost.name
                          }
                        </strong>
                      </div>

                      <label>
                        <span>
                          OFFSET
                        </span>

                        <input
                          type="number"
                          step="50"
                          value={
                            Math.round(
                              safeNumber(
                                selectedArchitectureOpening
                                  .parameters
                                  ?.archWallOffsetMm,
                                0
                              )
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            updateHostedOpening(
                              "offset",
                              event.target
                                .value
                            )
                          }
                        />

                        <small>
                          MM
                        </small>
                      </label>

                      <label>
                        <span>
                          SILL
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={
                            Math.round(
                              safeNumber(
                                selectedArchitectureOpening
                                  .parameters
                                  ?.archSill,
                                0
                              )
                            )
                          }
                          onChange={(
                            event
                          ) =>
                            updateHostedOpening(
                              "sill",
                              event.target
                                .value
                            )
                          }
                        />

                        <small>
                          MM
                        </small>
                      </label>

                      <div className="creator-architecture-smart-opening-actions">
                        <button
                          type="button"
                          onClick={
                            centerHostedOpening
                          }
                        >
                          CENTER
                        </button>

                        <button
                          type="button"
                          onClick={
                            selectHostedOpeningPair
                          }
                        >
                          SELECT PAIR
                        </button>
                      </div>

                      <button
                        type="button"
                        className="creator-architecture-cut-opening"
                        onClick={
                          cutHostedOpening
                        }
                      >
                        CUT OPENING
                      </button>
                    </div>
                  )}

                  {selected.role ===
                    "hole" &&
                    !selectedArchitectureOpening && (
                    <small className="creator-field-note">
                      This architecture object is a HOLE. Select it together with a solid and use CUT / HOLE.
                    </small>
                  )}
                </div>
              )}

              <div className="creator-inspector-block creator-tab-object">
                <div className="creator-inspector-title">
                  OBJECT MODE
                </div>

                <div className="creator-role-toggle">
                  <button
                    type="button"
                    className={
                      selected.role ===
                      "solid"
                        ? "active solid"
                        : ""
                    }
                    onClick={() =>
                      setRole(
                        "solid"
                      )
                    }
                    disabled={
                      selected.locked
                    }
                  >
                    SOLID
                  </button>

                  <button
                    type="button"
                    className={
                      selected.role ===
                      "hole"
                        ? "active hole"
                        : ""
                    }
                    onClick={() =>
                      setRole(
                        "hole"
                      )
                    }
                    disabled={
                      selected.locked
                    }
                  >
                    HOLE
                  </button>
                </div>

                <small className="creator-field-note">
                  HOLE objects are
                  subtracted when
                  you use Cut /
                  Hole.
                </small>
              </div>

              {selected.type ===
                "text" && (
                <div className="creator-inspector-block creator-tab-object">
                  <label className="creator-text-field">
                    <span>
                      TEXT
                    </span>

                    <input
                      type="text"
                      maxLength={
                        12
                      }
                      value={
                        selected.text
                      }
                      disabled={
                        selected.locked
                      }
                      onChange={(
                        event
                      ) =>
                        updateText(
                          event.target
                            .value
                        )
                      }
                      placeholder="BEYOND"
                    />
                  </label>

                  <small className="creator-field-note">
                    Technical
                    5×7 printable
                    block lettering ·
                    A–Z / 0–9
                  </small>
                </div>
              )}

              {selected.type ===
                "tube" && (
                <div className="creator-inspector-block creator-tab-object">
                  <div className="creator-inspector-title">
                    TUBE
                    <span>
                      MM
                    </span>
                  </div>

                  <label className="creator-v6-single-field">
                    <span>
                      WALL
                    </span>

                    <input
                      type="number"
                      min="0.8"
                      step="0.5"
                      value={
                        selected.parameters
                          ?.wallThickness ||
                        4
                      }
                      disabled={
                        selected.locked
                      }
                      onChange={(
                        event
                      ) =>
                        updateParameter(
                          "wallThickness",
                          event.target
                            .value,
                          0.8,
                          Math.min(
                            selected.dimensions
                              .width,
                            selected.dimensions
                              .depth
                          ) /
                            2 -
                            0.5
                        )
                      }
                    />
                  </label>
                </div>
              )}

              {selected.type ===
                "roundedBox" && (
                <div className="creator-inspector-block creator-tab-object">
                  <div className="creator-inspector-title">
                    CORNERS
                    <span>
                      MM
                    </span>
                  </div>

                  <label className="creator-v6-single-field">
                    <span>
                      RADIUS
                    </span>

                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={
                        selected.parameters
                          ?.radius ||
                        4
                      }
                      disabled={
                        selected.locked
                      }
                      onChange={(
                        event
                      ) =>
                        updateParameter(
                          "radius",
                          event.target
                            .value,
                          0.5,
                          Math.min(
                            selected.dimensions
                              .width,
                            selected.dimensions
                              .depth,
                            selected.dimensions
                              .height
                          ) /
                            2 -
                            0.2
                        )
                      }
                    />
                  </label>
                </div>
              )}

              {selected.source ===
                "sketch" && (
                <div className="creator-inspector-block creator-sketch-source-card creator-tab-object">
                  <div className="creator-inspector-title">
                    SKETCH SOLID
                  </div>

                  <div className="creator-sketch-source-stats">
                    <span>
                      ENGINE
                      <strong>
                        {selected.engine ||
                          "CUSTOM"}
                      </strong>
                    </span>

                    <span>
                      PROFILE
                      <strong>
                        {selected.parameters
                          ?.sketchPoints
                          ?.length ||
                          0} PT
                      </strong>
                    </span>
                  </div>

                  <small className="creator-field-note">
                    This profile is now a normal Creator solid and can be combined, cut, transformed and exported.
                  </small>
                </div>
              )}

              {selected.source ===
                "revolve" && (
                <div className="creator-inspector-block creator-sketch-source-card creator-revolve-source-card creator-tab-object">
                  <div className="creator-inspector-title">
                    REVOLVED SOLID
                  </div>

                  <div className="creator-sketch-source-stats">
                    <span>
                      ENGINE
                      <strong>
                        {selected.engine ||
                          "MANIFOLD"}
                      </strong>
                    </span>

                    <span>
                      REVOLVE
                      <strong>
                        {selected.parameters
                          ?.revolveDegrees ||
                          360}°
                      </strong>
                    </span>
                  </div>

                  <small className="creator-field-note">
                    Created from a 2D radial profile revolved around its axis.
                  </small>
                </div>
              )}

              {selected.source ===
                "import" && (
                <div className="creator-inspector-block creator-import-source-card creator-tab-object">
                  <div className="creator-inspector-title">
                    IMPORTED MODEL
                  </div>

                  <div className="creator-sketch-source-stats">
                    <span>
                      FORMAT
                      <strong>
                        {selected.parameters
                          ?.importFormat ||
                          "MESH"}
                      </strong>
                    </span>

                    <span>
                      FACES
                      <strong>
                        {selected.parameters
                          ?.triangleCount ||
                          "—"}
                      </strong>
                    </span>
                  </div>

                  <small className="creator-field-note">
                    {selected.parameters
                      ?.importName ||
                      "Imported model"}
                  </small>
                </div>
              )}

              {creatorMode ===
                "advanced" && (
                <div className="creator-inspector-block creator-tab-edit creator-mesh-edit-panel">
                  <div className="creator-inspector-title">
                    MESH EDIT
                    <span>
                      V12
                    </span>
                  </div>

                  <div className="creator-edit-status">
                    <span>
                      MODE
                    </span>

                    <strong>
                      {meshEditMode
                        ? `${meshSelectionMode.toUpperCase()} SELECT`
                        : "OBJECT MODE"}
                    </strong>
                  </div>

                  {!meshEditMode ? (
                    <>
                      <p className="creator-edit-copy">
                        Convert the selected object into an editable triangle mesh. Undo restores the previous parametric version.
                      </p>

                      <button
                        type="button"
                        className="creator-edit-primary"
                        onClick={
                          enterMeshEditMode
                        }
                        disabled={
                          selected.locked ||
                          selected.role !==
                            "solid"
                        }
                      >
                        ENTER MESH EDIT MODE
                        <small>
                          TAB
                        </small>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="creator-edit-select-row">
                        {[
                          [
                            "vertex",
                            "VERTEX",
                          ],
                          [
                            "edge",
                            "EDGE",
                          ],
                          [
                            "face",
                            "FACE",
                          ],
                        ].map(
                          ([
                            mode,
                            label,
                          ]) => (
                            <button
                              type="button"
                              key={
                                mode
                              }
                              className={
                                meshSelectionMode ===
                                mode
                                  ? "active"
                                  : ""
                              }
                              onClick={() =>
                                changeMeshSelectionMode(
                                  mode
                                )
                              }
                            >
                              {
                                label
                              }
                            </button>
                          )
                        )}
                      </div>

                      <div className="creator-edit-selection-readout">
                        <span>
                          SELECTION
                        </span>

                        <strong>
                          {meshSelection
                            ? editableSelectionCount(
                                meshSelection
                              ) >
                              1
                              ? `${editableSelectionCount(
                                  meshSelection
                                ).toLocaleString()} ${meshSelection.mode.toUpperCase()}S`
                              : meshSelection.mode ===
                                  "face"
                                ? `FACE ${meshSelection.faceIndex + 1}`
                                : meshSelection.mode ===
                                    "edge"
                                  ? "EDGE SELECTED"
                                  : `VERTEX ${meshSelection.indices[0] + 1}`
                            : "CLICK · SHIFT-CLICK TO ADD"}
                        </strong>
                      </div>

                      <div className="creator-v10-selection-actions">
                        <button
                          type="button"
                          className={
                            boxSelectActive
                              ? "active"
                              : ""
                          }
                          onClick={
                            toggleBoxSelect
                          }
                        >
                          BOX
                          <small>
                            B
                          </small>
                        </button>

                        <button
                          type="button"
                          onClick={
                            selectConnectedMeshElements
                          }
                          disabled={
                            !meshSelection
                          }
                        >
                          CONNECTED
                          <small>
                            L
                          </small>
                        </button>

                        <button
                          type="button"
                          onClick={
                            selectAllMeshElements
                          }
                        >
                          ALL
                          <small>
                            A
                          </small>
                        </button>

                        <button
                          type="button"
                          onClick={
                            shrinkMeshSelection
                          }
                          disabled={
                            !meshSelection
                          }
                        >
                          SHRINK
                          <small>
                            [
                          </small>
                        </button>

                        <button
                          type="button"
                          onClick={
                            growMeshSelection
                          }
                          disabled={
                            !meshSelection
                          }
                        >
                          GROW
                          <small>
                            ]
                          </small>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setMeshSelection(
                              null
                            )
                          }
                          disabled={
                            !meshSelection
                          }
                        >
                          CLEAR
                          <small>
                            ESC
                          </small>
                        </button>
                      </div>

                      <div className="creator-v9-proportional">
                        <button
                          type="button"
                          className={
                            proportionalEdit
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setProportionalEdit(
                              (value) =>
                                !value
                            )
                          }
                        >
                          PROPORTIONAL
                          <span>
                            {
                              proportionalEdit
                                ? "ON"
                                : "OFF"
                            }
                          </span>
                        </button>

                        <label>
                          <span>
                            RADIUS
                          </span>

                          <input
                            type="number"
                            min="1"
                            max="200"
                            step="1"
                            value={
                              proportionalRadiusMm
                            }
                            disabled={
                              !proportionalEdit
                            }
                            onChange={(
                              event
                            ) =>
                              setProportionalRadiusMm(
                                clamp(
                                  event.target
                                    .value,
                                  1,
                                  200
                                )
                              )
                            }
                          />

                          <small>
                            MM
                          </small>
                        </label>
                      </div>

                      <label className="creator-edit-step-field">
                        <span>
                          MOVE STEP
                        </span>

                        <input
                          type="number"
                          min="0.1"
                          max="50"
                          step="0.1"
                          value={
                            editNudgeMm
                          }
                          onChange={(
                            event
                          ) =>
                            setEditNudgeMm(
                              clamp(
                                event.target
                                  .value,
                                0.1,
                                50
                              )
                            )
                          }
                        />

                        <small>
                          MM
                        </small>
                      </label>

                      <div className="creator-edit-nudge-grid">
                        {[
                          [
                            "X−",
                            "x",
                            -1,
                          ],
                          [
                            "X+",
                            "x",
                            1,
                          ],
                          [
                            "Y−",
                            "y",
                            -1,
                          ],
                          [
                            "Y+",
                            "y",
                            1,
                          ],
                          [
                            "Z−",
                            "z",
                            -1,
                          ],
                          [
                            "Z+",
                            "z",
                            1,
                          ],
                        ].map(
                          ([
                            label,
                            axis,
                            direction,
                          ]) => (
                            <button
                              type="button"
                              key={
                                label
                              }
                              disabled={
                                !meshSelection
                              }
                              onClick={() =>
                                nudgeEditableSelection(
                                  axis,
                                  direction
                                )
                              }
                            >
                              {
                                label
                              }
                            </button>
                          )
                        )}
                      </div>

                      <div className="creator-v9-shape-tools">
                        <div className="creator-edit-subtitle">
                          SHAPE TOOLS
                        </div>

                        <label className="creator-v9-smooth-field">
                          <span>
                            SMOOTH
                          </span>

                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={
                              smoothStrength
                            }
                            onChange={(
                              event
                            ) =>
                              setSmoothStrength(
                                clamp(
                                  event.target
                                    .value,
                                  1,
                                  100
                                )
                              )
                            }
                          />

                          <strong>
                            {
                              smoothStrength
                            }%
                          </strong>
                        </label>

                        <button
                          type="button"
                          className="creator-edit-primary creator-v9-smooth-button"
                          disabled={
                            !meshSelection
                          }
                          onClick={
                            smoothMeshSelection
                          }
                        >
                          SMOOTH SELECTION
                        </button>

                        <div className="creator-v9-flatten-row">
                          <span>
                            FLATTEN
                          </span>

                          {[
                            "x",
                            "y",
                            "z",
                          ].map(
                            (
                              axis
                            ) => (
                              <button
                                type="button"
                                key={
                                  axis
                                }
                                disabled={
                                  !meshSelection
                                }
                                onClick={() =>
                                  flattenMeshSelection(
                                    axis
                                  )
                                }
                              >
                                {
                                  axis.toUpperCase()
                                }
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {meshSelectionMode ===
                        "face" && (
                        <div className="creator-face-edit-tools">
                          <div className="creator-edit-subtitle">
                            FACE PUSH / PULL
                          </div>

                          <div className="creator-v7-two-fields">
                            <label>
                              <span>
                                INSET
                              </span>

                              <input
                                type="number"
                                min="0"
                                max="75"
                                value={
                                  faceInsetPercent
                                }
                                onChange={(
                                  event
                                ) =>
                                  setFaceInsetPercent(
                                    clamp(
                                      event.target
                                        .value,
                                      0,
                                      75
                                    )
                                  )
                                }
                              />

                              <small>
                                %
                              </small>
                            </label>

                            <label>
                              <span>
                                EXTRUDE
                              </span>

                              <input
                                type="number"
                                min="-80"
                                max="80"
                                step="0.5"
                                value={
                                  faceExtrudeMm
                                }
                                onChange={(
                                  event
                                ) =>
                                  setFaceExtrudeMm(
                                    clamp(
                                      event.target
                                        .value,
                                      -80,
                                      80
                                    )
                                  )
                                }
                              />

                              <small>
                                MM
                              </small>
                            </label>
                          </div>

                          <button
                            type="button"
                            className="creator-edit-primary"
                            onClick={
                              applyEditableFaceExtrude
                            }
                            disabled={
                              !meshSelection ||
                              meshSelection.mode !==
                                "face" ||
                              editableSelectionCount(
                                meshSelection
                              ) >
                                24
                            }
                          >
                            {meshSelection &&
                            meshSelection.mode ===
                              "face" &&
                            editableSelectionCount(
                              meshSelection
                            ) >
                              1
                              ? `APPLY ${editableSelectionCount(
                                  meshSelection
                                )} FACES`
                              : "APPLY FACE"}
                          </button>

                          {meshSelection &&
                            meshSelection.mode ===
                              "face" &&
                            editableSelectionCount(
                              meshSelection
                            ) >
                              1 && (
                              <small className="creator-v10-region-note">
                                Multi-face Push / Pull supports up to 24 selected faces. Inset is applied only to single-face operations.
                              </small>
                            )}

                          <small className="creator-edit-help">
                            Positive values add material. Negative values cut a pocket. Inset scales the extrusion inside the selected triangle.
                          </small>
                        </div>
                      )}

                      <div className="creator-v11-topology">
                        <div className="creator-edit-subtitle">
                          TOPOLOGY / REPAIR
                        </div>

                        <div className="creator-v11-topology-grid">
                          <button
                            type="button"
                            onClick={
                              selectBoundaryEdges
                            }
                          >
                            BOUNDARY
                            <small>
                              H
                            </small>
                          </button>

                          <button
                            type="button"
                            onClick={
                              selectEdgeChain
                            }
                            disabled={
                              !meshSelection ||
                              meshSelection.mode !==
                                "edge"
                            }
                          >
                            EDGE CHAIN
                            <small>
                              K
                            </small>
                          </button>
                        </div>

                        <label className="creator-v11-chain-field">
                          <span>
                            CHAIN TURN
                          </span>

                          <input
                            type="number"
                            min="1"
                            max="89"
                            step="1"
                            value={
                              edgeChainAngle
                            }
                            onChange={(
                              event
                            ) =>
                              setEdgeChainAngle(
                                clamp(
                                  event.target
                                    .value,
                                  1,
                                  89
                                )
                              )
                            }
                          />

                          <small>
                            DEG
                          </small>
                        </label>

                        <button
                          type="button"
                          className="creator-v11-fill-button"
                          onClick={
                            fillSelectedHole
                          }
                          disabled={
                            !meshSelection ||
                            meshSelection.mode !==
                              "edge" ||
                            selected.locked
                          }
                        >
                          FILL SELECTED BOUNDARY
                        </button>

                        <small className="creator-field-note">
                          BOUNDARY selects open mesh edges. If one boundary edge is already selected, it selects only that connected hole. Fill works on one clean closed boundary loop at a time.
                        </small>
                      </div>

                      <div className="creator-v12-fillet">
                        <div className="creator-edit-subtitle">
                          EDGE FILLET
                        </div>

                        <label className="creator-v12-field">
                          <span>
                            SHARP ANGLE
                          </span>

                          <input
                            type="number"
                            min="1"
                            max="179"
                            step="1"
                            value={
                              sharpEdgeAngle
                            }
                            onChange={(
                              event
                            ) =>
                              setSharpEdgeAngle(
                                clamp(
                                  event.target
                                    .value,
                                  1,
                                  179
                                )
                              )
                            }
                          />

                          <small>
                            DEG
                          </small>
                        </label>

                        <button
                          type="button"
                          className="creator-v12-select-sharp"
                          onClick={
                            selectSharpEdges
                          }
                        >
                          SELECT SHARP EDGES
                        </button>

                        <label className="creator-v12-range-field">
                          <span>
                            FILLET SMOOTHNESS
                          </span>

                          <input
                            type="range"
                            min="5"
                            max="100"
                            step="1"
                            value={
                              edgeFilletSmoothness
                            }
                            onChange={(
                              event
                            ) =>
                              setEdgeFilletSmoothness(
                                clamp(
                                  event.target
                                    .value,
                                  5,
                                  100
                                )
                              )
                            }
                          />

                          <strong>
                            {
                              edgeFilletSmoothness
                            }%
                          </strong>
                        </label>

                        <label className="creator-v12-field">
                          <span>
                            REFINE
                          </span>

                          <input
                            type="number"
                            min="2"
                            max="4"
                            step="1"
                            value={
                              edgeFilletRefine
                            }
                            onChange={(
                              event
                            ) =>
                              setEdgeFilletRefine(
                                Math.round(
                                  clamp(
                                    event.target
                                      .value,
                                    2,
                                    4
                                  )
                                )
                              )
                            }
                          />

                          <small>
                            X
                          </small>
                        </label>

                        <button
                          type="button"
                          className="creator-v12-apply-fillet"
                          onClick={
                            applySelectedEdgeFillet
                          }
                          disabled={
                            !meshSelection ||
                            meshSelection.mode !==
                              "edge" ||
                            selected.locked ||
                            edgeFilletWorking
                          }
                        >
                          {edgeFilletWorking
                            ? "BUILDING FILLET…"
                            : meshSelection &&
                                meshSelection.mode ===
                                  "edge"
                              ? `FILLET ${editableSelectionCount(
                                  meshSelection
                                )} EDGE${
                                  editableSelectionCount(
                                    meshSelection
                                  ) ===
                                  1
                                    ? ""
                                    : "S"
                                }`
                              : "SELECT EDGES TO FILLET"}
                        </button>

                        <small className="creator-field-note">
                          Select edges manually, with EDGE CHAIN, or SELECT SHARP EDGES. V12 uses Manifold smooth/refine to create a printable rounded transition. It is a smooth fillet, not a constant-radius CAD chamfer.
                        </small>
                      </div>

                      <div className="creator-v9-health">
                        <div className="creator-edit-subtitle">
                          MESH HEALTH
                        </div>

                        <div
                          className={`creator-v9-health-status ${
                            meshAnalysis?.status ===
                            "MANIFOLD"
                              ? "good"
                              : meshAnalysis
                                  ? "warn"
                                  : ""
                          }`}
                        >
                          <span>
                            STATUS
                          </span>

                          <strong>
                            {
                              meshAnalysis?.status ||
                              "NOT ANALYZED"
                            }
                          </strong>
                        </div>

                        {meshAnalysis && (
                          <div className="creator-v9-health-grid">
                            <span>
                              VERTICES
                              <strong>
                                {
                                  meshAnalysis.vertices.toLocaleString()
                                }
                              </strong>
                            </span>

                            <span>
                              TRIANGLES
                              <strong>
                                {
                                  meshAnalysis.triangles.toLocaleString()
                                }
                              </strong>
                            </span>

                            <span>
                              OPEN EDGES
                              <strong>
                                {
                                  meshAnalysis.boundaryEdges.toLocaleString()
                                }
                              </strong>
                            </span>

                            <span>
                              NON-MANIFOLD
                              <strong>
                                {
                                  meshAnalysis.nonManifoldEdges.toLocaleString()
                                }
                              </strong>
                            </span>

                            <span>
                              DEGENERATE
                              <strong>
                                {
                                  meshAnalysis.degenerateTriangles.toLocaleString()
                                }
                              </strong>
                            </span>

                            <span>
                              DUP FACES
                              <strong>
                                {
                                  meshAnalysis.duplicateFaces.toLocaleString()
                                }
                              </strong>
                            </span>
                          </div>
                        )}

                        <div className="creator-v9-health-actions">
                          <button
                            type="button"
                            onClick={
                              analyzeSelectedMesh
                            }
                          >
                            ANALYZE
                          </button>

                          <button
                            type="button"
                            onClick={
                              repairSelectedMesh
                            }
                            disabled={
                              selected.locked
                            }
                          >
                            BASIC REPAIR
                          </button>
                        </div>

                        <label className="creator-v11-manifold-field">
                          <span>
                            MANIFOLD MERGE TOLERANCE
                          </span>

                          <input
                            type="number"
                            min="0.001"
                            max="2"
                            step="0.01"
                            value={
                              manifoldToleranceMm
                            }
                            onChange={(
                              event
                            ) =>
                              setManifoldToleranceMm(
                                clamp(
                                  event.target
                                    .value,
                                  0.001,
                                  2
                                )
                              )
                            }
                          />

                          <small>
                            MM
                          </small>
                        </label>

                        <button
                          type="button"
                          className="creator-v11-manifold-clean"
                          onClick={
                            manifoldCleanSelectedMesh
                          }
                          disabled={
                            selected.locked ||
                            manifoldCleaning
                          }
                        >
                          {manifoldCleaning
                            ? "REBUILDING…"
                            : "MANIFOLD CLEAN"}
                        </button>

                        <small className="creator-field-note">
                          Basic Repair handles local cleanup. Manifold Clean then attempts a canonical closed-solid rebuild, including best-effort merging of tiny coincident gaps within the tolerance. Large visible holes should be filled explicitly first.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="creator-edit-exit"
                        onClick={
                          exitMeshEditMode
                        }
                      >
                        EXIT EDIT MODE
                        <small>
                          TAB
                        </small>
                      </button>
                    </>
                  )}
                </div>
              )}

              {creatorMode ===
                "advanced" && (
                <div className="creator-inspector-block creator-v7-modifier-panel creator-tab-modify">
                  <div className="creator-inspector-title">
                    MODIFIERS
                    <span>
                      V7
                    </span>
                  </div>

                  <div className="creator-v7-modifier">
                    <div className="creator-v7-modifier-head">
                      <strong>
                        MIRROR COPY
                      </strong>

                      <small>
                        GLOBAL PLANE
                      </small>
                    </div>

                    <div className="creator-v7-axis-row">
                      {[
                        "x",
                        "y",
                        "z",
                      ].map(
                        (
                          axis
                        ) => (
                          <button
                            type="button"
                            key={
                              axis
                            }
                            className={
                              mirrorAxis ===
                              axis
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setMirrorAxis(
                                axis
                              )
                            }
                          >
                            {
                              axis.toUpperCase()
                            }
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="creator-v7-apply"
                      onClick={
                        applyMirrorCopy
                      }
                      disabled={
                        !selected ||
                        selected.locked ||
                        objects.length >=
                          MAX_OBJECTS
                      }
                    >
                      MIRROR SELECTED
                    </button>
                  </div>

                  <div className="creator-v7-modifier">
                    <div className="creator-v7-modifier-head">
                      <strong>
                        ARRAY
                      </strong>

                      <small>
                        DUPLICATE
                      </small>
                    </div>

                    <div className="creator-v7-axis-row">
                      {[
                        "x",
                        "y",
                        "z",
                      ].map(
                        (
                          axis
                        ) => (
                          <button
                            type="button"
                            key={
                              axis
                            }
                            className={
                              arrayAxis ===
                              axis
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setArrayAxis(
                                axis
                              )
                            }
                          >
                            {
                              axis.toUpperCase()
                            }
                          </button>
                        )
                      )}
                    </div>

                    <div className="creator-v7-two-fields">
                      <label>
                        <span>
                          COUNT
                        </span>

                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={
                            arrayCount
                          }
                          onChange={(
                            event
                          ) =>
                            setArrayCount(
                              clamp(
                                event.target
                                  .value,
                                2,
                                10
                              )
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>
                          SPACE
                        </span>

                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={
                            arraySpacing
                          }
                          onChange={(
                            event
                          ) =>
                            setArraySpacing(
                              clamp(
                                event.target
                                  .value,
                                1,
                                300
                              )
                            )
                          }
                        />
                        <small>
                          MM
                        </small>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="creator-v7-apply"
                      onClick={
                        applyArray
                      }
                      disabled={
                        !selected ||
                        selected.locked ||
                        objects.length >=
                          MAX_OBJECTS
                      }
                    >
                      CREATE ARRAY
                    </button>
                  </div>

                  <div className="creator-v7-modifier">
                    <div className="creator-v7-modifier-head">
                      <strong>
                        HOLLOW / SHELL
                      </strong>

                      <small>
                        OPEN TOP
                      </small>
                    </div>

                    <label className="creator-v7-wide-field">
                      <span>
                        WALL
                      </span>

                      <input
                        type="number"
                        min="0.8"
                        step="0.2"
                        value={
                          shellWall
                        }
                        onChange={(
                          event
                        ) =>
                          setShellWall(
                            clamp(
                              event.target
                                .value,
                              0.8,
                              30
                            )
                          )
                        }
                      />

                      <small>
                        MM
                      </small>
                    </label>

                    <button
                      type="button"
                      className="creator-v7-apply"
                      onClick={
                        applyOpenShell
                      }
                      disabled={
                        !selected ||
                        selected.locked ||
                        selected.role !==
                          "solid" ||
                        [
                          "tube",
                          "torus",
                          "text",
                        ].includes(
                          selected.type
                        )
                      }
                    >
                      APPLY OPEN SHELL
                    </button>
                  </div>

                  <div className="creator-v7-modifier">
                    <div className="creator-v7-modifier-head">
                      <strong>
                        BEVEL
                      </strong>

                      <small>
                        BOX SOLIDS
                      </small>
                    </div>

                    <div className="creator-v7-two-fields">
                      <label>
                        <span>
                          RADIUS
                        </span>

                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={
                            bevelRadius
                          }
                          onChange={(
                            event
                          ) =>
                            setBevelRadius(
                              clamp(
                                event.target
                                  .value,
                                0.5,
                                40
                              )
                            )
                          }
                        />
                        <small>
                          MM
                        </small>
                      </label>

                      <label>
                        <span>
                          SEG
                        </span>

                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={
                            bevelSegments
                          }
                          onChange={(
                            event
                          ) =>
                            setBevelSegments(
                              Math.round(
                                clamp(
                                  event.target
                                    .value,
                                  1,
                                  10
                                )
                              )
                            )
                          }
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="creator-v7-apply"
                      onClick={
                        applyBevel
                      }
                      disabled={
                        !selected ||
                        selected.locked ||
                        ![
                          "cube",
                          "roundedBox",
                        ].includes(
                          selected.type
                        )
                      }
                    >
                      APPLY BEVEL
                    </button>

                    {![
                      "cube",
                      "roundedBox",
                    ].includes(
                      selected.type
                    ) && (
                      <small className="creator-v7-limit-note">
                        Generic mesh bevel will be added with topology Edit Mode.
                      </small>
                    )}
                  </div>
                </div>
              )}

              <div className="creator-inspector-block creator-tab-transform">
                <div className="creator-inspector-title">
                  SIZE
                  <span>
                    MM
                  </span>
                </div>

                <div className="creator-vector-fields">
                  {[
                    [
                      "width",
                      "W",
                    ],
                    [
                      "depth",
                      "D",
                    ],
                    [
                      "height",
                      "H",
                    ],
                  ].map(
                    ([
                      key,
                      label,
                    ]) => (
                      <label
                        key={
                          key
                        }
                      >
                        <span>
                          {
                            label
                          }
                        </span>

                        <input
                          type="number"
                          value={
                            selected
                              .dimensions[
                              key
                            ]
                          }
                          disabled={
                            selected.locked
                          }
                          onChange={(
                            event
                          ) =>
                            updateDimension(
                              key,
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="creator-inspector-block creator-tab-transform">
                <div className="creator-inspector-title">
                  POSITION
                  <span>
                    MM
                  </span>
                </div>

                <div className="creator-vector-fields">
                  {[
                    "x",
                    "y",
                    "z",
                  ].map(
                    (
                      key
                    ) => (
                      <label
                        key={
                          key
                        }
                      >
                        <span>
                          {
                            key.toUpperCase()
                          }
                        </span>

                        <input
                          type="number"
                          value={
                            selected
                              .position[
                              key
                            ]
                          }
                          disabled={
                            selected.locked
                          }
                          onChange={(
                            event
                          ) =>
                            updatePosition(
                              key,
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>
                    )
                  )}
                </div>

                <div className="creator-nudge-row">
                  {[
                    [
                      "← X",
                      "x",
                      -5,
                    ],
                    [
                      "X →",
                      "x",
                      5,
                    ],
                    [
                      "← Z",
                      "z",
                      -5,
                    ],
                    [
                      "Z →",
                      "z",
                      5,
                    ],
                  ].map(
                    ([
                      label,
                      axis,
                      amount,
                    ]) => (
                      <button
                        type="button"
                        key={
                          label
                        }
                        disabled={
                          selected.locked
                        }
                        onClick={() =>
                          updatePosition(
                            axis,
                            selected
                              .position[
                              axis
                            ] +
                              amount
                          )
                        }
                      >
                        {
                          label
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="creator-inspector-block creator-tab-transform">
                <div className="creator-inspector-title">
                  ROTATION
                  <span>
                    DEG
                  </span>
                </div>

                <div className="creator-vector-fields">
                  {[
                    "x",
                    "y",
                    "z",
                  ].map(
                    (
                      key
                    ) => (
                      <label
                        key={
                          key
                        }
                      >
                        <span>
                          {
                            key.toUpperCase()
                          }
                        </span>

                        <input
                          type="number"
                          value={
                            selected
                              .rotation[
                              key
                            ]
                          }
                          disabled={
                            selected.locked
                          }
                          onChange={(
                            event
                          ) =>
                            updateRotation(
                              key,
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="creator-inspector-block creator-tab-object creator-appearance-dropdown-block">
                <div className="creator-inspector-title">
                  COLOR + MATERIAL
                </div>

                <small className="creator-material-global-note">
                  Available in STUDIO · ARCHITECT
                </small>

                <div className="creator-appearance-picker">
                  <span className="creator-appearance-picker-label">
                    APPEARANCE
                  </span>

                  <details className="creator-appearance-details">
                    <summary>
                      <i
                        className={
                          materialPreset(
                            selected.materialId
                          ).transparent
                            ? "creator-appearance-swatch transparent"
                            : "creator-appearance-swatch"
                        }
                        style={{
                          backgroundColor:
                            materialColor(
                              selected.materialId
                            ),
                        }}
                      />

                      <span>
                        {
                          materialPreset(
                            selected.materialId
                          ).label
                        }
                      </span>

                      <small>
                        {materialPreset(
                          selected.materialId
                        ).group ===
                        "material"
                          ? "MATERIAL"
                          : "COLOR"}
                      </small>

                      <b>
                        ▾
                      </b>
                    </summary>

                    <div className="creator-appearance-menu">
                      <div className="creator-appearance-group-title">
                        COLORS
                      </div>

                      {MATERIALS.filter(
                        (item) =>
                          item.group ===
                          "color"
                      ).map(
                        (item) => (
                          <button
                            type="button"
                            key={
                              item.id
                            }
                            className={
                              selected.materialId ===
                              item.id
                                ? "active"
                                : ""
                            }
                            disabled={
                              selected.locked
                            }
                            onClick={(
                              event
                            ) => {
                              setMaterial(
                                item.id
                              );

                              event.currentTarget
                                .closest(
                                  "details"
                                )
                                ?.removeAttribute(
                                  "open"
                                );
                            }}
                          >
                            <i
                              className="creator-appearance-swatch"
                              style={{
                                backgroundColor:
                                  item.color,
                              }}
                            />

                            <span>
                              {
                                item.label
                              }
                            </span>

                            {selected.materialId ===
                              item.id && (
                              <small>
                                ✓
                              </small>
                            )}
                          </button>
                        )
                      )}

                      <div className="creator-appearance-group-title creator-appearance-material-title">
                        MATERIALS
                      </div>

                      {MATERIALS.filter(
                        (item) =>
                          item.group ===
                          "material"
                      ).map(
                        (item) => (
                          <button
                            type="button"
                            key={
                              item.id
                            }
                            className={
                              selected.materialId ===
                              item.id
                                ? "active"
                                : ""
                            }
                            disabled={
                              selected.locked
                            }
                            onClick={(
                              event
                            ) => {
                              setMaterial(
                                item.id
                              );

                              event.currentTarget
                                .closest(
                                  "details"
                                )
                                ?.removeAttribute(
                                  "open"
                                );
                            }}
                          >
                            <i
                              className={
                                item.transparent
                                  ? "creator-appearance-swatch transparent"
                                  : "creator-appearance-swatch"
                              }
                              style={{
                                backgroundColor:
                                  item.color,
                              }}
                            />

                            <span>
                              {
                                item.label
                              }
                            </span>

                            {selected.materialId ===
                              item.id && (
                              <small>
                                ✓
                              </small>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </details>
                </div>

                <div className="creator-material-current">
                  <span>
                    SELECTED
                  </span>

                  <strong>
                    {
                      materialPreset(
                        selected.materialId
                      ).label
                    }
                  </strong>

                  <small>
                    {materialPreset(
                      selected.materialId
                    ).group ===
                    "material"
                      ? materialPreset(
                          selected.materialId
                        ).metalness >
                        0.5
                        ? "METALLIC MATERIAL"
                        : materialPreset(
                            selected.materialId
                          ).transparent
                          ? "TRANSPARENT MATERIAL"
                          : "ARCHITECTURAL MATERIAL"
                      : "COLOR PRESET"}
                  </small>
                </div>
              </div>
            </>
          )}

          {creatorMode ===
            "architecture" &&
            inspectorTab ===
              "output" && (
            <div className="creator-architecture-output creator-tab-output">
              <div className="creator-export-heading">
                <span>
                  A1
                </span>

                <strong>
                  ARCHITECTURAL PRINT MODEL
                </strong>
              </div>

              <div className={`creator-architecture-production-status ${architectureProductionQA.status.toLowerCase()}`}>
                <div>
                  <span>
                    PRODUCTION
                  </span>

                  <strong>
                    {
                      architectureProductionQA.status
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    BLOCKERS
                  </span>

                  <strong>
                    {
                      architectureProductionQA.blockerCount
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    WARNINGS
                  </span>

                  <strong>
                    {
                      architectureProductionQA.warningCount
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    OBJECTS
                  </span>

                  <strong>
                    {architectureProductionQA.architectureObjectCount} / {
                      MAX_OBJECTS
                    }
                  </strong>
                </div>
              </div>

              <div className="creator-architecture-production-actions">
                <button
                  type="button"
                  onClick={
                    runArchitectureProductionCheck
                  }
                >
                  RUN PRODUCTION CHECK
                </button>

                <button
                  type="button"
                  onClick={
                    downloadArchitectureQAReport
                  }
                >
                  QA REPORT
                </button>
              </div>

              {(architectureProductionQA.blockers.length >
                0 ||
                architectureProductionQA.warnings.length >
                  0) && (
                <div className="creator-architecture-qa-list">
                  {[
                    ...architectureProductionQA.blockers.map(
                      (issue) => ({
                        ...issue,
                        severity:
                          "blocker",
                      })
                    ),
                    ...architectureProductionQA.warnings.map(
                      (issue) => ({
                        ...issue,
                        severity:
                          "warning",
                      })
                    ),
                  ]
                    .slice(
                      0,
                      8
                    )
                    .map(
                      (
                        issue,
                        index
                      ) => (
                        <button
                          type="button"
                          className={
                            `creator-architecture-qa-item ${issue.severity}`
                          }
                          key={
                            `${issue.code}-${index}`
                          }
                          onClick={() =>
                            focusArchitectureQAIssue(
                              issue
                            )
                          }
                        >
                          <i>
                            {issue.severity ===
                            "blocker"
                              ? "!"
                              : "⚠"}
                          </i>

                          <span>
                            <strong>
                              {
                                issue.title
                              }
                            </strong>

                            <small>
                              {
                                issue.detail
                              }
                            </small>
                          </span>

                          <b>
                            {issue.objectId
                              ? "VIEW"
                              : "INFO"}
                          </b>
                        </button>
                      )
                    )}
                </div>
              )}

              <details className="creator-architecture-level-qa">
                <summary>
                  <span>
                    LEVEL QA
                  </span>

                  <strong>
                    {
                      architectureProductionQA.levelStats.length
                    }
                  </strong>

                  <b>
                    ▾
                  </b>
                </summary>

                <div className="creator-architecture-level-qa-body">
                  {architectureProductionQA.levelStats.map(
                    (level) => (
                      <div
                        className="creator-architecture-level-qa-row"
                        key={
                          level.id
                        }
                      >
                        <span>
                          {
                            level.name
                          }
                        </span>

                        <small>
                          {level.solids} SOLID · {level.openings} HOLE
                        </small>

                        <strong>
                          {level.width.toFixed(
                            1
                          )} × {level.depth.toFixed(
                            1
                          )} MM
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </details>

              <div className={`creator-architecture-output-status ${architectureCheck.status.toLowerCase()}`}>
                <div>
                  <span>
                    STATUS
                  </span>

                  <strong>
                    {
                      architectureCheck.status
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    SCALE
                  </span>

                  <strong>
                    1:{
                      architectureScale
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    SIZE
                  </span>

                  <strong>
                    {architectureCheck.width.toFixed(
                      1
                    )} × {architectureCheck.depth.toFixed(
                      1
                    )} × {architectureCheck.height.toFixed(
                      1
                    )} MM
                  </strong>
                </div>

                <div>
                  <span>
                    MIN PRINT WALL
                  </span>

                  <strong>
                    {
                      ARCH_MIN_PRINT_WALL_MM
                    } MM
                  </strong>
                </div>
              </div>

              {(architectureCheck.thinWalls >
                0 ||
                architectureCheck.thinColumns >
                  0 ||
                architectureCheck.outsideBed) && (
                <div className="creator-architecture-warning-list">
                  {architectureCheck.thinWalls >
                    0 && (
                    <span>
                      ⚠ {
                        architectureCheck.thinWalls
                      } wall(s) below {
                        ARCH_MIN_PRINT_WALL_MM
                      } mm at print scale.
                    </span>
                  )}

                  {architectureCheck.thinColumns >
                    0 && (
                    <span>
                      ⚠ {
                        architectureCheck.thinColumns
                      } column(s) may be too thin.
                    </span>
                  )}

                  {architectureCheck.outsideBed && (
                    <span>
                      ⚠ Model footprint exceeds the 256 × 256 mm Creator build plate.
                    </span>
                  )}
                </div>
              )}

              <button
                type="button"
                className="creator-architecture-split-levels"
                onClick={
                  downloadArchitectureLevelsZip
                }
                disabled={
                  exporting ||
                  architectureCheck
                    .objectCount ===
                    0 ||
                  architectureProductionQA
                    .blockerCount >
                    0
                }
              >
                SPLIT BY LEVEL · 3MF ZIP
              </button>

              <small className="creator-field-note">
                Export uses the scaled physical dimensions shown above. SPLIT BY LEVEL creates one 3MF per architecture level inside a ZIP.
              </small>
            </div>
          )}

          <div className="creator-export-tools creator-tab-output">
            <div className="creator-export-heading">
              <span>
                05
              </span>

              <strong>
                EXPORT & PROJECT
              </strong>
            </div>

            <div className="creator-export-grid">
              <button
                type="button"
                onClick={
                  downloadSTL
                }
                disabled={
                  exporting ||
                  architectureExportBlocked
                }
              >
                <Download
                  size={15}
                  strokeWidth={
                    1.45
                  }
                />

                <span>
                  STL
                </span>

                <small>
                  Binary
                </small>
              </button>

              <button
                type="button"
                onClick={
                  download3MF
                }
                disabled={
                  exporting ||
                  architectureExportBlocked
                }
              >
                <Download
                  size={15}
                  strokeWidth={
                    1.45
                  }
                />

                <span>
                  3MF
                </span>

                <small>
                  Millimeters
                </small>
              </button>
            </div>

            {objects.some(
              (item) =>
                item.role ===
                "hole"
            ) && (
              <div className="creator-export-warning">
                {creatorMode ===
                "architecture"
                  ? "Architect export is blocked while unapplied openings remain. Use CUT OPENING first."
                  : "Unapplied HOLE objects are not exported. Use CUT / HOLE first if you want the opening in the final file."}
              </div>
            )}

            {exportMessage && (
              <div className="creator-export-message">
                {
                  exportMessage
                }
              </div>
            )}
          </div>

          <div className="creator-inspector-actions">
            <button
              type="button"
              className="creator-primary-action creator-send-project-action"
              onClick={
                sendToProject
              }
              disabled={
                exporting ||
                architectureExportBlocked
              }
            >
              <span className="creator-send-project-label">
                <Send
                  size={14}
                  strokeWidth={
                    1.5
                  }
                />

                {exporting
                  ? "Preparing Model…"
                  : "Send Model to Project"}
              </span>

              <span>
                ↗
              </span>
            </button>

            <button
              type="button"
              className="creator-reset-action"
              onClick={
                resetScene
              }
            >
              <RefreshCcw
                size={14}
                strokeWidth={
                  1.45
                }
              />

              Reset Scene
            </button>
          </div>
        </aside>
      </div>
      <SketchExtrudeModal
        open={
          sketchOpen
        }
        engineStatus={
          manifoldStatus
        }
        onClose={() =>
          setSketchOpen(
            false
          )
        }
        onCreate={
          createSketchSolid
        }
      />

      <RevolveModal
        open={
          revolveOpen
        }
        engineStatus={
          manifoldStatus
        }
        onClose={() =>
          setRevolveOpen(
            false
          )
        }
        onCreate={
          createRevolveSolid
        }
      />

    </section>
  );
}

export default BeyondCreator;
