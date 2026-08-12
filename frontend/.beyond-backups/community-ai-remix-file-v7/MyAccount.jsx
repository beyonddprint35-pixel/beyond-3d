import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Check,
  Clock3,
  FileBox,
  FolderOpen,
  LogOut,
  PackageCheck,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  supabase,
} from "../lib/supabaseClient";

import {
  listUserCommunityShares,
  publishAiModelToCommunity,
  publishProjectToCommunity,
  unpublishCommunitySource,
} from "../lib/communityStore";

import "./MyAccount.css";

function makeOrderNumber(
  id
) {
  if (!id) {
    return "B3D-UNKNOWN";
  }

  return (
    "B3D-" +
    String(id)
      .slice(0, 8)
      .toUpperCase()
  );
}

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

function modelTitle(
  generation
) {
  if (
    generation.mode ===
      "text" &&
    generation.prompt
  ) {
    const value =
      generation.prompt
        .trim();

    if (
      value.length <=
      55
    ) {
      return value;
    }

    return `${value.slice(
      0,
      55
    )}…`;
  }

  return generation.mode ===
    "photos"
    ? "Photo-generated 3D model"
    : "AI-generated 3D model";
}

function MyAccount({
  open,
  onClose,
  session,
  profile,
  onProfileUpdated,
  onSignOut,
}) {
  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    models,
    setModels,
  ] = useState([]);

  const [
    projects,
    setProjects,
  ] = useState([]);

  const [
    communityShares,
    setCommunityShares,
  ] = useState([]);

  const [
    communityBusyKey,
    setCommunityBusyKey,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    archivingId,
    setArchivingId,
  ] = useState(null);

  const loadAccountData =
    useCallback(
      async () => {
        if (
          !session?.user?.id
        ) {
          setOrders([]);
          setModels([]);
          return;
        }

        setLoading(true);
        setError("");

        const [
          ordersResult,
          modelsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "orders"
              )
              .select(
                `
                  id,
                  user_id,
                  project_type,
                  material,
                  color,
                  quantity,
                  status,
                  source_type,
                  ai_generation_id,
                  created_at,
                  needed_by
                `
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
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
                  model_3mf_url,
                  glb_url,
                  thumbnail_url,
                  glb_storage_path,
                  model_3mf_storage_path,
                  thumbnail_storage_path,
                  archived_at,
                  credits_used,
                  created_at
                `
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          ordersResult.error ||
          modelsResult.error
        ) {
          console.error(
            "Account data error:",
            ordersResult.error,
            modelsResult.error
          );

          setError(
            "We could not load all of your account data."
          );
        }

        setOrders(
          ordersResult.data ||
            []
        );

        setModels(
          modelsResult.data ||
            []
        );

        setLoading(false);
      },
      [
        session?.user?.id,
      ]
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    loadAccountData();
  }, [
    open,
    loadAccountData,
  ]);


  // BEYOND_MY_PROJECTS_V1
  const loadProjects =
    useCallback(
      async () => {
        if (!session?.user?.id) {
          setProjects([]);
          return;
        }

        const {
          data,
          error:
            projectsError,
        } = await supabase
          .from("projects")
          .select(
            "id,user_id,name,project_type,project_data,thumbnail_url,visibility,created_at,updated_at"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .order(
            "updated_at",
            { ascending: false }
          );

        if (projectsError) {
          console.error(
            "Projects load error:",
            projectsError
          );
          return;
        }

        setProjects(data || []);
      },
      [session?.user?.id]
    );

  useEffect(() => {
    if (!open) return;
    loadProjects();
  }, [open, loadProjects]);

  useEffect(() => {
    function handleProjectSaved() {
      if (open) {
        loadProjects();
      }
    }

    window.addEventListener(
      "beyond-project-saved",
      handleProjectSaved
    );

    return () =>
      window.removeEventListener(
        "beyond-project-saved",
        handleProjectSaved
      );
  }, [open, loadProjects]);

  function openProject(project) {
    window.dispatchEvent(
      new CustomEvent(
        "beyond-project-open",
        { detail: project }
      )
    );
    onClose();
  }

  // BEYOND_COMMUNITY_ACCOUNT_V1
  const loadCommunityShares =
    useCallback(
      async () => {
        if (!session?.user?.id) {
          setCommunityShares([]);
          return;
        }

        try {
          const data =
            await listUserCommunityShares(
              session.user.id
            );

          setCommunityShares(
            data || []
          );
        } catch (
          communityError
        ) {
          console.error(
            "Community shares load failed:",
            communityError
          );
        }
      },
      [session?.user?.id]
    );

  useEffect(() => {
    if (!open) return;
    loadCommunityShares();
  }, [
    open,
    loadCommunityShares,
  ]);

  function communityShareFor(
    sourceType,
    sourceId
  ) {
    return communityShares.find(
      (item) =>
        item.source_type ===
          sourceType &&
        item.source_id ===
          sourceId
    );
  }

  function communityCreatorName() {
    return (
      profile?.full_name ||
      session?.user
        ?.user_metadata
        ?.full_name ||
      session?.user?.email
        ?.split("@")[0] ||
      "BEYOND Creator"
    );
  }

  async function shareProjectToCommunity(
    project
  ) {
    const key =
      `project:${project.id}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await publishProjectToCommunity({
        project,
        userId:
          session.user.id,
        creatorName:
          communityCreatorName(),
      });

      await loadCommunityShares();

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "Project Community share failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not share this project."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  async function shareAiModelToCommunity(
    generation
  ) {
    const key =
      `ai_model:${generation.id}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await publishAiModelToCommunity({
        generation,
        userId:
          session.user.id,
        creatorName:
          communityCreatorName(),
      });

      await loadCommunityShares();

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "AI Community share failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not share this AI model."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  async function removeCommunityShare(
    sourceType,
    sourceId
  ) {
    const key =
      `${sourceType}:${sourceId}`;

    setCommunityBusyKey(
      key
    );
    setError("");

    try {
      await unpublishCommunitySource({
        userId:
          session.user.id,
        sourceType,
        sourceId,
      });

      setCommunityShares(
        (current) =>
          current.filter(
            (item) =>
              !(
                item.source_type ===
                  sourceType &&
                item.source_id ===
                  sourceId
              )
          )
      );

      window.dispatchEvent(
        new Event(
          "beyond-community-refresh"
        )
      );
    } catch (
      communityError
    ) {
      console.error(
        "Community unpublish failed:",
        communityError
      );
      setError(
        communityError?.message ||
          "Could not remove this creation from Community."
      );
    } finally {
      setCommunityBusyKey(
        null
      );
    }
  }

  // BEYOND_PROJECT_ACTIONS_PHASE_2
  async function renameProject(
    project
  ) {
    const nextName =
      window.prompt(
        "Rename BEYOND project",
        project.name ||
          "Untitled Project"
      );

    if (nextName == null) {
      return;
    }

    const cleanName =
      nextName.trim();

    if (!cleanName) {
      setError(
        "Project name cannot be empty."
      );
      return;
    }

    const {
      data,
      error: renameError,
    } = await supabase
      .from("projects")
      .update({
        name: cleanName,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq("id", project.id)
      .eq(
        "user_id",
        session.user.id
      )
      .select()
      .single();

    if (renameError) {
      console.error(
        "Project rename failed:",
        renameError
      );
      setError(
        "Could not rename project."
      );
      return;
    }

    setProjects((current) =>
      current
        .map((item) =>
          item.id === data.id
            ? data
            : item
        )
        .sort(
          (a, b) =>
            new Date(
              b.updated_at || 0
            ) -
            new Date(
              a.updated_at || 0
            )
        )
    );

    window.dispatchEvent(
      new CustomEvent(
        "beyond-project-renamed",
        { detail: data }
      )
    );
  }

  async function duplicateProject(
    project
  ) {
    const now =
      new Date()
        .toISOString();

    const {
      data,
      error: duplicateError,
    } = await supabase
      .from("projects")
      .insert({
        user_id:
          session.user.id,
        name:
          `${project.name || "Untitled Project"} Copy`,
        project_type:
          project.project_type ||
          "creator",
        project_data: {
          ...(project.project_data || {}),
          duplicatedFrom:
            project.id,
          savedAt: now,
        },
        thumbnail_url:
          project.thumbnail_url ||
          null,
        visibility:
          "private",
        updated_at: now,
      })
      .select()
      .single();

    if (duplicateError) {
      console.error(
        "Project duplicate failed:",
        duplicateError
      );
      setError(
        "Could not duplicate project."
      );
      return;
    }

    setProjects((current) => [
      data,
      ...current,
    ]);
  }

  async function deleteProject(project) {
    const confirmed =
      window.confirm(
        `Delete “${project.name}”? This cannot be undone.`
      );

    if (!confirmed) return;

    const { error: deleteError } =
      await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)
        .eq(
          "user_id",
          session.user.id
        );

    if (deleteError) {
      console.error(
        "Project delete failed:",
        deleteError
      );
      setError(
        "Could not delete project."
      );
      return;
    }

    setProjects((current) =>
      current.filter(
        (item) =>
          item.id !== project.id
      )
    );
  }

  useEffect(() => {
    setFullName(
      profile?.full_name ||
        session?.user
          ?.user_metadata
          ?.full_name ||
        ""
    );

    setPhone(
      profile?.phone ||
        ""
    );
  }, [
    profile,
    session,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    const originalOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style
        .overflow =
        originalOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    onClose,
  ]);

  const readyModels =
    useMemo(
      () =>
        models.filter(
          (item) =>
            item.status ===
            "SUCCEEDED"
        ).length,
      [models]
    );

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          (item) =>
            ![
              "Completed",
            ].includes(
              item.status
            )
        ).length,
      [orders]
    );

  async function handleSaveProfile(
    event
  ) {
    event.preventDefault();

    if (
      !session?.user?.id
    ) {
      return;
    }

    setSavingProfile(
      true
    );

    setProfileMessage(
      ""
    );

    const {
      data,
      error:
        updateError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .update({
          full_name:
            fullName.trim(),
          phone:
            phone.trim(),
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          session.user.id
        )
        .select()
        .single();

    if (
      updateError
    ) {
      console.error(
        "Profile update failed:",
        updateError
      );

      setProfileMessage(
        "Could not update profile."
      );
    } else {
      setProfileMessage(
        "Profile updated."
      );

      onProfileUpdated?.(
        data
      );
    }

    setSavingProfile(
      false
    );
  }

  function useModel(
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

      thumbnailUrl:
        generation.thumbnail_url,

      thumbnailStoragePath:
        generation.thumbnail_storage_path,
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

    onClose();

    window.setTimeout(
      () => {
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
      },
      100
    );
  }

  async function savePermanently(
    generation
  ) {
    if (
      !session?.access_token
    ) {
      return;
    }

    setArchivingId(
      generation.id
    );

    try {
      const response =
        await fetch(
          "/.netlify/functions/archive-ai-model",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                generationId:
                  generation.id,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to save model."
        );
      }

      await loadAccountData();
    } catch (
      archiveError
    ) {
      console.error(
        archiveError
      );

      setError(
        archiveError.message ||
          "Unable to save model permanently."
      );
    } finally {
      setArchivingId(
        null
      );
    }
  }

  if (
    !open ||
    !session
  ) {
    return null;
  }

  const accountName =
    profile?.full_name ||
    session.user
      ?.user_metadata
      ?.full_name ||
    session.user
      ?.email ||
    "Customer";

  return (
    <div
      className="account-backdrop"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-label="My account"
      >
        <aside className="account-sidebar">
          <div className="account-sidebar-top">
            <div className="account-brand">
              BEYOND
            </div>

            <button
              type="button"
              className="account-close-mobile"
              onClick={
                onClose
              }
            >
              <X
                size={18}
                strokeWidth={
                  1.6
                }
              />
            </button>
          </div>

          <div className="account-person">
            <div className="account-avatar">
              {accountName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {accountName}
              </strong>

              <span>
                {
                  session.user
                    ?.email
                }
              </span>
            </div>
          </div>

          <nav className="account-nav">
            <button
              type="button"
              className={
                activeTab ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "overview"
                )
              }
            >
              <Sparkles
                size={16}
                strokeWidth={
                  1.5
                }
              />

              Overview
            </button>

            <button
              type="button"
              className={
                activeTab ===
                "orders"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "orders"
                )
              }
            >
              <PackageCheck
                size={16}
                strokeWidth={
                  1.5
                }
              />

              My Orders

              <span>
                {
                  orders.length
                }
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab ===
                "projects"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "projects"
                )
              }
            >
              <FolderOpen
                size={16}
                strokeWidth={
                  1.5
                }
              />

              My Projects

              <span>
                {
                  projects.length
                }
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab ===
                "models"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "models"
                )
              }
            >
              <Box
                size={16}
                strokeWidth={
                  1.5
                }
              />

              My Models

              <span>
                {
                  models.length
                }
              </span>
            </button>

            <button
              type="button"
              className={
                activeTab ===
                "profile"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "profile"
                )
              }
            >
              <UserRound
                size={16}
                strokeWidth={
                  1.5
                }
              />

              Profile
            </button>
          </nav>

          <button
            type="button"
            className="account-logout"
            onClick={
              onSignOut
            }
          >
            <LogOut
              size={15}
              strokeWidth={
                1.5
              }
            />

            Log out
          </button>
        </aside>

        <div className="account-content">
          <header className="account-content-header">
            <div>
              <span>
                MY ACCOUNT
              </span>

              <h2>
                {activeTab ===
                "overview"
                  ? "Overview"
                  : activeTab ===
                      "orders"
                    ? "My Orders"
                    : activeTab ===
                        "projects"
                      ? "My Projects"
                      : activeTab ===
                          "models"
                        ? "My Models"
                        : "Profile"}
              </h2>
            </div>

            <div className="account-header-actions">
              <button
                type="button"
                className="account-refresh"
                onClick={
                  loadAccountData
                }
                disabled={
                  loading
                }
                aria-label="Refresh account"
              >
                <RefreshCw
                  size={16}
                  strokeWidth={
                    1.5
                  }
                />
              </button>

              <button
                type="button"
                className="account-close"
                onClick={
                  onClose
                }
              >
                <X
                  size={18}
                  strokeWidth={
                    1.6
                  }
                />
              </button>
            </div>
          </header>

          {error && (
            <div className="account-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="account-loading">
              <RefreshCw
                size={22}
                strokeWidth={
                  1.4
                }
              />

              Loading account...
            </div>
          ) : activeTab ===
            "overview" ? (
            <div className="account-overview">
              <div className="account-welcome">
                <span>
                  WELCOME BACK
                </span>

                <h3>
                  {accountName}
                </h3>

                <p>
                  Your BEYOND account
                  keeps your orders and
                  AI-generated models
                  connected in one
                  place.
                </p>
              </div>

              <div className="account-stats">
                <article>
                  <span>
                    TOTAL ORDERS
                  </span>

                  <strong>
                    {
                      orders.length
                    }
                  </strong>

                  <small>
                    {activeOrders} active
                  </small>
                </article>

                <article>
                  <span>
                    AI MODELS
                  </span>

                  <strong>
                    {
                      models.length
                    }
                  </strong>

                  <small>
                    {readyModels} ready
                  </small>
                </article>

                <article>
                  <span>
                    MEMBER SINCE
                  </span>

                  <strong className="account-stat-date">
                    {formatDate(
                      profile
                        ?.created_at ||
                        session.user
                          ?.created_at
                    )}
                  </strong>

                  <small>
                    BEYOND customer
                  </small>
                </article>
              </div>

              <div className="account-recent-grid">
                <section>
                  <div className="account-subheading">
                    <div>
                      <span>
                        RECENT
                      </span>

                      <h3>
                        Orders
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "orders"
                        )
                      }
                    >
                      View all
                    </button>
                  </div>

                  {orders
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        order
                      ) => (
                        <div
                          className="account-mini-row"
                          key={
                            order.id
                          }
                        >
                          <div>
                            <strong>
                              {makeOrderNumber(
                                order.id
                              )}
                            </strong>

                            <span>
                              {order.project_type ||
                                "3D Printing"}
                            </span>
                          </div>

                          <div className="account-mini-right">
                            <span
                              className={`account-status ${String(
                                order.status ||
                                  "Submitted"
                              ).toLowerCase()}`}
                            >
                              {order.status ||
                                "Submitted"}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                  {!orders.length && (
                    <div className="account-empty-small">
                      No orders yet.
                    </div>
                  )}
                </section>

                <section>
                  <div className="account-subheading">
                    <div>
                      <span>
                        RECENT
                      </span>

                      <h3>
                        AI Models
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "models"
                        )
                      }
                    >
                      View all
                    </button>
                  </div>

                  {models
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        model
                      ) => (
                        <div
                          className="account-mini-row"
                          key={
                            model.id
                          }
                        >
                          <div>
                            <strong>
                              {modelTitle(
                                model
                              )}
                            </strong>

                            <span>
                              {model.mode ===
                              "photos"
                                ? "Photos to 3D"
                                : "Text to 3D"}
                            </span>
                          </div>

                          <div className="account-mini-right">
                            <span
                              className={`account-status ${String(
                                model.status ||
                                  "PENDING"
                              ).toLowerCase()}`}
                            >
                              {model.status ||
                                "PENDING"}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                  {!models.length && (
                    <div className="account-empty-small">
                      No AI models yet.
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : activeTab ===
            "orders" ? (
            <div className="account-orders">
              {!orders.length ? (
                <div className="account-empty">
                  <PackageCheck
                    size={34}
                    strokeWidth={
                      1.2
                    }
                  />

                  <strong>
                    No orders yet.
                  </strong>

                  <span>
                    Your submitted
                    projects will appear
                    here.
                  </span>
                </div>
              ) : (
                <div className="account-order-list">
                  {orders.map(
                    (
                      order
                    ) => (
                      <article
                        className="account-order-card"
                        key={
                          order.id
                        }
                      >
                        <div className="account-order-number">
                          <span>
                            ORDER
                          </span>

                          <strong>
                            {makeOrderNumber(
                              order.id
                            )}
                          </strong>
                        </div>

                        <div className="account-order-details">
                          <div>
                            <span>
                              PROJECT
                            </span>

                            <strong>
                              {order.project_type ||
                                "3D Printing"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              MATERIAL
                            </span>

                            <strong>
                              {order.material ||
                                "Not specified"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              SOURCE
                            </span>

                            <strong>
                              {order.source_type ===
                              "AI_MODEL"
                                ? "AI Model"
                                : "Uploaded File"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              SUBMITTED
                            </span>

                            <strong>
                              {formatDate(
                                order.created_at
                              )}
                            </strong>
                          </div>
                        </div>

                        <span
                          className={`account-status account-order-status ${String(
                            order.status ||
                              "Submitted"
                          ).toLowerCase()}`}
                        >
                          {order.status ||
                            "Submitted"}
                        </span>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          ) : activeTab ===
            "projects" ? (
            <div className="account-projects">
              {!projects.length ? (
                <div className="account-empty">
                  <FolderOpen
                    size={34}
                    strokeWidth={1.2}
                  />

                  <strong>
                    No saved projects yet.
                  </strong>

                  <span>
                    Save a project in BEYOND Creator and it will appear here.
                  </span>
                </div>
              ) : (
                <div className="account-project-grid">
                  {projects.map(
                    (project) => {
                      const objectCount =
                        project.project_data
                          ?.objects
                          ?.length || 0;

                      const projectCommunityShare =
                        communityShareFor(
                          "project",
                          project.id
                        );

                      return (
                        <article
                          className="account-project-card"
                          key={project.id}
                        >
                          <div className="account-project-preview">
                            {project.thumbnail_url ? (
                              <img
                                src={project.thumbnail_url}
                                alt=""
                              />
                            ) : (
                              <FolderOpen
                                size={42}
                                strokeWidth={1.05}
                              />
                            )}
                          </div>

                          <div className="account-project-body">
                            <span className="account-project-type">
                              {String(
                                project.project_type ||
                                  "CREATOR"
                              ).toUpperCase()}
                            </span>

                            <h3>
                              {project.name ||
                                "Untitled Project"}
                            </h3>

                            <div className="account-project-meta">
                              <span>
                                <Box size={12} />
                                {objectCount} {objectCount === 1 ? "object" : "objects"}
                              </span>

                              <span>
                                <Clock3 size={12} />
                                {formatDate(
                                  project.updated_at ||
                                    project.created_at
                                )}
                              </span>
                            </div>

                            <div className="account-project-actions">
                              <button
                                type="button"
                                className="account-primary-button"
                                onClick={() =>
                                  openProject(project)
                                }
                              >
                                Open Project
                              </button>

                              <button
                                type="button"
                                className="account-project-action-text"
                                onClick={() =>
                                  renameProject(project)
                                }
                              >
                                Rename
                              </button>

                              <button
                                type="button"
                                className="account-project-action-text"
                                onClick={() =>
                                  duplicateProject(project)
                                }
                              >
                                Duplicate
                              </button>

                              <button
                                type="button"
                                className={`account-community-button ${
                                  projectCommunityShare
                                    ? "is-published"
                                    : ""
                                }`}
                                disabled={
                                  communityBusyKey ===
                                  `project:${project.id}`
                                }
                                onClick={() =>
                                  projectCommunityShare
                                    ? removeCommunityShare(
                                        "project",
                                        project.id
                                      )
                                    : shareProjectToCommunity(
                                        project
                                      )
                                }
                              >
                                {communityBusyKey ===
                                `project:${project.id}`
                                  ? "Updating…"
                                  : projectCommunityShare
                                    ? "Remove from Community"
                                    : "Share to Community"}
                              </button>

                              <button
                                type="button"
                                className="account-project-delete"
                                aria-label="Delete project"
                                onClick={() =>
                                  deleteProject(project)
                                }
                              >
                                <Trash2
                                  size={15}
                                  strokeWidth={1.45}
                                />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : activeTab ===
            "models" ? (
            <div className="account-models">
              {!models.length ? (
                <div className="account-empty">
                  <Box
                    size={34}
                    strokeWidth={
                      1.2
                    }
                  />

                  <strong>
                    No AI models yet.
                  </strong>

                  <span>
                    Models generated in
                    AI Studio will
                    appear here.
                  </span>
                </div>
              ) : (
                <div className="account-model-grid">
                  {models.map(
                    (
                      generation
                    ) => {
                      const ready =
                        generation.status ===
                        "SUCCEEDED";

                      const archived =
                        Boolean(
                          generation
                            .model_3mf_storage_path ||
                          generation
                            .glb_storage_path
                        );

                      const aiCommunityShare =
                        communityShareFor(
                          "ai_model",
                          generation.id
                        );

                      return (
                        <article
                          className="account-model-card"
                          key={
                            generation.id
                          }
                        >
                          <div className="account-model-preview">
                            {generation.thumbnail_url ? (
                              <img
                                src={
                                  generation.thumbnail_url
                                }
                                alt=""
                              />
                            ) : (
                              <Box
                                size={44}
                                strokeWidth={
                                  1.1
                                }
                              />
                            )}

                            <span
                              className={`account-status account-model-status ${String(
                                generation.status ||
                                  "PENDING"
                              ).toLowerCase()}`}
                            >
                              {generation.status ||
                                "PENDING"}
                            </span>
                          </div>

                          <div className="account-model-body">
                            <span className="account-model-type">
                              {generation.mode ===
                              "photos"
                                ? "PHOTOS TO 3D"
                                : "TEXT TO 3D"}
                            </span>

                            <h3>
                              {modelTitle(
                                generation
                              )}
                            </h3>

                            <div className="account-model-info">
                              <div>
                                <Clock3
                                  size={12}
                                  strokeWidth={
                                    1.4
                                  }
                                />

                                {formatDate(
                                  generation.created_at
                                )}
                              </div>

                              <div>
                                {archived ? (
                                  <>
                                    <Check
                                      size={12}
                                      strokeWidth={
                                        1.6
                                      }
                                    />

                                    Saved
                                  </>
                                ) : (
                                  <>
                                    <FileBox
                                      size={12}
                                      strokeWidth={
                                        1.4
                                      }
                                    />

                                    Meshy
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="account-model-actions">
                              {ready &&
                                !archived && (
                                <button
                                  type="button"
                                  className="account-secondary-button"
                                  disabled={
                                    archivingId ===
                                    generation.id
                                  }
                                  onClick={() =>
                                    savePermanently(
                                      generation
                                    )
                                  }
                                >
                                  <Save
                                    size={14}
                                    strokeWidth={
                                      1.5
                                    }
                                  />

                                  {archivingId ===
                                  generation.id
                                    ? "Saving..."
                                    : "Save Permanently"}
                                </button>
                              )}

                              {ready && (
                                <button
                                  type="button"
                                  className={`account-community-button ${
                                    aiCommunityShare
                                      ? "is-published"
                                      : ""
                                  }`}
                                  disabled={
                                    communityBusyKey ===
                                    `ai_model:${generation.id}`
                                  }
                                  onClick={() =>
                                    aiCommunityShare
                                      ? removeCommunityShare(
                                          "ai_model",
                                          generation.id
                                        )
                                      : shareAiModelToCommunity(
                                          generation
                                        )
                                  }
                                >
                                  {communityBusyKey ===
                                  `ai_model:${generation.id}`
                                    ? "Updating…"
                                    : aiCommunityShare
                                      ? "Remove from Community"
                                      : "Share to Community"}
                                </button>
                              )}

                              <button
                                type="button"
                                className="account-primary-button"
                                disabled={
                                  !ready
                                }
                                onClick={() =>
                                  useModel(
                                    generation
                                  )
                                }
                              >
                                Use This Model
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="account-profile">
              <div className="account-profile-intro">
                <UserRound
                  size={36}
                  strokeWidth={
                    1.1
                  }
                />

                <div>
                  <span>
                    PROFILE
                  </span>

                  <h3>
                    Your details
                  </h3>

                  <p>
                    Keep your contact
                    information up to
                    date for future
                    projects.
                  </p>
                </div>
              </div>

              <form
                className="account-profile-form"
                onSubmit={
                  handleSaveProfile
                }
              >
                <label>
                  <span>
                    FULL NAME
                  </span>

                  <input
                    type="text"
                    value={
                      fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setFullName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Your name"
                  />
                </label>

                <label>
                  <span>
                    EMAIL
                  </span>

                  <input
                    type="email"
                    value={
                      session.user
                        ?.email ||
                      ""
                    }
                    disabled
                  />

                  <small>
                    Email is managed by
                    your login account.
                  </small>
                </label>

                <label>
                  <span>
                    PHONE
                  </span>

                  <input
                    type="tel"
                    value={
                      phone
                    }
                    onChange={(
                      event
                    ) =>
                      setPhone(
                        event.target
                          .value
                      )
                    }
                    placeholder="Phone number"
                  />
                </label>

                <button
                  type="submit"
                  className="account-primary-button account-save-profile"
                  disabled={
                    savingProfile
                  }
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save Profile"}
                </button>

                {profileMessage && (
                  <div className="account-profile-message">
                    {
                      profileMessage
                    }
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default MyAccount;
