import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  Bounds,
  Environment,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import {
  Box,
  ImagePlus,
  Rotate3D,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";

import "./AIModelStudio.css";

const photoSlots = [
  {
    key: "front",
    label: "FRONT",
    hint: "Straight-on view",
  },
  {
    key: "left",
    label: "LEFT",
    hint: "Left side view",
  },
  {
    key: "right",
    label: "RIGHT",
    hint: "Right side view",
  },
  {
    key: "back",
    label: "BACK",
    hint: "Rear view",
  },
];

function GeneratedModel({
  url,
}) {
  const { scene } =
    useGLTF(url);

  const clonedScene =
    useMemo(
      () =>
        scene.clone(true),
      [scene]
    );

  return (
    <Bounds
      fit
      clip
      observe
      margin={1.35}
    >
      <primitive
        object={
          clonedScene
        }
      />
    </Bounds>
  );
}

class ModelViewerErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error
  ) {
    console.error(
      "3D viewer error:",
      error
    );
  }

  componentDidUpdate(
    previousProps
  ) {
    if (
      previousProps.resetKey !==
        this.props.resetKey &&
      this.state.hasError
    ) {
      this.setState({
        hasError: false,
      });
    }
  }

  render() {
    if (
      this.state.hasError
    ) {
      return (
        <div className="ai-viewer-error">
          <strong>
            The 3D preview could not be displayed.
          </strong>

          <span>
            The generated model is safe, but the browser viewer failed to load it.
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}

function RealModelViewer({
  modelUrl,
}) {
  return (
    <Canvas
      camera={{
        position: [
          3.4,
          2.6,
          4.2,
        ],
        fov: 42,
      }}
      dpr={[
        1,
        1.6,
      ]}
      gl={{
        antialias:
          true,
        alpha:
          true,
      }}
    >
      <ambientLight
        intensity={1.1}
      />

      <directionalLight
        position={[
          4,
          6,
          5,
        ]}
        intensity={2}
      />

      <Suspense
        fallback={
          null
        }
      >
        <GeneratedModel
          url={
            modelUrl
          }
        />

        <Environment
          preset="city"
          environmentIntensity={
            0.45
          }
        />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.5}
        maxDistance={8}
      />
    </Canvas>
  );
}

function fileToDataUrl(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(
          reader.result
        );

      reader.onerror =
        reject;

      reader.readAsDataURL(
        file
      );
    }
  );
}

async function compressImage(
  file
) {
  const originalDataUrl =
    await fileToDataUrl(
      file
    );

  const image =
    new Image();

  await new Promise(
    (
      resolve,
      reject
    ) => {
      image.onload =
        resolve;

      image.onerror =
        reject;

      image.src =
        originalDataUrl;
    }
  );

  const maxDimension =
    1400;

  const scale =
    Math.min(
      1,
      maxDimension /
        Math.max(
          image.width,
          image.height
        )
    );

  const width =
    Math.max(
      1,
      Math.round(
        image.width *
          scale
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        image.height *
          scale
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const context =
    canvas.getContext(
      "2d"
    );

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    width,
    height
  );

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL(
    "image/jpeg",
    0.8
  );
}

function AIModelStudio() {
  const [mode, setMode] =
    useState("text");

  const [prompt, setPrompt] =
    useState("");

  const [photos, setPhotos] =
    useState({
      front: null,
      left: null,
      right: null,
      back: null,
    });

  const [
    accessCode,
    setAccessCode,
  ] = useState("");

  const [
    generationState,
    setGenerationState,
  ] = useState("idle");

  const [
    statusText,
    setStatusText,
  ] = useState(
    "Waiting for input"
  );

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    viewerUrl,
    setViewerUrl,
  ] = useState(null);

  const [
    model3mfUrl,
    setModel3mfUrl,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    taskInfo,
    setTaskInfo,
  ] = useState(null);

  const pollTimerRef =
    useRef(null);

  const uploadedCount =
    useMemo(
      () =>
        Object.values(
          photos
        ).filter(Boolean)
          .length,
      [photos]
    );

  function clearPolling() {
    if (
      pollTimerRef.current
    ) {
      window.clearTimeout(
        pollTimerRef.current
      );

      pollTimerRef.current =
        null;
    }
  }

  function resetGeneration() {
    clearPolling();

    setGenerationState(
      "idle"
    );

    setStatusText(
      "Waiting for input"
    );

    setProgress(0);
    setViewerUrl(null);
    setModel3mfUrl(
      null
    );
    setError("");
    setTaskInfo(null);
  }

  function switchMode(
    nextMode
  ) {
    setMode(nextMode);
    resetGeneration();
  }

  function handlePhoto(
    key,
    file
  ) {
    if (!file) {
      return;
    }

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setPhotos(
      (current) => {
        const previous =
          current[key];

        if (
          previous?.previewUrl
        ) {
          URL.revokeObjectURL(
            previous.previewUrl
          );
        }

        return {
          ...current,
          [key]: {
            file,
            previewUrl,
          },
        };
      }
    );

    resetGeneration();
  }

  function removePhoto(
    key
  ) {
    setPhotos(
      (current) => {
        const item =
          current[key];

        if (
          item?.previewUrl
        ) {
          URL.revokeObjectURL(
            item.previewUrl
          );
        }

        return {
          ...current,
          [key]: null,
        };
      }
    );

    resetGeneration();
  }

  function canGenerate() {
    if (
      generationState ===
      "generating"
    ) {
      return false;
    }

    if (
      !accessCode.trim()
    ) {
      return false;
    }

    if (
      mode === "text"
    ) {
      return (
        prompt.trim()
          .length >= 10
      );
    }

    return (
      uploadedCount >= 2
    );
  }

  function statusLabel(
    status,
    apiProgress
  ) {
    if (
      status ===
      "SUCCEEDED"
    ) {
      return "Model ready";
    }

    if (
      status ===
      "FAILED"
    ) {
      return "Generation failed";
    }

    if (
      apiProgress >= 80
    ) {
      return "Preparing 3D files";
    }

    if (
      apiProgress >= 50
    ) {
      return "Refining geometry";
    }

    if (
      apiProgress >= 20
    ) {
      return "Building geometry";
    }

    return "Starting generation";
  }

  async function pollTask(
    taskId,
    taskType
  ) {
    try {
      const response =
        await fetch(
          `/.netlify/functions/get-ai-model-status?id=${encodeURIComponent(
            taskId
          )}&type=${encodeURIComponent(
            taskType
          )}`,
          {
            headers: {
              "x-ai-access-code":
                accessCode.trim(),
            },
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to check generation status."
        );
      }

      const nextProgress =
        Math.max(
          1,
          Math.min(
            100,
            Number(
              data.progress ||
                0
            )
          )
        );

      setProgress(
        nextProgress
      );

      setStatusText(
        statusLabel(
          data.status,
          nextProgress
        )
      );

      setTaskInfo(
        data
      );

      if (
        data.status ===
        "SUCCEEDED"
      ) {
        if (
          !data.viewerUrl
        ) {
          throw new Error(
            "Meshy finished but no viewer URL was returned."
          );
        }

        setViewerUrl(
          data.viewerUrl
        );

        setModel3mfUrl(
          data.model3mfUrl ||
            null
        );

        setGenerationState(
          "ready"
        );

        setProgress(100);

        return;
      }

      if (
        data.status ===
        "FAILED"
      ) {
        throw new Error(
          data.error ||
            "Meshy could not generate this model."
        );
      }

      pollTimerRef.current =
        window.setTimeout(
          () =>
            pollTask(
              taskId,
              taskType
            ),
          5000
        );
    } catch (
      err
    ) {
      setGenerationState(
        "error"
      );

      setError(
        err.message ||
          "Generation failed."
      );

      setStatusText(
        "Generation error"
      );
    }
  }

  async function generateModel() {
    if (
      !canGenerate()
    ) {
      return;
    }

    clearPolling();

    setError("");
    setViewerUrl(null);
    setModel3mfUrl(
      null
    );
    setTaskInfo(null);

    setGenerationState(
      "generating"
    );

    setStatusText(
      mode === "text"
        ? "Sending prompt to Meshy"
        : "Preparing your photos"
    );

    setProgress(2);

    try {
      let requestBody;

      if (
        mode === "text"
      ) {
        requestBody = {
          mode:
            "text",
          prompt:
            prompt.trim(),
        };
      } else {
        const selected =
          Object.values(
            photos
          )
            .filter(Boolean)
            .map(
              (item) =>
                item.file
            );

        const images =
          [];

        for (
          const file of
          selected
        ) {
          setStatusText(
            `Preparing photo ${
              images.length +
              1
            } of ${
              selected.length
            }`
          );

          const dataUrl =
            await compressImage(
              file
            );

          images.push(
            dataUrl
          );
        }

        requestBody = {
          mode:
            "photos",
          images,
        };
      }

      setStatusText(
        "Starting AI generation"
      );

      setProgress(5);

      const response =
        await fetch(
          "/.netlify/functions/generate-ai-model",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-ai-access-code":
                accessCode.trim(),
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to start generation."
        );
      }

      setTaskInfo({
        taskId:
          data.taskId,
        taskType:
          data.taskType,
      });

      setStatusText(
        "Generation started"
      );

      setProgress(8);

      await pollTask(
        data.taskId,
        data.taskType
      );
    } catch (
      err
    ) {
      setGenerationState(
        "error"
      );

      setError(
        err.message ||
          "Unable to generate model."
      );

      setStatusText(
        "Generation error"
      );
    }
  }

  function handleUseModel() {
    document
      .getElementById(
        "start"
      )
      ?.scrollIntoView({
        behavior:
          "smooth",
        block:
          "start",
      });
  }

  return (
    <section
      className="ai-studio-section"
      id="ai-studio"
    >
      <div className="ai-studio-shell">
        <div className="ai-studio-heading">
          <div>
            <div className="ai-studio-kicker">
              02 / CREATE WITH AI
            </div>

            <h2>
              Turn an idea
              <br />

              <span>
                into a 3D model.
              </span>
            </h2>
          </div>

          <p>
            Describe what you want
            or upload several photos
            of the same object.
            BEYOND AI Studio creates
            a real AI-generated 3D
            model you can rotate and
            inspect.
          </p>
        </div>

        <div className="ai-studio-panel">
          <div className="ai-studio-mode-switch">
            <button
              type="button"
              className={
                mode === "text"
                  ? "active"
                  : ""
              }
              onClick={() =>
                switchMode(
                  "text"
                )
              }
            >
              <WandSparkles
                size={18}
                strokeWidth={
                  1.7
                }
              />

              <span>
                Text to 3D
              </span>

              <small>
                Describe your idea
              </small>
            </button>

            <button
              type="button"
              className={
                mode === "photos"
                  ? "active"
                  : ""
              }
              onClick={() =>
                switchMode(
                  "photos"
                )
              }
            >
              <ImagePlus
                size={18}
                strokeWidth={
                  1.7
                }
              />

              <span>
                Photos to 3D
              </span>

              <small>
                Recommended
              </small>
            </button>
          </div>

          <div className="ai-studio-access">
            <div>
              <span>
                PRIVATE BETA
              </span>

              <p>
                AI generation is
                protected while we
                test the service.
              </p>
            </div>

            <input
              type="password"
              value={
                accessCode
              }
              onChange={(
                event
              ) =>
                setAccessCode(
                  event.target
                    .value
                )
              }
              placeholder="AI Studio access code"
              autoComplete="off"
            />
          </div>

          <div className="ai-studio-workspace">
            <div className="ai-studio-input">
              {mode ===
              "text" ? (
                <div className="ai-text-mode">
                  <div className="ai-input-label">
                    <span>
                      DESCRIBE YOUR
                      OBJECT
                    </span>

                    <strong>
                      TEXT INPUT
                    </strong>
                  </div>

                  <textarea
                    value={
                      prompt
                    }
                    onChange={(
                      event
                    ) => {
                      setPrompt(
                        event
                          .target
                          .value
                      );

                      resetGeneration();
                    }}
                    placeholder="Example: A minimalist wall-mounted headphone holder with rounded corners, a hidden cable hook and a clean modern shape."
                    maxLength={
                      600
                    }
                  />

                  <div className="ai-text-meta">
                    <span>
                      Be specific about
                      shape, size and
                      purpose.
                    </span>

                    <strong>
                      {
                        prompt.length
                      }
                      /600
                    </strong>
                  </div>

                  <div className="ai-prompt-ideas">
                    <span>
                      TRY AN IDEA
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(
                          "A compact desktop stand for a smartphone with a 20 degree viewing angle, rounded corners and a cable opening at the bottom."
                        );

                        resetGeneration();
                      }}
                    >
                      Phone stand
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(
                          "A modern wall-mounted key holder with four hooks, soft rounded edges and a minimalist geometric design."
                        );

                        resetGeneration();
                      }}
                    >
                      Key holder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ai-photo-mode">
                  <div className="ai-photo-intro">
                    <div>
                      <span>
                        MULTI-ANGLE
                        INPUT
                      </span>

                      <strong>
                        Upload the same
                        object from
                        different angles.
                      </strong>
                    </div>

                    <small>
                      2 photos minimum ·
                      4 recommended
                    </small>
                  </div>

                  <div className="ai-photo-grid">
                    {photoSlots.map(
                      (
                        slot
                      ) => {
                        const item =
                          photos[
                            slot
                              .key
                          ];

                        return (
                          <label
                            className={
                              item
                                ? "ai-photo-slot filled"
                                : "ai-photo-slot"
                            }
                            key={
                              slot.key
                            }
                          >
                            {item ? (
                              <>
                                <img
                                  src={
                                    item.previewUrl
                                  }
                                  alt={`${slot.label} preview`}
                                />

                                <div className="ai-photo-overlay">
                                  <span>
                                    {
                                      slot.label
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.preventDefault();

                                      removePhoto(
                                        slot.key
                                      );
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload
                                  size={
                                    22
                                  }
                                  strokeWidth={
                                    1.5
                                  }
                                />

                                <strong>
                                  {
                                    slot.label
                                  }
                                </strong>

                                <small>
                                  {
                                    slot.hint
                                  }
                                </small>
                              </>
                            )}

                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={(
                                event
                              ) =>
                                handlePhoto(
                                  slot.key,
                                  event
                                    .target
                                    .files?.[
                                    0
                                  ]
                                )
                              }
                            />
                          </label>
                        );
                      }
                    )}
                  </div>

                  <div className="ai-photo-tips">
                    <span>
                      BEST RESULTS
                    </span>

                    <p>
                      Use clear lighting,
                      keep the entire
                      object visible and
                      photograph the same
                      object from
                      different sides.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="ai-generate-button"
                disabled={
                  !canGenerate()
                }
                onClick={
                  generateModel
                }
              >
                <Sparkles
                  size={18}
                  strokeWidth={
                    1.7
                  }
                />

                {generationState ===
                "generating"
                  ? "Generating..."
                  : generationState ===
                      "ready"
                    ? "Generate Again"
                    : "Generate 3D Model"}
              </button>

              {error && (
                <div className="ai-studio-error">
                  {error}
                </div>
              )}

              <div className="ai-studio-disclaimer">
                AI-generated models
                may require technical
                adjustments before 3D
                printing. BEYOND reviews
                the model before
                production.
              </div>
            </div>

            <div className="ai-studio-preview">
              <div className="ai-preview-top">
                <span>
                  3D PREVIEW
                </span>

                <strong>
                  {generationState ===
                  "ready"
                    ? "READY"
                    : generationState ===
                        "generating"
                      ? "GENERATING"
                      : generationState ===
                          "error"
                        ? "ERROR"
                        : "WAITING"}
                </strong>
              </div>

              <div className="ai-preview-stage">
                <div className="ai-preview-grid" />
                <div className="ai-preview-glow" />

                {viewerUrl ? (
                  <div className="ai-real-model-viewer">
                    <ModelViewerErrorBoundary
                      resetKey={
                        viewerUrl
                      }
                    >
                      <RealModelViewer
                        modelUrl={
                          viewerUrl
                        }
                      />
                    </ModelViewerErrorBoundary>
                  </div>
                ) : (
                  <>
                    <div
                      className={
                        generationState ===
                        "generating"
                          ? "ai-preview-object generating"
                          : "ai-preview-object"
                      }
                    >
                      <div className="ai-preview-cube-face front">
                        <Box
                          size={58}
                          strokeWidth={
                            1.1
                          }
                        />
                      </div>

                      <div className="ai-preview-cube-face side" />
                      <div className="ai-preview-cube-face top" />
                    </div>

                    <div className="ai-preview-shadow" />
                  </>
                )}

                {!viewerUrl && (
                  <div className="ai-preview-empty-copy">
                    {generationState ===
                    "idle" ? (
                      <>
                        <Rotate3D
                          size={
                            24
                          }
                          strokeWidth={
                            1.4
                          }
                        />

                        <strong>
                          Your generated
                          model will appear
                          here.
                        </strong>

                        <span>
                          Rotate · Zoom ·
                          Inspect
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles
                          size={
                            24
                          }
                          strokeWidth={
                            1.4
                          }
                        />

                        <strong>
                          {
                            statusText
                          }
                        </strong>

                        <span>
                          {progress}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="ai-preview-progress">
                <span
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="ai-preview-footer">
                <div>
                  <span>
                    SOURCE
                  </span>

                  <strong>
                    {mode ===
                    "text"
                      ? "TEXT PROMPT"
                      : `${uploadedCount} PHOTOS`}
                  </strong>
                </div>

                <div>
                  <span>
                    OUTPUT
                  </span>

                  <strong>
                    GLB + 3MF
                  </strong>
                </div>

                <div>
                  <span>
                    STATUS
                  </span>

                  <strong>
                    {
                      statusText
                    }
                  </strong>
                </div>
              </div>

              {generationState ===
                "ready" && (
                <div className="ai-preview-actions">
                  <button
                    type="button"
                    className="ai-secondary-action"
                    onClick={
                      generateModel
                    }
                  >
                    Regenerate
                  </button>

                  {model3mfUrl && (
                    <a
                      className="ai-secondary-action ai-download-action"
                      href={
                        model3mfUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download 3MF
                    </a>
                  )}

                  <button
                    type="button"
                    className="ai-primary-action"
                    onClick={
                      handleUseModel
                    }
                  >
                    Use This Model
                  </button>
                </div>
              )}

              {taskInfo?.consumedCredits !==
                null &&
                taskInfo?.consumedCredits !==
                  undefined && (
                  <div className="ai-credit-readout">
                    MESHY CREDITS USED:{" "}
                    {
                      taskInfo.consumedCredits
                    }
                  </div>
                )}
            </div>
          </div>

          <div className="ai-studio-demo-note">
            <span>
              PRIVATE BETA
            </span>

            <p>
              Real Meshy generation
              is connected. Keep the
              access code private while
              you decide on the final
              customer usage model.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AIModelStudio;
