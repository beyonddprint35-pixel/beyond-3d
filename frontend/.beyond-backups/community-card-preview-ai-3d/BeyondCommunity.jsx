import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Canvas,
} from "@react-three/fiber";

import {
  Bounds,
  Environment,
  OrbitControls,
} from "@react-three/drei";

import * as THREE from "three";

import {
  Box,
  Copy,
  Heart,
  RefreshCw,
  Rotate3D,
  Sparkles,
  X,
} from "lucide-react";

import {
  deserializeCreatorObjects,
} from "../lib/projectStore";

import {
  listCommunityItems,
  listCommunityLikes,
  remixCommunityProject,
  setCommunityLike,
} from "../lib/communityStore";

import "./BeyondCommunity.css";

// BEYOND_COMMUNITY_3D_VIEWER_V2
const COMMUNITY_SCENE_SCALE = 0.018;

function formatCommunityDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IL",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function communityMaterialColor(materialId) {
  const colors = {
    navy: "#294f6d",
    white: "#dbe6ee",
    black: "#202a31",
    red: "#99515d",
    orange: "#a96c42",
    yellow: "#a58a45",
    green: "#4e7768",
    blue: "#3f7197",
    purple: "#68577f",
    gray: "#78848d",
    grey: "#78848d",
  };

  return (
    colors[String(materialId || "navy").toLowerCase()] ||
    colors.navy
  );
}

function generatedCommunityScale(item) {
  if (
    item?.type !== "mesh" ||
    !item?.baseDimensions ||
    !item?.dimensions
  ) {
    return [1, 1, 1];
  }

  return [
    Number(item.dimensions.width || 1) /
      Math.max(0.001, Number(item.baseDimensions.width || 1)),
    Number(item.dimensions.height || 1) /
      Math.max(0.001, Number(item.baseDimensions.height || 1)),
    Number(item.dimensions.depth || 1) /
      Math.max(0.001, Number(item.baseDimensions.depth || 1)),
  ];
}

function makeCommunityPrimitiveGeometry(item) {
  const dimensions = item?.dimensions || {};

  const width =
    Math.max(0.02, Number(dimensions.width || 20) * COMMUNITY_SCENE_SCALE);

  const depth =
    Math.max(0.02, Number(dimensions.depth || 20) * COMMUNITY_SCENE_SCALE);

  const height =
    Math.max(0.02, Number(dimensions.height || 20) * COMMUNITY_SCENE_SCALE);

  let geometry;

  if (item?.type === "sphere") {
    geometry = new THREE.SphereGeometry(1, 40, 28);
    geometry.scale(width / 2, height / 2, depth / 2);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  if (item?.type === "cylinder") {
    geometry = new THREE.CylinderGeometry(1, 1, 1, 48);
    geometry.scale(width / 2, height, depth / 2);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  if (item?.type === "cone") {
    geometry = new THREE.CylinderGeometry(0, 1, 1, 48, 1, false);
    geometry.scale(width / 2, height, depth / 2);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  if (item?.type === "torus") {
    geometry = new THREE.TorusGeometry(1, 0.25, 20, 56);
    geometry.rotateX(-Math.PI / 2);
    geometry.scale(width / 2.5, height / 0.5, depth / 2.5);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  // Cube, rounded box, text fallback, and any future primitive that
  // does not yet have a dedicated Community renderer use the exact
  // saved dimensions instead of disappearing from the public viewer.
  geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function CommunityProjectScene({ item }) {
  const displayObjects = useMemo(() => {
    const savedObjects =
      item?.source_payload?.projectData?.objects || [];

    const restored =
      deserializeCreatorObjects(savedObjects);

    return restored
      .filter((entry) => entry && entry.visible !== false)
      .map((entry) => {
        const savedMeshGeometry =
          entry.type === "mesh" && entry.geometry?.isBufferGeometry;

        const geometry = savedMeshGeometry
          ? entry.geometry
          : makeCommunityPrimitiveGeometry(entry);

        geometry.computeBoundingBox?.();
        geometry.computeBoundingSphere?.();

        return {
          item: entry,
          geometry,
        };
      });
  }, [item]);

  useEffect(() => {
    return () => {
      displayObjects.forEach(({ geometry }) => {
        geometry?.dispose?.();
      });
    };
  }, [displayObjects]);

  if (!displayObjects.length) {
    return null;
  }

  return (
    <Bounds
      fit
      clip
      observe
      margin={1.35}
    >
      <group>
        {displayObjects.map(({ item: entry, geometry }, index) => {
          const position = entry.position || {};
          const rotation = entry.rotation || {};
          const scale = generatedCommunityScale(entry);
          const isHole = entry.role === "hole";

          return (
            <group
              key={entry.id || `community-object-${index}`}
              position={[
                Number(position.x || 0) * COMMUNITY_SCENE_SCALE,
                Number(position.y || 0) * COMMUNITY_SCENE_SCALE,
                Number(position.z || 0) * COMMUNITY_SCENE_SCALE,
              ]}
              rotation={[
                THREE.MathUtils.degToRad(Number(rotation.x || 0)),
                THREE.MathUtils.degToRad(Number(rotation.y || 0)),
                THREE.MathUtils.degToRad(Number(rotation.z || 0)),
              ]}
              scale={scale}
            >
              <mesh
                geometry={geometry}
                castShadow={!isHole}
                receiveShadow={!isHole}
              >
                <meshStandardMaterial
                  color={isHole ? "#a76572" : communityMaterialColor(entry.materialId)}
                  roughness={0.42}
                  metalness={0.08}
                  transparent={isHole}
                  opacity={isHole ? 0.28 : 1}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </Bounds>
  );
}

function CommunityProjectViewer({ item }) {
  return (
    <div className="community-3d-canvas">
      <Canvas
        shadows
        camera={{
          position: [3.8, 3, 4.6],
          fov: 42,
          near: 0.01,
          far: 500,
        }}
        dpr={[1, 1.7]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <color attach="background" args={["#061018"]} />

        <ambientLight intensity={0.85} />

        <directionalLight
          position={[5, 7, 5]}
          intensity={2.1}
          castShadow
        />

        <directionalLight
          position={[-4, 2, -3]}
          intensity={0.65}
        />

        <Suspense fallback={null}>
          <CommunityProjectScene item={item} />

          <Environment
            preset="city"
            environmentIntensity={0.35}
          />
        </Suspense>

        <gridHelper
          args={[12, 24, "#17364a", "#0d2533"]}
          position={[0, -0.002, 0]}
        />

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={0.25}
          maxDistance={40}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      <div className="community-3d-hint">
        <Rotate3D size={14} strokeWidth={1.45} />
        Drag to rotate · scroll/pinch to zoom · right-drag/two fingers to pan
      </div>
    </div>
  );
}

function BeyondCommunity({
  session,
  onRequireAuth,
}) {
  const [items, setItems] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("new");
  const [busyId, setBusyId] = useState(null);
  const [viewerItem, setViewerItem] = useState(null);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [nextItems, nextLikes] = await Promise.all([
        listCommunityItems(),
        listCommunityLikes(),
      ]);

      setItems(nextItems);
      setLikes(nextLikes);
    } catch (loadError) {
      console.error("[BEYOND COMMUNITY] Load failed:", loadError);
      setError("Beyond Community could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    function refreshCommunity() {
      loadCommunity();
    }

    window.addEventListener(
      "beyond-community-refresh",
      refreshCommunity
    );

    return () =>
      window.removeEventListener(
        "beyond-community-refresh",
        refreshCommunity
      );
  }, [loadCommunity]);

  useEffect(() => {
    if (!viewerItem) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setViewerItem(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerItem]);

  const likeCountByItem = useMemo(() => {
    const map = new Map();

    likes.forEach((like) => {
      map.set(
        like.item_id,
        (map.get(like.item_id) || 0) + 1
      );
    });

    return map;
  }, [likes]);

  const likedByMe = useMemo(() => {
    const userId = session?.user?.id;

    if (!userId) {
      return new Set();
    }

    return new Set(
      likes
        .filter((like) => like.user_id === userId)
        .map((like) => like.item_id)
    );
  }, [likes, session?.user?.id]);

  const visibleItems = useMemo(() => {
    let next = [...items];

    if (filter === "creator") {
      next = next.filter(
        (item) => item.source_type === "project"
      );
    } else if (filter === "ai") {
      next = next.filter(
        (item) => item.source_type === "ai_model"
      );
    } else if (filter === "popular") {
      next.sort(
        (a, b) =>
          (likeCountByItem.get(b.id) || 0) -
            (likeCountByItem.get(a.id) || 0) ||
          new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
      );
    }

    return next;
  }, [filter, items, likeCountByItem]);

  async function toggleLike(item) {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setBusyId(`like:${item.id}`);

    try {
      const wasLiked = likedByMe.has(item.id);

      await setCommunityLike({
        itemId: item.id,
        userId: session.user.id,
        liked: wasLiked,
      });

      setLikes((current) => {
        if (wasLiked) {
          return current.filter(
            (like) =>
              !(
                like.item_id === item.id &&
                like.user_id === session.user.id
              )
          );
        }

        return [
          ...current,
          {
            item_id: item.id,
            user_id: session.user.id,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (likeError) {
      console.error("[BEYOND COMMUNITY] Like failed:", likeError);
      setError(likeError?.message || "Could not update this like.");
    } finally {
      setBusyId(null);
    }
  }

  async function remixProject(item) {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setBusyId(`remix:${item.id}`);

    try {
      const project = await remixCommunityProject({
        item,
        userId: session.user.id,
      });

      setViewerItem(null);

      window.dispatchEvent(
        new CustomEvent("beyond-project-open", {
          detail: project,
        })
      );

      window.dispatchEvent(
        new CustomEvent("beyond-project-saved", {
          detail: project,
        })
      );

      window.setTimeout(() => {
        document.getElementById("creator")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    } catch (remixError) {
      console.error("[BEYOND COMMUNITY] Remix failed:", remixError);
      setError(remixError?.message || "Could not remix this project.");
    } finally {
      setBusyId(null);
    }
  }

  function useAiModel(item) {
    const modelData = item.source_payload || {};

    sessionStorage.setItem(
      "beyondSelectedAiModel",
      JSON.stringify(modelData)
    );

    window.dispatchEvent(
      new CustomEvent("beyond-ai-model-selected", {
        detail: modelData,
      })
    );

    window.setTimeout(() => {
      document.getElementById("start")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  return (
    <section className="beyond-community" id="community">
      <div className="community-shell">
        <div className="community-heading">
          <div>
            <div className="community-kicker">
              04 / BEYOND COMMUNITY
            </div>

            <h2>
              Discover what people
              <br />

              <span>
                create with BEYOND.
              </span>
            </h2>
          </div>

          <p>
            Explore objects made in BEYOND Creator and BEYOND AI Studio.
            Rotate shared Creator projects in 3D, like ideas, use AI creations,
            or remix editable projects into your own workspace.
          </p>
        </div>

        <div className="community-toolbar">
          <div
            className="community-filters"
            role="tablist"
            aria-label="Community filters"
          >
            {[
              ["new", "New"],
              ["popular", "Popular"],
              ["creator", "Creator"],
              ["ai", "AI Created"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="community-refresh"
            onClick={loadCommunity}
            disabled={loading}
            aria-label="Refresh Beyond Community"
          >
            <RefreshCw size={15} strokeWidth={1.45} />
          </button>
        </div>

        {error && (
          <div className="community-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="community-loading">
            <RefreshCw size={22} strokeWidth={1.35} />
            Loading Beyond Community…
          </div>
        ) : !visibleItems.length ? (
          <div className="community-empty">
            <Sparkles size={32} strokeWidth={1.15} />

            <strong>
              No creations here yet.
            </strong>

            <span>
              Open My Projects or My Models and choose Share to Beyond Community.
            </span>
          </div>
        ) : (
          <div className="community-grid">
            {visibleItems.map((item) => {
              const liked = likedByMe.has(item.id);
              const likeCount = likeCountByItem.get(item.id) || 0;
              const isAi = item.source_type === "ai_model";

              return (
                <article
                  className="community-card"
                  key={item.id}
                >
                  <button
                    type="button"
                    className={`community-card-preview ${
                      isAi ? "is-ai" : "is-viewable"
                    }`}
                    onClick={() => {
                      if (!isAi) {
                        setViewerItem(item);
                      }
                    }}
                    aria-label={
                      isAi
                        ? item.title || "AI creation"
                        : `View ${item.title || "project"} in 3D`
                    }
                  >
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" />
                    ) : (
                      <div className="community-card-placeholder">
                        {isAi ? (
                          <Sparkles size={46} strokeWidth={1.05} />
                        ) : (
                          <Box size={46} strokeWidth={1.05} />
                        )}
                      </div>
                    )}

                    <span
                      className={`community-type ${
                        isAi ? "ai" : "creator"
                      }`}
                    >
                      {isAi ? "AI CREATED" : "CREATOR"}
                    </span>

                    {!isAi && (
                      <span className="community-view-3d-badge">
                        <Rotate3D size={13} strokeWidth={1.5} />
                        VIEW IN 3D
                      </span>
                    )}
                  </button>

                  <div className="community-card-body">
                    <div className="community-card-kicker">
                      <span>
                        BY {item.creator_name || "BEYOND CREATOR"}
                      </span>

                      <span>
                        {formatCommunityDate(item.created_at)}
                      </span>
                    </div>

                    <h3>
                      {item.title || "Untitled Creation"}
                    </h3>

                    {item.description && (
                      <p>
                        {item.description}
                      </p>
                    )}

                    {!!item.tags?.length && (
                      <div className="community-tags">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={`${item.id}-${tag}`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="community-card-actions">
                      <button
                        type="button"
                        className={`community-like ${
                          liked ? "liked" : ""
                        }`}
                        onClick={() => toggleLike(item)}
                        disabled={busyId === `like:${item.id}`}
                      >
                        <Heart
                          size={15}
                          strokeWidth={1.55}
                          fill={liked ? "currentColor" : "none"}
                        />

                        {likeCount}
                      </button>

                      {isAi ? (
                        <button
                          type="button"
                          className="community-primary-action"
                          onClick={() => useAiModel(item)}
                        >
                          Use This Model
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="community-secondary-action"
                            onClick={() => setViewerItem(item)}
                          >
                            <Rotate3D size={14} strokeWidth={1.45} />
                            View 3D
                          </button>

                          <button
                            type="button"
                            className="community-primary-action"
                            onClick={() => remixProject(item)}
                            disabled={busyId === `remix:${item.id}`}
                          >
                            <Copy size={14} strokeWidth={1.45} />

                            {busyId === `remix:${item.id}`
                              ? "Remixing…"
                              : "Remix"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {viewerItem && viewerItem.source_type === "project" && (
        <div
          className="community-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${viewerItem.title || "Community project"} 3D viewer`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewerItem(null);
            }
          }}
        >
          <div className="community-viewer-modal">
            <div className="community-viewer-header">
              <div>
                <span>
                  BEYOND COMMUNITY · 3D VIEW
                </span>

                <h3>
                  {viewerItem.title || "Untitled Creation"}
                </h3>

                <small>
                  By {viewerItem.creator_name || "BEYOND Creator"} · Read-only public preview
                </small>
              </div>

              <button
                type="button"
                onClick={() => setViewerItem(null)}
                aria-label="Close 3D viewer"
              >
                <X size={19} strokeWidth={1.5} />
              </button>
            </div>

            <CommunityProjectViewer item={viewerItem} />

            <div className="community-viewer-footer">
              <div>
                <strong>
                  Want to change it?
                </strong>

                <span>
                  Remix creates your own private editable copy. The original stays unchanged.
                </span>
              </div>

              <button
                type="button"
                className="community-primary-action community-viewer-remix"
                onClick={() => remixProject(viewerItem)}
                disabled={busyId === `remix:${viewerItem.id}`}
              >
                <Copy size={14} strokeWidth={1.45} />

                {busyId === `remix:${viewerItem.id}`
                  ? "Remixing…"
                  : "Remix in Creator"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BeyondCommunity;
