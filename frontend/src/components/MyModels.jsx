import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Clock3,
  ImageOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import "./MyModels.css";

function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IL",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function getTitle(
  generation
) {
  if (
    generation.mode ===
      "text" &&
    generation.prompt
  ) {
    const cleaned =
      generation.prompt
        .trim();

    if (
      cleaned.length <= 54
    ) {
      return cleaned;
    }

    return `${cleaned.slice(
      0,
      54
    )}…`;
  }

  if (
    generation.mode ===
    "photos"
  ) {
    return "Photo-generated 3D model";
  }

  return "AI-generated 3D model";
}

function MyModels({
  session,
}) {
  const [
    generations,
    setGenerations,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    archivingIds,
    setArchivingIds,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(null);

  const loadModels =
    useCallback(
      async () => {
        if (
          !session?.user?.id
        ) {
          setGenerations(
            []
          );

          setLoading(
            false
          );

          return;
        }

        setLoading(true);
        setError("");

        const {
          data,
          error:
            loadError,
        } =
          await supabase
            .from(
              "ai_generations"
            )
            .select(
              `
                id,
                user_id,
                meshy_task_id,
                mode,
                prompt,
                status,
                glb_url,
                model_3mf_url,
                thumbnail_url,
                glb_storage_path,
                model_3mf_storage_path,
                thumbnail_storage_path,
                archived_at,
                credits_used,
                created_at,
                updated_at
              `
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (
          loadError
        ) {
          console.error(
            "Unable to load AI models:",
            loadError
          );

          setError(
            "We could not load your saved models."
          );

          setGenerations(
            []
          );

          setLoading(
            false
          );

          return;
        }

        setGenerations(
          data || []
        );

        setLoading(false);
      },
      [
        session?.user?.id,
      ]
    );

  useEffect(() => {
    loadModels();
  }, [
    loadModels,
  ]);

  async function archiveModel(
    generation
  ) {
    if (
      !session?.access_token ||
      !generation?.id
    ) {
      return;
    }

    setArchivingIds(
      (current) => [
        ...current,
        generation.id,
      ]
    );

    try {
      const response =
        await fetch(
          "/.netlify/functions/archive-ai-model",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              generationId:
                generation.id,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save this model permanently."
        );
      }

      await loadModels();
    } catch (archiveError) {
      console.error(
        "Archive model error:",
        archiveError
      );
    } finally {
      setArchivingIds(
        (current) =>
          current.filter(
            (id) =>
              id !== generation.id
          )
      );
    }
  }

  const completedCount =
    useMemo(
      () =>
        generations.filter(
          (item) =>
            item.status ===
            "SUCCEEDED"
        ).length,
      [generations]
    );

  function handleUseModel(
    generation
  ) {
    const modelData = {
      generationId:
        generation.id,

      meshyTaskId:
        generation.meshy_task_id,

      mode:
        generation.mode,

      prompt:
        generation.prompt,

      status:
        generation.status,

      model3mfUrl:
        generation.model_3mf_url,

      model3mfStoragePath:
        generation.model_3mf_storage_path,

      glbStoragePath:
        generation.glb_storage_path,

      thumbnailStoragePath:
        generation.thumbnail_storage_path,

      thumbnailUrl:
        generation.thumbnail_url,
    };

    sessionStorage.setItem(
      "beyondSelectedAiModel",
      JSON.stringify(
        modelData
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "beyond-ai-model-selected",
        {
          detail:
            modelData,
        }
      )
    );

    setSelectedId(
      generation.id
    );

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

  if (!session) {
    return null;
  }

  return (
    <section
      className="my-models-section"
      id="my-models"
    >
      <div className="my-models-shell">
        <div className="my-models-heading">
          <div>
            <div className="my-models-kicker">
              03 / YOUR MODELS
            </div>

            <h2>
              Your ideas,
              <br />

              <span>
                saved.
              </span>
            </h2>
          </div>

          <div className="my-models-heading-right">
            <p>
              Every AI model generated
              while signed in is linked
              to your BEYOND account.
            </p>

            <div className="my-models-summary">
              <div>
                <span>
                  MODELS
                </span>

                <strong>
                  {
                    generations.length
                  }
                </strong>
              </div>

              <div>
                <span>
                  READY
                </span>

                <strong>
                  {
                    completedCount
                  }
                </strong>
              </div>

              <button
                type="button"
                className="my-models-refresh"
                onClick={
                  loadModels
                }
                disabled={
                  loading
                }
                aria-label="Refresh models"
              >
                <RefreshCw
                  size={16}
                  strokeWidth={
                    1.6
                  }
                />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="my-models-state">
            <div className="my-models-state-icon loading">
              <RefreshCw
                size={24}
                strokeWidth={
                  1.4
                }
              />
            </div>

            <strong>
              Loading your models
            </strong>

            <span>
              Retrieving your saved
              BEYOND AI generations.
            </span>
          </div>
        ) : error ? (
          <div className="my-models-state">
            <div className="my-models-state-icon">
              <ImageOff
                size={24}
                strokeWidth={
                  1.4
                }
              />
            </div>

            <strong>
              Unable to load models
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={
                loadModels
              }
            >
              Try again
            </button>
          </div>
        ) : generations.length ===
          0 ? (
          <div className="my-models-empty">
            <div className="my-models-empty-visual">
              <Box
                size={52}
                strokeWidth={
                  1.15
                }
              />

              <Sparkles
                className="my-models-empty-spark"
                size={20}
                strokeWidth={
                  1.3
                }
              />
            </div>

            <div>
              <strong>
                No AI models yet.
              </strong>

              <p>
                Generate your first
                model in BEYOND AI
                Studio and it will
                automatically appear
                here.
              </p>
            </div>
          </div>
        ) : (
          <div className="my-models-grid">
            {generations.map(
              (
                generation,
                index
              ) => {
                const ready =
                  generation.status ===
                  "SUCCEEDED";

                const selected =
                  selectedId ===
                  generation.id;

                return (
                  <article
                    className={
                      selected
                        ? "my-model-card selected"
                        : "my-model-card"
                    }
                    key={
                      generation.id
                    }
                  >
                    <div className="my-model-card-preview">
                      {generation.thumbnail_url ? (
                        <img
                          src={
                            generation.thumbnail_url
                          }
                          alt=""
                        />
                      ) : (
                        <div className="my-model-placeholder">
                          <Box
                            size={45}
                            strokeWidth={
                              1.15
                            }
                          />
                        </div>
                      )}

                      <div className="my-model-number">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div
                        className={`my-model-status ${String(
                          generation.status ||
                            "PENDING"
                        ).toLowerCase()}`}
                      >
                        <i />

                        {
                          generation.status ||
                          "PENDING"
                        }
                      </div>
                    </div>

                    <div className="my-model-card-body">
                      <div className="my-model-type">
                        <span>
                          {generation.mode ===
                          "photos"
                            ? "PHOTOS TO 3D"
                            : "TEXT TO 3D"}
                        </span>

                        <span className="my-model-date">
                          <Clock3
                            size={11}
                            strokeWidth={
                              1.4
                            }
                          />

                          {formatDate(
                            generation.created_at
                          )}
                        </span>
                      </div>

                      <h3>
                        {getTitle(
                          generation
                        )}
                      </h3>

                      <div className="my-model-meta">
                        <div>
                          <span>
                            TASK
                          </span>

                          <strong>
                            {generation.meshy_task_id
                              ? `${generation.meshy_task_id.slice(
                                  0,
                                  8
                                )}…`
                              : "—"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            CREDITS
                          </span>

                          <strong>
                            {generation.credits_used ??
                              "—"}
                          </strong>
                        </div>
                      </div>

                      {ready &&
                        !generation.model_3mf_storage_path && (
                        <button
                          type="button"
                          className="my-model-use-button"
                          disabled={
                            archivingIds.includes(
                              generation.id
                            )
                          }
                          onClick={() =>
                            archiveModel(
                              generation
                            )
                          }
                          style={{
                            marginBottom:
                              "8px",
                          }}
                        >
                          {archivingIds.includes(
                            generation.id
                          )
                            ? "Saving to BEYOND..."
                            : "Save Permanently"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="my-model-use-button"
                        disabled={
                          !ready
                        }
                        onClick={() =>
                          handleUseModel(
                            generation
                          )
                        }
                      >
                        {selected
                          ? "Selected for Project"
                          : ready
                            ? "Use This Model"
                            : "Model Not Ready"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        <div className="my-models-footnote">
          <span>
            ACCOUNT STORAGE
          </span>

          <p>
            This first version reads
            your model history from
            Supabase. Permanent BEYOND
            file storage will be added
            next.
          </p>
        </div>
      </div>
    </section>
  );
}

export default MyModels;
