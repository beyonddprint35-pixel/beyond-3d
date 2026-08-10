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
const MAX_OBJECTS = 24;

const MATERIALS = [
  {
    id: "navy",
    label: "Navy",
    color: "#245b87",
  },
  {
    id: "ice",
    label: "Ice",
    color: "#95c9ee",
  },
  {
    id: "graphite",
    label: "Graphite",
    color: "#4d5965",
  },
  {
    id: "white",
    label: "White",
    color: "#dce7ef",
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

function materialColor(
  id
) {
  return (
    MATERIALS.find(
      (item) =>
        item.id === id
    )?.color ||
    MATERIALS[0]
      .color
  );
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

function CameraController({
  view,
}) {
  const {
    camera,
    controls,
  } = useThree();

  useEffect(() => {
    if (!camera) {
      return;
    }

    const target =
      new THREE.Vector3(
        0,
        0.8,
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

    const position =
      positions[view] ||
      positions.perspective;

    camera.position.set(
      position[0],
      position[1],
      position[2]
    );

    if (
      view === "top"
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
      target
    );

    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(
        target
      );

      controls.update?.();
    }
  }, [
    camera,
    controls,
    view,
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
    !meshEditEnabled;

  const objectGroup = (
    <group
      ref={groupRef}
      position={[
        item.position.x *
          SCENE_SCALE,
        item.position.y *
          SCENE_SCALE,
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
      onClick={(
        event
      ) => {
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
      }}
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
              : 0.36
          }
          metalness={
            isHole
              ? 0
              : 0.14
          }
          transparent={
            isHole
          }
          opacity={
            isHole
              ? 0.28
              : item.locked
                ? 0.82
                : 1
          }
          depthWrite={
            !isHole
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
      {objectGroup}

      {canTransform && (
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
  navigationEnabled = true,
}) {
  const orbitControlsRef =
    useRef(null);

  return (
    <>
      <CameraController
        view={
          cameraView
        }
      />

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

      {objects
        .filter(
          (item) =>
            item.visible !==
            false
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
            />
          )
        )}

      <BuildPlate />

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
        cellSize={0.36}
        cellThickness={0.45}
        cellColor="#203e56"
        sectionSize={1.8}
        sectionThickness={0.75}
        sectionColor="#2c5c7d"
        fadeDistance={11}
        fadeStrength={1}
        infiniteGrid
      />

      <Environment
        preset="city"
        environmentIntensity={
          0.22
        }
      />

      <OrbitControls
        ref={
          orbitControlsRef
        }
        makeDefault
        enabled={
          navigationEnabled
        }
        enablePan
        enableRotate
        enableZoom
        screenSpacePanning
        mouseButtons={{
          LEFT:
            THREE.MOUSE.ROTATE,
          MIDDLE:
            THREE.MOUSE.PAN,
          RIGHT:
            null,
        }}
        minDistance={3}
        maxDistance={11}
        autoRotate={
          advanced
            ? false
            : autoRotate
        }
        autoRotateSpeed={0.45}
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
    "simple"
  );

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
    if (
      creatorMode !==
      "advanced"
    ) {
      return;
    }

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
      `Sketch extruded with ${result.engine}.`
    );

    setSketchOpen(
      false
    );

    return result.engine;
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

  async function sendToProject() {
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
          Start simple or switch to
          Advanced Mode for sketch and
          revolve modeling, modifiers,
          Manifold solids, viewport
          gizmos and precision tools.
        </p>
      </div>

      <div className="creator-mode-row">
        <div className="creator-mode-switch">
          <button
            type="button"
            className={
              creatorMode ===
              "simple"
                ? "active"
                : ""
            }
            onClick={() => {
              setCreatorMode(
                "simple"
              );

              setTransformMode(
                "select"
              );
            }}
          >
            SIMPLE
          </button>

          <button
            type="button"
            className={
              creatorMode ===
              "advanced"
                ? "active"
                : ""
            }
            onClick={() =>
              setCreatorMode(
                "advanced"
              )
            }
          >
            ADVANCED
          </button>
        </div>

        <span>
          {creatorMode ===
          "advanced"
            ? "SKETCH · REVOLVE · MIRROR · ARRAY · SHELL · BEVEL · G MOVE · R ROTATE · S SCALE"
            : "Simple solid modeling with precise numeric controls"}
        </span>
      </div>

      <div className="creator-shell creator-shell-v2 creator-shell-v3 creator-shell-v5">
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

          {creatorMode ===
            "advanced" && (
            <div className="creator-v6-add-tools creator-library-create">
              <div className="creator-v6-add-label">
                ADVANCED SOLIDS

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
                    SKETCH → EXTRUDE
                  </strong>

                  <small>
                    Draw a custom 2D profile and turn it into a solid
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
                    SKETCH → REVOLVE
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

          {creatorMode ===
            "advanced" && (
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

          {creatorMode ===
            "advanced" && (
            <div
              className={
                meshEditMode
                  ? "creator-advanced-toolbar creator-edit-mode-active"
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
                      snapMm
                    }
                    onChange={(
                      event
                    ) =>
                      setSnapMm(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
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
                  creatorMode ===
                  "advanced"
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
                navigationEnabled={
                  !boxSelectActive
                }
              />
            </Canvas>

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
              {creatorMode ===
                "advanced" && (
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

              <div className="creator-inspector-block creator-tab-object">
                <div className="creator-inspector-title">
                  MATERIAL LOOK
                </div>

                <div className="creator-materials">
                  {MATERIALS.map(
                    (
                      item
                    ) => (
                      <button
                        type="button"
                        key={
                          item.id
                        }
                        className={
                          selected
                            .materialId ===
                          item.id
                            ? "creator-material active"
                            : "creator-material"
                        }
                        onClick={() =>
                          setMaterial(
                            item.id
                          )
                        }
                        disabled={
                          selected.locked
                        }
                        title={
                          item.label
                        }
                      >
                        <i
                          style={{
                            background:
                              item.color,
                          }}
                        />

                        <span>
                          {
                            item.label
                          }
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
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
                  exporting
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
                  exporting
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
                Unapplied HOLE
                objects are not
                exported. Use
                CUT / HOLE first
                if you want the
                opening in the
                final file.
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
                exporting
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
