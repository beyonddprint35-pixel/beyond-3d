import {
  useMemo,
  useRef,
  useState,
} from "react";

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
  { key: "front", label: "FRONT", hint: "Straight-on view" },
  { key: "left", label: "LEFT", hint: "Left side view" },
  { key: "right", label: "RIGHT", hint: "Right side view" },
  { key: "back", label: "BACK", hint: "Rear view" },
];

function AIModelStudio() {
  const [mode, setMode] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState({
    front: null,
    left: null,
    right: null,
    back: null,
  });
  const [generationState, setGenerationState] = useState("idle");
  const [statusText, setStatusText] = useState("Waiting for input");
  const [progress, setProgress] = useState(0);
  const timersRef = useRef([]);

  const uploadedCount = useMemo(
    () => Object.values(photos).filter(Boolean).length,
    [photos]
  );

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function resetGeneration() {
    clearTimers();
    setGenerationState("idle");
    setStatusText("Waiting for input");
    setProgress(0);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    resetGeneration();
  }

  function handlePhoto(key, file) {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setPhotos((current) => {
      const previous = current[key];

      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      return {
        ...current,
        [key]: {
          file,
          previewUrl,
        },
      };
    });

    resetGeneration();
  }

  function removePhoto(key) {
    setPhotos((current) => {
      const item = current[key];

      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return {
        ...current,
        [key]: null,
      };
    });

    resetGeneration();
  }

  function canGenerate() {
    if (generationState === "generating") {
      return false;
    }

    if (mode === "text") {
      return prompt.trim().length >= 10;
    }

    return uploadedCount >= 2;
  }

  function simulateGeneration() {
    if (!canGenerate()) return;

    clearTimers();
    setGenerationState("generating");
    setProgress(8);
    setStatusText(
      mode === "text"
        ? "Understanding your idea"
        : "Reading photo angles"
    );

    const stages = [
      { delay: 700, progress: 28, text: "Preparing input" },
      { delay: 1500, progress: 52, text: "Building geometry" },
      { delay: 2400, progress: 76, text: "Refining the model" },
      { delay: 3300, progress: 94, text: "Preparing 3D preview" },
      {
        delay: 4100,
        progress: 100,
        text: "Model ready",
        complete: true,
      },
    ];

    stages.forEach((stage) => {
      const timer = window.setTimeout(() => {
        setProgress(stage.progress);
        setStatusText(stage.text);

        if (stage.complete) {
          setGenerationState("ready");
        }
      }, stage.delay);

      timersRef.current.push(timer);
    });
  }

  function handleUseModel() {
    document.getElementById("start")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="ai-studio-section" id="ai-studio">
      <div className="ai-studio-shell">
        <div className="ai-studio-heading">
          <div>
            <div className="ai-studio-kicker">
              02 / CREATE WITH AI
            </div>

            <h2>
              Turn an idea
              <br />
              <span>into a 3D model.</span>
            </h2>
          </div>

          <p>
            Describe what you want or upload several photos of the same
            object. BEYOND AI Studio will prepare a 3D concept you can review
            before starting a project.
          </p>
        </div>

        <div className="ai-studio-panel">
          <div className="ai-studio-mode-switch">
            <button
              type="button"
              className={mode === "text" ? "active" : ""}
              onClick={() => switchMode("text")}
            >
              <WandSparkles size={18} strokeWidth={1.7} />
              <span>Text to 3D</span>
              <small>Describe your idea</small>
            </button>

            <button
              type="button"
              className={mode === "photos" ? "active" : ""}
              onClick={() => switchMode("photos")}
            >
              <ImagePlus size={18} strokeWidth={1.7} />
              <span>Photos to 3D</span>
              <small>Recommended</small>
            </button>
          </div>

          <div className="ai-studio-workspace">
            <div className="ai-studio-input">
              {mode === "text" ? (
                <div className="ai-text-mode">
                  <div className="ai-input-label">
                    <span>DESCRIBE YOUR OBJECT</span>
                    <strong>TEXT INPUT</strong>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      resetGeneration();
                    }}
                    placeholder="Example: A minimalist wall-mounted headphone holder with rounded corners, a hidden cable hook and a clean modern shape."
                    maxLength={600}
                  />

                  <div className="ai-text-meta">
                    <span>Be specific about shape, size and purpose.</span>
                    <strong>{prompt.length}/600</strong>
                  </div>

                  <div className="ai-prompt-ideas">
                    <span>TRY AN IDEA</span>

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
                      <span>MULTI-ANGLE INPUT</span>
                      <strong>
                        Upload the same object from different angles.
                      </strong>
                    </div>

                    <small>2 photos minimum · 4 recommended</small>
                  </div>

                  <div className="ai-photo-grid">
                    {photoSlots.map((slot) => {
                      const item = photos[slot.key];

                      return (
                        <label
                          className={
                            item
                              ? "ai-photo-slot filled"
                              : "ai-photo-slot"
                          }
                          key={slot.key}
                        >
                          {item ? (
                            <>
                              <img
                                src={item.previewUrl}
                                alt={`${slot.label} preview`}
                              />

                              <div className="ai-photo-overlay">
                                <span>{slot.label}</span>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    removePhoto(slot.key);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload size={22} strokeWidth={1.5} />
                              <strong>{slot.label}</strong>
                              <small>{slot.hint}</small>
                            </>
                          )}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) =>
                              handlePhoto(
                                slot.key,
                                event.target.files?.[0]
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="ai-photo-tips">
                    <span>BEST RESULTS</span>
                    <p>
                      Use clear lighting, keep the entire object visible and
                      photograph the same object from different sides.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="ai-generate-button"
                disabled={!canGenerate()}
                onClick={simulateGeneration}
              >
                <Sparkles size={18} strokeWidth={1.7} />

                {generationState === "generating"
                  ? "Generating..."
                  : generationState === "ready"
                    ? "Generate Again"
                    : "Generate 3D Model"}
              </button>

              <div className="ai-studio-disclaimer">
                AI-generated models may require technical adjustments before
                3D printing. BEYOND reviews the model before production.
              </div>
            </div>

            <div className="ai-studio-preview">
              <div className="ai-preview-top">
                <span>3D PREVIEW</span>

                <strong>
                  {generationState === "ready"
                    ? "READY"
                    : generationState === "generating"
                      ? "GENERATING"
                      : "WAITING"}
                </strong>
              </div>

              <div className="ai-preview-stage">
                <div className="ai-preview-grid" />
                <div className="ai-preview-glow" />

                <div
                  className={
                    generationState === "ready"
                      ? "ai-preview-object ready"
                      : generationState === "generating"
                        ? "ai-preview-object generating"
                        : "ai-preview-object"
                  }
                >
                  <div className="ai-preview-cube-face front">
                    <Box size={58} strokeWidth={1.1} />
                  </div>

                  <div className="ai-preview-cube-face side" />
                  <div className="ai-preview-cube-face top" />
                </div>

                <div className="ai-preview-shadow" />

                <div className="ai-preview-empty-copy">
                  {generationState === "idle" ? (
                    <>
                      <Rotate3D size={24} strokeWidth={1.4} />
                      <strong>
                        Your generated model will appear here.
                      </strong>
                      <span>Rotate · Zoom · Inspect</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} strokeWidth={1.4} />
                      <strong>{statusText}</strong>
                      <span>{progress}%</span>
                    </>
                  )}
                </div>
              </div>

              <div className="ai-preview-progress">
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="ai-preview-footer">
                <div>
                  <span>SOURCE</span>
                  <strong>
                    {mode === "text"
                      ? "TEXT PROMPT"
                      : `${uploadedCount} PHOTOS`}
                  </strong>
                </div>

                <div>
                  <span>OUTPUT</span>
                  <strong>3D CONCEPT</strong>
                </div>

                <div>
                  <span>STATUS</span>
                  <strong>{statusText}</strong>
                </div>
              </div>

              {generationState === "ready" && (
                <div className="ai-preview-actions">
                  <button
                    type="button"
                    className="ai-secondary-action"
                    onClick={simulateGeneration}
                  >
                    Regenerate
                  </button>

                  <button
                    type="button"
                    className="ai-primary-action"
                    onClick={handleUseModel}
                  >
                    Use This Model
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="ai-studio-demo-note">
            <span>DEMO MODE</span>
            <p>
              The AI interface is active for design testing. No paid AI
              generation is connected yet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AIModelStudio;
