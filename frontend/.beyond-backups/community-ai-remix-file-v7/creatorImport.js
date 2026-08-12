import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  STLLoader,
} from "three/examples/jsm/loaders/STLLoader.js";
import {
  ThreeMFLoader,
} from "three/examples/jsm/loaders/3MFLoader.js";
import {
  OBJLoader,
} from "three/examples/jsm/loaders/OBJLoader.js";
import {
  GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

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

function positionsOnlyGeometry(
  source
) {
  let geometry =
    source.clone();

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

  if (
    !position ||
    position.count < 3
  ) {
    geometry.dispose();

    throw new Error(
      "The imported mesh has no triangle geometry."
    );
  }

  const clean =
    new THREE.BufferGeometry();

  clean.setAttribute(
    "position",
    position.clone()
  );

  geometry.dispose();

  return clean;
}

function objectToGeometry(
  object
) {
  object.updateMatrixWorld(
    true
  );

  const geometries = [];

  object.traverse(
    (child) => {
      if (
        !child.isMesh ||
        !child.geometry
      ) {
        return;
      }

      const geometry =
        positionsOnlyGeometry(
          child.geometry
        );

      geometry.applyMatrix4(
        child.matrixWorld
      );

      geometries.push(
        geometry
      );
    }
  );

  if (
    geometries.length ===
    0
  ) {
    throw new Error(
      "No mesh objects were found in this file."
    );
  }

  if (
    geometries.length ===
    1
  ) {
    return geometries[0];
  }

  const merged =
    mergeGeometryList(
      geometries
    );

  geometries.forEach(
    (geometry) =>
      geometry.dispose()
  );

  if (!merged) {
    throw new Error(
      "The imported mesh parts could not be merged."
    );
  }

  return merged;
}

function prepareImportedGeometry(
  sourceGeometry,
  {
    sceneScale,
    zUp,
  }
) {
  const geometry =
    positionsOnlyGeometry(
      sourceGeometry
    );

  if (zUp) {
    // Typical printable STL/3MF coordinates use Z as vertical.
    // BEYOND Creator uses Three.js Y-up coordinates.
    geometry.rotateX(
      -Math.PI / 2
    );
  }

  geometry.scale(
    sceneScale,
    sceneScale,
    sceneScale
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

function triangleCount(
  geometry
) {
  if (
    geometry.index
  ) {
    return Math.floor(
      geometry.index.count /
        3
    );
  }

  return Math.floor(
    geometry.getAttribute(
      "position"
    ).count / 3
  );
}


// BEYOND_AI_GLB_IMPORT_V6
// AI GLBs do not reliably carry printable millimeter units. For Remix we
// preserve the shape, center it on the Creator bed and normalize its largest
// dimension to 120 mm. The user can then resize it precisely in Studio.
function prepareAiGlbGeometry(
  sourceGeometry,
  sceneScale
) {
  const geometry =
    positionsOnlyGeometry(
      sourceGeometry
    );

  geometry.computeBoundingBox();

  const bounds =
    geometry.boundingBox;

  if (!bounds || bounds.isEmpty()) {
    geometry.dispose();
    throw new Error(
      "The AI GLB contains no visible mesh bounds."
    );
  }

  const size =
    new THREE.Vector3();
  const center =
    new THREE.Vector3();

  bounds.getSize(size);
  bounds.getCenter(center);

  const largest =
    Math.max(
      size.x,
      size.y,
      size.z
    );

  if (!Number.isFinite(largest) || largest <= 1e-8) {
    geometry.dispose();
    throw new Error(
      "The AI GLB has invalid dimensions."
    );
  }

  // Center X/Z and place the lowest point on the bed.
  geometry.translate(
    -center.x,
    -bounds.min.y,
    -center.z
  );

  const targetSceneSize =
    120 * sceneScale;
  const scale =
    targetSceneSize /
    largest;

  geometry.scale(
    scale,
    scale,
    scale
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export async function parseCreatorModelFile(
  file,
  sceneScale = 0.018
) {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  let geometry = null;
  let format = "";
  let engine = "THREE LOADER";
  let unitsLabel =
    "millimeters";

  if (
    extension === "stl"
  ) {
    const buffer =
      await file.arrayBuffer();

    const loader =
      new STLLoader();

    const parsed =
      loader.parse(
        buffer
      );

    geometry =
      prepareImportedGeometry(
        parsed,
        {
          sceneScale,
          zUp: true,
        }
      );

    parsed.dispose();
    format = "STL";
    engine = "THREE STL";
  } else if (
    extension === "3mf"
  ) {
    const buffer =
      await file.arrayBuffer();

    const loader =
      new ThreeMFLoader();

    const group =
      loader.parse(
        buffer
      );

    const raw =
      objectToGeometry(
        group
      );

    geometry =
      prepareImportedGeometry(
        raw,
        {
          sceneScale,
          zUp: true,
        }
      );

    raw.dispose();
    format = "3MF";
    engine = "THREE 3MF";
  } else if (
    extension === "obj"
  ) {
    const text =
      await file.text();

    const loader =
      new OBJLoader();

    const group =
      loader.parse(
        text
      );

    const raw =
      objectToGeometry(
        group
      );

    geometry =
      prepareImportedGeometry(
        raw,
        {
          sceneScale,
          // OBJ has no universal unit/up-axis declaration.
          // We keep the common Three.js Y-up interpretation.
          zUp: false,
        }
      );

    raw.dispose();
    format = "OBJ";
    engine = "THREE OBJ";
    unitsLabel =
      "millimeters / Y-up";
  } else if (
    extension === "glb"
  ) {
    const buffer =
      await file.arrayBuffer();

    const loader =
      new GLTFLoader();

    const gltf =
      await loader.parseAsync(
        buffer,
        ""
      );

    const raw =
      objectToGeometry(
        gltf.scene
      );

    geometry =
      prepareAiGlbGeometry(
        raw,
        sceneScale
      );

    raw.dispose();
    format = "GLB";
    engine = "THREE GLTF";
    unitsLabel =
      "auto-scaled to 120 mm max dimension";
  } else {
    throw new Error(
      "Unsupported format. Import STL, 3MF, OBJ or GLB."
    );
  }

  const count =
    triangleCount(
      geometry
    );

  if (
    count > 500000
  ) {
    geometry.dispose();

    throw new Error(
      "This model is too dense for browser editing (over 500,000 triangles). Simplify it first, then import again."
    );
  }

  return {
    geometry,
    format,
    engine,
    triangleCount:
      count,
    unitsLabel,
  };
}