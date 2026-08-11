import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Copy,
  Lock,
  Maximize2,
  Minimize2,
  Redo2,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";

import "./SketchWorkspace.css";

const clamp = (value, min, max) =>
  Math.min(
    max,
    Math.max(
      min,
      Number(value) || 0
    )
  );

const makeId = () =>
  `sk-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const pointDistance = (a, b) =>
  Math.hypot(
    a.x - b.x,
    a.y - b.y
  );

const deepClone = (value) =>
  JSON.parse(
    JSON.stringify(value)
  );

function translateEntity(
  entity,
  dx,
  dy
) {
  if (
    !entity ||
    entity.locked
  ) {
    return entity;
  }

  if (
    entity.type === "line"
  ) {
    return {
      ...entity,
      p1: {
        x: entity.p1.x + dx,
        y: entity.p1.y + dy,
      },
      p2: {
        x: entity.p2.x + dx,
        y: entity.p2.y + dy,
      },
    };
  }

  if (
    entity.type === "rect"
  ) {
    return {
      ...entity,
      x: entity.x + dx,
      y: entity.y + dy,
    };
  }

  if (
    entity.type === "circle"
  ) {
    return {
      ...entity,
      cx: entity.cx + dx,
      cy: entity.cy + dy,
    };
  }

  if (
    entity.type === "arc"
  ) {
    return {
      ...entity,
      center: {
        x:
          entity.center.x + dx,
        y:
          entity.center.y + dy,
      },
      start: {
        x:
          entity.start.x + dx,
        y:
          entity.start.y + dy,
      },
      end: {
        x:
          entity.end.x + dx,
        y:
          entity.end.y + dy,
      },
    };
  }

  if (
    entity.type === "spline"
  ) {
    return {
      ...entity,
      points:
        entity.points.map(
          (point) => ({
            x: point.x + dx,
            y: point.y + dy,
          })
        ),
    };
  }

  return entity;
}

function lineMetrics(entity) {
  const dx =
    entity.p2.x -
    entity.p1.x;

  const dy =
    entity.p2.y -
    entity.p1.y;

  return {
    length:
      Math.hypot(dx, dy),
    angle:
      Math.atan2(dy, dx) *
      180 /
      Math.PI,
  };
}

function entityName(entity) {
  if (!entity) {
    return "NO SELECTION";
  }

  return {
    line: "LINE",
    rect: "RECTANGLE",
    circle: "CIRCLE",
    arc: "ARC",
    spline: "SPLINE",
  }[
    entity.type
  ] || "SKETCH ITEM";
}

function circleProfile(entity) {
  return Array.from(
    {
      length: 72,
    },
    (_, index) => {
      const angle =
        index /
        72 *
        Math.PI *
        2;

      return [
        entity.cx +
          Math.cos(angle) *
            entity.r,
        entity.cy +
          Math.sin(angle) *
            entity.r,
      ];
    }
  );
}

function rectProfile(entity) {
  const x2 =
    entity.x + entity.w;

  const y2 =
    entity.y + entity.h;

  return [
    [entity.x, entity.y],
    [x2, entity.y],
    [x2, y2],
    [entity.x, y2],
  ];
}

function splineProfile(entity) {
  if (
    !entity.closed ||
    entity.points.length < 3
  ) {
    return null;
  }

  const points =
    entity.points.map(
      (point) => [
        point.x,
        point.y,
      ]
    );

  if (
    points.length > 2 &&
    Math.hypot(
      points[0][0] -
        points[
          points.length - 1
        ][0],
      points[0][1] -
        points[
          points.length - 1
        ][1]
    ) < 0.001
  ) {
    points.pop();
  }

  return points;
}

function lineLoopProfile(
  entities,
  selectedId
) {
  const lines =
    entities.filter(
      (entity) =>
        entity.type === "line"
    );

  const first =
    lines.find(
      (line) =>
        line.id === selectedId
    );

  if (!first) {
    return null;
  }

  const tolerance = 0.75;
  const near = (a, b) =>
    pointDistance(a, b) <=
    tolerance;

  const tryWalk = (
    firstStart,
    firstEnd
  ) => {
    const used =
      new Set([
        first.id,
      ]);

    const points = [
      firstStart,
      firstEnd,
    ];

    let current =
      firstEnd;

    for (
      let guard = 0;
      guard <
      lines.length + 2;
      guard += 1
    ) {
      if (
        points.length >= 4 &&
        near(
          current,
          firstStart
        )
      ) {
        return points
          .slice(0, -1)
          .map(
            (point) => [
              point.x,
              point.y,
            ]
          );
      }

      let next = null;
      let nextPoint = null;

      for (const line of lines) {
        if (
          used.has(line.id)
        ) {
          continue;
        }

        if (
          near(
            line.p1,
            current
          )
        ) {
          next = line;
          nextPoint = line.p2;
          break;
        }

        if (
          near(
            line.p2,
            current
          )
        ) {
          next = line;
          nextPoint = line.p1;
          break;
        }
      }

      if (!next) {
        return null;
      }

      used.add(next.id);
      points.push(nextPoint);
      current = nextPoint;
    }

    return null;
  };

  return (
    tryWalk(
      first.p1,
      first.p2
    ) ||
    tryWalk(
      first.p2,
      first.p1
    )
  );
}

function selectedProfile(
  entities,
  selectedId
) {
  const entity =
    entities.find(
      (item) =>
        item.id === selectedId
    );

  if (!entity) {
    return null;
  }

  if (
    entity.type === "rect"
  ) {
    return {
      points:
        rectProfile(entity),
      label:
        "RECTANGLE PROFILE",
    };
  }

  if (
    entity.type === "circle"
  ) {
    return {
      points:
        circleProfile(entity),
      label:
        "CIRCLE PROFILE",
    };
  }

  if (
    entity.type === "spline"
  ) {
    const points =
      splineProfile(entity);

    return points
      ? {
          points,
          label:
            "CLOSED SPLINE PROFILE",
        }
      : null;
  }

  if (
    entity.type === "line"
  ) {
    const points =
      lineLoopProfile(
        entities,
        selectedId
      );

    return points
      ? {
          points,
          label:
            "CLOSED LINE PROFILE",
        }
      : null;
  }

  return null;
}

function arcPoints(entity) {
  const startAngle =
    Math.atan2(
      entity.start.y -
        entity.center.y,
      entity.start.x -
        entity.center.x
    );

  let endAngle =
    Math.atan2(
      entity.end.y -
        entity.center.y,
      entity.end.x -
        entity.center.x
    );

  while (
    endAngle < startAngle
  ) {
    endAngle +=
      Math.PI * 2;
  }

  if (
    endAngle -
      startAngle >
    Math.PI * 1.8
  ) {
    endAngle -=
      Math.PI * 2;
  }

  const radius =
    pointDistance(
      entity.center,
      entity.start
    );

  return Array.from(
    {
      length: 36,
    },
    (_, index) => {
      const t =
        index / 35;

      const angle =
        startAngle +
        (
          endAngle -
          startAngle
        ) *
          t;

      return {
        x:
          entity.center.x +
          Math.cos(angle) *
            radius,
        y:
          entity.center.y +
          Math.sin(angle) *
            radius,
      };
    }
  );
}

function SketchWorkspace({
  active,
  engineStatus,
  onCreateSolid,
  onSwitchToStudio,
  objectCount = 0,
  maxObjects = 80,
}) {
  const svgRef =
    useRef(null);

  const touchPointersRef =
    useRef(new Map());

  const touchGestureRef =
    useRef(null);

  const dragSelectionRef =
    useRef(null);

  const pullExtrudeRef =
    useRef(null);

  const edgeDragRef =
    useRef(null);

  const lastFaceTapRef =
    useRef(null);

  const [
    entities,
    setEntities,
  ] = useState([]);

  const [
    past,
    setPast,
  ] = useState([]);

  const [
    future,
    setFuture,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(null);

  const [
    tool,
    setTool,
  ] = useState("select");

  const [
    plane,
    setPlane,
  ] = useState("top");

  const [
    gridSize,
    setGridSize,
  ] = useState(10);

  const [
    snapEnabled,
    setSnapEnabled,
  ] = useState(true);

  const [
    autoConstraints,
    setAutoConstraints,
  ] = useState(true);

  const [
    showDimensions,
    setShowDimensions,
  ] = useState(true);

  const [
    lineStart,
    setLineStart,
  ] = useState(null);

  const [
    lineChainStart,
    setLineChainStart,
  ] = useState(null);

  const [
    lineChainCount,
    setLineChainCount,
  ] = useState(0);

  const [
    draft,
    setDraft,
  ] = useState(null);

  const [
    arcDraft,
    setArcDraft,
  ] = useState(null);

  const [
    hoverPoint,
    setHoverPoint,
  ] = useState(null);

  const [
    pan,
    setPan,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    zoom,
    setZoom,
  ] = useState(1.45);

  const [
    size,
    setSize,
  ] = useState({
    width: 1100,
    height: 680,
  });

  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);

  const [
    extrusionHeight,
    setExtrusionHeight,
  ] = useState(20);

  const [
    creatingSolid,
    setCreatingSolid,
  ] = useState(false);

  const [
    draftSolids,
    setDraftSolids,
  ] = useState([]);

  const [
    selectedSolidId,
    setSelectedSolidId,
  ] = useState(null);

  const [
    selectedSolidFace,
    setSelectedSolidFace,
  ] = useState({ type: "top", index: null });

  const [
    selectedFeatureId,
    setSelectedFeatureId,
  ] = useState(null);

  const [
    orbitAngle,
    setOrbitAngle,
  ] = useState(58);

  const [
    orbitElevation,
    setOrbitElevation,
  ] = useState(42);

  const [
    selectedEdge,
    setSelectedEdge,
  ] = useState(null);

  const [
    edgeTreatmentMode,
    setEdgeTreatmentMode,
  ] = useState("chamfer");

  const [
    edgeTreatmentAmount,
    setEdgeTreatmentAmount,
  ] = useState(2);

  const [
    createMessage,
    setCreateMessage,
  ] = useState("");

  const [
    faceSketchTarget,
    setFaceSketchTarget,
  ] = useState(null);

  const [
    penInfo,
    setPenInfo,
  ] = useState({
    pointerType: "mouse",
    pressure: 0,
  });

  const selected =
    entities.find(
      (entity) =>
        entity.id === selectedId
    ) || null;

  const profile =
    useMemo(
      () =>
        selectedProfile(
          entities,
          selectedId
        ),
      [entities, selectedId]
    );

  const selectedSolid =
    draftSolids.find(
      (solid) =>
        solid.id === selectedSolidId
    ) || null;

  const selectedFeature =
    selectedSolid?.features?.find(
      (feature) => feature.id === selectedFeatureId
    ) || null;

  const solidNavigationActive = Boolean(
    draftSolids.length > 0 &&
    tool === "select" &&
    !faceSketchTarget
  );

  const modelHistory = useMemo(() => {
    const entries = [];
    draftSolids.forEach((solid, solidIndex) => {
      entries.push({
        id: `${solid.id}:extrude`,
        kind: "extrude",
        solidId: solid.id,
        label: `Extrude ${solidIndex + 1}`,
        value: `${Number(solid.height || 0).toFixed(1)} mm`,
      });
      (solid.features || []).forEach((feature, featureIndex) => {
        entries.push({
          id: feature.id,
          kind: "feature",
          solidId: solid.id,
          featureId: feature.id,
          label: `${feature.mode === "cut" ? "Pocket" : "Boss"} ${featureIndex + 1}`,
          value: `${Number(feature.depth || 0).toFixed(1)} mm`,
        });
      });
      (solid.edgeTreatments || []).forEach((treatment, edgeIndex) => {
        entries.push({
          id: treatment.id || `${solid.id}:edge:${edgeIndex}`,
          kind: "edge",
          solidId: solid.id,
          edgeIndex: treatment.edgeIndex,
          edgeType: treatment.edgeType || "top",
          label: `${String(treatment.mode || "chamfer").toUpperCase()} · ${(treatment.edgeType || "top").toUpperCase()} EDGE ${Number(treatment.edgeIndex) + 1}`,
          value: `${Number(treatment.amount || 0).toFixed(1)} mm`,
        });
      });
    });
    return entries;
  }, [draftSolids]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const node =
      svgRef.current
        ?.parentElement;

    if (!node) {
      return undefined;
    }

    if (
      typeof ResizeObserver ===
      "undefined"
    ) {
      const rect =
        node.getBoundingClientRect();

      setSize({
        width:
          Math.max(
            320,
            rect.width
          ),
        height:
          Math.max(
            420,
            rect.height
          ),
      });

      return undefined;
    }

    const observer =
      new ResizeObserver(
        (entries) => {
          const rect =
            entries[0]
              ?.contentRect;

          if (!rect) {
            return;
          }

          setSize({
            width:
              Math.max(
                320,
                rect.width
              ),
            height:
              Math.max(
                420,
                rect.height
              ),
          });
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    function handleKeyDown(
      event
    ) {
      const target =
        event.target;

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement
      ) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (
        (
          event.metaKey ||
          event.ctrlKey
        ) &&
        key === "z"
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      const hotkeys = {
        v: "select",
        l: "line",
        r: "rect",
        c: "circle",
        a: "arc",
        i: "spline",
        e: "erase",
      };

      if (hotkeys[key]) {
        event.preventDefault();
        activateTool(
          hotkeys[key]
        );
        return;
      }

      if (
        key === "escape"
      ) {
        event.preventDefault();
        finishCurrentTool();
        return;
      }

      if (
        key === "enter"
      ) {
        event.preventDefault();
        finishCurrentTool();
        return;
      }

      if (
        key === "delete" ||
        key === "backspace"
      ) {
        if (selectedId) {
          event.preventDefault();
          deleteSelected();
        }
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  });

  function pushHistory(
    before
  ) {
    setPast(
      (current) => [
        ...current.slice(-39),
        deepClone(before),
      ]
    );

    setFuture([]);
  }

  function commitEntities(
    updater
  ) {
    const before =
      deepClone(entities);

    const next =
      typeof updater ===
      "function"
        ? updater(
            deepClone(entities)
          )
        : updater;

    pushHistory(before);
    setEntities(next);
  }

  function undo() {
    if (past.length === 0) {
      return;
    }

    const previous =
      past[past.length - 1];

    setFuture([
      deepClone(entities),
      ...future.slice(0, 39),
    ]);

    setPast(
      past.slice(0, -1)
    );

    setEntities(
      deepClone(previous)
    );

    setSelectedId(null);
    finishCurrentTool(false);
  }

  function redo() {
    if (future.length === 0) {
      return;
    }

    const next =
      future[0];

    setPast([
      ...past.slice(-39),
      deepClone(entities),
    ]);

    setFuture(
      future.slice(1)
    );

    setEntities(
      deepClone(next)
    );

    setSelectedId(null);
    finishCurrentTool(false);
  }

  function screenPoint(
    point
  ) {
    return {
      x:
        size.width /
          2 +
        pan.x +
        point.x *
          zoom,
      y:
        size.height /
          2 +
        pan.y -
        point.y *
          zoom,
    };
  }

  function modelPointFromClient(
    clientX,
    clientY
  ) {
    const rect =
      svgRef.current
        ?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    const x =
      clientX - rect.left;

    const y =
      clientY - rect.top;

    const rawPoint = {
      x:
        (
          x -
          size.width /
            2 -
          pan.x
        ) /
        zoom,
      y:
        -(
          y -
          size.height /
            2 -
          pan.y
        ) /
        zoom,
    };

    if (faceSketchTarget?.faceType === "top") {
      const targetSolid = draftSolids.find((solid) => solid.id === faceSketchTarget.solidId);
      if (targetSolid) {
        const projection = solidProjection(targetSolid.height);
        return {
          x: rawPoint.x - projection.x,
          y: rawPoint.y - projection.y,
        };
      }
    }

    if (faceSketchTarget?.faceType === "side") {
      return sideModelToLocal(faceSketchTarget, rawPoint);
    }

    return rawPoint;
  }

  function modelPointFromEvent(
    event
  ) {
    return modelPointFromClient(
      event.clientX,
      event.clientY
    );
  }

  function endpointCandidates() {
    const result = [];

    entities.forEach(
      (entity) => {
        if (
          entity.type === "line"
        ) {
          result.push(
            entity.p1,
            entity.p2
          );
        } else if (
          entity.type === "rect"
        ) {
          result.push(
            {
              x: entity.x,
              y: entity.y,
            },
            {
              x:
                entity.x +
                entity.w,
              y: entity.y,
            },
            {
              x:
                entity.x +
                entity.w,
              y:
                entity.y +
                entity.h,
            },
            {
              x: entity.x,
              y:
                entity.y +
                entity.h,
            }
          );
        } else if (
          entity.type === "spline"
        ) {
          result.push(
            ...entity.points
          );
        }
      }
    );

    return result;
  }

  function faceSnapCandidates() {
    if (!faceSketchTarget?.solidId) return [];
    const solid = draftSolids.find((item) => item.id === faceSketchTarget.solidId);
    if (!solid?.points?.length) return [];

    if (faceSketchTarget.faceType === "side") {
      const frame = sideFaceFrame(faceSketchTarget);
      if (!frame) return [];
      const h = Math.max(0.5, Number(solid.height) || 0.5);
      const l = frame.length;
      return [
        { x: 0, y: 0, snapKind: "CORNER" },
        { x: l, y: 0, snapKind: "CORNER" },
        { x: 0, y: h, snapKind: "CORNER" },
        { x: l, y: h, snapKind: "CORNER" },
        { x: l / 2, y: 0, snapKind: "MIDPOINT" },
        { x: l / 2, y: h, snapKind: "MIDPOINT" },
        { x: 0, y: h / 2, snapKind: "MIDPOINT" },
        { x: l, y: h / 2, snapKind: "MIDPOINT" },
        { x: l / 2, y: h / 2, snapKind: "CENTER" },
      ];
    }

    const pts = solid.points.map(([x, y]) => ({ x, y, snapKind: "CORNER" }));
    solid.points.forEach((point, index) => {
      const next = solid.points[(index + 1) % solid.points.length];
      pts.push({
        x: (point[0] + next[0]) / 2,
        y: (point[1] + next[1]) / 2,
        snapKind: "MIDPOINT",
      });
    });
    const center = pointsCenter(solid.points);
    if (center) pts.push({ ...center, snapKind: "CENTER" });
    return pts;
  }

  function snapPoint(
    point,
    start = null
  ) {
    if (!point) {
      return null;
    }

    let next = {
      ...point,
      snapKind: null,
    };

    const endpointTolerance =
      13 /
      zoom;

    let nearest = null;

    [...endpointCandidates(), ...faceSnapCandidates()].forEach(
      (candidate) => {
        const distance =
          pointDistance(
            point,
            candidate
          );

        if (
          distance <=
            endpointTolerance &&
          (
            !nearest ||
            distance <
              nearest.distance
          )
        ) {
          nearest = {
            distance,
            point: candidate,
            snapKind: candidate.snapKind || "COINCIDENT",
          };
        }
      }
    );

    if (nearest) {
      return {
        x:
          nearest.point.x,
        y:
          nearest.point.y,
        snapKind:
          nearest.snapKind || "COINCIDENT",
      };
    }

    if (
      start &&
      autoConstraints
    ) {
      const dx =
        point.x -
        start.x;

      const dy =
        point.y -
        start.y;

      const length =
        Math.hypot(dx, dy);

      if (length > 0) {
        const angle =
          Math.atan2(
            dy,
            dx
          );

        const nearHorizontal =
          Math.abs(
            Math.sin(angle)
          ) < 0.12;

        const nearVertical =
          Math.abs(
            Math.cos(angle)
          ) < 0.12;

        if (nearHorizontal) {
          next.y =
            start.y;
          next.snapKind =
            "HORIZONTAL";
        } else if (
          nearVertical
        ) {
          next.x =
            start.x;
          next.snapKind =
            "VERTICAL";
        }
      }
    }

    if (snapEnabled) {
      next.x =
        Math.round(
          next.x /
            gridSize
        ) *
        gridSize;

      next.y =
        Math.round(
          next.y /
            gridSize
        ) *
        gridSize;

      next.snapKind =
        next.snapKind ||
        "GRID";
    }

    return next;
  }

  function activateTool(
    nextTool
  ) {
    setTool(nextTool);
    setSelectedId(
      nextTool === "select"
        ? selectedId
        : null
    );
    setLineStart(null);
    setLineChainStart(null);
    setLineChainCount(0);
    setDraft(null);
    setArcDraft(null);
    setCreateMessage("");
  }

  function finishCurrentTool(
    switchToSelect = true
  ) {
    setLineStart(null);
    setLineChainStart(null);
    setLineChainCount(0);
    setDraft(null);
    setArcDraft(null);
    setHoverPoint(null);

    if (switchToSelect) {
      setTool("select");
    }
  }

  function deleteSelected() {
    if (!selectedId) {
      return;
    }

    commitEntities(
      (current) =>
        current.filter(
          (entity) =>
            entity.id !==
            selectedId
        )
    );

    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected) {
      return;
    }

    const duplicate =
      translateEntity(
        {
          ...deepClone(selected),
          id: makeId(),
          locked: false,
        },
        15,
        -15
      );

    commitEntities(
      (current) => [
        ...current,
        duplicate,
      ]
    );

    setSelectedId(
      duplicate.id
    );
  }

  function toggleSelectedLock() {
    if (!selectedId) {
      return;
    }

    commitEntities(
      (current) =>
        current.map(
          (entity) =>
            entity.id ===
            selectedId
              ? {
                  ...entity,
                  locked:
                    !entity.locked,
                }
              : entity
        )
    );
  }

  function constrainSelected(
    constraint
  ) {
    if (
      !selected ||
      selected.type !==
        "line" ||
      selected.locked
    ) {
      return;
    }

    commitEntities(
      (current) =>
        current.map(
          (entity) => {
            if (
              entity.id !==
              selected.id
            ) {
              return entity;
            }

            if (
              constraint ===
              "horizontal"
            ) {
              return {
                ...entity,
                p2: {
                  ...entity.p2,
                  y:
                    entity.p1.y,
                },
                constraints: [
                  ...new Set([
                    ...(entity.constraints || []),
                    "horizontal",
                  ]),
                ],
              };
            }

            if (
              constraint ===
              "vertical"
            ) {
              return {
                ...entity,
                p2: {
                  ...entity.p2,
                  x:
                    entity.p1.x,
                },
                constraints: [
                  ...new Set([
                    ...(entity.constraints || []),
                    "vertical",
                  ]),
                ],
              };
            }

            return entity;
          }
        )
    );
  }

  function updateDimension(
    key,
    rawValue
  ) {
    if (
      !selected ||
      selected.locked
    ) {
      return;
    }

    const value =
      Math.max(
        0.1,
        Number(rawValue) ||
          0.1
      );

    commitEntities(
      (current) =>
        current.map(
          (entity) => {
            if (
              entity.id !==
              selected.id
            ) {
              return entity;
            }

            if (
              entity.type ===
                "line" &&
              key === "length"
            ) {
              const metrics =
                lineMetrics(entity);

              const angle =
                metrics.angle *
                Math.PI /
                180;

              return {
                ...entity,
                p2: {
                  x:
                    entity.p1.x +
                    Math.cos(angle) *
                      value,
                  y:
                    entity.p1.y +
                    Math.sin(angle) *
                      value,
                },
                dimensionLocked:
                  true,
              };
            }

            if (
              entity.type ===
              "rect"
            ) {
              if (
                key === "width"
              ) {
                return {
                  ...entity,
                  w:
                    Math.sign(
                      entity.w || 1
                    ) *
                    value,
                  dimensionLocked:
                    true,
                };
              }

              if (
                key === "height"
              ) {
                return {
                  ...entity,
                  h:
                    Math.sign(
                      entity.h || 1
                    ) *
                    value,
                  dimensionLocked:
                    true,
                };
              }
            }

            if (
              entity.type ===
                "circle" &&
              key === "diameter"
            ) {
              return {
                ...entity,
                r:
                  value /
                  2,
                dimensionLocked:
                  true,
              };
            }

            if (
              entity.type ===
                "arc" &&
              key === "radius"
            ) {
              const angleStart =
                Math.atan2(
                  entity.start.y -
                    entity.center.y,
                  entity.start.x -
                    entity.center.x
                );

              const angleEnd =
                Math.atan2(
                  entity.end.y -
                    entity.center.y,
                  entity.end.x -
                    entity.center.x
                );

              return {
                ...entity,
                start: {
                  x:
                    entity.center.x +
                    Math.cos(
                      angleStart
                    ) *
                      value,
                  y:
                    entity.center.y +
                    Math.sin(
                      angleStart
                    ) *
                      value,
                },
                end: {
                  x:
                    entity.center.x +
                    Math.cos(
                      angleEnd
                    ) *
                      value,
                  y:
                    entity.center.y +
                    Math.sin(
                      angleEnd
                    ) *
                      value,
                },
                dimensionLocked:
                  true,
              };
            }

            return entity;
          }
        )
    );
  }

  function closeSelectedSpline() {
    if (
      !selected ||
      selected.type !==
        "spline" ||
      selected.points.length < 3 ||
      selected.locked
    ) {
      return;
    }

    commitEntities(
      (current) =>
        current.map(
          (entity) =>
            entity.id ===
            selected.id
              ? {
                  ...entity,
                  closed:
                    !entity.closed,
                }
              : entity
        )
    );
  }

  function handleEntityPointerDown(
    event,
    entity
  ) {
    // Direct-touch selection: a single finger tap on geometry selects the
    // profile instead of always being interpreted as canvas navigation.
    // Two-finger gestures still pan/zoom from the canvas.
    if (event.pointerType === "touch" && tool !== "select") {
      return;
    }

    if (
      tool === "erase"
    ) {
      event.stopPropagation();

      commitEntities(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              entity.id
          )
      );

      if (
        selectedId ===
        entity.id
      ) {
        setSelectedId(null);
      }

      return;
    }

    if (
      tool !== "select"
    ) {
      return;
    }

    event.stopPropagation();
    setSelectedId(entity.id);

    if (!entity.locked && event.pointerType !== "touch") {
      const point =
        modelPointFromEvent(
          event
        );

      if (point) {
        dragSelectionRef.current = {
          id: entity.id,
          start: point,
          before:
            deepClone(entities),
          original:
            deepClone(entity),
          moved: false,
        };

        svgRef.current
          ?.setPointerCapture?.(
            event.pointerId
          );
      }
    }
  }

  function beginTouchGesture(
    event
  ) {
    touchPointersRef.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    const points =
      Array.from(
        touchPointersRef.current.values()
      );

    if (
      points.length === 1
    ) {
      touchGestureRef.current = {
        type: solidNavigationActive ? "orbit" : "pan",
        start:
          points[0],
        pan:
          {...pan},
        orbitAngle,
        orbitElevation,
        moved: false,
      };
    } else if (
      points.length >= 2
    ) {
      const [a, b] =
        points;

      touchGestureRef.current = {
        type: "pinch",
        distance:
          Math.hypot(
            b.x - a.x,
            b.y - a.y
          ),
        midpoint: {
          x:
            (
              a.x + b.x
            ) /
            2,
          y:
            (
              a.y + b.y
            ) /
            2,
        },
        zoom,
        pan:
          {...pan},
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        orbitAngle,
        orbitElevation,
        moved: false,
      };
    }
  }

  function moveTouchGesture(
    event
  ) {
    if (
      !touchPointersRef.current.has(
        event.pointerId
      )
    ) {
      return;
    }

    touchPointersRef.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      }
    );

    const points =
      Array.from(
        touchPointersRef.current.values()
      );

    const gesture =
      touchGestureRef.current;

    if (
      points.length === 1 &&
      gesture?.type === "orbit"
    ) {
      const dx = points[0].x - gesture.start.x;
      const dy = points[0].y - gesture.start.y;
      if (Math.hypot(dx, dy) > 5) gesture.moved = true;
      setOrbitAngle(clamp(gesture.orbitAngle + dx * 0.32, 5, 175));
      setOrbitElevation(clamp(gesture.orbitElevation - dy * 0.24, 12, 78));
      return;
    }

    if (
      points.length === 1 &&
      gesture?.type === "pan"
    ) {
      const panDx = points[0].x - gesture.start.x;
      const panDy = points[0].y - gesture.start.y;
      if (Math.hypot(panDx, panDy) > 5) gesture.moved = true;
      setPan({
        x:
          gesture.pan.x +
          points[0].x -
          gesture.start.x,
        y:
          gesture.pan.y +
          points[0].y -
          gesture.start.y,
      });

      return;
    }

    if (
      points.length >= 2
    ) {
      const [a, b] =
        points;

      const distance =
        Math.max(
          10,
          Math.hypot(
            b.x - a.x,
            b.y - a.y
          )
        );

      const midpoint = {
        x:
          (
            a.x + b.x
          ) /
          2,
        y:
          (
            a.y + b.y
          ) /
          2,
      };

      const fingerAngle = Math.atan2(b.y - a.y, b.x - a.x);

      if (
        gesture?.type !==
        "pinch"
      ) {
        touchGestureRef.current = {
          type: "pinch",
          distance,
          midpoint,
          zoom,
          pan:
            {...pan},
          angle: fingerAngle,
          orbitAngle,
          orbitElevation,
        };
        return;
      }

      const nextZoom =
        clamp(
          gesture.zoom *
            distance /
            Math.max(
              10,
              gesture.distance
            ),
          0.18,
          9
        );

      setZoom(nextZoom);
      setPan({
        x:
          gesture.pan.x +
          midpoint.x -
          gesture.midpoint.x,
        y:
          gesture.pan.y +
          midpoint.y -
          gesture.midpoint.y,
      });

      // In solid mode one finger owns orbit. Two fingers stay predictable:
      // pinch = zoom and midpoint movement = pan, like a direct-modeling tablet app.
    }
  }

  function endTouchGesture(
    event
  ) {
    const finishedGesture = touchGestureRef.current;
    touchPointersRef.current.delete(
      event.pointerId
    );

    const points =
      Array.from(
        touchPointersRef.current.values()
      );

    if (
      points.length === 1
    ) {
      touchGestureRef.current = {
        type: solidNavigationActive ? "orbit" : "pan",
        start:
          points[0],
        pan:
          {...pan},
        orbitAngle,
        orbitElevation,
        moved: true,
      };
    } else if (
      points.length === 0
    ) {
      if (
        finishedGesture &&
        !finishedGesture.moved &&
        tool === "select"
      ) {
        clearModelSelection();
      }
      touchGestureRef.current =
        null;
    }
  }

  function handleCanvasPointerDown(
    event
  ) {
    setPenInfo({
      pointerType:
        event.pointerType ||
        "mouse",
      pressure:
        event.pressure ||
        0,
    });

    if (
      event.pointerType ===
      "touch"
    ) {
      event.currentTarget.setPointerCapture?.(
        event.pointerId
      );
      beginTouchGesture(event);
      return;
    }

    const raw =
      modelPointFromEvent(
        event
      );

    if (!raw) {
      return;
    }

    if (
      tool === "select"
    ) {
      clearModelSelection();
      return;
    }

    if (
      tool === "line"
    ) {
      const point =
        snapPoint(
          raw,
          lineStart
        );

      if (!lineStart) {
        setLineStart(point);
        setLineChainStart(point);
        setLineChainCount(0);
        setHoverPoint(point);
        return;
      }

      if (
        pointDistance(
          lineStart,
          point
        ) < 0.25
      ) {
        return;
      }

      const isClosing =
        lineChainStart &&
        lineChainCount >= 2 &&
        pointDistance(
          point,
          lineChainStart
        ) <=
          13 /
          zoom;

      const endPoint =
        isClosing
          ? lineChainStart
          : point;

      const constraints = [];
      if (
        point.snapKind ===
        "HORIZONTAL"
      ) {
        constraints.push(
          "horizontal"
        );
      }

      if (
        point.snapKind ===
        "VERTICAL"
      ) {
        constraints.push(
          "vertical"
        );
      }

      const entity = {
        id: makeId(),
        type: "line",
        p1: {
          x: lineStart.x,
          y: lineStart.y,
        },
        p2: {
          x: endPoint.x,
          y: endPoint.y,
        },
        constraints,
        locked: false,
      };

      commitEntities(
        (current) => [
          ...current,
          entity,
        ]
      );

      setSelectedId(entity.id);

      if (isClosing) {
        setLineStart(null);
        setLineChainStart(null);
        setLineChainCount(0);
        setTool("select");
      } else {
        setLineStart(endPoint);
        setLineChainCount(
          (count) =>
            count + 1
        );
      }

      return;
    }

    if (
      tool === "rect" ||
      tool === "circle"
    ) {
      const start =
        snapPoint(raw);

      setDraft({
        type: tool,
        start,
        current: start,
      });

      event.currentTarget.setPointerCapture?.(
        event.pointerId
      );
      return;
    }

    if (
      tool === "spline"
    ) {
      setDraft({
        type: "spline",
        points: [raw],
      });

      event.currentTarget.setPointerCapture?.(
        event.pointerId
      );
      return;
    }

    if (
      tool === "arc"
    ) {
      if (!arcDraft) {
        const center =
          snapPoint(raw);

        setArcDraft({
          stage: 1,
          center,
          start: null,
          end: null,
        });
        return;
      }

      if (
        arcDraft.stage ===
        1
      ) {
        const start =
          snapPoint(raw);

        if (
          pointDistance(
            start,
            arcDraft.center
          ) < 0.5
        ) {
          return;
        }

        setArcDraft({
          ...arcDraft,
          stage: 2,
          start,
          end: start,
        });
        return;
      }

      if (
        arcDraft.stage ===
        2
      ) {
        const end =
          snapPoint(raw);

        const entity = {
          id: makeId(),
          type: "arc",
          center:
            arcDraft.center,
          start:
            arcDraft.start,
          end,
          locked: false,
        };

        commitEntities(
          (current) => [
            ...current,
            entity,
          ]
        );

        setSelectedId(entity.id);
        setArcDraft(null);
        setTool("select");
      }
    }
  }

  function handleCanvasPointerMove(
    event
  ) {
    setPenInfo({
      pointerType:
        event.pointerType ||
        "mouse",
      pressure:
        event.pressure ||
        0,
    });

    if (
      event.pointerType ===
      "touch"
    ) {
      moveTouchGesture(event);
      return;
    }

    if (
      dragSelectionRef.current &&
      tool === "select"
    ) {
      const drag =
        dragSelectionRef.current;

      const point =
        modelPointFromEvent(
          event
        );

      if (point) {
        const dx =
          point.x -
          drag.start.x;

        const dy =
          point.y -
          drag.start.y;

        if (
          Math.hypot(
            dx,
            dy
          ) > 0.05
        ) {
          drag.moved = true;
        }

        setEntities(
          (current) =>
            current.map(
              (entity) =>
                entity.id ===
                drag.id
                  ? translateEntity(
                      drag.original,
                      dx,
                      dy
                    )
                  : entity
            )
        );
      }

      return;
    }

    const raw =
      modelPointFromEvent(
        event
      );

    if (!raw) {
      return;
    }

    if (
      tool === "line" &&
      lineStart
    ) {
      setHoverPoint(
        snapPoint(
          raw,
          lineStart
        )
      );
    } else if (
      tool === "arc" &&
      arcDraft?.stage ===
        2
    ) {
      setArcDraft(
        (current) => ({
          ...current,
          end:
            snapPoint(raw),
        })
      );
    } else if (
      draft?.type ===
        "rect" ||
      draft?.type ===
        "circle"
    ) {
      setDraft(
        (current) => ({
          ...current,
          current:
            snapPoint(raw),
        })
      );
    } else if (
      draft?.type ===
      "spline"
    ) {
      const sourceEvents =
        typeof event.nativeEvent
          ?.getCoalescedEvents ===
        "function"
          ? event.nativeEvent.getCoalescedEvents()
          : [event.nativeEvent || event];

      setDraft(
        (current) => {
          if (
            !current ||
            current.type !==
              "spline"
          ) {
            return current;
          }

          const points = [
            ...current.points,
          ];

          sourceEvents.forEach(
            (sample) => {
              const point =
                modelPointFromClient(
                  sample.clientX,
                  sample.clientY
                );

              const last =
                points[
                  points.length - 1
                ];

              if (
                point &&
                (
                  !last ||
                  pointDistance(
                    point,
                    last
                  ) >
                    2.5 /
                    zoom
                )
              ) {
                points.push(point);
              }
            }
          );

          return {
            ...current,
            points,
          };
        }
      );
    }
  }

  function handleCanvasPointerUp(
    event
  ) {
    if (
      event.pointerType ===
      "touch"
    ) {
      endTouchGesture(event);
      return;
    }

    if (
      dragSelectionRef.current
    ) {
      const drag =
        dragSelectionRef.current;

      if (drag.moved) {
        pushHistory(
          drag.before
        );
      }

      dragSelectionRef.current =
        null;
      return;
    }

    if (
      draft?.type ===
      "rect"
    ) {
      const start =
        draft.start;
      const current =
        draft.current;

      const w =
        current.x -
        start.x;
      const h =
        current.y -
        start.y;

      if (
        Math.abs(w) > 0.5 &&
        Math.abs(h) > 0.5
      ) {
        const entity = {
          id: makeId(),
          type: "rect",
          x: start.x,
          y: start.y,
          w,
          h,
          locked: false,
          constraints:
            autoConstraints
              ? [
                  "horizontal",
                  "vertical",
                ]
              : [],
          faceSketch: faceSketchTarget ? deepClone(faceSketchTarget) : null,
        };

        commitEntities(
          (items) => [
            ...items,
            entity,
          ]
        );
        setSelectedId(entity.id);
      }

      setDraft(null);
      setTool("select");
      return;
    }

    if (
      draft?.type ===
      "circle"
    ) {
      const r =
        pointDistance(
          draft.start,
          draft.current
        );

      if (r > 0.5) {
        const entity = {
          id: makeId(),
          type: "circle",
          cx:
            draft.start.x,
          cy:
            draft.start.y,
          r,
          locked: false,
          faceSketch: faceSketchTarget ? deepClone(faceSketchTarget) : null,
        };

        commitEntities(
          (items) => [
            ...items,
            entity,
          ]
        );
        setSelectedId(entity.id);
      }

      setDraft(null);
      setTool("select");
      return;
    }

    if (
      draft?.type ===
      "spline"
    ) {
      if (
        draft.points.length >=
        3
      ) {
        const first =
          draft.points[0];
        const last =
          draft.points[
            draft.points.length -
              1
          ];

        const closeTolerance =
          15 /
          zoom;

        const closed =
          pointDistance(
            first,
            last
          ) <=
          closeTolerance;

        const points =
          closed
            ? [
                ...draft.points.slice(
                  0,
                  -1
                ),
                first,
              ]
            : draft.points;

        const entity = {
          id: makeId(),
          type: "spline",
          points,
          closed,
          locked: false,
        };

        commitEntities(
          (items) => [
            ...items,
            entity,
          ]
        );
        setSelectedId(entity.id);
      }

      setDraft(null);
      setTool("select");
    }
  }

  function handleWheel(
    event
  ) {
    event.preventDefault();

    const rect =
      svgRef.current
        ?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const sx =
      event.clientX -
      rect.left;

    const sy =
      event.clientY -
      rect.top;

    const before = {
      x:
        (
          sx -
          size.width /
            2 -
          pan.x
        ) /
        zoom,
      y:
        -(
          sy -
          size.height /
            2 -
          pan.y
        ) /
        zoom,
    };

    const factor =
      Math.exp(
        -event.deltaY *
          0.0014
      );

    const nextZoom =
      clamp(
        zoom * factor,
        0.18,
        9
      );

    setZoom(nextZoom);
    setPan({
      x:
        sx -
        size.width /
          2 -
        before.x *
          nextZoom,
      y:
        sy -
        size.height /
          2 +
        before.y *
          nextZoom,
    });
  }

  function setViewPreset(preset) {
    const views = {
      iso: { angle: 58, elevation: 42 },
      top: { angle: 90, elevation: 78 },
      front: { angle: 90, elevation: 14 },
      right: { angle: 8, elevation: 22 },
    };
    const next = views[preset] || views.iso;
    setOrbitAngle(next.angle);
    setOrbitElevation(next.elevation);
    setCreateMessage(`${String(preset).toUpperCase()} VIEW`);
  }

  function fitModelView() {
    const points = [];
    draftSolids.forEach((solid) => {
      const projection = solidProjection(solid.height);
      (solid.points || []).forEach(([x, y]) => {
        points.push({ x, y });
        points.push({ x: x + projection.x, y: y + projection.y });
      });
    });
    if (!points.length) {
      setPan({ x: 0, y: 0 });
      setZoom(1.45);
      return;
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(20, maxX - minX);
    const height = Math.max(20, maxY - minY);
    const nextZoom = clamp(Math.min(size.width * 0.62 / width, size.height * 0.62 / height), 0.22, 6);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(nextZoom);
    setPan({ x: -centerX * nextZoom, y: centerY * nextZoom });
    setCreateMessage("FIT VIEW");
  }

  function deleteSelectedFeature() {
    if (!selectedSolid || !selectedFeature) return;
    const featureId = selectedFeature.id;
    setDraftSolids((current) => current.map((solid) =>
      solid.id === selectedSolid.id
        ? { ...solid, features: (solid.features || []).filter((feature) => feature.id !== featureId) }
        : solid
    ));
    setSelectedFeatureId(null);
    setCreateMessage("Feature removed");
  }

  function flipSelectedFeature() {
    if (!selectedSolid || !selectedFeature) return;
    const featureId = selectedFeature.id;
    setDraftSolids((current) => current.map((solid) =>
      solid.id === selectedSolid.id
        ? {
            ...solid,
            features: (solid.features || []).map((feature) =>
              feature.id === featureId
                ? { ...feature, depth: -feature.depth, mode: feature.depth > 0 ? "cut" : "add" }
                : feature
            ),
          }
        : solid
    ));
    setExtrusionHeight(-Number(selectedFeature.depth || 0));
    setCreateMessage(selectedFeature.depth > 0 ? "Feature switched to CUT" : "Feature switched to ADD");
  }

  function removeSelectedEdgeTreatment() {
    if (!selectedSolid || !selectedEdge) return;
    const key = edgeKey(selectedEdge.edgeType || "top", selectedEdge.edgeIndex);
    setDraftSolids((current) => current.map((solid) =>
      solid.id === selectedSolid.id
        ? {
            ...solid,
            edgeTreatments: (solid.edgeTreatments || []).filter((item) =>
              edgeKey(item.edgeType || "top", item.edgeIndex) !== key
            ),
          }
        : solid
    ));
    setCreateMessage("Edge treatment removed");
  }

  function clearModelSelection() {
    setSelectedFeatureId(null);
    setSelectedEdge(null);
    setSelectedSolidId(null);
    setSelectedId(null);
    setCreateMessage("");
  }

  function pointsCenter(points) {
    if (!points?.length) return null;
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point[0], y: acc.y + point[1] }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  function profileCenter() {
    return pointsCenter(profile?.points);
  }

  function solidProjection(height) {
    const amount = Math.max(0, Number(height) || 0);
    const angle = orbitAngle * Math.PI / 180;
    const elevation = orbitElevation * Math.PI / 180;
    const depthScale = 0.7 * Math.cos((elevation - Math.PI / 4) * 0.55);
    return {
      x: amount * Math.cos(angle) * depthScale,
      y: amount * Math.sin(angle) * depthScale * (0.72 + Math.sin(elevation) * 0.38),
    };
  }

  function sideFaceFrame(target) {
    if (!target?.solidId || target.faceType !== "side") return null;
    const solid = draftSolids.find((item) => item.id === target.solidId);
    if (!solid?.points?.length) return null;
    const index = clamp(target.faceIndex ?? 0, 0, solid.points.length - 1);
    const a = solid.points[index];
    const b = solid.points[(index + 1) % solid.points.length];
    if (!a || !b) return null;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return null;
    const signedArea = solid.points.reduce((total, point, pointIndex) => {
      const next = solid.points[(pointIndex + 1) % solid.points.length];
      return total + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2;
    const edge = { x: dx / length, y: dy / length };
    const outward = signedArea >= 0
      ? { x: edge.y, y: -edge.x }
      : { x: -edge.y, y: edge.x };
    return {
      solid,
      index,
      origin: { x: a[0], y: a[1] },
      edge,
      outward,
      lift: solidProjection(1),
      length,
    };
  }

  function sideLocalToModel(target, point) {
    const frame = sideFaceFrame(target);
    if (!frame) return point;
    return {
      x: frame.origin.x + frame.edge.x * point.x + frame.lift.x * point.y,
      y: frame.origin.y + frame.edge.y * point.x + frame.lift.y * point.y,
    };
  }

  function sideModelToLocal(target, point) {
    const frame = sideFaceFrame(target);
    if (!frame) return point;
    const rx = point.x - frame.origin.x;
    const ry = point.y - frame.origin.y;
    const det = frame.edge.x * frame.lift.y - frame.edge.y * frame.lift.x;
    if (Math.abs(det) < 0.0001) return { x: 0, y: 0 };
    return {
      x: (rx * frame.lift.y - ry * frame.lift.x) / det,
      y: (frame.edge.x * ry - frame.edge.y * rx) / det,
    };
  }

  function facePointToScreen(faceSketch, point) {
    if (!faceSketch?.solidId) return screenPoint(point);
    const solid = draftSolids.find((item) => item.id === faceSketch.solidId);
    if (!solid) return screenPoint(point);
    if (faceSketch.faceType === "side") {
      return screenPoint(sideLocalToModel(faceSketch, point));
    }
    const projection = solidProjection(solid.height);
    return screenPoint({ x: point.x + projection.x, y: point.y + projection.y });
  }

  function selectFeature(event, solid, feature) {
    if (tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedSolidId(solid.id);
    setSelectedFeatureId(feature.id);
    setSelectedSolidFace({
      type: feature.faceType || "top",
      index: feature.faceIndex ?? null,
    });
    setSelectedId(null);
    setFaceSketchTarget(null);
    setExtrusionHeight(Number(feature.depth) || 0);
    setCreateMessage(`${feature.mode === "cut" ? "Pocket" : "Boss"} selected · drag to edit depth`);
  }

  function beginFeaturePull(event, solid, feature) {
    if (creatingSolid) return;
    event.preventDefault();
    event.stopPropagation();
    selectFeature(event, solid, feature);
    pullExtrudeRef.current = {
      pointerId: event.pointerId,
      solidId: solid.id,
      featureId: feature.id,
      featureTarget: {
        solidId: solid.id,
        faceType: feature.faceType || "top",
        faceIndex: feature.faceIndex ?? null,
      },
      startX: event.clientX,
      startY: event.clientY,
      startDepth: Number(feature.depth) || 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function beginPullExtrude(event, solidId = null) {
    const solid = solidId
      ? draftSolids.find((item) => item.id === solidId)
      : null;

    if ((!profile && !solid) || creatingSolid) return;
    event.preventDefault();
    event.stopPropagation();

    if (solid) {
      setSelectedSolidId(solid.id);
      setSelectedFeatureId(null);
      setSelectedId(null);
      setExtrusionHeight(solid.height);
    }

    const featureTarget = !solid && selected?.faceSketch?.solidId
      ? selected.faceSketch
      : null;

    pullExtrudeRef.current = {
      pointerId: event.pointerId,
      solidId: solid?.id || null,
      featureTarget,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: featureTarget ? 0 : (solid?.height ?? extrusionHeight),
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function movePullExtrude(event) {
    const drag = pullExtrudeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    let delta = drag.startY - event.clientY;
    if (drag.featureTarget?.faceType === "side") {
      const frame = sideFaceFrame(drag.featureTarget);
      if (frame) {
        const vx = frame.outward.x;
        const vy = -frame.outward.y;
        const magnitude = Math.hypot(vx, vy) || 1;
        const ux = vx / magnitude;
        const uy = vy / magnitude;
        delta = (event.clientX - drag.startX) * ux + (event.clientY - drag.startY) * uy;
      }
    }
    if (Math.abs(delta) > 3) drag.moved = true;
    const nextHeight = drag.featureId
      ? clamp(drag.startDepth + delta / Math.max(0.55, zoom), -500, 500)
      : drag.featureTarget
        ? clamp(delta / Math.max(0.55, zoom), -500, 500)
        : clamp(drag.startHeight + delta / Math.max(0.55, zoom), 0.5, 500);
    drag.height = nextHeight;
    setExtrusionHeight(nextHeight);

    if (drag.solidId && drag.featureId) {
      setDraftSolids((current) => current.map((solid) =>
        solid.id === drag.solidId
          ? {
              ...solid,
              features: (solid.features || []).map((feature) =>
                feature.id === drag.featureId
                  ? {
                      ...feature,
                      depth: Math.abs(nextHeight) < 0.5 ? (nextHeight < 0 ? -0.5 : 0.5) : nextHeight,
                      mode: nextHeight < 0 ? "cut" : "add",
                    }
                  : feature
              ),
            }
          : solid
      ));
    } else if (drag.solidId) {
      setDraftSolids((current) =>
        current.map((solid) =>
          solid.id === drag.solidId
            ? { ...solid, height: nextHeight }
            : solid
        )
      );
    }
  }

  function endPullExtrude(event) {
    const drag = pullExtrudeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    pullExtrudeRef.current = null;

    if (!drag.moved) return;

    if (drag.featureId) {
      const depth = drag.height ?? drag.startDepth;
      setCreateMessage(`${depth < 0 ? "Pocket" : "Boss"} depth · ${Math.abs(depth).toFixed(1)} mm`);
      return;
    }

    if (drag.solidId || !profile) return;

    const nextHeight = drag.height ?? extrusionHeight;

    if (drag.featureTarget) {
      if (Math.abs(nextHeight) < 0.5) {
        setCreateMessage('Pull at least 0.5 mm to create the feature');
        return;
      }
      const targetId = drag.featureTarget.solidId;
      const feature = {
        id: `feature-${makeId()}`,
        points: deepClone(profile.points),
        depth: nextHeight,
        mode: nextHeight >= 0 ? 'add' : 'cut',
        faceType: drag.featureTarget.faceType || 'top',
        faceIndex: drag.featureTarget.faceIndex ?? null,
      };
      setDraftSolids((current) => current.map((item) =>
        item.id === targetId
          ? { ...item, features: [...(item.features || []), feature] }
          : item
      ));
      setEntities((current) => current.filter((item) => item.id !== selectedId));
      setSelectedId(null);
      setSelectedSolidId(targetId);
      setSelectedFeatureId(feature.id);
      setSelectedSolidFace({
        type: drag.featureTarget.faceType || 'top',
        index: drag.featureTarget.faceIndex ?? null,
      });
      setFaceSketchTarget(null);
      setExtrusionHeight(20);
      setCreateMessage(nextHeight >= 0
        ? `Boss added · ${nextHeight.toFixed(1)} mm`
        : `Pocket cut · ${Math.abs(nextHeight).toFixed(1)} mm`);
      return;
    }

    const solid = {
      id: `solid-${makeId()}`,
      points: deepClone(profile.points),
      height: nextHeight,
      label: profile.label,
      plane,
      features: [],
      edgeTreatments: [],
    };

    setDraftSolids((current) => [...current, solid]);
    setSelectedSolidId(solid.id);
    setSelectedFeatureId(null);
    setSelectedId(null);
    setCreateMessage('3D body created · tap a face · tap again to sketch on it');
  }

  function beginFaceSketch(target) {
    if (!target?.solidId) return;
    setFaceSketchTarget(target);
    setSelectedSolidId(null);
    setSelectedFeatureId(null);
    setSelectedId(null);
    setExtrusionHeight(0);
    setTool('rect');
    setCreateMessage(target.faceType === 'top'
      ? 'TOP FACE SKETCH · corners, midpoints and center snap automatically'
      : `SIDE FACE ${target.faceIndex + 1} SKETCH · face snapping is active`);
  }

  function selectSolidFace(event, solid, faceType = 'top', faceIndex = null) {
    if (tool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    const faceKey = `${solid.id}:${faceType}:${faceIndex ?? 'top'}`;
    const lastTap = lastFaceTapRef.current;
    const isSecondTap = lastTap?.key === faceKey && now - lastTap.time < 520;
    lastFaceTapRef.current = { key: faceKey, time: now };

    const target = { solidId: solid.id, faceType, faceIndex };
    if (isSecondTap) {
      beginFaceSketch(target);
      return;
    }

    setSelectedSolidId(solid.id);
    setSelectedFeatureId(null);
    setSelectedEdge(null);
    setSelectedSolidFace({ type: faceType, index: faceIndex });
    setSelectedId(null);
    setExtrusionHeight(solid.height);
    setCreateMessage(faceType === 'top'
      ? 'Top face selected · pull to change height · tap again to sketch'
      : `Side face ${faceIndex + 1} selected · tap again to sketch`);
  }

  function edgeKey(edgeType, edgeIndex) {
    return `${edgeType || "top"}:${Number(edgeIndex) || 0}`;
  }

  function findEdgeTreatment(solid, edgeType, edgeIndex) {
    const key = edgeKey(edgeType, edgeIndex);
    return (solid.edgeTreatments || []).find((item) =>
      edgeKey(item.edgeType || "top", item.edgeIndex) === key
    );
  }

  function selectSolidEdge(event, solid, edgeType, edgeIndex) {
    if (tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    const normalizedType = edgeType || "top";
    setSelectedSolidId(solid.id);
    setSelectedFeatureId(null);
    setSelectedEdge({ solidId: solid.id, edgeType: normalizedType, edgeIndex });
    setSelectedId(null);
    const existing = findEdgeTreatment(solid, normalizedType, edgeIndex);
    const edgeLabel = `${normalizedType.toUpperCase()} EDGE ${edgeIndex + 1}`;
    if (existing) {
      setEdgeTreatmentMode(existing.mode || "chamfer");
      setEdgeTreatmentAmount(Number(existing.amount) || 2);
      setCreateMessage(`${String(existing.mode || "chamfer").toUpperCase()} · ${edgeLabel} · drag to edit`);
    } else {
      setCreateMessage(`${edgeLabel} selected · drag across it to ${edgeTreatmentMode}`);
    }
  }

  function beginEdgeTreatmentDrag(event, solid, edgeType, edgeIndex, point, next) {
    if (tool !== "select" || creatingSolid) return;
    event.preventDefault();
    event.stopPropagation();
    const normalizedType = edgeType || "top";
    selectSolidEdge(event, solid, normalizedType, edgeIndex);

    const existing = findEdgeTreatment(solid, normalizedType, edgeIndex);
    const mode = existing?.mode || edgeTreatmentMode;
    const startAmount = Number(existing?.amount) || 0.25;
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    edgeDragRef.current = {
      pointerId: event.pointerId,
      solidId: solid.id,
      edgeType: normalizedType,
      edgeIndex,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startAmount,
      nx,
      ny,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveEdgeTreatmentDrag(event) {
    const drag = edgeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const sx = event.clientX - drag.startX;
    const sy = event.clientY - drag.startY;
    const projected = sx * drag.nx + sy * drag.ny;
    if (Math.abs(projected) > 3) drag.moved = true;
    const amount = clamp(drag.startAmount + projected / Math.max(1.8, zoom * 2.35), 0.25, 50);
    drag.amount = amount;
    setEdgeTreatmentMode(drag.mode);
    setEdgeTreatmentAmount(amount);
    setDraftSolids((current) => current.map((candidate) => {
      if (candidate.id !== drag.solidId) return candidate;
      const treatments = [...(candidate.edgeTreatments || [])];
      const key = edgeKey(drag.edgeType, drag.edgeIndex);
      const index = treatments.findIndex((item) => edgeKey(item.edgeType || "top", item.edgeIndex) === key);
      const treatment = {
        id: index >= 0 ? treatments[index].id : `edge-${makeId()}`,
        edgeType: drag.edgeType,
        edgeIndex: drag.edgeIndex,
        mode: drag.mode,
        amount,
      };
      if (index >= 0) treatments[index] = treatment;
      else treatments.push(treatment);
      return { ...candidate, edgeTreatments: treatments };
    }));
    setCreateMessage(`${drag.mode.toUpperCase()} · ${drag.edgeType.toUpperCase()} EDGE ${drag.edgeIndex + 1} · ${amount.toFixed(1)} mm`);
  }

  function endEdgeTreatmentDrag(event) {
    const drag = edgeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    edgeDragRef.current = null;
    if (!drag.moved) return;
    const amount = drag.amount ?? drag.startAmount;
    setCreateMessage(`${drag.mode.toUpperCase()} · ${drag.edgeType.toUpperCase()} EDGE ${drag.edgeIndex + 1} · ${amount.toFixed(1)} mm`);
  }

  function applyEdgeTreatment(mode = edgeTreatmentMode, amount = edgeTreatmentAmount) {
    if (!selectedEdge?.solidId) return;
    const safeAmount = clamp(amount, 0.25, 50);
    setEdgeTreatmentMode(mode);
    setEdgeTreatmentAmount(safeAmount);
    setDraftSolids((current) => current.map((solid) => {
      if (solid.id !== selectedEdge.solidId) return solid;
      const treatments = [...(solid.edgeTreatments || [])];
      const type = selectedEdge.edgeType || "top";
      const key = edgeKey(type, selectedEdge.edgeIndex);
      const existingIndex = treatments.findIndex((item) => edgeKey(item.edgeType || "top", item.edgeIndex) === key);
      const treatment = {
        id: existingIndex >= 0 ? treatments[existingIndex].id : `edge-${makeId()}`,
        edgeType: type,
        edgeIndex: selectedEdge.edgeIndex,
        mode,
        amount: safeAmount,
      };
      if (existingIndex >= 0) treatments[existingIndex] = treatment;
      else treatments.push(treatment);
      return { ...solid, edgeTreatments: treatments };
    }));
    setCreateMessage(`${mode.toUpperCase()} · ${(selectedEdge.edgeType || "top").toUpperCase()} EDGE ${selectedEdge.edgeIndex + 1} · ${safeAmount.toFixed(1)} mm`);
  }

  function selectHistoryEntry(entry) {
    const solid = draftSolids.find((item) => item.id === entry.solidId);
    if (!solid) return;
    setSelectedSolidId(solid.id);
    setSelectedId(null);
    setSelectedEdge(null);
    if (entry.kind === "feature") {
      setSelectedFeatureId(entry.featureId);
      const feature = (solid.features || []).find((item) => item.id === entry.featureId);
      if (feature) {
        setSelectedSolidFace({ type: feature.faceType || "top", index: feature.faceIndex ?? null });
        setExtrusionHeight(Number(feature.depth) || 0);
      }
    } else if (entry.kind === "edge") {
      setSelectedFeatureId(null);
      setSelectedEdge({ solidId: solid.id, edgeType: entry.edgeType || "top", edgeIndex: entry.edgeIndex });
      const treatment = findEdgeTreatment(solid, entry.edgeType || "top", entry.edgeIndex);
      if (treatment) {
        setEdgeTreatmentMode(treatment.mode || "chamfer");
        setEdgeTreatmentAmount(Number(treatment.amount) || 2);
      }
    } else {
      setSelectedFeatureId(null);
      setExtrusionHeight(solid.height);
    }
  }

  function sketchOnSelectedFace() {
    if (!selectedSolid) return;
    beginFaceSketch({
      solidId: selectedSolid.id,
      faceType: selectedSolidFace.type,
      faceIndex: selectedSolidFace.index,
    });
  }

  async function sendSolidToStudio(solid = selectedSolid) {
    if (!solid || creatingSolid || objectCount >= maxObjects) return;

    setCreatingSolid(true);
    setCreateMessage('');

    try {
      const engine = await onCreateSolid({
        points: solid.points,
        height: Math.max(0.5, solid.height),
        twistDegrees: 0,
        scaleTop: 1,
        plane: solid.plane || plane,
        features: deepClone(solid.features || []),
        edgeTreatments: deepClone(solid.edgeTreatments || []),
      });

      setCreateMessage(`${engine || '3D'} · sent to Studio`);
      setDraftSolids((current) => current.filter((item) => item.id !== solid.id));
      setSelectedSolidId(null);
      setSelectedFeatureId(null);
    } catch (error) {
      setCreateMessage(error?.message || 'Unable to create the 3D solid.');
    } finally {
      setCreatingSolid(false);
    }
  }

  async function extrudeProfile(heightOverride) {
    if (!profile || creatingSolid) return;
    const solid = {
      id: `solid-${makeId()}`,
      points: deepClone(profile.points),
      height: Math.max(0.5, heightOverride ?? extrusionHeight),
      label: profile.label,
      plane,
      features: [],
      edgeTreatments: [],
    };
    setDraftSolids((current) => [...current, solid]);
    setSelectedSolidId(solid.id);
    setSelectedId(null);
    setExtrusionHeight(solid.height);
    setCreateMessage('3D body created · keep editing in Sketch');
  }

  const gridLines =
    useMemo(
      () => {
        const left =
          (
            -size.width /
              2 -
            pan.x
          ) /
          zoom;

        const right =
          (
            size.width /
              2 -
            pan.x
          ) /
          zoom;

        const bottom =
          -(
            size.height /
              2 -
            pan.y
          ) /
          zoom;

        const top =
          -(
            -size.height /
              2 -
            pan.y
          ) /
          zoom;

        const step =
          Math.max(
            1,
            gridSize
          );

        const xStart =
          Math.floor(
            left /
              step
          ) *
          step;

        const yStart =
          Math.floor(
            bottom /
              step
          ) *
          step;

        const vertical = [];
        const horizontal = [];

        let count = 0;

        for (
          let x = xStart;
          x <= right &&
          count < 240;
          x += step,
          count += 1
        ) {
          vertical.push(x);
        }

        count = 0;

        for (
          let y = yStart;
          y <= top &&
          count < 240;
          y += step,
          count += 1
        ) {
          horizontal.push(y);
        }

        return {
          vertical,
          horizontal,
        };
      },
      [
        gridSize,
        pan,
        size,
        zoom,
      ]
    );

  function renderDimension(
    entity
  ) {
    if (!showDimensions) {
      return null;
    }

    if (
      entity.type === "line"
    ) {
      const a =
        screenPoint(
          entity.p1
        );
      const b =
        screenPoint(
          entity.p2
        );

      return (
        <text
          x={(a.x + b.x) / 2}
          y={(a.y + b.y) / 2 - 10}
          className="sketch-dimension-text"
          textAnchor="middle"
        >
          {lineMetrics(
            entity
          ).length.toFixed(1)} MM
        </text>
      );
    }

    if (
      entity.type === "rect"
    ) {
      const center =
        screenPoint({
          x:
            entity.x +
            entity.w /
              2,
          y:
            entity.y +
            entity.h /
              2,
        });

      return (
        <text
          x={center.x}
          y={center.y}
          className="sketch-dimension-text"
          textAnchor="middle"
        >
          {Math.abs(
            entity.w
          ).toFixed(1)} × {Math.abs(
            entity.h
          ).toFixed(1)} MM
        </text>
      );
    }

    if (
      entity.type === "circle"
    ) {
      const center =
        screenPoint({
          x: entity.cx,
          y: entity.cy,
        });

      return (
        <text
          x={center.x}
          y={center.y - 12}
          className="sketch-dimension-text"
          textAnchor="middle"
        >
          ⌀ {(entity.r * 2).toFixed(1)} MM
        </text>
      );
    }

    return null;
  }

  function renderEntity(
    entity
  ) {
    const selectedNow = entity.id === selectedId;
    const defined = entity.locked || entity.dimensionLocked;
    const stroke = selectedNow ? "#9bdcff" : defined ? "#64d69c" : "#4ca9e8";
    const project = (point) => facePointToScreen(entity.faceSketch, point);
    const common = {
      onPointerDown: (event) => handleEntityPointerDown(event, entity),
    };
    const showDimension = entity.faceSketch?.faceType !== "side";

    if (entity.type === "line") {
      const a = project(entity.p1);
      const b = project(entity.p2);
      return (
        <g key={entity.id} {...common} className="sketch-entity">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="sketch-hit-line" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} className="sketch-line" />
          <circle cx={a.x} cy={a.y} r={selectedNow ? 4.5 : 3} fill={stroke} className="sketch-point" />
          <circle cx={b.x} cy={b.y} r={selectedNow ? 4.5 : 3} fill={stroke} className="sketch-point" />
          {showDimension && renderDimension(entity)}
        </g>
      );
    }

    if (entity.type === "rect") {
      const corners = [
        { x: entity.x, y: entity.y },
        { x: entity.x + entity.w, y: entity.y },
        { x: entity.x + entity.w, y: entity.y + entity.h },
        { x: entity.x, y: entity.y + entity.h },
      ].map(project);
      const points = corners.map((point) => `${point.x},${point.y}`).join(" ");
      return (
        <g key={entity.id} {...common} className="sketch-entity">
          <polygon points={points} className="sketch-hit-shape" />
          <polygon points={points} stroke={stroke} className="sketch-shape" />
          {showDimension && renderDimension(entity)}
        </g>
      );
    }

    if (entity.type === "circle") {
      const samples = Array.from({ length: 64 }, (_, index) => {
        const angle = index / 64 * Math.PI * 2;
        return project({
          x: entity.cx + Math.cos(angle) * entity.r,
          y: entity.cy + Math.sin(angle) * entity.r,
        });
      });
      const points = samples.map((point) => `${point.x},${point.y}`).join(" ");
      const center = project({ x: entity.cx, y: entity.cy });
      return (
        <g key={entity.id} {...common} className="sketch-entity">
          <polygon points={points} className="sketch-hit-shape" />
          <polygon points={points} stroke={stroke} className="sketch-shape" />
          <circle cx={center.x} cy={center.y} r="3.5" fill={stroke} />
          {showDimension && renderDimension(entity)}
        </g>
      );
    }

    if (entity.type === "spline") {
      const screenPoints = entity.points.map(project);
      const points = screenPoints.map((point) => `${point.x},${point.y}`).join(" ");
      return (
        <g key={entity.id} {...common} className="sketch-entity">
          <polyline points={points} className="sketch-hit-line" />
          <polyline points={points} stroke={stroke} className="sketch-spline" />
          {entity.closed && screenPoints.length > 1 && (
            <line
              x1={screenPoints[0]?.x}
              y1={screenPoints[0]?.y}
              x2={screenPoints[screenPoints.length - 1]?.x}
              y2={screenPoints[screenPoints.length - 1]?.y}
              stroke={stroke}
              className="sketch-line"
            />
          )}
        </g>
      );
    }

    if (entity.type === "arc") {
      const points = arcPoints(entity)
        .map(project)
        .map((point) => `${point.x},${point.y}`)
        .join(" ");
      return (
        <g key={entity.id} {...common} className="sketch-entity">
          <polyline points={points} className="sketch-hit-line" />
          <polyline points={points} stroke={stroke} className="sketch-spline" />
        </g>
      );
    }

    return null;
  }

  const selectedMetrics =
    useMemo(
      () => {
        if (!selected) {
          return null;
        }

        if (
          selected.type === "line"
        ) {
          return {
            length:
              lineMetrics(
                selected
              ).length,
            angle:
              lineMetrics(
                selected
              ).angle,
          };
        }

        if (
          selected.type === "rect"
        ) {
          return {
            width:
              Math.abs(
                selected.w
              ),
            height:
              Math.abs(
                selected.h
              ),
          };
        }

        if (
          selected.type === "circle"
        ) {
          return {
            diameter:
              selected.r * 2,
          };
        }

        if (
          selected.type === "arc"
        ) {
          return {
            radius:
              pointDistance(
                selected.center,
                selected.start
              ),
          };
        }

        if (
          selected.type === "spline"
        ) {
          const length =
            selected.points
              .slice(1)
              .reduce(
                (
                  total,
                  point,
                  index
                ) =>
                  total +
                  pointDistance(
                    selected.points[
                      index
                    ],
                    point
                  ),
                0
              );

          return {
            length,
          };
        }

        return null;
      },
      [selected]
    );

  const draftRect =
    draft?.type === "rect"
      ? {
          x:
            Math.min(
              draft.start.x,
              draft.current.x
            ),
          y:
            Math.max(
              draft.start.y,
              draft.current.y
            ),
          w:
            Math.abs(
              draft.current.x -
                draft.start.x
            ),
          h:
            Math.abs(
              draft.current.y -
                draft.start.y
            ),
        }
      : null;

  const draftCircleRadius =
    draft?.type === "circle"
      ? pointDistance(
          draft.start,
          draft.current
        )
      : 0;

  const currentArc =
    arcDraft?.stage === 2 &&
    arcDraft.start &&
    arcDraft.end
      ? {
          center:
            arcDraft.center,
          start:
            arcDraft.start,
          end:
            arcDraft.end,
        }
      : null;

  if (!active) {
    return (
      <div className="sketch-workspace sketch-workspace-hidden" />
    );
  }

  return (
    <div
      className={`${
        isFullscreen
          ? "sketch-workspace sketch-workspace-fullscreen"
          : "sketch-workspace"
      } ${solidNavigationActive ? "sketch-solid-mode" : "sketch-sketch-mode"}`}
    >
      <div className="sketch-topbar">
        <div className="sketch-topbar-title">
          <span>
            SKETCH
          </span>

          <strong>
            Direct Modeling · iPad
          </strong>
        </div>

        <div className="sketch-plane-switch">
          <span>
            PLANE
          </span>

          {[
            ["top", "TOP"],
            ["front", "FRONT"],
            ["right", "RIGHT"],
          ].map(
            ([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  plane === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPlane(value)
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        <div className="sketch-status-cluster">
          <span>
            {penInfo.pointerType ===
            "pen"
              ? `APPLE PENCIL · ${Math.round(
                  penInfo.pressure *
                    100
                )}%`
              : "PENCIL READY"}
          </span>

          <b>
            {engineStatus ===
            "ready"
              ? "MANIFOLD READY"
              : engineStatus ===
                  "loading"
                ? "ENGINE LOADING"
                : "ENGINE FALLBACK"}
          </b>
        </div>

        <button
          type="button"
          className="sketch-fullscreen-button"
          onClick={() =>
            setIsFullscreen(
              (value) => !value
            )
          }
        >
          {isFullscreen ? (
            <Minimize2
              size={18}
            />
          ) : (
            <Maximize2
              size={18}
            />
          )}

          <span>
            {isFullscreen
              ? "EXIT"
              : "FULL"}
          </span>
        </button>
      </div>

      <div className="sketch-main">
        <aside className="sketch-toolrail">
          {[
            ["select", "V", "SELECT"],
            ["line", "L", "LINE"],
            ["rect", "R", "RECT"],
            ["circle", "C", "CIRCLE"],
            ["arc", "A", "ARC"],
            ["spline", "I", "SPLINE"],
            ["erase", "E", "ERASE"],
          ].map(
            ([value, hotkey, label]) => (
              <button
                type="button"
                key={value}
                className={
                  tool === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  activateTool(value)
                }
              >
                <b>
                  {hotkey}
                </b>

                <span>
                  {label}
                </span>
              </button>
            )
          )}

          <div className="sketch-toolrail-spacer" />

          <button
            type="button"
            disabled={
              past.length === 0
            }
            onClick={undo}
          >
            <Undo2 size={18} />
            <span>
              UNDO
            </span>
          </button>

          <button
            type="button"
            disabled={
              future.length === 0
            }
            onClick={redo}
          >
            <Redo2 size={18} />
            <span>
              REDO
            </span>
          </button>
        </aside>

        <div className="sketch-canvas-shell">
          <svg
            ref={svgRef}
            className={
              `sketch-canvas sketch-tool-${tool}`
            }
            width="100%"
            height="100%"
            viewBox={`0 0 ${size.width} ${size.height}`}
            onPointerDown={
              handleCanvasPointerDown
            }
            onPointerMove={
              handleCanvasPointerMove
            }
            onPointerUp={
              handleCanvasPointerUp
            }
            onPointerCancel={
              handleCanvasPointerUp
            }
            onWheel={handleWheel}
            onContextMenu={(
              event
            ) =>
              event.preventDefault()
            }
          >
            <rect
              x="0"
              y="0"
              width={size.width}
              height={size.height}
              className="sketch-canvas-bg"
            />

            <g className="sketch-grid">
              {gridLines.vertical.map(
                (x) => {
                  const screen =
                    screenPoint({
                      x,
                      y: 0,
                    });

                  const major =
                    Math.round(
                      x /
                        gridSize
                    ) % 5 ===
                    0;

                  return (
                    <line
                      key={`vx-${x}`}
                      x1={screen.x}
                      y1="0"
                      x2={screen.x}
                      y2={size.height}
                      className={
                        major
                          ? "sketch-grid-major"
                          : "sketch-grid-minor"
                      }
                    />
                  );
                }
              )}

              {gridLines.horizontal.map(
                (y) => {
                  const screen =
                    screenPoint({
                      x: 0,
                      y,
                    });

                  const major =
                    Math.round(
                      y /
                        gridSize
                    ) % 5 ===
                    0;

                  return (
                    <line
                      key={`hy-${y}`}
                      x1="0"
                      y1={screen.y}
                      x2={size.width}
                      y2={screen.y}
                      className={
                        major
                          ? "sketch-grid-major"
                          : "sketch-grid-minor"
                      }
                    />
                  );
                }
              )}
            </g>

            <line
              x1={
                screenPoint({
                  x: 0,
                  y: 0,
                }).x
              }
              y1="0"
              x2={
                screenPoint({
                  x: 0,
                  y: 0,
                }).x
              }
              y2={size.height}
              className="sketch-axis sketch-axis-y"
            />

            <line
              x1="0"
              y1={
                screenPoint({
                  x: 0,
                  y: 0,
                }).y
              }
              x2={size.width}
              y2={
                screenPoint({
                  x: 0,
                  y: 0,
                }).y
              }
              className="sketch-axis sketch-axis-x"
            />

            {draftSolids.map((solid) => {
              const projection = solidProjection(solid.height);
              const base = solid.points.map(([x, y]) => screenPoint({ x, y }));
              const top = solid.points.map(([x, y]) =>
                screenPoint({ x: x + projection.x, y: y + projection.y })
              );
              const polygon = (points) => points.map((point) => `${point.x},${point.y}`).join(' ');
              const isSelected = solid.id === selectedSolidId;

              return (
                <g key={solid.id} className={`sketch-solid ${isSelected ? 'selected' : ''}`}>
                  {base.map((point, index) => {
                    const nextIndex = (index + 1) % base.length;
                    const sidePoints = [point, base[nextIndex], top[nextIndex], top[index]];
                    return (
                      <polygon
                        key={`${solid.id}-side-${index}`}
                        points={polygon(sidePoints)}
                        className={`sketch-solid-side ${isSelected && selectedSolidFace.type === 'side' && selectedSolidFace.index === index ? 'selected-face' : ''}`}
                        onPointerDown={(event) => selectSolidFace(event, solid, 'side', index)}
                      />
                    );
                  })}
                  <polygon
                    points={polygon(top)}
                    className={`sketch-solid-top ${isSelected && selectedSolidFace.type === 'top' ? 'selected-face' : ''}`}
                    onPointerDown={(event) => selectSolidFace(event, solid, 'top')}
                  />
                  <polygon points={polygon(top)} className="sketch-solid-top-hit" onPointerDown={(event) => selectSolidFace(event, solid, 'top')} />
                  {[
                    ...top.map((point, edgeIndex) => ({ edgeType: "top", edgeIndex, point, next: top[(edgeIndex + 1) % top.length] })),
                    ...base.map((point, edgeIndex) => ({ edgeType: "bottom", edgeIndex, point, next: base[(edgeIndex + 1) % base.length] })),
                    ...base.map((point, edgeIndex) => ({ edgeType: "vertical", edgeIndex, point, next: top[edgeIndex] })),
                  ].map(({ edgeType, edgeIndex, point, next }) => {
                    const treatment = findEdgeTreatment(solid, edgeType, edgeIndex);
                    const edgeSelected = selectedEdge?.solidId === solid.id
                      && selectedEdge?.edgeIndex === edgeIndex
                      && (selectedEdge?.edgeType || "top") === edgeType;
                    return (
                      <g key={`${solid.id}-${edgeType}-edge-${edgeIndex}`} className={`sketch-solid-edge edge-${edgeType} ${edgeSelected ? "selected-edge" : ""} ${treatment ? "treated-edge" : ""}`}>
                        <line x1={point.x} y1={point.y} x2={next.x} y2={next.y} className="sketch-edge-visible" />
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={next.x}
                          y2={next.y}
                          className="sketch-edge-hit"
                          onPointerDown={(event) => beginEdgeTreatmentDrag(event, solid, edgeType, edgeIndex, point, next)}
                          onPointerMove={moveEdgeTreatmentDrag}
                          onPointerUp={endEdgeTreatmentDrag}
                          onPointerCancel={endEdgeTreatmentDrag}
                        />
                        {treatment && (
                          <text x={(point.x + next.x) / 2} y={(point.y + next.y) / 2 - 8} className="sketch-edge-label">
                            {treatment.mode === "fillet" ? "R" : "C"}{Number(treatment.amount).toFixed(1)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {(solid.features || []).map((feature) => {
                    let featureBase = [];
                    let featureEnd = [];
                    if (feature.faceType === 'side') {
                      const target = {
                        solidId: solid.id,
                        faceType: 'side',
                        faceIndex: feature.faceIndex ?? 0,
                      };
                      const frame = sideFaceFrame(target);
                      if (!frame) return null;
                      const direction = feature.depth >= 0 ? 1 : -1;
                      featureBase = feature.points.map(([x, y]) =>
                        screenPoint(sideLocalToModel(target, { x, y }))
                      );
                      featureEnd = feature.points.map(([x, y]) => {
                        const model = sideLocalToModel(target, { x, y });
                        return screenPoint({
                          x: model.x + frame.outward.x * Math.abs(feature.depth) * direction,
                          y: model.y + frame.outward.y * Math.abs(feature.depth) * direction,
                        });
                      });
                    } else {
                      const depthProjection = solidProjection(Math.abs(feature.depth));
                      const direction = feature.depth >= 0 ? 1 : -1;
                      featureBase = feature.points.map(([x, y]) =>
                        screenPoint({ x: x + projection.x, y: y + projection.y })
                      );
                      featureEnd = feature.points.map(([x, y]) =>
                        screenPoint({
                          x: x + projection.x + depthProjection.x * direction,
                          y: y + projection.y + depthProjection.y * direction,
                        })
                      );
                    }
                    return (
                      <g key={feature.id} className={`sketch-feature ${feature.mode} ${isSelected && selectedFeatureId === feature.id ? 'selected-feature' : ''}`}>
                        {featureBase.map((point, index) => {
                          const nextIndex = (index + 1) % featureBase.length;
                          return (
                            <polygon
                              key={`${feature.id}-side-${index}`}
                              points={polygon([point, featureBase[nextIndex], featureEnd[nextIndex], featureEnd[index]])}
                              className="sketch-feature-side"
                            />
                          );
                        })}
                        <polygon
                          points={polygon(featureEnd)}
                          className="sketch-feature-cap"
                          onPointerDown={(event) => selectFeature(event, solid, feature)}
                        />
                      </g>
                    );
                  })}
                  {isSelected && selectedFeature && (() => {
                    const feature = selectedFeature;
                    let center = null;
                    let direction = { x: 0, y: -1 };
                    const featureCenter = pointsCenter(feature.points);
                    if (!featureCenter) return null;

                    if (feature.faceType === 'side') {
                      const target = { solidId: solid.id, faceType: 'side', faceIndex: feature.faceIndex ?? 0 };
                      const frame = sideFaceFrame(target);
                      if (!frame) return null;
                      const baseModel = sideLocalToModel(target, featureCenter);
                      const sign = feature.depth >= 0 ? 1 : -1;
                      const endModel = {
                        x: baseModel.x + frame.outward.x * Math.abs(feature.depth) * sign,
                        y: baseModel.y + frame.outward.y * Math.abs(feature.depth) * sign,
                      };
                      center = screenPoint(endModel);
                      const vx = frame.outward.x;
                      const vy = -frame.outward.y;
                      const mag = Math.hypot(vx, vy) || 1;
                      direction = { x: vx / mag, y: vy / mag };
                    } else {
                      const depthProjection = solidProjection(Math.abs(feature.depth));
                      const sign = feature.depth >= 0 ? 1 : -1;
                      center = screenPoint({
                        x: featureCenter.x + projection.x + depthProjection.x * sign,
                        y: featureCenter.y + projection.y + depthProjection.y * sign,
                      });
                    }

                    const lift = 78;
                    const end = { x: center.x + direction.x * lift, y: center.y + direction.y * lift };
                    const perp = { x: -direction.y, y: direction.x };
                    const tip = { x: end.x + direction.x * 5, y: end.y + direction.y * 5 };
                    const arrowA = { x: end.x - direction.x * 12 + perp.x * 9, y: end.y - direction.y * 12 + perp.y * 9 };
                    const arrowB = { x: end.x - direction.x * 12 - perp.x * 9, y: end.y - direction.y * 12 - perp.y * 9 };
                    return (
                      <g className="sketch-pull-gizmo sketch-feature-gizmo">
                        <circle cx={center.x} cy={center.y} r="8" className="sketch-face-anchor" />
                        <line x1={center.x} y1={center.y} x2={end.x} y2={end.y} className="sketch-pull-line" />
                        <path d={`M ${arrowA.x} ${arrowA.y} L ${tip.x} ${tip.y} L ${arrowB.x} ${arrowB.y} Z`} className="sketch-pull-arrow" />
                        <circle
                          cx={end.x}
                          cy={end.y}
                          r="28"
                          className="sketch-pull-hit"
                          onPointerDown={(event) => beginFeaturePull(event, solid, feature)}
                          onPointerMove={movePullExtrude}
                          onPointerUp={endPullExtrude}
                          onPointerCancel={endPullExtrude}
                        />
                        <g transform={`translate(${end.x + 18} ${end.y - 12})`}>
                          <rect x="0" y="0" width="86" height="28" rx="8" className="sketch-pull-badge" />
                          <text x="43" y="18" textAnchor="middle" className="sketch-pull-text">
                            {feature.depth.toFixed(1)} mm
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                  {isSelected && !selectedFeature && selectedSolidFace.type === 'top' && (() => {
                    const centerModel = pointsCenter(solid.points);
                    if (!centerModel) return null;
                    const center = screenPoint({
                      x: centerModel.x + projection.x,
                      y: centerModel.y + projection.y,
                    });
                    const lift = Math.min(128, Math.max(64, solid.height * zoom * 0.32));
                    const topY = center.y - lift;
                    return (
                      <g className="sketch-pull-gizmo">
                        <circle cx={center.x} cy={center.y} r="9" className="sketch-face-anchor" />
                        <line x1={center.x} y1={center.y} x2={center.x} y2={topY} className="sketch-pull-line" />
                        <path d={`M ${center.x - 9} ${topY + 12} L ${center.x} ${topY - 4} L ${center.x + 9} ${topY + 12} Z`} className="sketch-pull-arrow" />
                        <circle
                          cx={center.x}
                          cy={topY}
                          r="26"
                          className="sketch-pull-hit"
                          onPointerDown={(event) => beginPullExtrude(event, solid.id)}
                          onPointerMove={movePullExtrude}
                          onPointerUp={endPullExtrude}
                          onPointerCancel={endPullExtrude}
                        />
                        <g transform={`translate(${center.x + 18} ${topY - 12})`}>
                          <rect x="0" y="0" width="76" height="28" rx="8" className="sketch-pull-badge" />
                          <text x="38" y="18" textAnchor="middle" className="sketch-pull-text">
                            {solid.height.toFixed(1)} mm
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {entities.map(
              renderEntity
            )}

            {profile && !selectedSolid && tool === "select" && (() => {
              const centerModel = profileCenter();
              if (!centerModel) return null;
              const faceSketch = selected?.faceSketch || null;
              const featureMode = Boolean(faceSketch);
              let center = screenPoint(centerModel);
              let direction = { x: 0, y: -1 };

              if (faceSketch?.faceType === "top") {
                center = facePointToScreen(faceSketch, centerModel);
              } else if (faceSketch?.faceType === "side") {
                center = facePointToScreen(faceSketch, centerModel);
                const frame = sideFaceFrame(faceSketch);
                if (frame) {
                  const vx = frame.outward.x;
                  const vy = -frame.outward.y;
                  const magnitude = Math.hypot(vx, vy) || 1;
                  direction = { x: vx / magnitude, y: vy / magnitude };
                }
              }

              const lift = featureMode
                ? 88
                : Math.min(150, Math.max(72, extrusionHeight * zoom * 0.55));
              const end = {
                x: center.x + direction.x * lift,
                y: center.y + direction.y * lift,
              };
              const perp = { x: -direction.y, y: direction.x };
              const tip = {
                x: end.x + direction.x * 5,
                y: end.y + direction.y * 5,
              };
              const arrowA = {
                x: end.x - direction.x * 12 + perp.x * 9,
                y: end.y - direction.y * 12 + perp.y * 9,
              };
              const arrowB = {
                x: end.x - direction.x * 12 - perp.x * 9,
                y: end.y - direction.y * 12 - perp.y * 9,
              };

              return (
                <g className="sketch-pull-gizmo">
                  <circle cx={center.x} cy={center.y} r="9" className="sketch-face-anchor" />
                  <line x1={center.x} y1={center.y} x2={end.x} y2={end.y} className="sketch-pull-line" />
                  <path
                    d={`M ${arrowA.x} ${arrowA.y} L ${tip.x} ${tip.y} L ${arrowB.x} ${arrowB.y} Z`}
                    className="sketch-pull-arrow"
                  />
                  <circle
                    cx={end.x}
                    cy={end.y}
                    r="26"
                    className="sketch-pull-hit"
                    onPointerDown={beginPullExtrude}
                    onPointerMove={movePullExtrude}
                    onPointerUp={endPullExtrude}
                    onPointerCancel={endPullExtrude}
                  />
                  <g transform={`translate(${end.x + 18} ${end.y - 12})`}>
                    <rect x="0" y="0" width="76" height="28" rx="8" className="sketch-pull-badge" />
                    <text x="38" y="18" textAnchor="middle" className="sketch-pull-text">
                      {extrusionHeight.toFixed(1)} mm
                    </text>
                  </g>
                </g>
              );
            })()}

            {tool === "line" &&
              lineStart &&
              hoverPoint && (
              <g className="sketch-preview">
                <line
                  x1={
                    screenPoint(
                      lineStart
                    ).x
                  }
                  y1={
                    screenPoint(
                      lineStart
                    ).y
                  }
                  x2={
                    screenPoint(
                      hoverPoint
                    ).x
                  }
                  y2={
                    screenPoint(
                      hoverPoint
                    ).y
                  }
                  className="sketch-preview-line"
                />

                {hoverPoint.snapKind && (
                  <text
                    x={
                      screenPoint(
                        hoverPoint
                      ).x + 10
                    }
                    y={
                      screenPoint(
                        hoverPoint
                      ).y - 10
                    }
                    className="sketch-snap-label"
                  >
                    {hoverPoint.snapKind}
                  </text>
                )}
              </g>
            )}

            {draftRect && (() => {
              const target = faceSketchTarget;
              const project = (point) => facePointToScreen(target, point);
              const points = [
                { x: draft.start.x, y: draft.start.y },
                { x: draft.current.x, y: draft.start.y },
                { x: draft.current.x, y: draft.current.y },
                { x: draft.start.x, y: draft.current.y },
              ].map(project).map((point) => `${point.x},${point.y}`).join(" ");
              return <polygon points={points} className="sketch-preview-shape" />;
            })()}

            {draft?.type === "circle" && (() => {
              const target = faceSketchTarget;
              const project = (point) => facePointToScreen(target, point);
              const points = Array.from({ length: 64 }, (_, index) => {
                const angle = index / 64 * Math.PI * 2;
                return project({
                  x: draft.start.x + Math.cos(angle) * draftCircleRadius,
                  y: draft.start.y + Math.sin(angle) * draftCircleRadius,
                });
              }).map((point) => `${point.x},${point.y}`).join(" ");
              return <polygon points={points} className="sketch-preview-shape" />;
            })()}

            {draft?.type ===
              "spline" && (
              <polyline
                points={
                  draft.points
                    .map(
                      screenPoint
                    )
                    .map(
                      (point) =>
                        `${point.x},${point.y}`
                    )
                    .join(" ")
                }
                className="sketch-preview-line"
              />
            )}

            {currentArc && (
              <polyline
                points={
                  arcPoints(
                    currentArc
                  )
                    .map(
                      screenPoint
                    )
                    .map(
                      (point) =>
                        `${point.x},${point.y}`
                    )
                    .join(" ")
                }
                className="sketch-preview-line"
              />
            )}
          </svg>

          {draftSolids.length > 0 && !faceSketchTarget && (
            <div className="sketch-view-controls" aria-label="3D view controls">
              <div className="sketch-view-cube" aria-hidden="true">
                <span className="cube-top">T</span>
                <span className="cube-front">F</span>
                <span className="cube-side">R</span>
              </div>
              <div className="sketch-view-buttons">
                <button type="button" onClick={() => setViewPreset("iso")}>ISO</button>
                <button type="button" onClick={() => setViewPreset("top")}>TOP</button>
                <button type="button" onClick={() => setViewPreset("front")}>FRONT</button>
                <button type="button" onClick={() => setViewPreset("right")}>RIGHT</button>
                <button type="button" onClick={fitModelView}>FIT</button>
              </div>
            </div>
          )}

          {(selectedSolid || selectedFeature || selectedEdge) && !faceSketchTarget && (
            <div className="sketch-context-toolbar" role="toolbar" aria-label="Context tools">
              <div className="sketch-context-title">
                <span>{selectedEdge ? "EDGE" : selectedFeature ? "FEATURE" : "FACE"}</span>
                <strong>
                  {selectedEdge
                    ? `${(selectedEdge.edgeType || "top").toUpperCase()} ${selectedEdge.edgeIndex + 1}`
                    : selectedFeature
                      ? `${selectedFeature.mode === "cut" ? "POCKET" : "BOSS"} · ${Math.abs(Number(selectedFeature.depth || 0)).toFixed(1)} mm`
                      : selectedSolidFace.type === "top"
                        ? "TOP FACE"
                        : `SIDE ${selectedSolidFace.index + 1}`}
                </strong>
              </div>
              <div className="sketch-context-actions">
                {selectedEdge ? (
                  <>
                    <button type="button" className={edgeTreatmentMode === "fillet" ? "active" : ""} onClick={() => applyEdgeTreatment("fillet", edgeTreatmentAmount)}>FILLET</button>
                    <button type="button" className={edgeTreatmentMode === "chamfer" ? "active" : ""} onClick={() => applyEdgeTreatment("chamfer", edgeTreatmentAmount)}>CHAMFER</button>
                    <button type="button" onClick={removeSelectedEdgeTreatment}>REMOVE</button>
                  </>
                ) : selectedFeature ? (
                  <>
                    <button type="button" onClick={flipSelectedFeature}>{selectedFeature.mode === "cut" ? "MAKE ADD" : "MAKE CUT"}</button>
                    <button type="button" onClick={deleteSelectedFeature}>DELETE</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="primary" onClick={sketchOnSelectedFace}>SKETCH ON FACE</button>
                    <button type="button" onClick={fitModelView}>FIT</button>
                  </>
                )}
                <button type="button" className="context-close" onClick={clearModelSelection}>×</button>
              </div>
            </div>
          )}

          <div className="sketch-canvas-readout sketch-canvas-readout-left">
            <span>
              {plane.toUpperCase()} PLANE
            </span>
            <b>
              GRID {gridSize} MM
            </b>
          </div>

          <div className="sketch-canvas-readout sketch-canvas-readout-right">
            <span>
              PENCIL = DRAW / SELECT
            </span>
            <b>
              {solidNavigationActive ? "1 FINGER = ORBIT · 2 FINGERS = PAN/ZOOM" : "TOUCH = PAN · PINCH = ZOOM"}
            </b>
          </div>

          {tool === "line" &&
            lineStart && (
            <button
              type="button"
              className="sketch-floating-done"
              onClick={() =>
                finishCurrentTool()
              }
            >
              DONE
            </button>
          )}
        </div>

        <aside className="sketch-inspector">
          <div className="sketch-inspector-head">
            <span>
              ADAPTIVE TOOLS
            </span>

            <strong>
              {entityName(
                selected
              )}
            </strong>
          </div>

          {!selected && (
            <div className="sketch-empty-inspector">
              <b>
                Apple Pencil workflow
              </b>

              <p>
                Draw with Pencil. Use a finger to move the canvas and two fingers to pinch-zoom. Tap geometry to reveal dimensions, constraints and valid next actions.
              </p>
            </div>
          )}

          {selected && (
            <>
              <div className="sketch-selected-state">
                <span>
                  STATE
                </span>

                <strong
                  className={
                    selected.locked ||
                    selected.dimensionLocked
                      ? "defined"
                      : "under-defined"
                  }
                >
                  {selected.locked ||
                  selected.dimensionLocked
                    ? "DEFINED"
                    : "UNDER-DEFINED"}
                </strong>
              </div>

              <div className="sketch-dimension-panel">
                <span>
                  DIMENSIONS
                </span>

                {selected.type ===
                  "line" && (
                  <label>
                    <span>
                      LENGTH
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={
                        selectedMetrics
                          ?.length.toFixed(
                            1
                          ) ||
                        0
                      }
                      onChange={(
                        event
                      ) =>
                        updateDimension(
                          "length",
                          event.target
                            .value
                        )
                      }
                    />
                    <small>
                      MM
                    </small>
                  </label>
                )}

                {selected.type ===
                  "rect" && (
                  <>
                    <label>
                      <span>
                        WIDTH
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          selectedMetrics
                            ?.width.toFixed(
                              1
                            ) ||
                          0
                        }
                        onChange={(
                          event
                        ) =>
                          updateDimension(
                            "width",
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
                        HEIGHT
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          selectedMetrics
                            ?.height.toFixed(
                              1
                            ) ||
                          0
                        }
                        onChange={(
                          event
                        ) =>
                          updateDimension(
                            "height",
                            event.target
                              .value
                          )
                        }
                      />
                      <small>
                        MM
                      </small>
                    </label>
                  </>
                )}

                {selected.type ===
                  "circle" && (
                  <label>
                    <span>
                      DIAMETER
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={
                        selectedMetrics
                          ?.diameter.toFixed(
                            1
                          ) ||
                        0
                      }
                      onChange={(
                        event
                      ) =>
                        updateDimension(
                          "diameter",
                          event.target
                            .value
                        )
                      }
                    />
                    <small>
                      MM
                    </small>
                  </label>
                )}

                {selected.type ===
                  "arc" && (
                  <label>
                    <span>
                      RADIUS
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={
                        selectedMetrics
                          ?.radius.toFixed(
                            1
                          ) ||
                        0
                      }
                      onChange={(
                        event
                      ) =>
                        updateDimension(
                          "radius",
                          event.target
                            .value
                        )
                      }
                    />
                    <small>
                      MM
                    </small>
                  </label>
                )}

                {selected.type ===
                  "spline" && (
                  <div className="sketch-readonly-dimension">
                    <span>
                      PATH LENGTH
                    </span>
                    <strong>
                      {selectedMetrics
                        ?.length.toFixed(
                          1
                        )} MM
                    </strong>
                  </div>
                )}
              </div>

              <div className="sketch-constraint-panel">
                <span>
                  CONSTRAINTS
                </span>

                <div>
                  <button
                    type="button"
                    disabled={
                      selected.type !==
                        "line" ||
                      selected.locked
                    }
                    onClick={() =>
                      constrainSelected(
                        "horizontal"
                      )
                    }
                  >
                    HORIZONTAL
                  </button>

                  <button
                    type="button"
                    disabled={
                      selected.type !==
                        "line" ||
                      selected.locked
                    }
                    onClick={() =>
                      constrainSelected(
                        "vertical"
                      )
                    }
                  >
                    VERTICAL
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleSelectedLock
                    }
                  >
                    {selected.locked ? (
                      <Unlock
                        size={15}
                      />
                    ) : (
                      <Lock
                        size={15}
                      />
                    )}

                    {selected.locked
                      ? "UNLOCK"
                      : "LOCK"}
                  </button>
                </div>
              </div>

              {selected.type ===
                "spline" && (
                <button
                  type="button"
                  className="sketch-secondary-action"
                  onClick={
                    closeSelectedSpline
                  }
                >
                  {selected.closed
                    ? "OPEN SPLINE"
                    : "CLOSE PROFILE"}
                </button>
              )}

              <div className="sketch-selection-actions">
                <button
                  type="button"
                  onClick={
                    duplicateSelected
                  }
                >
                  <Copy
                    size={16}
                  />
                  DUPLICATE
                </button>

                <button
                  type="button"
                  onClick={
                    deleteSelected
                  }
                >
                  <Trash2
                    size={16}
                  />
                  DELETE
                </button>
              </div>
            </>
          )}

          <div className="sketch-settings-panel">
            <span>
              SKETCH SETTINGS
            </span>

            <label>
              <span>
                SNAP
              </span>
              <button
                type="button"
                className={
                  snapEnabled
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSnapEnabled(
                    (value) =>
                      !value
                  )
                }
              >
                {snapEnabled
                  ? "ON"
                  : "OFF"}
              </button>
            </label>

            <label>
              <span>
                AUTO CONSTRAINT
              </span>
              <button
                type="button"
                className={
                  autoConstraints
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setAutoConstraints(
                    (value) =>
                      !value
                  )
                }
              >
                {autoConstraints
                  ? "ON"
                  : "OFF"}
              </button>
            </label>

            <label>
              <span>
                DIMENSIONS
              </span>
              <button
                type="button"
                className={
                  showDimensions
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setShowDimensions(
                    (value) =>
                      !value
                  )
                }
              >
                {showDimensions
                  ? "ON"
                  : "OFF"}
              </button>
            </label>

            <label>
              <span>
                GRID
              </span>
              <select
                value={gridSize}
                onChange={(
                  event
                ) =>
                  setGridSize(
                    Number(
                      event.target
                        .value
                    )
                  )
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
                <option value="25">
                  25 MM
                </option>
                <option value="50">
                  50 MM
                </option>
              </select>
            </label>
          </div>
        </aside>
      </div>

      {modelHistory.length > 0 && (
        <aside className="sketch-model-history" aria-label="Model history">
          <div className="sketch-model-history-head">
            <span>MODEL HISTORY</span>
            <small>{modelHistory.length}</small>
          </div>
          <div className="sketch-model-history-list">
            {modelHistory.map((entry) => (
              <button key={entry.id} type="button" onClick={() => selectHistoryEntry(entry)} className={(entry.kind === "feature" && entry.featureId === selectedFeatureId) || (entry.kind === "edge" && selectedEdge?.solidId === entry.solidId && selectedEdge?.edgeIndex === entry.edgeIndex && (selectedEdge?.edgeType || "top") === (entry.edgeType || "top")) || (entry.kind === "extrude" && selectedSolidId === entry.solidId && !selectedFeatureId && !selectedEdge) ? "active" : ""}>
                <span>{entry.label}</span>
                <strong>{entry.value}</strong>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="sketch-adaptive-bar">
        <div className="sketch-adaptive-copy">
          <span>
            {selectedEdge
              ? `${edgeTreatmentMode.toUpperCase()} · ${(selectedEdge.edgeType || "top").toUpperCase()} EDGE ${selectedEdge.edgeIndex + 1}`
              : selectedFeature
              ? `${selectedFeature.mode === 'cut' ? 'POCKET' : 'BOSS'} · FEATURE`
              : selectedSolid
                ? `3D BODY · ${selectedSolidFace.type === 'top' ? 'TOP FACE' : `SIDE ${selectedSolidFace.index + 1}`}`
              : profile
                ? "CLOSED PROFILE"
                : selected
                  ? entityName(selected)
                  : tool.toUpperCase()}
          </span>

          <strong>
            {selectedEdge
              ? "Choose FILLET or CHAMFER · edit the radius/distance non-destructively"
              : selectedFeature
              ? "Drag the feature arrow to edit depth · cross the face to switch add/cut"
              : selectedSolid
                ? selectedSolidFace.type === 'top'
                  ? "Drag the arrow to push/pull · tap the face again to sketch"
                  : "Tap the side again to sketch · face snapping is automatic"
              : profile
                ? selected?.faceSketch
                  ? `${profile.label} · pull UP to add · pull DOWN to cut`
                  : `${profile.label} · pull the face to create a body`
                : tool === "line" && lineStart
                  ? "Tap next point · close the loop to create a profile"
                  : tool === "arc"
                    ? "Center → start → end"
                    : tool === "spline"
                      ? "Draw freely with Apple Pencil"
                      : "Select geometry for adaptive actions"}
          </strong>
        </div>

        {selectedEdge && selectedSolid ? (
          <div className="sketch-extrude-control sketch-edge-control">
            <div className="sketch-segmented-control">
              <button type="button" className={edgeTreatmentMode === "chamfer" ? "active" : ""} onClick={() => applyEdgeTreatment("chamfer", edgeTreatmentAmount)}>CHAMFER</button>
              <button type="button" className={edgeTreatmentMode === "fillet" ? "active" : ""} onClick={() => applyEdgeTreatment("fillet", edgeTreatmentAmount)}>FILLET</button>
            </div>
            <label>
              <span>{edgeTreatmentMode === "fillet" ? "RADIUS" : "DISTANCE"}</span>
              <input type="number" min="0.25" max="50" step="0.25" value={edgeTreatmentAmount} onChange={(event) => { const value = clamp(event.target.value, 0.25, 50); setEdgeTreatmentAmount(value); applyEdgeTreatment(edgeTreatmentMode, value); }} />
              <small>MM</small>
            </label>
            <div className="sketch-edge-drag-tip">DRAG THE HIGHLIGHTED EDGE SIDEWAYS TO SET SIZE</div>
            <button type="button" className="sketch-secondary-action" onClick={() => setSelectedEdge(null)}>DONE</button>
          </div>
        ) : selectedFeature && selectedSolid ? (
          <div className="sketch-extrude-control">
            <label>
              <span>DEPTH</span>
              <input
                type="number"
                min="-500"
                max="500"
                step="0.5"
                value={selectedFeature.depth}
                onChange={(event) => {
                  const depth = clamp(event.target.value, -500, 500);
                  const safeDepth = Math.abs(depth) < 0.5 ? (depth < 0 ? -0.5 : 0.5) : depth;
                  setExtrusionHeight(safeDepth);
                  setDraftSolids((current) => current.map((solid) =>
                    solid.id === selectedSolid.id
                      ? {
                          ...solid,
                          features: (solid.features || []).map((feature) =>
                            feature.id === selectedFeature.id
                              ? { ...feature, depth: safeDepth, mode: safeDepth < 0 ? 'cut' : 'add' }
                              : feature
                          ),
                        }
                      : solid
                  ));
                }}
              />
              <small>MM</small>
            </label>
            <button type="button" className="sketch-secondary-action" onClick={() => setSelectedFeatureId(null)}>DONE</button>
            <button type="button" disabled={creatingSolid || objectCount >= maxObjects} onClick={() => sendSolidToStudio(selectedSolid)}>
              {creatingSolid ? "BUILDING…" : "SEND TO STUDIO"}
            </button>
          </div>
        ) : selectedSolid ? (
          <div className="sketch-extrude-control">
            <label>
              <span>HEIGHT</span>
              <input
                type="number"
                min="0.5"
                max="500"
                step="0.5"
                value={selectedSolid.height}
                onChange={(event) => {
                  const height = clamp(event.target.value, 0.5, 500);
                  setExtrusionHeight(height);
                  setDraftSolids((current) => current.map((solid) =>
                    solid.id === selectedSolid.id ? { ...solid, height } : solid
                  ));
                }}
              />
              <small>MM</small>
            </label>
            <button
              type="button"
              className="sketch-secondary-action"
              onClick={sketchOnSelectedFace}
            >
              START FACE SKETCH
            </button>
            <button
              type="button"
              className="sketch-secondary-action"
              onClick={() => {
                setOrbitAngle((value) => value >= 155 ? 25 : value + 32);
                setOrbitElevation((value) => value >= 68 ? 28 : value + 10);
              }}
            >
              ORBIT VIEW
            </button>
            <button
              type="button"
              disabled={creatingSolid || objectCount >= maxObjects}
              onClick={() => sendSolidToStudio(selectedSolid)}
            >
              {creatingSolid ? "BUILDING…" : "SEND TO STUDIO"}
            </button>
          </div>
        ) : profile ? (
          <div className="sketch-extrude-control">
            <label>
              <span>
                EXTRUDE
              </span>
              <input
                type="number"
                min={selected?.faceSketch ? "-500" : "0.5"}
                max="500"
                step="0.5"
                value={
                  extrusionHeight
                }
                onChange={(
                  event
                ) =>
                  setExtrusionHeight(
                    clamp(
                      event.target
                        .value,
                      selected?.faceSketch ? -500 : 0.5,
                      500
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
              disabled={
                creatingSolid ||
                objectCount >=
                  maxObjects ||
                Boolean(selected?.faceSketch)
              }
              onClick={
                extrudeProfile
              }
            >
              {creatingSolid
                ? "BUILDING…"
                : selected?.faceSketch
                  ? "DRAG ARROW TO APPLY"
                  : "CREATE 3D BODY"}
            </button>
          </div>
        ) : (
          <div className="sketch-adaptive-actions">
            <button
              type="button"
              onClick={() => {
                finishCurrentTool();
                onSwitchToStudio?.();
              }}
            >
              OPEN STUDIO
            </button>
          </div>
        )}

        {createMessage && (
          <span className="sketch-create-message">
            {createMessage}
          </span>
        )}
      </div>
    </div>
  );
}

export default SketchWorkspace;
