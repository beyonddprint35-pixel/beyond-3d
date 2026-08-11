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
    createMessage,
    setCreateMessage,
  ] = useState("");

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

    return {
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

    endpointCandidates().forEach(
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
            point:
              candidate,
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
          "COINCIDENT",
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
    if (
      event.pointerType ===
      "touch"
    ) {
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

    if (!entity.locked) {
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
        type: "pan",
        start:
          points[0],
        pan:
          {...pan},
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
      gesture?.type === "pan"
    ) {
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
    }
  }

  function endTouchGesture(
    event
  ) {
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
        type: "pan",
        start:
          points[0],
        pan:
          {...pan},
      };
    } else if (
      points.length === 0
    ) {
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
      setSelectedId(null);
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

  async function extrudeProfile() {
    if (
      !profile ||
      creatingSolid ||
      objectCount >=
        maxObjects
    ) {
      return;
    }

    setCreatingSolid(true);
    setCreateMessage("");

    try {
      const engine =
        await onCreateSolid({
          points:
            profile.points,
          height:
            Math.max(
              0.5,
              extrusionHeight
            ),
          twistDegrees: 0,
          scaleTop: 1,
          plane,
        });

      setCreateMessage(
        `${engine || "3D"} · sent to Studio`
      );
    } catch (error) {
      setCreateMessage(
        error?.message ||
          "Unable to create the 3D solid."
      );
    } finally {
      setCreatingSolid(false);
    }
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
    const selectedNow =
      entity.id === selectedId;

    const defined =
      entity.locked ||
      entity.dimensionLocked;

    const stroke =
      selectedNow
        ? "#9bdcff"
        : defined
          ? "#64d69c"
          : "#4ca9e8";

    const common = {
      onPointerDown: (
        event
      ) =>
        handleEntityPointerDown(
          event,
          entity
        ),
    };

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
        <g
          key={entity.id}
          {...common}
          className="sketch-entity"
        >
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="sketch-hit-line"
          />

          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={stroke}
            className="sketch-line"
          />

          <circle
            cx={a.x}
            cy={a.y}
            r={selectedNow ? 4.5 : 3}
            fill={stroke}
            className="sketch-point"
          />

          <circle
            cx={b.x}
            cy={b.y}
            r={selectedNow ? 4.5 : 3}
            fill={stroke}
            className="sketch-point"
          />

          {renderDimension(
            entity
          )}
        </g>
      );
    }

    if (
      entity.type === "rect"
    ) {
      const a =
        screenPoint({
          x:
            Math.min(
              entity.x,
              entity.x +
                entity.w
            ),
          y:
            Math.max(
              entity.y,
              entity.y +
                entity.h
            ),
        });

      const width =
        Math.abs(
          entity.w
        ) *
        zoom;

      const height =
        Math.abs(
          entity.h
        ) *
        zoom;

      return (
        <g
          key={entity.id}
          {...common}
          className="sketch-entity"
        >
          <rect
            x={a.x}
            y={a.y}
            width={width}
            height={height}
            className="sketch-hit-shape"
          />

          <rect
            x={a.x}
            y={a.y}
            width={width}
            height={height}
            stroke={stroke}
            className="sketch-shape"
          />

          {renderDimension(
            entity
          )}
        </g>
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
        <g
          key={entity.id}
          {...common}
          className="sketch-entity"
        >
          <circle
            cx={center.x}
            cy={center.y}
            r={entity.r * zoom}
            className="sketch-hit-shape"
          />

          <circle
            cx={center.x}
            cy={center.y}
            r={entity.r * zoom}
            stroke={stroke}
            className="sketch-shape"
          />

          <circle
            cx={center.x}
            cy={center.y}
            r="3.5"
            fill={stroke}
          />

          {renderDimension(
            entity
          )}
        </g>
      );
    }

    if (
      entity.type === "spline"
    ) {
      const screenPoints =
        entity.points.map(
          screenPoint
        );

      const points =
        screenPoints
          .map(
            (point) =>
              `${point.x},${point.y}`
          )
          .join(" ");

      return (
        <g
          key={entity.id}
          {...common}
          className="sketch-entity"
        >
          <polyline
            points={points}
            className="sketch-hit-line"
          />

          <polyline
            points={points}
            stroke={stroke}
            className="sketch-spline"
          />

          {entity.closed && (
            <line
              x1={
                screenPoints[0]
                  ?.x
              }
              y1={
                screenPoints[0]
                  ?.y
              }
              x2={
                screenPoints[
                  screenPoints.length -
                    1
                ]?.x
              }
              y2={
                screenPoints[
                  screenPoints.length -
                    1
                ]?.y
              }
              stroke={stroke}
              className="sketch-line"
            />
          )}
        </g>
      );
    }

    if (
      entity.type === "arc"
    ) {
      const points =
        arcPoints(entity)
          .map(
            screenPoint
          )
          .map(
            (point) =>
              `${point.x},${point.y}`
          )
          .join(" ");

      return (
        <g
          key={entity.id}
          {...common}
          className="sketch-entity"
        >
          <polyline
            points={points}
            className="sketch-hit-line"
          />

          <polyline
            points={points}
            stroke={stroke}
            className="sketch-spline"
          />
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
      className={
        isFullscreen
          ? "sketch-workspace sketch-workspace-fullscreen"
          : "sketch-workspace"
      }
    >
      <div className="sketch-topbar">
        <div className="sketch-topbar-title">
          <span>
            SKETCH
          </span>

          <strong>
            Pencil-first CAD
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

            {entities.map(
              renderEntity
            )}

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

            {draftRect && (
              <rect
                x={
                  screenPoint({
                    x:
                      draftRect.x,
                    y:
                      draftRect.y,
                  }).x
                }
                y={
                  screenPoint({
                    x:
                      draftRect.x,
                    y:
                      draftRect.y,
                  }).y
                }
                width={
                  draftRect.w *
                  zoom
                }
                height={
                  draftRect.h *
                  zoom
                }
                className="sketch-preview-shape"
              />
            )}

            {draft?.type ===
              "circle" && (
              <circle
                cx={
                  screenPoint(
                    draft.start
                  ).x
                }
                cy={
                  screenPoint(
                    draft.start
                  ).y
                }
                r={
                  draftCircleRadius *
                  zoom
                }
                className="sketch-preview-shape"
              />
            )}

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
              TOUCH = PAN · PINCH = ZOOM
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

      <div className="sketch-adaptive-bar">
        <div className="sketch-adaptive-copy">
          <span>
            {profile
              ? "CLOSED PROFILE"
              : selected
                ? entityName(
                    selected
                  )
                : tool.toUpperCase()}
          </span>

          <strong>
            {profile
              ? profile.label
              : tool === "line" &&
                  lineStart
                ? "Tap next point · close the loop to create a profile"
                : tool === "arc"
                  ? "Center → start → end"
                  : tool === "spline"
                    ? "Draw freely with Apple Pencil"
                    : "Select geometry for adaptive actions"}
          </strong>
        </div>

        {profile ? (
          <div className="sketch-extrude-control">
            <label>
              <span>
                EXTRUDE
              </span>
              <input
                type="number"
                min="0.5"
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
                      0.5,
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
                  maxObjects
              }
              onClick={
                extrudeProfile
              }
            >
              {creatingSolid
                ? "BUILDING…"
                : "CREATE 3D → STUDIO"}
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
