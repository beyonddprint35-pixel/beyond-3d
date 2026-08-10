import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ConvexGeometry,
} from "three/examples/jsm/geometries/ConvexGeometry.js";

function cleanPositionGeometry(
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
      "Mesh has no editable triangle positions."
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

export function prepareEditableGeometry(
  source
) {
  const clean =
    cleanPositionGeometry(
      source
    );

  const merge =
    BufferGeometryUtils
      .mergeVertices;

  const welded =
    typeof merge ===
    "function"
      ? merge(
          clean,
          1e-5
        )
      : clean;

  if (
    welded !== clean
  ) {
    clean.dispose();
  }

  welded.computeVertexNormals();
  welded.computeBoundingBox();
  welded.computeBoundingSphere();

  return welded;
}

function vertexAt(
  geometry,
  index
) {
  const position =
    geometry.getAttribute(
      "position"
    );

  return new THREE.Vector3(
    position.getX(
      index
    ),
    position.getY(
      index
    ),
    position.getZ(
      index
    )
  );
}

function distanceToSegmentSquared(
  point,
  start,
  end
) {
  const segment =
    end.clone().sub(
      start
    );

  const lengthSq =
    segment.lengthSq();

  if (
    lengthSq <= 1e-12
  ) {
    return point.distanceToSquared(
      start
    );
  }

  const t =
    THREE.MathUtils.clamp(
      point
        .clone()
        .sub(
          start
        )
        .dot(
          segment
        ) /
        lengthSq,
      0,
      1
    );

  const closest =
    start.clone().add(
      segment.multiplyScalar(
        t
      )
    );

  return point.distanceToSquared(
    closest
  );
}

export function pickEditableElement(
  geometry,
  face,
  localPoint,
  mode
) {
  const indices = [
    face.a,
    face.b,
    face.c,
  ];

  if (
    mode === "face"
  ) {
    return {
      mode: "face",
      faceIndex:
        Number.isFinite(
          face.materialIndex
        )
          ? face.materialIndex
          : 0,
      indices,
    };
  }

  const vertices =
    indices.map(
      (index) =>
        vertexAt(
          geometry,
          index
        )
    );

  if (
    mode === "vertex"
  ) {
    let winner = 0;
    let distance =
      Infinity;

    vertices.forEach(
      (vertex, index) => {
        const next =
          localPoint.distanceToSquared(
            vertex
          );

        if (
          next < distance
        ) {
          distance = next;
          winner = index;
        }
      }
    );

    return {
      mode: "vertex",
      faceIndex: 0,
      indices: [
        indices[
          winner
        ],
      ],
    };
  }

  const edges = [
    [
      indices[0],
      indices[1],
      vertices[0],
      vertices[1],
    ],
    [
      indices[1],
      indices[2],
      vertices[1],
      vertices[2],
    ],
    [
      indices[2],
      indices[0],
      vertices[2],
      vertices[0],
    ],
  ];

  let winner =
    edges[0];
  let distance =
    Infinity;

  edges.forEach(
    (edge) => {
      const next =
        distanceToSegmentSquared(
          localPoint,
          edge[2],
          edge[3]
        );

      if (
        next < distance
      ) {
        distance = next;
        winner = edge;
      }
    }
  );

  return {
    mode: "edge",
    faceIndex: 0,
    indices: [
      winner[0],
      winner[1],
    ],
  };
}


function editableTriangles(
  geometry
) {
  const position =
    geometry.getAttribute(
      "position"
    );

  if (!position) {
    return [];
  }

  const index =
    geometry.index;

  const triangleCount =
    Math.floor(
      (
        index
          ? index.count
          : position.count
      ) / 3
    );

  const triangles = [];

  for (
    let faceIndex = 0;
    faceIndex <
      triangleCount;
    faceIndex += 1
  ) {
    const offset =
      faceIndex * 3;

    triangles.push({
      faceIndex,
      indices: [
        index
          ? index.getX(
              offset
            )
          : offset,
        index
          ? index.getX(
              offset + 1
            )
          : offset + 1,
        index
          ? index.getX(
              offset + 2
            )
          : offset + 2,
      ],
    });
  }

  return triangles;
}

function editableElementKey(
  element
) {
  const indices =
    Array.from(
      new Set(
        element.indices ||
          []
      )
    ).sort(
      (
        a,
        b
      ) => a - b
    );

  if (
    element.mode ===
      "vertex"
  ) {
    return `v:${indices[0]}`;
  }

  if (
    element.mode ===
      "edge"
  ) {
    return `e:${indices.join(
      "-"
    )}`;
  }

  return `f:${
    Number.isFinite(
      element.faceIndex
    )
      ? element.faceIndex
      : indices.join("-")
  }`;
}

function normalizedElements(
  selection
) {
  if (!selection) {
    return [];
  }

  if (
    Array.isArray(
      selection.elements
    ) &&
    selection.elements.length >
      0
  ) {
    return selection.elements.map(
      (element) => ({
        mode:
          selection.mode,
        faceIndex:
          element.faceIndex ??
          0,
        indices: [
          ...(element.indices ||
            []),
        ],
      })
    );
  }

  return [
    {
      mode:
        selection.mode,
      faceIndex:
        selection.faceIndex ??
        0,
      indices: [
        ...(selection.indices ||
          []),
      ],
    },
  ];
}

function buildSelection(
  mode,
  elements
) {
  const clean =
    elements.filter(
      (element) =>
        element &&
        Array.isArray(
          element.indices
        ) &&
        element.indices.length >
          0
    );

  if (
    clean.length ===
    0
  ) {
    return null;
  }

  const indices =
    Array.from(
      new Set(
        clean.flatMap(
          (element) =>
            element.indices
        )
      )
    );

  return {
    mode,
    faceIndex:
      clean[0]
        .faceIndex ??
      0,
    indices,
    elements:
      clean.map(
        (element) => ({
          mode,
          faceIndex:
            element.faceIndex ??
            0,
          indices: [
            ...element.indices,
          ],
        })
      ),
  };
}

export function mergeEditableSelection(
  current,
  next,
  toggle = false
) {
  if (!next) {
    return current ||
      null;
  }

  const single =
    buildSelection(
      next.mode,
      [
        {
          mode:
            next.mode,
          faceIndex:
            next.faceIndex ??
            0,
          indices: [
            ...(next.indices ||
              []),
          ],
        },
      ]
    );

  if (!single) {
    return current ||
      null;
  }

  if (
    !current ||
    current.mode !==
      next.mode
  ) {
    return single;
  }

  if (!toggle) {
    return single;
  }

  const existing =
    normalizedElements(
      current
    );

  const key =
    editableElementKey(
      single.elements[0]
    );

  const existingIndex =
    existing.findIndex(
      (element) =>
        editableElementKey(
          element
        ) === key
    );

  if (
    existingIndex >= 0
  ) {
    existing.splice(
      existingIndex,
      1
    );
  } else {
    existing.push(
      single.elements[0]
    );
  }

  return buildSelection(
    current.mode,
    existing
  );
}

export function editableSelectionCount(
  selection
) {
  return normalizedElements(
    selection
  ).length;
}

export function mergeEditableSelections(
  current,
  next
) {
  if (!current) {
    return next ||
      null;
  }

  if (!next) {
    return current;
  }

  if (
    current.mode !==
    next.mode
  ) {
    return next;
  }

  const map =
    new Map();

  [
    ...normalizedElements(
      current
    ),
    ...normalizedElements(
      next
    ),
  ].forEach(
    (element) => {
      map.set(
        editableElementKey(
          element
        ),
        element
      );
    }
  );

  return buildSelection(
    current.mode,
    Array.from(
      map.values()
    )
  );
}

function uniqueEditableEdges(
  geometry
) {
  const edges =
    new Map();

  editableTriangles(
    geometry
  ).forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        (edge) => {
          const indices = [
            Math.min(
              edge[0],
              edge[1]
            ),
            Math.max(
              edge[0],
              edge[1]
            ),
          ];

          const key =
            indices.join(":");

          if (
            !edges.has(
              key
            )
          ) {
            edges.set(
              key,
              {
                mode:
                  "edge",
                faceIndex:
                  triangle.faceIndex,
                indices,
              }
            );
          }
        }
      );
    }
  );

  return Array.from(
    edges.values()
  );
}

function selectionPointForElement(
  geometry,
  element
) {
  const points =
    element.indices.map(
      (index) =>
        vertexAt(
          geometry,
          index
        )
    );

  return points.reduce(
    (
      total,
      point
    ) =>
      total.add(
        point
      ),
    new THREE.Vector3()
  ).multiplyScalar(
    1 /
      Math.max(
        1,
        points.length
      )
  );
}

export function selectEditableElementsInScreenBox(
  geometry,
  mode,
  worldMatrix,
  camera,
  viewport,
  box,
  maxElements = 50000
) {
  if (
    !geometry ||
    !camera ||
    !viewport ||
    !box
  ) {
    return null;
  }

  const left =
    Math.min(
      box.x1,
      box.x2
    );

  const right =
    Math.max(
      box.x1,
      box.x2
    );

  const top =
    Math.min(
      box.y1,
      box.y2
    );

  const bottom =
    Math.max(
      box.y1,
      box.y2
    );

  const candidates =
    mode === "vertex"
      ? Array.from(
          {
            length:
              geometry.getAttribute(
                "position"
              )?.count ||
              0,
          },
          (
            _,
            index
          ) => ({
            mode:
              "vertex",
            faceIndex: 0,
            indices: [
              index,
            ],
          })
        )
      : mode === "edge"
        ? uniqueEditableEdges(
            geometry
          )
        : editableTriangles(
            geometry
          ).map(
            (triangle) => ({
              mode:
                "face",
              faceIndex:
                triangle.faceIndex,
              indices: [
                ...triangle.indices,
              ],
            })
          );

  const selected = [];

  candidates.forEach(
    (element) => {
      const point =
        selectionPointForElement(
          geometry,
          element
        );

      point.applyMatrix4(
        worldMatrix
      );

      point.project(
        camera
      );

      if (
        point.z < -1 ||
        point.z > 1
      ) {
        return;
      }

      const x =
        (
          point.x +
          1
        ) *
        0.5 *
        viewport.width;

      const y =
        (
          1 -
          (
            point.y +
            1
          ) *
            0.5
        ) *
        viewport.height;

      if (
        x >= left &&
        x <= right &&
        y >= top &&
        y <= bottom
      ) {
        selected.push(
          element
        );
      }
    }
  );

  if (
    selected.length >
    maxElements
  ) {
    throw new Error(
      `Box selection contains ${selected.length.toLocaleString()} elements. V10 limits one browser selection to ${maxElements.toLocaleString()} elements.`
    );
  }

  return buildSelection(
    mode,
    selected
  );
}

export function selectConnectedEditableElements(
  geometry,
  selection,
  maxElements = 50000
) {
  if (!selection) {
    return null;
  }

  const triangles =
    editableTriangles(
      geometry
    );

  let elements = [];

  if (
    selection.mode ===
    "vertex"
  ) {
    const adjacency =
      new Map();

    function ensure(
      index
    ) {
      if (
        !adjacency.has(
          index
        )
      ) {
        adjacency.set(
          index,
          new Set()
        );
      }

      return adjacency.get(
        index
      );
    }

    triangles.forEach(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        ensure(a).add(b);
        ensure(a).add(c);
        ensure(b).add(a);
        ensure(b).add(c);
        ensure(c).add(a);
        ensure(c).add(b);
      }
    );

    const visited =
      new Set(
        selection.indices ||
          []
      );

    const queue =
      Array.from(
        visited
      );

    while (
      queue.length
    ) {
      const current =
        queue.shift();

      (
        adjacency.get(
          current
        ) ||
        []
      ).forEach(
        (next) => {
          if (
            visited.has(
              next
            )
          ) {
            return;
          }

          visited.add(
            next
          );

          queue.push(
            next
          );
        }
      );

      if (
        visited.size >
        maxElements
      ) {
        throw new Error(
          `Connected component exceeds ${maxElements.toLocaleString()} vertices.`
        );
      }
    }

    elements =
      Array.from(
        visited
      ).map(
        (index) => ({
          mode:
            "vertex",
          faceIndex: 0,
          indices: [
            index,
          ],
        })
      );
  } else if (
    selection.mode ===
    "edge"
  ) {
    const edges =
      uniqueEditableEdges(
        geometry
      );

    const byVertex =
      new Map();

    edges.forEach(
      (edge) => {
        edge.indices.forEach(
          (index) => {
            if (
              !byVertex.has(
                index
              )
            ) {
              byVertex.set(
                index,
                []
              );
            }

            byVertex
              .get(
                index
              )
              .push(
                edge
              );
          }
        );
      }
    );

    const selectedKeys =
      new Set(
        normalizedElements(
          selection
        ).map(
          editableElementKey
        )
      );

    const queue =
      edges.filter(
        (edge) =>
          selectedKeys.has(
            editableElementKey(
              edge
            )
          )
      );

    const visited =
      new Map();

    queue.forEach(
      (edge) =>
        visited.set(
          editableElementKey(
            edge
          ),
          edge
        )
    );

    while (
      queue.length
    ) {
      const edge =
        queue.shift();

      edge.indices.forEach(
        (vertex) => {
          (
            byVertex.get(
              vertex
            ) ||
            []
          ).forEach(
            (next) => {
              const key =
                editableElementKey(
                  next
                );

              if (
                visited.has(
                  key
                )
              ) {
                return;
              }

              visited.set(
                key,
                next
              );

              queue.push(
                next
              );
            }
          );
        }
      );

      if (
        visited.size >
        maxElements
      ) {
        throw new Error(
          `Connected component exceeds ${maxElements.toLocaleString()} edges.`
        );
      }
    }

    elements =
      Array.from(
        visited.values()
      );
  } else {
    const edgeFaces =
      new Map();

    triangles.forEach(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        [
          [a, b],
          [b, c],
          [c, a],
        ].forEach(
          (edge) => {
            const key = [
              Math.min(
                edge[0],
                edge[1]
              ),
              Math.max(
                edge[0],
                edge[1]
              ),
            ].join(":");

            if (
              !edgeFaces.has(
                key
              )
            ) {
              edgeFaces.set(
                key,
                []
              );
            }

            edgeFaces
              .get(
                key
              )
              .push(
                triangle.faceIndex
              );
          }
        );
      }
    );

    const neighbors =
      new Map();

    triangles.forEach(
      (triangle) =>
        neighbors.set(
          triangle.faceIndex,
          new Set()
        )
    );

    edgeFaces.forEach(
      (faces) => {
        faces.forEach(
          (faceA) =>
            faces.forEach(
              (faceB) => {
                if (
                  faceA !==
                  faceB
                ) {
                  neighbors
                    .get(
                      faceA
                    )
                    ?.add(
                      faceB
                    );
                }
              }
            )
        );
      }
    );

    const seeds =
      normalizedElements(
        selection
      ).map(
        (element) =>
          element.faceIndex
      );

    const visited =
      new Set(
        seeds
      );

    const queue = [
      ...seeds,
    ];

    while (
      queue.length
    ) {
      const current =
        queue.shift();

      (
        neighbors.get(
          current
        ) ||
        []
      ).forEach(
        (next) => {
          if (
            visited.has(
              next
            )
          ) {
            return;
          }

          visited.add(
            next
          );

          queue.push(
            next
          );
        }
      );

      if (
        visited.size >
        maxElements
      ) {
        throw new Error(
          `Connected component exceeds ${maxElements.toLocaleString()} faces.`
        );
      }
    }

    elements =
      triangles
        .filter(
          (triangle) =>
            visited.has(
              triangle.faceIndex
            )
        )
        .map(
          (triangle) => ({
            mode:
              "face",
            faceIndex:
              triangle.faceIndex,
            indices: [
              ...triangle.indices,
            ],
          })
        );
  }

  return buildSelection(
    selection.mode,
    elements
  );
}

export function shrinkEditableSelection(
  geometry,
  selection
) {
  if (!selection) {
    return null;
  }

  const current =
    normalizedElements(
      selection
    );

  if (
    current.length <= 1
  ) {
    return null;
  }

  const triangles =
    editableTriangles(
      geometry
    );

  if (
    selection.mode ===
    "vertex"
  ) {
    const selected =
      new Set(
        selection.indices
      );

    const adjacency =
      new Map();

    function ensure(
      index
    ) {
      if (
        !adjacency.has(
          index
        )
      ) {
        adjacency.set(
          index,
          new Set()
        );
      }

      return adjacency.get(
        index
      );
    }

    triangles.forEach(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        ensure(a).add(b);
        ensure(a).add(c);
        ensure(b).add(a);
        ensure(b).add(c);
        ensure(c).add(a);
        ensure(c).add(b);
      }
    );

    return buildSelection(
      "vertex",
      Array.from(
        selected
      )
        .filter(
          (index) =>
            Array.from(
              adjacency.get(
                index
              ) ||
                []
            ).every(
              (neighbor) =>
                selected.has(
                  neighbor
                )
            )
        )
        .map(
          (index) => ({
            mode:
              "vertex",
            faceIndex: 0,
            indices: [
              index,
            ],
          })
        )
    );
  }

  if (
    selection.mode ===
    "edge"
  ) {
    const selectedKeys =
      new Set(
        current.map(
          editableElementKey
        )
      );

    const allEdges =
      uniqueEditableEdges(
        geometry
      );

    const byVertex =
      new Map();

    allEdges.forEach(
      (edge) => {
        edge.indices.forEach(
          (vertex) => {
            if (
              !byVertex.has(
                vertex
              )
            ) {
              byVertex.set(
                vertex,
                []
              );
            }

            byVertex
              .get(
                vertex
              )
              .push(
                edge
              );
          }
        );
      }
    );

    const kept =
      current.filter(
        (edge) =>
          edge.indices.every(
            (vertex) =>
              (
                byVertex.get(
                  vertex
                ) ||
                []
              ).every(
                (neighbor) =>
                  selectedKeys.has(
                    editableElementKey(
                      neighbor
                    )
                  )
              )
          )
      );

    return buildSelection(
      "edge",
      kept
    );
  }

  const selectedFaces =
    new Set(
      current.map(
        (element) =>
          element.faceIndex
      )
    );

  const edgeFaces =
    new Map();

  triangles.forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        (edge) => {
          const key = [
            Math.min(
              edge[0],
              edge[1]
            ),
            Math.max(
              edge[0],
              edge[1]
            ),
          ].join(":");

          if (
            !edgeFaces.has(
              key
            )
          ) {
            edgeFaces.set(
              key,
              []
            );
          }

          edgeFaces
            .get(
              key
            )
            .push(
              triangle.faceIndex
            );
        }
      );
    }
  );

  const kept =
    current.filter(
      (element) => {
        const triangle =
          triangles[
            element.faceIndex
          ];

        if (!triangle) {
          return false;
        }

        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        return [
          [a, b],
          [b, c],
          [c, a],
        ].every(
          (edge) => {
            const key = [
              Math.min(
                edge[0],
                edge[1]
              ),
              Math.max(
                edge[0],
                edge[1]
              ),
            ].join(":");

            const faces =
              edgeFaces.get(
                key
              ) ||
              [];

            return (
              faces.length >=
                2 &&
              faces.every(
                (faceIndex) =>
                  selectedFaces.has(
                    faceIndex
                  )
              )
            );
          }
        );
      }
    );

  return buildSelection(
    "face",
    kept
  );
}


function editableBoundaryEdges(
  geometry
) {
  const edgeMap =
    new Map();

  editableTriangles(
    geometry
  ).forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        (
          [
            from,
            to,
          ]
        ) => {
          const key = [
            Math.min(
              from,
              to
            ),
            Math.max(
              from,
              to
            ),
          ].join(":");

          const existing =
            edgeMap.get(
              key
            );

          if (
            existing
          ) {
            existing.count +=
              1;
          } else {
            edgeMap.set(
              key,
              {
                key,
                count: 1,
                from,
                to,
                indices: [
                  Math.min(
                    from,
                    to
                  ),
                  Math.max(
                    from,
                    to
                  ),
                ],
                faceIndex:
                  triangle.faceIndex,
              }
            );
          }
        }
      );
    }
  );

  return Array.from(
    edgeMap.values()
  ).filter(
    (edge) =>
      edge.count ===
      1
  );
}

function edgeSelectionFromEdges(
  edges
) {
  return buildSelection(
    "edge",
    edges.map(
      (edge) => ({
        mode:
          "edge",
        faceIndex:
          edge.faceIndex ??
          0,
        indices: [
          ...(edge.indices ||
            [
              edge.from,
              edge.to,
            ]),
        ],
      })
    )
  );
}

export function selectSharpEditableEdges(
  geometry,
  minAngleDegrees = 45,
  maxEdges = 50000
) {
  const triangles =
    editableTriangles(
      geometry
    );

  if (
    triangles.length ===
    0
  ) {
    return null;
  }

  const faceNormals =
    triangles.map(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        const va =
          vertexAt(
            geometry,
            a
          );

        const vb =
          vertexAt(
            geometry,
            b
          );

        const vc =
          vertexAt(
            geometry,
            c
          );

        return vb
          .clone()
          .sub(
            va
          )
          .cross(
            vc
              .clone()
              .sub(
                va
              )
          )
          .normalize();
      }
    );

  const edgeMap =
    new Map();

  triangles.forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        (edge) => {
          const indices = [
            Math.min(
              edge[0],
              edge[1]
            ),
            Math.max(
              edge[0],
              edge[1]
            ),
          ];

          const key =
            indices.join(":");

          if (
            !edgeMap.has(
              key
            )
          ) {
            edgeMap.set(
              key,
              {
                indices,
                faces: [],
              }
            );
          }

          edgeMap
            .get(
              key
            )
            .faces.push(
              triangle.faceIndex
            );
        }
      );
    }
  );

  const threshold =
    THREE.MathUtils.degToRad(
      THREE.MathUtils.clamp(
        Number(
          minAngleDegrees
        ),
        0.1,
        179.9
      )
    );

  const selected = [];

  edgeMap.forEach(
    (edge) => {
      if (
        edge.faces.length !==
        2
      ) {
        return;
      }

      const first =
        faceNormals[
          edge.faces[0]
        ];

      const second =
        faceNormals[
          edge.faces[1]
        ];

      if (
        !first ||
        !second
      ) {
        return;
      }

      const angle =
        Math.acos(
          THREE.MathUtils.clamp(
            first.dot(
              second
            ),
            -1,
            1
          )
        );

      if (
        angle +
          1e-8 >=
        threshold
      ) {
        selected.push({
          mode:
            "edge",
          faceIndex:
            edge.faces[0],
          indices: [
            ...edge.indices,
          ],
        });
      }
    }
  );

  if (
    selected.length >
    maxEdges
  ) {
    throw new Error(
      `Sharp-edge selection contains ${selected.length.toLocaleString()} edges.`
    );
  }

  return buildSelection(
    "edge",
    selected
  );
}

export function selectBoundaryEditableEdges(
  geometry,
  seedSelection = null,
  maxEdges = 50000
) {
  const boundary =
    editableBoundaryEdges(
      geometry
    );

  if (
    boundary.length ===
    0
  ) {
    return null;
  }

  if (
    boundary.length >
    maxEdges
  ) {
    throw new Error(
      `Boundary contains ${boundary.length.toLocaleString()} edges.`
    );
  }

  const seedVertices =
    new Set(
      seedSelection?.mode ===
        "edge"
        ? seedSelection.indices ||
            []
        : []
    );

  if (
    seedVertices.size ===
    0
  ) {
    return edgeSelectionFromEdges(
      boundary
    );
  }

  const byVertex =
    new Map();

  boundary.forEach(
    (edge) => {
      [
        edge.from,
        edge.to,
      ].forEach(
        (vertex) => {
          if (
            !byVertex.has(
              vertex
            )
          ) {
            byVertex.set(
              vertex,
              []
            );
          }

          byVertex
            .get(
              vertex
            )
            .push(
              edge
            );
        }
      );
    }
  );

  const queue =
    boundary.filter(
      (edge) =>
        seedVertices.has(
          edge.from
        ) ||
        seedVertices.has(
          edge.to
        )
    );

  if (
    queue.length ===
    0
  ) {
    return edgeSelectionFromEdges(
      boundary
    );
  }

  const visited =
    new Map();

  queue.forEach(
    (edge) =>
      visited.set(
        edge.key,
        edge
      )
  );

  while (
    queue.length
  ) {
    const edge =
      queue.shift();

    [
      edge.from,
      edge.to,
    ].forEach(
      (vertex) => {
        (
          byVertex.get(
            vertex
          ) ||
          []
        ).forEach(
          (next) => {
            if (
              visited.has(
                next.key
              )
            ) {
              return;
            }

            visited.set(
              next.key,
              next
            );

            queue.push(
              next
            );
          }
        );
      }
    );

    if (
      visited.size >
      maxEdges
    ) {
      throw new Error(
        `Boundary component exceeds ${maxEdges.toLocaleString()} edges.`
      );
    }
  }

  return edgeSelectionFromEdges(
    Array.from(
      visited.values()
    )
  );
}

export function selectEdgeChainEditableElements(
  geometry,
  selection,
  maxTurnDegrees = 35,
  maxEdges = 10000
) {
  if (
    !selection ||
    selection.mode !==
      "edge"
  ) {
    throw new Error(
      "Select an edge before using Edge Chain."
    );
  }

  const allEdges =
    uniqueEditableEdges(
      geometry
    );

  const seed =
    normalizedElements(
      selection
    )[0];

  if (!seed) {
    return null;
  }

  const seedKey =
    editableElementKey(
      seed
    );

  const seedEdge =
    allEdges.find(
      (edge) =>
        editableElementKey(
          edge
        ) ===
        seedKey
    );

  if (!seedEdge) {
    return null;
  }

  const byVertex =
    new Map();

  allEdges.forEach(
    (edge) => {
      edge.indices.forEach(
        (vertex) => {
          if (
            !byVertex.has(
              vertex
            )
          ) {
            byVertex.set(
              vertex,
              []
            );
          }

          byVertex
            .get(
              vertex
            )
            .push(
              edge
            );
        }
      );
    }
  );

  const maxTurnRadians =
    THREE.MathUtils.degToRad(
      THREE.MathUtils.clamp(
        Number(
          maxTurnDegrees
        ),
        1,
        89
      )
    );

  const visited =
    new Map([
      [
        seedKey,
        seedEdge,
      ],
    ]);

  function walk(
    previousVertex,
    currentVertex,
    currentEdge
  ) {
    let previous =
      previousVertex;

    let current =
      currentVertex;

    let edge =
      currentEdge;

    while (
      visited.size <
      maxEdges
    ) {
      const incoming =
        vertexAt(
          geometry,
          current
        )
          .sub(
            vertexAt(
              geometry,
              previous
            )
          )
          .normalize();

      const candidates =
        (
          byVertex.get(
            current
          ) ||
          []
        ).filter(
          (candidate) =>
            editableElementKey(
              candidate
            ) !==
              editableElementKey(
                edge
              ) &&
            !visited.has(
              editableElementKey(
                candidate
              )
            )
        );

      if (
        candidates.length ===
        0
      ) {
        break;
      }

      let best = null;
      let bestTurn =
        Infinity;

      candidates.forEach(
        (candidate) => {
          const nextVertex =
            candidate.indices[0] ===
            current
              ? candidate.indices[1]
              : candidate.indices[0];

          const outgoing =
            vertexAt(
              geometry,
              nextVertex
            )
              .sub(
                vertexAt(
                  geometry,
                  current
                )
              )
              .normalize();

          const turn =
            Math.acos(
              THREE.MathUtils.clamp(
                incoming.dot(
                  outgoing
                ),
                -1,
                1
              )
            );

          if (
            turn <
            bestTurn
          ) {
            bestTurn =
              turn;

            best = {
              edge:
                candidate,
              nextVertex,
            };
          }
        }
      );

      if (
        !best ||
        bestTurn >
          maxTurnRadians
      ) {
        break;
      }

      const key =
        editableElementKey(
          best.edge
        );

      visited.set(
        key,
        best.edge
      );

      previous =
        current;

      current =
        best.nextVertex;

      edge =
        best.edge;

      if (
        current ===
        previousVertex
      ) {
        break;
      }
    }
  }

  const [
    a,
    b,
  ] =
    seedEdge.indices;

  walk(
    a,
    b,
    seedEdge
  );

  walk(
    b,
    a,
    seedEdge
  );

  return edgeSelectionFromEdges(
    Array.from(
      visited.values()
    )
  );
}

function orderedBoundaryLoopFromSelection(
  geometry,
  selection
) {
  if (
    !selection ||
    selection.mode !==
      "edge"
  ) {
    throw new Error(
      "Select boundary edges before filling a hole."
    );
  }

  const boundary =
    editableBoundaryEdges(
      geometry
    );

  const selectedKeys =
    new Set(
      normalizedElements(
        selection
      ).map(
        editableElementKey
      )
    );

  const selectedBoundary =
    boundary.filter(
      (edge) =>
        selectedKeys.has(
          `e:${edge.indices.join(
            "-"
          )}`
        )
    );

  if (
    selectedBoundary.length <
    3
  ) {
    throw new Error(
      "Select a closed boundary loop with at least 3 edges."
    );
  }

  const byVertex =
    new Map();

  selectedBoundary.forEach(
    (edge) => {
      [
        edge.from,
        edge.to,
      ].forEach(
        (vertex) => {
          if (
            !byVertex.has(
              vertex
            )
          ) {
            byVertex.set(
              vertex,
              []
            );
          }

          byVertex
            .get(
              vertex
            )
            .push(
              edge
            );
        }
      );
    }
  );

  for (
    const [
      _vertex,
      edges,
    ] of byVertex
  ) {
    if (
      edges.length !==
      2
    ) {
      throw new Error(
        "The selected boundary is not one clean closed loop. Use BOUNDARY on one hole first."
      );
    }
  }

  const startEdge =
    selectedBoundary[0];

  const loop = [
    startEdge.from,
    startEdge.to,
  ];

  let previous =
    startEdge.from;

  let current =
    startEdge.to;

  let guard = 0;

  while (
    current !==
      loop[0] &&
    guard <
      selectedBoundary.length +
        2
  ) {
    guard += 1;

    const candidates =
      byVertex.get(
        current
      ) ||
      [];

    const nextEdge =
      candidates.find(
        (edge) => {
          const other =
            edge.from ===
            current
              ? edge.to
              : edge.from;

          return (
            other !==
            previous
          );
        }
      );

    if (!nextEdge) {
      throw new Error(
        "Unable to follow the selected boundary loop."
      );
    }

    const next =
      nextEdge.from ===
      current
        ? nextEdge.to
        : nextEdge.from;

    previous =
      current;

    current =
      next;

    if (
      current !==
      loop[0]
    ) {
      loop.push(
        current
      );
    }
  }

  if (
    current !==
    loop[0]
  ) {
    throw new Error(
      "The selected boundary does not close."
    );
  }

  return loop;
}

function polygonNormalNewell(
  points
) {
  const normal =
    new THREE.Vector3();

  for (
    let index = 0;
    index <
      points.length;
    index += 1
  ) {
    const current =
      points[
        index
      ];

    const next =
      points[
        (index + 1) %
          points.length
      ];

    normal.x +=
      (
        current.y -
        next.y
      ) *
      (
        current.z +
        next.z
      );

    normal.y +=
      (
        current.z -
        next.z
      ) *
      (
        current.x +
        next.x
      );

    normal.z +=
      (
        current.x -
        next.x
      ) *
      (
        current.y +
        next.y
      );
  }

  return normal.normalize();
}

export function fillSelectedBoundaryHole(
  source,
  selection
) {
  const geometry =
    prepareEditableGeometry(
      source
    );

  const loop =
    orderedBoundaryLoopFromSelection(
      geometry,
      selection
    );

  const points =
    loop.map(
      (index) =>
        vertexAt(
          geometry,
          index
        )
    );

  if (
    points.length <
    3
  ) {
    geometry.dispose();

    throw new Error(
      "Boundary loop is too small to fill."
    );
  }

  const meshCenter =
    new THREE.Vector3();

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
    meshCenter.x +=
      position.getX(
        index
      );

    meshCenter.y +=
      position.getY(
        index
      );

    meshCenter.z +=
      position.getZ(
        index
      );
  }

  meshCenter.multiplyScalar(
    1 /
      Math.max(
        1,
        position.count
      )
  );

  const polygonCenter =
    points.reduce(
      (
        total,
        point
      ) =>
        total.add(
          point
        ),
      new THREE.Vector3()
    ).multiplyScalar(
      1 /
        points.length
    );

  let normal =
    polygonNormalNewell(
      points
    );

  if (
    normal.lengthSq() <
    1e-10
  ) {
    geometry.dispose();

    throw new Error(
      "Boundary loop is too flat or degenerate to triangulate."
    );
  }

  const outward =
    polygonCenter
      .clone()
      .sub(
        meshCenter
      );

  if (
    outward.lengthSq() >
      1e-10 &&
    normal.dot(
      outward
    ) < 0
  ) {
    loop.reverse();
    points.reverse();

    normal =
      polygonNormalNewell(
        points
      );
  }

  const absNormal = {
    x:
      Math.abs(
        normal.x
      ),
    y:
      Math.abs(
        normal.y
      ),
    z:
      Math.abs(
        normal.z
      ),
  };

  const dropAxis =
    absNormal.x >=
      absNormal.y &&
    absNormal.x >=
      absNormal.z
      ? "x"
      : absNormal.y >=
          absNormal.z
        ? "y"
        : "z";

  const projected =
    points.map(
      (point) =>
        dropAxis ===
        "x"
          ? new THREE.Vector2(
              point.y,
              point.z
            )
          : dropAxis ===
              "y"
            ? new THREE.Vector2(
                point.x,
                point.z
              )
            : new THREE.Vector2(
                point.x,
                point.y
              )
    );

  const triangles =
    THREE.ShapeUtils.triangulateShape(
      projected,
      []
    );

  if (
    triangles.length ===
    0
  ) {
    geometry.dispose();

    throw new Error(
      "Unable to triangulate this boundary. The hole may be highly non-planar or self-intersecting."
    );
  }

  const existing =
    Array.from(
      geometry.index?.array ||
        []
    );

  triangles.forEach(
    (
      [
        ia,
        ib,
        ic,
      ]
    ) => {
      let a =
        loop[ia];

      let b =
        loop[ib];

      let c =
        loop[ic];

      const va =
        vertexAt(
          geometry,
          a
        );

      const vb =
        vertexAt(
          geometry,
          b
        );

      const vc =
        vertexAt(
          geometry,
          c
        );

      const triNormal =
        vb
          .clone()
          .sub(
            va
          )
          .cross(
            vc
              .clone()
              .sub(
                va
              )
          );

      if (
        triNormal.dot(
          normal
        ) < 0
      ) {
        const swap =
          b;

        b = c;
        c = swap;
      }

      existing.push(
        a,
        b,
        c
      );
    }
  );

  geometry.setIndex(
    existing
  );

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    loopVertices:
      loop.length,
    addedTriangles:
      triangles.length,
  };
}

export function getSelectionPositions(
  geometry,
  selection
) {
  if (
    !geometry ||
    !selection
  ) {
    return null;
  }

  const elements =
    normalizedElements(
      selection
    );

  if (
    elements.length ===
    0
  ) {
    return null;
  }

  return {
    kind:
      selection.mode,
    count:
      elements.length,
    elements:
      elements.map(
        (element) => ({
          ...element,
          points:
            element.indices.map(
              (index) =>
                vertexAt(
                  geometry,
                  index
                )
            ),
        })
      ),
  };
}

export function selectAllEditableElements(
  geometry,
  mode,
  maxElements = 50000
) {
  const triangles =
    editableTriangles(
      geometry
    );

  if (
    triangles.length ===
    0
  ) {
    return null;
  }

  let elements = [];

  if (
    mode === "face"
  ) {
    elements =
      triangles.map(
        (triangle) => ({
          mode,
          faceIndex:
            triangle.faceIndex,
          indices: [
            ...triangle.indices,
          ],
        })
      );
  } else if (
    mode === "edge"
  ) {
    const edges =
      new Map();

    triangles.forEach(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        [
          [a, b],
          [b, c],
          [c, a],
        ].forEach(
          (edge) => {
            const indices =
              [
                Math.min(
                  edge[0],
                  edge[1]
                ),
                Math.max(
                  edge[0],
                  edge[1]
                ),
              ];

            const key =
              indices.join(
                ":"
              );

            if (
              !edges.has(
                key
              )
            ) {
              edges.set(
                key,
                {
                  mode,
                  faceIndex:
                    triangle.faceIndex,
                  indices,
                }
              );
            }
          }
        );
      }
    );

    elements =
      Array.from(
        edges.values()
      );
  } else {
    const position =
      geometry.getAttribute(
        "position"
      );

    elements =
      Array.from(
        {
          length:
            position?.count ||
            0,
        },
        (
          _,
          index
        ) => ({
          mode:
            "vertex",
          faceIndex: 0,
          indices: [
            index,
          ],
        })
      );
  }

  if (
    elements.length >
    maxElements
  ) {
    throw new Error(
      `Selection contains ${elements.length.toLocaleString()} elements. V9 limits one browser selection to ${maxElements.toLocaleString()} elements.`
    );
  }

  return buildSelection(
    mode,
    elements
  );
}

export function growEditableSelection(
  geometry,
  selection,
  maxElements = 50000
) {
  if (!selection) {
    return null;
  }

  const triangles =
    editableTriangles(
      geometry
    );

  const current =
    normalizedElements(
      selection
    );

  let grown = [
    ...current,
  ];

  if (
    selection.mode ===
    "vertex"
  ) {
    const selectedVertices =
      new Set(
        selection.indices
      );

    const nextVertices =
      new Set(
        selectedVertices
      );

    triangles.forEach(
      (triangle) => {
        if (
          triangle.indices.some(
            (index) =>
              selectedVertices.has(
                index
              )
          )
        ) {
          triangle.indices.forEach(
            (index) =>
              nextVertices.add(
                index
              )
          );
        }
      }
    );

    grown =
      Array.from(
        nextVertices
      ).map(
        (index) => ({
          mode:
            "vertex",
          faceIndex: 0,
          indices: [
            index,
          ],
        })
      );
  } else if (
    selection.mode ===
    "edge"
  ) {
    const selectedVertices =
      new Set(
        selection.indices
      );

    const edges =
      new Map();

    triangles.forEach(
      (triangle) => {
        const [
          a,
          b,
          c,
        ] =
          triangle.indices;

        [
          [a, b],
          [b, c],
          [c, a],
        ].forEach(
          (edge) => {
            if (
              !selectedVertices.has(
                edge[0]
              ) &&
              !selectedVertices.has(
                edge[1]
              )
            ) {
              return;
            }

            const indices =
              [
                Math.min(
                  edge[0],
                  edge[1]
                ),
                Math.max(
                  edge[0],
                  edge[1]
                ),
              ];

            const element = {
              mode:
                "edge",
              faceIndex:
                triangle.faceIndex,
              indices,
            };

            edges.set(
              editableElementKey(
                element
              ),
              element
            );
          }
        );
      }
    );

    grown =
      Array.from(
        edges.values()
      );
  } else {
    const selectedEdges =
      new Set();

    current.forEach(
      (element) => {
        const [
          a,
          b,
          c,
        ] =
          element.indices;

        [
          [a, b],
          [b, c],
          [c, a],
        ].forEach(
          (edge) =>
            selectedEdges.add(
              [
                Math.min(
                  edge[0],
                  edge[1]
                ),
                Math.max(
                  edge[0],
                  edge[1]
                ),
              ].join(":")
            )
        );
      }
    );

    grown =
      triangles
        .filter(
          (triangle) => {
            const [
              a,
              b,
              c,
            ] =
              triangle.indices;

            return [
              [a, b],
              [b, c],
              [c, a],
            ].some(
              (edge) =>
                selectedEdges.has(
                  [
                    Math.min(
                      edge[0],
                      edge[1]
                    ),
                    Math.max(
                      edge[0],
                      edge[1]
                    ),
                  ].join(":")
                )
            );
          }
        )
        .map(
          (triangle) => ({
            mode:
              "face",
            faceIndex:
              triangle.faceIndex,
            indices: [
              ...triangle.indices,
            ],
          })
        );
  }

  if (
    grown.length >
    maxElements
  ) {
    throw new Error(
      `Grow Selection would exceed ${maxElements.toLocaleString()} elements.`
    );
  }

  return buildSelection(
    selection.mode,
    grown
  );
}

function proportionalWeight(
  distance,
  radius
) {
  if (
    radius <= 0
  ) {
    return 0;
  }

  const linear =
    THREE.MathUtils.clamp(
      1 -
        distance /
          radius,
      0,
      1
    );

  return (
    linear *
    linear *
    (
      3 -
      2 * linear
    )
  );
}

export function moveEditableSelection(
  source,
  selection,
  delta,
  {
    proportional = false,
    radius = 0,
  } = {}
) {
  const geometry =
    source.clone();

  const position =
    geometry.getAttribute(
      "position"
    );

  if (!position) {
    geometry.dispose();

    throw new Error(
      "Editable mesh positions are unavailable."
    );
  }

  const unique =
    Array.from(
      new Set(
        selection.indices ||
          []
      )
    );

  if (
    unique.length ===
    0
  ) {
    return geometry;
  }

  const selectedSet =
    new Set(
      unique
    );

  const selectedPoints =
    unique
      .slice(
        0,
        64
      )
      .map(
        (index) =>
          new THREE.Vector3(
            position.getX(
              index
            ),
            position.getY(
              index
            ),
            position.getZ(
              index
            )
          )
      );

  for (
    let index = 0;
    index <
      position.count;
    index += 1
  ) {
    let weight =
      selectedSet.has(
        index
      )
        ? 1
        : 0;

    if (
      proportional &&
      weight === 0 &&
      selectedPoints.length >
        0
    ) {
      const point =
        new THREE.Vector3(
          position.getX(
            index
          ),
          position.getY(
            index
          ),
          position.getZ(
            index
          )
        );

      let nearest =
        Infinity;

      selectedPoints.forEach(
        (selectedPoint) => {
          nearest =
            Math.min(
              nearest,
              point.distanceTo(
                selectedPoint
              )
            );
        }
      );

      weight =
        proportionalWeight(
          nearest,
          radius
        );
    }

    if (
      weight <= 0
    ) {
      continue;
    }

    position.setXYZ(
      index,
      position.getX(
        index
      ) +
        delta.x *
          weight,
      position.getY(
        index
      ) +
        delta.y *
          weight,
      position.getZ(
        index
      ) +
        delta.z *
          weight
    );
  }

  position.needsUpdate =
    true;

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

function editableAdjacency(
  geometry
) {
  const map =
    new Map();

  const ensure = (
    index
  ) => {
    if (
      !map.has(
        index
      )
    ) {
      map.set(
        index,
        new Set()
      );
    }

    return map.get(
      index
    );
  };

  editableTriangles(
    geometry
  ).forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      ensure(a).add(b);
      ensure(a).add(c);
      ensure(b).add(a);
      ensure(b).add(c);
      ensure(c).add(a);
      ensure(c).add(b);
    }
  );

  return map;
}

export function smoothEditableSelection(
  source,
  selection,
  strength = 0.35
) {
  const geometry =
    source.clone();

  const amount =
    THREE.MathUtils.clamp(
      Number(
        strength
      ),
      0,
      1
    );

  const selected =
    Array.from(
      new Set(
        selection?.indices ||
          []
      )
    );

  if (
    selected.length ===
    0
  ) {
    return geometry;
  }

  const adjacency =
    editableAdjacency(
      geometry
    );

  const position =
    geometry.getAttribute(
      "position"
    );

  const updates =
    new Map();

  selected.forEach(
    (index) => {
      const neighbors =
        Array.from(
          adjacency.get(
            index
          ) ||
            []
        );

      if (
        neighbors.length ===
        0
      ) {
        return;
      }

      const average =
        new THREE.Vector3();

      neighbors.forEach(
        (neighbor) => {
          average.x +=
            position.getX(
              neighbor
            );

          average.y +=
            position.getY(
              neighbor
            );

          average.z +=
            position.getZ(
              neighbor
            );
        }
      );

      average.multiplyScalar(
        1 /
          neighbors.length
      );

      const current =
        new THREE.Vector3(
          position.getX(
            index
          ),
          position.getY(
            index
          ),
          position.getZ(
            index
          )
        );

      updates.set(
        index,
        current.lerp(
          average,
          amount
        )
      );
    }
  );

  updates.forEach(
    (
      point,
      index
    ) => {
      position.setXYZ(
        index,
        point.x,
        point.y,
        point.z
      );
    }
  );

  position.needsUpdate =
    true;

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function flattenEditableSelection(
  source,
  selection,
  axis = "y"
) {
  const geometry =
    source.clone();

  const position =
    geometry.getAttribute(
      "position"
    );

  const selected =
    Array.from(
      new Set(
        selection?.indices ||
          []
      )
    );

  if (
    !position ||
    selected.length ===
      0
  ) {
    return geometry;
  }

  const getter =
    axis === "x"
      ? "getX"
      : axis === "z"
        ? "getZ"
        : "getY";

  const average =
    selected.reduce(
      (
        total,
        index
      ) =>
        total +
        position[
          getter
        ](
          index
        ),
      0
    ) /
    selected.length;

  selected.forEach(
    (index) => {
      const x =
        position.getX(
          index
        );

      const y =
        position.getY(
          index
        );

      const z =
        position.getZ(
          index
        );

      position.setXYZ(
        index,
        axis === "x"
          ? average
          : x,
        axis === "y"
          ? average
          : y,
        axis === "z"
          ? average
          : z
      );
    }
  );

  position.needsUpdate =
    true;

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export function analyzeEditableGeometry(
  geometry
) {
  const position =
    geometry.getAttribute(
      "position"
    );

  if (!position) {
    return {
      vertices: 0,
      triangles: 0,
      boundaryEdges: 0,
      nonManifoldEdges: 0,
      degenerateTriangles: 0,
      duplicateFaces: 0,
      status:
        "INVALID",
    };
  }

  const triangles =
    editableTriangles(
      geometry
    );

  const edgeCounts =
    new Map();

  const faceKeys =
    new Set();

  let degenerateTriangles =
    0;

  let duplicateFaces =
    0;

  triangles.forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      const va =
        vertexAt(
          geometry,
          a
        );

      const vb =
        vertexAt(
          geometry,
          b
        );

      const vc =
        vertexAt(
          geometry,
          c
        );

      const areaSq =
        vb
          .clone()
          .sub(
            va
          )
          .cross(
            vc
              .clone()
              .sub(
                va
              )
          )
          .lengthSq();

      if (
        a === b ||
        b === c ||
        c === a ||
        areaSq <
          1e-12
      ) {
        degenerateTriangles +=
          1;
      }

      const faceKey =
        [
          a,
          b,
          c,
        ]
          .sort(
            (
              left,
              right
            ) =>
              left -
              right
          )
          .join(":");

      if (
        faceKeys.has(
          faceKey
        )
      ) {
        duplicateFaces +=
          1;
      } else {
        faceKeys.add(
          faceKey
        );
      }

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        (edge) => {
          const key =
            [
              Math.min(
                edge[0],
                edge[1]
              ),
              Math.max(
                edge[0],
                edge[1]
              ),
            ].join(":");

          edgeCounts.set(
            key,
            (
              edgeCounts.get(
                key
              ) ||
              0
            ) + 1
          );
        }
      );
    }
  );

  let boundaryEdges = 0;
  let nonManifoldEdges =
    0;

  edgeCounts.forEach(
    (count) => {
      if (
        count === 1
      ) {
        boundaryEdges +=
          1;
      } else if (
        count > 2
      ) {
        nonManifoldEdges +=
          1;
      }
    }
  );

  const status =
    boundaryEdges === 0 &&
    nonManifoldEdges ===
      0 &&
    degenerateTriangles ===
      0 &&
    duplicateFaces ===
      0
      ? "MANIFOLD"
      : boundaryEdges > 0
        ? "OPEN MESH"
        : "NEEDS REPAIR";

  return {
    vertices:
      position.count,
    triangles:
      triangles.length,
    boundaryEdges,
    nonManifoldEdges,
    degenerateTriangles,
    duplicateFaces,
    status,
  };
}

export function repairEditableGeometry(
  source
) {
  const prepared =
    prepareEditableGeometry(
      source
    );

  const position =
    prepared.getAttribute(
      "position"
    );

  const triangles =
    editableTriangles(
      prepared
    );

  const faceKeys =
    new Set();

  const kept = [];

  let removedDegenerate =
    0;

  let removedDuplicateFaces =
    0;

  triangles.forEach(
    (triangle) => {
      const [
        a,
        b,
        c,
      ] =
        triangle.indices;

      const va =
        vertexAt(
          prepared,
          a
        );

      const vb =
        vertexAt(
          prepared,
          b
        );

      const vc =
        vertexAt(
          prepared,
          c
        );

      const areaSq =
        vb
          .clone()
          .sub(
            va
          )
          .cross(
            vc
              .clone()
              .sub(
                va
              )
          )
          .lengthSq();

      if (
        a === b ||
        b === c ||
        c === a ||
        areaSq <
          1e-12
      ) {
        removedDegenerate +=
          1;

        return;
      }

      const faceKey =
        [
          a,
          b,
          c,
        ]
          .sort(
            (
              left,
              right
            ) =>
              left -
              right
          )
          .join(":");

      if (
        faceKeys.has(
          faceKey
        )
      ) {
        removedDuplicateFaces +=
          1;

        return;
      }

      faceKeys.add(
        faceKey
      );

      kept.push(
        [
          a,
          b,
          c,
        ]
      );
    }
  );

  const used =
    new Map();

  const compactPositions =
    [];

  const compactIndices =
    [];

  function compactIndex(
    original
  ) {
    if (
      used.has(
        original
      )
    ) {
      return used.get(
        original
      );
    }

    const next =
      compactPositions.length /
      3;

    used.set(
      original,
      next
    );

    compactPositions.push(
      position.getX(
        original
      ),
      position.getY(
        original
      ),
      position.getZ(
        original
      )
    );

    return next;
  }

  kept.forEach(
    (
      [
        a,
        b,
        c,
      ]
    ) => {
      compactIndices.push(
        compactIndex(a),
        compactIndex(b),
        compactIndex(c)
      );
    }
  );

  prepared.dispose();

  const repaired =
    new THREE.BufferGeometry();

  repaired.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      compactPositions,
      3
    )
  );

  repaired.setIndex(
    compactIndices
  );

  repaired.computeVertexNormals();
  repaired.computeBoundingBox();
  repaired.computeBoundingSphere();

  const analysis =
    analyzeEditableGeometry(
      repaired
    );

  return {
    geometry:
      repaired,
    analysis,
    removedDegenerate,
    removedDuplicateFaces,
  };
}

export function editableGeometryDimensions(
  geometry,
  sceneScale
) {
  geometry.computeBoundingBox();

  const box =
    geometry.boundingBox;

  if (!box) {
    return {
      width: 1,
      depth: 1,
      height: 1,
    };
  }

  return {
    width:
      Math.max(
        0.1,
        (
          box.max.x -
          box.min.x
        ) /
          sceneScale
      ),
    depth:
      Math.max(
        0.1,
        (
          box.max.z -
          box.min.z
        ) /
          sceneScale
      ),
    height:
      Math.max(
        0.1,
        (
          box.max.y -
          box.min.y
        ) /
          sceneScale
      ),
  };
}

export function buildFaceExtrusionGeometries(
  geometry,
  selection,
  amount,
  insetPercent = 0,
  maxFaces = 24
) {
  if (
    selection?.mode !==
      "face"
  ) {
    throw new Error(
      "Select one or more faces before using Face Push / Pull."
    );
  }

  const elements =
    normalizedElements(
      selection
    );

  if (
    elements.length ===
    0
  ) {
    throw new Error(
      "Select at least one face."
    );
  }

  if (
    elements.length >
    maxFaces
  ) {
    throw new Error(
      `V10 multi-face Push / Pull supports up to ${maxFaces} selected faces per operation.`
    );
  }

  const effectiveInset =
    elements.length ===
      1
      ? insetPercent
      : 0;

  return elements.map(
    (element) =>
      buildFaceExtrusionGeometry(
        geometry,
        {
          mode:
            "face",
          faceIndex:
            element.faceIndex,
          indices: [
            ...element.indices,
          ],
        },
        amount,
        effectiveInset
      )
  );
}

export function buildFaceExtrusionGeometry(
  geometry,
  selection,
  amount,
  insetPercent = 0
) {
  if (
    selection.mode !==
      "face" ||
    selection.indices.length !==
      3
  ) {
    throw new Error(
      "Select one face before using Face Extrude."
    );
  }

  const source =
    selection.indices.map(
      (index) =>
        vertexAt(
          geometry,
          index
        )
    );

  const centroid =
    source.reduce(
      (
        total,
        point
      ) =>
        total.add(
          point
        ),
      new THREE.Vector3()
    ).multiplyScalar(
      1 / 3
    );

  const insetScale =
    1 -
    THREE.MathUtils.clamp(
      insetPercent,
      0,
      75
    ) /
      100;

  const base =
    source.map(
      (point) =>
        centroid
          .clone()
          .add(
            point
              .clone()
              .sub(
                centroid
              )
              .multiplyScalar(
                insetScale
              )
          )
    );

  const ab =
    base[1]
      .clone()
      .sub(
        base[0]
      );

  const ac =
    base[2]
      .clone()
      .sub(
        base[0]
      );

  const normal =
    ab.cross(
      ac
    ).normalize();

  if (
    normal.lengthSq() <
    0.5
  ) {
    throw new Error(
      "This face is too small or degenerate to extrude."
    );
  }

  const epsilon =
    Math.max(
      Math.abs(
        amount
      ) *
        0.002,
      0.0002
    );

  const startOffset =
    normal
      .clone()
      .multiplyScalar(
        amount > 0
          ? -epsilon
          : epsilon
      );

  const endOffset =
    normal
      .clone()
      .multiplyScalar(
        amount
      );

  const points = [
    ...base.map(
      (point) =>
        point
          .clone()
          .add(
            startOffset
          )
    ),
    ...base.map(
      (point) =>
        point
          .clone()
          .add(
            endOffset
          )
    ),
  ];

  const tool =
    new ConvexGeometry(
      points
    );

  tool.computeVertexNormals();
  tool.computeBoundingBox();
  tool.computeBoundingSphere();

  return tool;
}