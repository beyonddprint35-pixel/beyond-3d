import {
  useMemo,
  useRef,
  useState,
} from "react";

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 400;
const MM_WIDTH = 260;
const MM_HEIGHT = 170;

function toCanvasPoint(
  point
) {
  return {
    x:
      CANVAS_WIDTH / 2 +
      point[0] *
        (CANVAS_WIDTH /
          MM_WIDTH),
    y:
      CANVAS_HEIGHT / 2 -
      point[1] *
        (CANVAS_HEIGHT /
          MM_HEIGHT),
  };
}

function rectanglePoints(
  a,
  b
) {
  return [
    [a[0], a[1]],
    [b[0], a[1]],
    [b[0], b[1]],
    [a[0], b[1]],
  ];
}

function circlePoints(
  center,
  edge,
  segments = 48
) {
  const radius =
    Math.max(
      1,
      Math.hypot(
        edge[0] -
          center[0],
        edge[1] -
          center[1]
      )
    );

  return Array.from(
    {
      length:
        segments,
    },
    (
      _,
      index
    ) => {
      const angle =
        index /
        segments *
        Math.PI *
        2;

      return [
        center[0] +
          Math.cos(
            angle
          ) *
          radius,
        center[1] +
          Math.sin(
            angle
          ) *
          radius,
      ];
    }
  );
}

function starPoints() {
  const points = [];
  const count = 10;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const angle =
      -Math.PI / 2 +
      index /
        count *
        Math.PI *
        2;

    const radius =
      index % 2 === 0
        ? 48
        : 22;

    points.push([
      Math.cos(
        angle
      ) *
        radius,
      Math.sin(
        angle
      ) *
        radius,
    ]);
  }

  return points;
}

function SketchExtrudeModal({
  open,
  engineStatus,
  onClose,
  onCreate,
}) {
  const svgRef =
    useRef(null);

  const [
    tool,
    setTool,
  ] = useState(
    "polygon"
  );

  const [
    points,
    setPoints,
  ] = useState([]);

  const [
    anchor,
    setAnchor,
  ] = useState(null);

  const [
    height,
    setHeight,
  ] = useState(30);

  const [
    twist,
    setTwist,
  ] = useState(0);

  const [
    topScale,
    setTopScale,
  ] = useState(100);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const previewPoints =
    useMemo(
      () =>
        points.map(
          toCanvasPoint
        ),
      [points]
    );

  if (!open) {
    return null;
  }

  function eventToMm(
    event
  ) {
    const rect =
      svgRef.current
        .getBoundingClientRect();

    const normalizedX =
      (event.clientX -
        rect.left) /
      rect.width;

    const normalizedY =
      (event.clientY -
        rect.top) /
      rect.height;

    const x =
      (normalizedX -
        0.5) *
      MM_WIDTH;

    const y =
      (0.5 -
        normalizedY) *
      MM_HEIGHT;

    return [
      Math.round(
        x * 2
      ) / 2,
      Math.round(
        y * 2
      ) / 2,
    ];
  }

  function handleCanvasClick(
    event
  ) {
    const point =
      eventToMm(
        event
      );

    setMessage("");

    if (
      tool ===
      "polygon"
    ) {
      setPoints(
        (current) => [
          ...current,
          point,
        ]
      );

      return;
    }

    if (!anchor) {
      setAnchor(
        point
      );

      setPoints([
        point,
      ]);

      return;
    }

    if (
      tool ===
      "rectangle"
    ) {
      setPoints(
        rectanglePoints(
          anchor,
          point
        )
      );
    } else if (
      tool ===
      "circle"
    ) {
      setPoints(
        circlePoints(
          anchor,
          point
        )
      );
    }

    setAnchor(null);
  }

  function switchTool(
    nextTool
  ) {
    setTool(
      nextTool
    );

    setPoints([]);
    setAnchor(null);
    setMessage("");
  }

  function clearSketch() {
    setPoints([]);
    setAnchor(null);
    setMessage("");
  }

  function undoPoint() {
    if (
      tool !==
      "polygon"
    ) {
      clearSketch();
      return;
    }

    setPoints(
      (current) =>
        current.slice(
          0,
          -1
        )
    );
  }

  async function createSolid() {
    if (
      points.length < 3
    ) {
      setMessage(
        "Add at least 3 points to the sketch."
      );
      return;
    }

    setCreating(true);
    setMessage(
      "Building solid…"
    );

    try {
      const engine =
        await onCreate({
          points,
          height:
            Math.max(
              1,
              Number(
                height
              ) || 1
            ),
          twistDegrees:
            Math.max(
              -360,
              Math.min(
                360,
                Number(
                  twist
                ) || 0
              )
            ),
          scaleTop:
            Math.max(
              0.05,
              Math.min(
                3,
                (Number(
                  topScale
                ) || 100) /
                  100
              )
            ),
        });

      setMessage(
        `Created with ${engine}.`
      );
    } catch (error) {
      setMessage(
        error?.message ||
          "Unable to create the sketch solid."
      );
    } finally {
      setCreating(false);
    }
  }

  const polyline =
    previewPoints
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  return (
    <div
      className="creator-sketch-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sketch and extrude"
    >
      <div className="creator-sketch-modal">
        <div className="creator-sketch-topbar">
          <div>
            <span>
              ADVANCED CAD
            </span>

            <strong>
              Sketch → Extrude
            </strong>
          </div>

          <button
            type="button"
            className="creator-sketch-close"
            onClick={
              onClose
            }
          >
            ×
          </button>
        </div>

        <div className="creator-sketch-layout">
          <aside className="creator-sketch-toolbar">
            <span className="creator-sketch-section-label">
              SKETCH TOOL
            </span>

            <div className="creator-sketch-tool-grid">
              {[
                [
                  "polygon",
                  "Polygon",
                  "⌁",
                ],
                [
                  "rectangle",
                  "Rectangle",
                  "□",
                ],
                [
                  "circle",
                  "Circle",
                  "○",
                ],
              ].map(
                ([
                  value,
                  label,
                  icon,
                ]) => (
                  <button
                    type="button"
                    key={
                      value
                    }
                    className={
                      tool ===
                      value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      switchTool(
                        value
                      )
                    }
                  >
                    <b>
                      {icon}
                    </b>

                    <span>
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="creator-sketch-star"
              onClick={() => {
                setTool(
                  "polygon"
                );
                setAnchor(null);
                setPoints(
                  starPoints()
                );
                setMessage("");
              }}
            >
              ★ STAR PROFILE
            </button>

            <div className="creator-sketch-divider" />

            <span className="creator-sketch-section-label">
              EXTRUSION
            </span>

            <label className="creator-sketch-field">
              <span>
                HEIGHT
              </span>

              <div>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={
                    height
                  }
                  onChange={(
                    event
                  ) =>
                    setHeight(
                      event.target
                        .value
                    )
                  }
                />
                <small>MM</small>
              </div>
            </label>

            <label className="creator-sketch-field">
              <span>
                TWIST
              </span>

              <div>
                <input
                  type="number"
                  min="-360"
                  max="360"
                  step="5"
                  value={
                    twist
                  }
                  onChange={(
                    event
                  ) =>
                    setTwist(
                      event.target
                        .value
                    )
                  }
                />
                <small>DEG</small>
              </div>
            </label>

            <label className="creator-sketch-field">
              <span>
                TOP SCALE
              </span>

              <div>
                <input
                  type="number"
                  min="5"
                  max="300"
                  step="5"
                  value={
                    topScale
                  }
                  onChange={(
                    event
                  ) =>
                    setTopScale(
                      event.target
                        .value
                    )
                  }
                />
                <small>%</small>
              </div>
            </label>

            <div className="creator-sketch-engine-card">
              <span>
                GEOMETRY ENGINE
              </span>

              <strong>
                {engineStatus ===
                "ready"
                  ? "MANIFOLD WASM"
                  : engineStatus ===
                      "loading"
                    ? "LOADING…"
                    : "MANIFOLD + FALLBACK"}
              </strong>

              <small>
                Robust CAD extrusion when Manifold is available.
              </small>
            </div>
          </aside>

          <div className="creator-sketch-stage">
            <div className="creator-sketch-stage-top">
              <div>
                <span className="creator-sketch-live-dot" />
                XY SKETCH PLANE
              </div>

              <strong>
                {points.length} PT
              </strong>
            </div>

            <svg
              ref={
                svgRef
              }
              className="creator-sketch-canvas"
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              onClick={
                handleCanvasClick
              }
            >
              <defs>
                <pattern
                  id="creatorSketchGridSmall"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="rgba(79,123,158,0.10)"
                    strokeWidth="1"
                  />
                </pattern>

                <pattern
                  id="creatorSketchGrid"
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width="120"
                    height="120"
                    fill="url(#creatorSketchGridSmall)"
                  />
                  <path
                    d="M 120 0 L 0 0 0 120"
                    fill="none"
                    stroke="rgba(83,137,179,0.16)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect
                width={
                  CANVAS_WIDTH
                }
                height={
                  CANVAS_HEIGHT
                }
                fill="url(#creatorSketchGrid)"
              />

              <line
                x1={
                  CANVAS_WIDTH /
                  2
                }
                x2={
                  CANVAS_WIDTH /
                  2
                }
                y1="0"
                y2={
                  CANVAS_HEIGHT
                }
                stroke="rgba(91,161,211,0.32)"
                strokeWidth="1"
              />

              <line
                x1="0"
                x2={
                  CANVAS_WIDTH
                }
                y1={
                  CANVAS_HEIGHT /
                  2
                }
                y2={
                  CANVAS_HEIGHT /
                  2
                }
                stroke="rgba(91,161,211,0.32)"
                strokeWidth="1"
              />

              {previewPoints.length >=
                2 && (
                <polygon
                  points={
                    polyline
                  }
                  fill="rgba(55,139,203,0.12)"
                  stroke="#65afe2"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )}

              {previewPoints.map(
                (
                  point,
                  index
                ) => (
                  <g
                    key={
                      `${point.x}-${point.y}-${index}`
                    }
                  >
                    <circle
                      cx={
                        point.x
                      }
                      cy={
                        point.y
                      }
                      r="5"
                      fill="#0a1824"
                      stroke="#8bcaf2"
                      strokeWidth="2"
                    />

                    {tool ===
                      "polygon" && (
                      <text
                        x={
                          point.x +
                          8
                        }
                        y={
                          point.y -
                          8
                        }
                        fill="#557b98"
                        fontSize="9"
                      >
                        {index +
                          1}
                      </text>
                    )}
                  </g>
                )
              )}
            </svg>

            <div className="creator-sketch-instructions">
              {tool ===
              "polygon"
                ? "CLICK TO PLACE VERTICES · THE LAST POINT CONNECTS BACK TO THE FIRST"
                : anchor
                  ? "CLICK AGAIN TO FINISH THE SHAPE"
                  : `CLICK TO SET THE ${tool === "circle" ? "CENTER" : "FIRST CORNER"}`}
            </div>
          </div>

          <aside className="creator-sketch-summary">
            <span className="creator-sketch-section-label">
              PROFILE
            </span>

            <div className="creator-sketch-profile-stat">
              <span>
                TYPE
              </span>
              <strong>
                {tool.toUpperCase()}
              </strong>
            </div>

            <div className="creator-sketch-profile-stat">
              <span>
                VERTICES
              </span>
              <strong>
                {points.length}
              </strong>
            </div>

            <div className="creator-sketch-profile-stat">
              <span>
                HEIGHT
              </span>
              <strong>
                {height} MM
              </strong>
            </div>

            <div className="creator-sketch-profile-stat">
              <span>
                TWIST
              </span>
              <strong>
                {twist}°
              </strong>
            </div>

            <div className="creator-sketch-actions-small">
              <button
                type="button"
                onClick={
                  undoPoint
                }
                disabled={
                  points.length ===
                  0
                }
              >
                Undo Point
              </button>

              <button
                type="button"
                onClick={
                  clearSketch
                }
                disabled={
                  points.length ===
                  0
                }
              >
                Clear
              </button>
            </div>

            {message && (
              <div className="creator-sketch-message">
                {message}
              </div>
            )}

            <button
              type="button"
              className="creator-sketch-create"
              onClick={
                createSolid
              }
              disabled={
                creating ||
                points.length <
                  3
              }
            >
              {creating
                ? "BUILDING SOLID…"
                : "CREATE 3D SOLID →"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SketchExtrudeModal;
