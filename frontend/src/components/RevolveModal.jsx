import {
  useMemo,
  useRef,
  useState,
} from "react";

const CANVAS_WIDTH =
  680;
const CANVAS_HEIGHT =
  460;
const MAX_RADIUS_MM =
  110;
const HALF_HEIGHT_MM =
  90;

const PRESETS = {
  vase: [
    [24, -70],
    [30, -62],
    [37, -42],
    [34, -18],
    [29, 8],
    [35, 32],
    [43, 55],
    [39, 70],
  ],
  knob: [
    [26, -32],
    [30, -27],
    [34, -17],
    [35, -4],
    [32, 10],
    [25, 22],
    [18, 30],
    [10, 34],
  ],
  chess: [
    [28, -72],
    [31, -66],
    [30, -58],
    [19, -53],
    [14, -45],
    [15, -34],
    [11, -24],
    [9, -10],
    [11, 4],
    [17, 14],
    [22, 22],
    [23, 33],
    [19, 43],
    [13, 50],
    [18, 58],
    [16, 68],
  ],
};

function profileToCanvas(
  point
) {
  const axisX = 72;
  const usableWidth =
    CANVAS_WIDTH -
    axisX -
    32;

  return {
    x:
      axisX +
      (
        point[0] /
        MAX_RADIUS_MM
      ) *
        usableWidth,
    y:
      CANVAS_HEIGHT /
        2 -
      (
        point[1] /
        HALF_HEIGHT_MM
      ) *
        (
          CANVAS_HEIGHT /
            2 -
          28
        ),
  };
}

function RevolveModal({
  open,
  engineStatus,
  onClose,
  onCreate,
}) {
  const svgRef =
    useRef(null);

  const [
    profilePoints,
    setProfilePoints,
  ] = useState(
    PRESETS.vase
  );

  const [
    degrees,
    setDegrees,
  ] = useState(360);

  const [
    segments,
    setSegments,
  ] = useState(64);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const preview =
    useMemo(
      () =>
        profilePoints.map(
          profileToCanvas
        ),
      [profilePoints]
    );

  const closedProfile =
    useMemo(
      () => {
        if (
          profilePoints.length <
          2
        ) {
          return [];
        }

        const first =
          profilePoints[0];

        const last =
          profilePoints[
            profilePoints.length -
              1
          ];

        return [
          [
            0,
            first[1],
          ],
          ...profilePoints.map(
            (point) => [
              point[0],
              point[1],
            ]
          ),
          [
            0,
            last[1],
          ],
        ];
      },
      [profilePoints]
    );

  if (!open) {
    return null;
  }

  function eventToProfile(
    event
  ) {
    const rect =
      svgRef.current
        .getBoundingClientRect();

    const x =
      (
        event.clientX -
        rect.left
      ) /
      rect.width *
      CANVAS_WIDTH;

    const y =
      (
        event.clientY -
        rect.top
      ) /
      rect.height *
      CANVAS_HEIGHT;

    const axisX = 72;

    const usableWidth =
      CANVAS_WIDTH -
      axisX -
      32;

    const radius =
      Math.max(
        0.5,
        Math.min(
          MAX_RADIUS_MM,
          (
            x -
            axisX
          ) /
            usableWidth *
            MAX_RADIUS_MM
        )
      );

    const height =
      Math.max(
        -HALF_HEIGHT_MM,
        Math.min(
          HALF_HEIGHT_MM,
          (
            CANVAS_HEIGHT /
              2 -
            y
          ) /
            (
              CANVAS_HEIGHT /
                2 -
              28
            ) *
            HALF_HEIGHT_MM
        )
      );

    return [
      Math.round(
        radius * 2
      ) / 2,
      Math.round(
        height * 2
      ) / 2,
    ];
  }

  function addPoint(
    event
  ) {
    const point =
      eventToProfile(
        event
      );

    setMessage("");

    setProfilePoints(
      (current) => [
        ...current,
        point,
      ]
    );
  }

  function usePreset(
    key
  ) {
    setProfilePoints(
      PRESETS[
        key
      ].map(
        (point) => [
          point[0],
          point[1],
        ]
      )
    );

    setMessage("");
  }

  async function create() {
    if (
      profilePoints.length <
      2
    ) {
      setMessage(
        "Add at least two profile points."
      );

      return;
    }

    setCreating(
      true
    );

    setMessage(
      "Building revolved solid…"
    );

    try {
      const engine =
        await onCreate({
          points:
            closedProfile,
          profilePoints:
            profilePoints.map(
              (point) => [
                point[0],
                point[1],
              ]
            ),
          degrees:
            Math.max(
              1,
              Math.min(
                360,
                Number(
                  degrees
                )
              )
            ),
          segments:
            Math.max(
              12,
              Math.min(
                160,
                Math.round(
                  Number(
                    segments
                  )
                )
              )
            ),
        });

      setMessage(
        `${engine} created.`
      );
    } catch (
      error
    ) {
      console.error(
        "Creator revolve error:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to revolve this profile."
      );
    } finally {
      setCreating(
        false
      );
    }
  }

  const polygonPoints =
    closedProfile
      .map(
        profileToCanvas
      )
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  return (
    <div className="creator-revolve-overlay">
      <div className="creator-revolve-modal">
        <div className="creator-revolve-topbar">
          <div>
            <span>
              ADVANCED CAD / REVOLVE
            </span>

            <strong>
              Sketch a side profile.
              Spin it into a solid.
            </strong>
          </div>

          <button
            type="button"
            className="creator-revolve-close"
            onClick={
              onClose
            }
          >
            ×
          </button>
        </div>

        <div className="creator-revolve-layout">
          <aside className="creator-revolve-toolbar">
            <span className="creator-revolve-section-label">
              PROFILE PRESETS
            </span>

            <div className="creator-revolve-presets">
              <button
                type="button"
                onClick={() =>
                  usePreset(
                    "vase"
                  )
                }
              >
                <b>
                  ◒
                </b>

                <span>
                  Vase
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  usePreset(
                    "knob"
                  )
                }
              >
                <b>
                  ●
                </b>

                <span>
                  Knob
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  usePreset(
                    "chess"
                  )
                }
              >
                <b>
                  ♟
                </b>

                <span>
                  Turned
                </span>
              </button>
            </div>

            <button
              type="button"
              className="creator-revolve-clear"
              onClick={() => {
                setProfilePoints(
                  []
                );

                setMessage("");
              }}
            >
              CLEAR FOR CUSTOM
            </button>

            <div className="creator-revolve-divider" />

            <label className="creator-revolve-field">
              <span>
                REVOLVE
              </span>

              <div>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={
                    degrees
                  }
                  onChange={(
                    event
                  ) =>
                    setDegrees(
                      event.target
                        .value
                    )
                  }
                />

                <small>
                  DEG
                </small>
              </div>
            </label>

            <label className="creator-revolve-field">
              <span>
                QUALITY
              </span>

              <div>
                <input
                  type="number"
                  min="12"
                  max="160"
                  step="4"
                  value={
                    segments
                  }
                  onChange={(
                    event
                  ) =>
                    setSegments(
                      event.target
                        .value
                    )
                  }
                />

                <small>
                  SEG
                </small>
              </div>
            </label>

            <div className="creator-revolve-engine-card">
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
                    : "FALLBACK AVAILABLE"}
              </strong>

              <small>
                Manifold revolve creates a printable solid from the radial cross-section.
              </small>
            </div>
          </aside>

          <main className="creator-revolve-stage">
            <div className="creator-revolve-stage-top">
              <div>
                <span className="creator-revolve-live-dot" />

                SIDE PROFILE
              </div>

              <strong>
                CLICK BOTTOM → TOP
              </strong>
            </div>

            <svg
              ref={
                svgRef
              }
              className="creator-revolve-canvas"
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              onClick={
                addPoint
              }
            >
              <defs>
                <pattern
                  id="creator-revolve-grid"
                  width="34"
                  height="34"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 34 0 L 0 0 0 34"
                    fill="none"
                    stroke="rgba(90,135,170,.08)"
                    strokeWidth="1"
                  />
                </pattern>

                <linearGradient
                  id="creator-revolve-fill"
                  x1="0"
                  x2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(53,139,202,.28)"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(78,166,224,.08)"
                  />
                </linearGradient>
              </defs>

              <rect
                width="100%"
                height="100%"
                fill="url(#creator-revolve-grid)"
              />

              <line
                x1="72"
                y1="18"
                x2="72"
                y2={CANVAS_HEIGHT - 18}
                stroke="rgba(94,176,230,.7)"
                strokeWidth="2"
              />

              <text
                x="18"
                y="28"
                fill="rgba(92,145,184,.62)"
                fontSize="9"
                fontWeight="700"
              >
                AXIS
              </text>

              {closedProfile.length >
                2 && (
                <polygon
                  points={
                    polygonPoints
                  }
                  fill="url(#creator-revolve-fill)"
                  stroke="rgba(94,177,231,.72)"
                  strokeWidth="2"
                />
              )}

              {preview.map(
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
                      fill="#0b1f30"
                      stroke="#78c0ed"
                      strokeWidth="2"
                    />

                    <text
                      x={
                        point.x +
                        8
                      }
                      y={
                        point.y -
                        8
                      }
                      fill="rgba(116,166,202,.65)"
                      fontSize="8"
                    >
                      {
                        index +
                        1
                      }
                    </text>
                  </g>
                )
              )}
            </svg>

            <div className="creator-revolve-instructions">
              The blue vertical line is the rotation axis. Keep points to its right. For a custom shape, clear the preset and click the OUTER profile from bottom to top.
            </div>
          </main>

          <aside className="creator-revolve-summary">
            <span className="creator-revolve-section-label">
              REVOLVE SUMMARY
            </span>

            <div className="creator-revolve-stat">
              <span>
                PROFILE
              </span>

              <strong>
                {
                  profilePoints.length
                } PT
              </strong>
            </div>

            <div className="creator-revolve-stat">
              <span>
                ANGLE
              </span>

              <strong>
                {
                  degrees
                }°
              </strong>
            </div>

            <div className="creator-revolve-stat">
              <span>
                SEGMENTS
              </span>

              <strong>
                {
                  segments
                }
              </strong>
            </div>

            <div className="creator-revolve-examples">
              <span>
                GREAT FOR
              </span>

              <p>
                Vases · knobs · bowls · chess pieces · bottles · lamp bodies · turned parts
              </p>
            </div>

            <div className="creator-revolve-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setProfilePoints(
                    (
                      current
                    ) =>
                      current.slice(
                        0,
                        -1
                      )
                  )
                }
                disabled={
                  profilePoints.length ===
                  0
                }
              >
                Undo Point
              </button>

              <button
                type="button"
                className="primary"
                onClick={
                  create
                }
                disabled={
                  creating ||
                  profilePoints.length <
                    2
                }
              >
                {creating
                  ? "BUILDING…"
                  : "CREATE REVOLVED SOLID →"}
              </button>
            </div>

            {message && (
              <div className="creator-revolve-message">
                {
                  message
                }
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default RevolveModal;
