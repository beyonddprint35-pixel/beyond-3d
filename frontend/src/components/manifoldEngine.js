import * as THREE from "three";

let manifoldPromise = null;

async function loadManifold() {
  if (
    manifoldPromise
  ) {
    return manifoldPromise;
  }

  manifoldPromise =
    (async () => {
      const [
        moduleImport,
        wasmImport,
      ] =
        await Promise.all([
          import(
            "manifold-3d"
          ),
          import(
            "manifold-3d/manifold.wasm?url"
          ),
        ]);

      const createModule =
        moduleImport.default;

      const wasmUrl =
        wasmImport.default;

      const module =
        await createModule({
          locateFile: () =>
            wasmUrl,
        });

      module.setup();

      return module;
    })();

  try {
    return await manifoldPromise;
  } catch (error) {
    manifoldPromise = null;
    throw error;
  }
}

export async function warmManifoldEngine() {
  await loadManifold();
  return true;
}

function normalizeCreatorGeometry(
  geometry
) {
  geometry.computeBoundingBox();

  const box =
    geometry.boundingBox;

  if (!box) {
    return geometry;
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

  geometry.translate(
    -centerX,
    -box.min.y,
    -centerZ
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

function manifoldMeshToThree(
  manifold,
  sceneScale
) {
  const mesh =
    manifold.getMesh();

  const numProp =
    Number(
      mesh.numProp ||
      3
    );

  const triangleIndices =
    mesh.triVerts;

  const properties =
    mesh.vertProperties;

  const positions =
    new Float32Array(
      triangleIndices.length *
        3
    );

  for (
    let index = 0;
    index <
      triangleIndices.length;
    index += 1
  ) {
    const sourceIndex =
      Number(
        triangleIndices[
          index
        ]
      );

    const offset =
      sourceIndex *
      numProp;

    const x =
      Number(
        properties[
          offset
        ]
      );

    const profileY =
      Number(
        properties[
          offset + 1
        ]
      );

    const extrusionZ =
      Number(
        properties[
          offset + 2
        ]
      );

    // Manifold extrudes a profile in XY along +Z.
    // Creator is Y-up, so map Manifold Z -> Creator Y
    // and Manifold Y -> Creator -Z.
    positions[
      index * 3
    ] =
      x *
      sceneScale;

    positions[
      index * 3 + 1
    ] =
      extrusionZ *
      sceneScale;

    positions[
      index * 3 + 2
    ] =
      -profileY *
      sceneScale;
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  return normalizeCreatorGeometry(
    geometry
  );
}

async function manifoldExtrusion(
  points,
  {
    height,
    twistDegrees,
    scaleTop,
    sceneScale,
  }
) {
  const module =
    await loadManifold();

  const contour =
    points.map(
      (point) => [
        Number(
          point[0]
        ),
        Number(
          point[1]
        ),
      ]
    );

  const signedArea =
    contour.reduce(
      (
        total,
        point,
        index
      ) => {
        const next =
          contour[
            (index + 1) %
              contour.length
          ];

        return (
          total +
          point[0] *
            next[1] -
          next[0] *
            point[1]
        );
      },
      0
    ) / 2;

  if (
    signedArea < 0
  ) {
    contour.reverse();
  }

  const contours = [
    contour,
  ];

  const crossSection =
    new module.CrossSection(
      contours
    );

  let solid = null;

  try {
    const divisions =
      Math.max(
        0,
        Math.ceil(
          Math.abs(
            twistDegrees
          ) / 15
        )
      );

    solid =
      crossSection.extrude(
        Number(
          height
        ),
        divisions,
        Number(
          twistDegrees
        ),
        [
          Number(
            scaleTop
          ),
          Number(
            scaleTop
          ),
        ],
        false
      );

    if (
      solid.isEmpty()
    ) {
      throw new Error(
        "The sketch produced an empty solid. Check that the profile does not cross itself."
      );
    }

    return manifoldMeshToThree(
      solid,
      sceneScale
    );
  } finally {
    solid?.delete?.();
    crossSection.delete?.();
  }
}

function threeFallbackExtrusion(
  points,
  {
    height,
    sceneScale,
  }
) {
  const shape =
    new THREE.Shape();

  points.forEach(
    (
      point,
      index
    ) => {
      const x =
        Number(
          point[0]
        ) *
        sceneScale;

      const y =
        Number(
          point[1]
        ) *
        sceneScale;

      if (
        index === 0
      ) {
        shape.moveTo(
          x,
          y
        );
      } else {
        shape.lineTo(
          x,
          y
        );
      }
    }
  );

  shape.closePath();

  const geometry =
    new THREE.ExtrudeGeometry(
      shape,
      {
        depth:
          Number(
            height
          ) *
          sceneScale,
        steps: 1,
        bevelEnabled:
          false,
        curveSegments: 12,
      }
    );

  geometry.rotateX(
    -Math.PI / 2
  );

  return normalizeCreatorGeometry(
    geometry
  );
}

export async function createExtrudedSketchGeometry(
  points,
  {
    height = 30,
    twistDegrees = 0,
    scaleTop = 1,
    sceneScale = 0.018,
  } = {}
) {
  if (
    !Array.isArray(
      points
    ) ||
    points.length < 3
  ) {
    throw new Error(
      "A sketch needs at least three points."
    );
  }

  try {
    const geometry =
      await manifoldExtrusion(
        points,
        {
          height,
          twistDegrees,
          scaleTop,
          sceneScale,
        }
      );

    return {
      geometry,
      engine:
        "MANIFOLD WASM",
    };
  } catch (error) {
    console.warn(
      "Manifold extrusion failed; using Three.js fallback:",
      error
    );

    const geometry =
      threeFallbackExtrusion(
        points,
        {
          height,
          sceneScale,
        }
      );

    return {
      geometry,
      engine:
        "THREE FALLBACK",
      warning:
        error?.message ||
        "Manifold unavailable",
    };
  }
}


async function manifoldRevolve(
  points,
  {
    circularSegments,
    revolveDegrees,
    sceneScale,
  }
) {
  const module =
    await loadManifold();

  const contour =
    points.map(
      (point) => [
        Number(
          point[0]
        ),
        Number(
          point[1]
        ),
      ]
    );

  const signedArea =
    contour.reduce(
      (
        total,
        point,
        index
      ) => {
        const next =
          contour[
            (index + 1) %
              contour.length
          ];

        return (
          total +
          point[0] *
            next[1] -
          next[0] *
            point[1]
        );
      },
      0
    ) / 2;

  if (
    signedArea < 0
  ) {
    contour.reverse();
  }

  const crossSection =
    new module.CrossSection(
      [
        contour,
      ]
    );

  let solid = null;

  try {
    solid =
      crossSection.revolve(
        Math.max(
          12,
          Math.round(
            Number(
              circularSegments ||
                64
            )
          )
        ),
        Math.max(
          1,
          Math.min(
            360,
            Number(
              revolveDegrees ||
                360
            )
          )
        )
      );

    if (
      solid.isEmpty()
    ) {
      throw new Error(
        "The revolved profile produced an empty solid. Keep the profile on the positive-radius side of the axis and avoid self-intersections."
      );
    }

    return manifoldMeshToThree(
      solid,
      sceneScale
    );
  } finally {
    solid?.delete?.();
    crossSection.delete?.();
  }
}

function threeFallbackRevolve(
  points,
  {
    circularSegments,
    revolveDegrees,
    sceneScale,
  }
) {
  const profile =
    points.map(
      (point) =>
        new THREE.Vector2(
          Math.max(
            0,
            Number(
              point[0]
            )
          ) *
            sceneScale,
          Number(
            point[1]
          ) *
            sceneScale
        )
    );

  const geometry =
    new THREE.LatheGeometry(
      profile,
      Math.max(
        12,
        Math.round(
          Number(
            circularSegments ||
              64
          )
        )
      ),
      0,
      THREE.MathUtils.degToRad(
        Math.max(
          1,
          Math.min(
            360,
            Number(
              revolveDegrees ||
                360
            )
          )
        )
      )
    );

  return normalizeCreatorGeometry(
    geometry
  );
}

export async function createRevolvedSketchGeometry(
  points,
  {
    circularSegments = 64,
    revolveDegrees = 360,
    sceneScale = 0.018,
  } = {}
) {
  if (
    !Array.isArray(
      points
    ) ||
    points.length < 4
  ) {
    throw new Error(
      "A revolve profile needs at least two profile points plus the rotation axis."
    );
  }

  const hasNegativeRadius =
    points.some(
      (point) =>
        Number(
          point[0]
        ) <
        -0.001
    );

  if (
    hasNegativeRadius
  ) {
    throw new Error(
      "Revolve profiles must stay on the positive side of the rotation axis."
    );
  }

  try {
    const geometry =
      await manifoldRevolve(
        points,
        {
          circularSegments,
          revolveDegrees,
          sceneScale,
        }
      );

    return {
      geometry,
      engine:
        "MANIFOLD REVOLVE",
    };
  } catch (
    error
  ) {
    console.warn(
      "Manifold revolve failed; using Three.js LatheGeometry fallback:",
      error
    );

    const geometry =
      threeFallbackRevolve(
        points,
        {
          circularSegments,
          revolveDegrees,
          sceneScale,
        }
      );

    return {
      geometry,
      engine:
        "THREE LATHE FALLBACK",
      warning:
        error?.message ||
        "Manifold revolve unavailable",
    };
  }
}


function creatorGeometryToManifoldMesh(
  module,
  geometry,
  tolerance
) {
  const position =
    geometry.getAttribute(
      "position"
    );

  if (!position) {
    throw new Error(
      "Mesh has no position data."
    );
  }

  const vertProperties =
    new Float32Array(
      position.count *
        3
    );

  for (
    let index = 0;
    index <
      position.count;
    index += 1
  ) {
    vertProperties[
      index * 3
    ] =
      position.getX(
        index
      );

    vertProperties[
      index * 3 + 1
    ] =
      position.getY(
        index
      );

    vertProperties[
      index * 3 + 2
    ] =
      position.getZ(
        index
      );
  }

  let triVerts;

  if (
    geometry.index
  ) {
    triVerts =
      Uint32Array.from(
        geometry.index.array
      );
  } else {
    triVerts =
      new Uint32Array(
        position.count
      );

    for (
      let index = 0;
      index <
        position.count;
      index += 1
    ) {
      triVerts[
        index
      ] =
        index;
    }
  }

  if (
    triVerts.length %
      3 !==
    0
  ) {
    throw new Error(
      "Mesh triangle index data is invalid."
    );
  }

  return new module.Mesh({
    numProp: 3,
    vertProperties,
    triVerts,
    tolerance:
      Math.max(
        0,
        Number(
          tolerance ||
            0
        )
      ),
  });
}

function manifoldToCreatorGeometryDirect(
  solid
) {
  const mesh =
    solid.getMesh();

  const numProp =
    Number(
      mesh.numProp ||
      3
    );

  const properties =
    mesh.vertProperties;

  const triVerts =
    mesh.triVerts;

  const vertexCount =
    Math.floor(
      properties.length /
        numProp
    );

  const positions =
    new Float32Array(
      vertexCount *
        3
    );

  for (
    let index = 0;
    index <
      vertexCount;
    index += 1
  ) {
    const offset =
      index *
      numProp;

    positions[
      index * 3
    ] =
      Number(
        properties[
          offset
        ]
      );

    positions[
      index * 3 + 1
    ] =
      Number(
        properties[
          offset + 1
        ]
      );

    positions[
      index * 3 + 2
    ] =
      Number(
        properties[
          offset + 2
        ]
      );
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  geometry.setIndex(
    Uint32Array.from(
      triVerts
    )
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  mesh.delete?.();

  return geometry;
}

export async function cleanCreatorGeometryWithManifold(
  geometry,
  {
    tolerance = 0.0009,
    simplifyTolerance = 0,
  } = {}
) {
  const module =
    await loadManifold();

  let mesh = null;
  let solid = null;
  let result = null;

  try {
    mesh =
      creatorGeometryToManifoldMesh(
        module,
        geometry,
        tolerance
      );

    // Best effort: reconnect duplicate/open vertices that are already
    // coincident or within the supplied tolerance.
    mesh.merge?.();

    solid =
      module.Manifold.ofMesh
        ? module.Manifold.ofMesh(
            mesh
          )
        : new module.Manifold(
            mesh
          );

    const status =
      solid.status?.();

    if (
      solid.isEmpty?.()
    ) {
      throw new Error(
        `Manifold could not build a closed oriented solid${
          status !==
            undefined
            ? ` · status ${String(
                status
              )}`
            : ""
        }. Fill visible holes first, then run Manifold Clean.`
      );
    }

    result =
      simplifyTolerance >
      0
        ? solid.simplify(
            simplifyTolerance
          )
        : solid;

    const output =
      manifoldToCreatorGeometryDirect(
        result
      );

    return {
      geometry:
        output,
      info: {
        status:
          "MANIFOLD",
        vertices:
          Number(
            result.numVert?.() ||
              0
          ),
        triangles:
          Number(
            result.numTri?.() ||
              0
          ),
        genus:
          Number(
            result.genus?.() ||
              0
          ),
        volume:
          Number(
            result.volume?.() ||
              0
          ),
        surfaceArea:
          Number(
            result.surfaceArea?.() ||
              0
          ),
        tolerance:
          Number(
            result.tolerance?.() ||
              tolerance
          ),
      },
    };
  } catch (
    error
  ) {
    throw new Error(
      error?.message ||
        "Manifold Clean could not rebuild this mesh."
    );
  } finally {
    if (
      result &&
      result !==
        solid
    ) {
      result.delete?.();
    }

    solid?.delete?.();
    mesh?.delete?.();
  }
}


function creatorSelectionEdgeKeys(
  selection
) {
  const keys =
    new Set();

  if (
    !selection ||
    selection.mode !==
      "edge"
  ) {
    return keys;
  }

  const elements =
    Array.isArray(
      selection.elements
    ) &&
    selection.elements.length >
      0
      ? selection.elements
      : [
          {
            indices:
              selection.indices ||
              [],
          },
        ];

  elements.forEach(
    (element) => {
      if (
        !Array.isArray(
          element.indices
        ) ||
        element.indices.length <
          2
      ) {
        return;
      }

      const a =
        Number(
          element.indices[0]
        );

      const b =
        Number(
          element.indices[1]
        );

      keys.add(
        `${
          Math.min(
            a,
            b
          )
        }:${
          Math.max(
            a,
            b
          )
        }`
      );
    }
  );

  return keys;
}

export async function filletSelectedCreatorEdges(
  geometry,
  selection,
  {
    smoothness = 0.72,
    refine = 2,
    tolerance = 0.0009,
    maxInputTriangles = 30000,
    maxOutputTriangles = 250000,
  } = {}
) {
  const module =
    await loadManifold();

  if (
    !selection ||
    selection.mode !==
      "edge"
  ) {
    throw new Error(
      "Select one or more edges before applying the fillet."
    );
  }

  const selectedKeys =
    creatorSelectionEdgeKeys(
      selection
    );

  if (
    selectedKeys.size ===
    0
  ) {
    throw new Error(
      "No valid selected edges were found."
    );
  }

  let mesh = null;
  let smooth = null;
  let refined = null;

  try {
    mesh =
      creatorGeometryToManifoldMesh(
        module,
        geometry,
        tolerance
      );

    const triangleCount =
      Math.floor(
        mesh.triVerts.length /
          3
      );

    if (
      triangleCount >
      maxInputTriangles
    ) {
      throw new Error(
        `Selected-edge fillet is limited to ${maxInputTriangles.toLocaleString()} input triangles in V12. Current mesh: ${triangleCount.toLocaleString()}.`
      );
    }

    mesh.merge?.();

    const refineLevel =
      Math.round(
        THREE.MathUtils.clamp(
          Number(
            refine
          ),
          2,
          4
        )
      );

    const estimatedOutput =
      triangleCount *
      refineLevel *
      refineLevel;

    if (
      estimatedOutput >
      maxOutputTriangles
    ) {
      throw new Error(
        `This fillet would create about ${estimatedOutput.toLocaleString()} triangles. Reduce REFINE or simplify the mesh first.`
      );
    }

    const selectedSmoothness =
      THREE.MathUtils.clamp(
        Number(
          smoothness
        ),
        0.05,
        1
      );

    const triVerts =
      mesh.triVerts;

    const edgeHalfedges =
      new Map();

    for (
      let halfedge = 0;
      halfedge <
        triVerts.length;
      halfedge += 1
    ) {
      const triangle =
        Math.floor(
          halfedge /
            3
        );

      const corner =
        halfedge %
        3;

      const next =
        triangle *
          3 +
        (
          (
            corner +
            1
          ) %
          3
        );

      const a =
        Number(
          triVerts[
            halfedge
          ]
        );

      const b =
        Number(
          triVerts[
            next
          ]
        );

      const key =
        `${
          Math.min(
            a,
            b
          )
        }:${
          Math.max(
            a,
            b
          )
        }`;

      if (
        !edgeHalfedges.has(
          key
        )
      ) {
        edgeHalfedges.set(
          key,
          []
        );
      }

      edgeHalfedges
        .get(
          key
        )
        .push(
          halfedge
        );
    }

    const missing =
      Array.from(
        selectedKeys
      ).filter(
        (key) =>
          !edgeHalfedges.has(
            key
          )
      );

    if (
      missing.length >
      0
    ) {
      throw new Error(
        "The selected edge topology changed before the fillet could be applied. Re-enter Edit Mode and select the edges again."
      );
    }

    // Manifold.smooth defaults unspecified halfedges to smoothness 1.
    // To smooth ONLY the customer's selected edges, explicitly keep every
    // unselected halfedge sharp (0) and give selected halfedges the chosen
    // smoothness.
    const sharpenedEdges = [];

    edgeHalfedges.forEach(
      (
        halfedges,
        key
      ) => {
        const value =
          selectedKeys.has(
            key
          )
            ? selectedSmoothness
            : 0;

        halfedges.forEach(
          (halfedge) => {
            sharpenedEdges.push({
              halfedge,
              smoothness:
                value,
            });
          }
        );
      }
    );

    const smoothFn =
      module.Manifold
        ?.smooth;

    if (
      typeof smoothFn !==
      "function"
    ) {
      throw new Error(
        "This manifold-3d build does not expose Manifold.smooth()."
      );
    }

    smooth =
      smoothFn.call(
        module.Manifold,
        mesh,
        sharpenedEdges
      );

    if (
      smooth.isEmpty?.()
    ) {
      throw new Error(
        "The fillet could not produce a closed manifold. Run Mesh Health / Manifold Clean first."
      );
    }

    refined =
      smooth.refine(
        refineLevel
      );

    if (
      refined.isEmpty?.()
    ) {
      throw new Error(
        "The refined fillet result is empty."
      );
    }

    const output =
      manifoldToCreatorGeometryDirect(
        refined
      );

    return {
      geometry:
        output,
      info: {
        selectedEdges:
          selectedKeys.size,
        smoothness:
          selectedSmoothness,
        refine:
          refineLevel,
        inputTriangles:
          triangleCount,
        outputTriangles:
          Number(
            refined.numTri?.() ||
              0
          ),
        status:
          refined.status?.(),
      },
    };
  } catch (
    error
  ) {
    throw new Error(
      error?.message ||
        "Selected-edge fillet failed."
    );
  } finally {
    refined?.delete?.();

    if (
      smooth &&
      smooth !==
        refined
    ) {
      smooth.delete?.();
    }

    mesh?.delete?.();
  }
}
