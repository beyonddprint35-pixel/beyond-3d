import {
  Component,
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
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import {
  Box,
  Copy,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  RefreshCw,
  Rotate3D,
  Sparkles,
  X,
} from "lucide-react";

import {
  deserializeCreatorObjects,
} from "../lib/projectStore";

import {
  addCommunityComment,
  deleteCommunityComment,
  listCommunityCommentCounts,
  listCommunityComments,
  listCommunityItems,
  listCommunityLikes,
  remixCommunityProject,
  resolveOwnedAiGenerationAssets,
  setCommunityLike,
} from "../lib/communityStore";

import "./BeyondCommunity.css";

// BEYOND_COMMUNITY_AI_3D_AND_REMIX_V5
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


// BEYOND_COMMUNITY_CREATOR_ALWAYS_LIVE_PREVIEW_V4
function CommunityCardProjectPreview({ item }) {
  return (
    <div className="community-card-live-preview" aria-hidden="true">
      <Canvas
        frameloop="demand"
        camera={{
          position: [3.8, 3, 4.6],
          fov: 40,
          near: 0.01,
          far: 500,
        }}
        dpr={1}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        }}
      >
        <color attach="background" args={["#07121a"]} />

        <ambientLight intensity={0.95} />

        <directionalLight
          position={[5, 7, 5]}
          intensity={2.1}
        />

        <directionalLight
          position={[-4, 2, -3]}
          intensity={0.6}
        />

        <Suspense fallback={null}>
          <CommunityProjectScene item={item} />

          <Environment
            preset="city"
            environmentIntensity={0.3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function communityAiModelUrl(item) {
  const directGlbUrl =
    item?.source_payload?.glbUrl ||
    null;

  // Newly shared AI models can preview directly in Vite/Codespaces.
  // The server function remains the permanent/public fallback once deployed.
  if (directGlbUrl) {
    return directGlbUrl;
  }

  if (!item?.id) return null;

  return `/.netlify/functions/get-community-ai-model?id=${encodeURIComponent(
    item.id
  )}`;
}

function CommunityAiModel({ url }) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(
    () => scene.clone(true),
    [scene]
  );

  return (
    <Bounds fit clip observe margin={1.35}>
      <primitive object={clonedScene} />
    </Bounds>
  );
}

class CommunityAiViewerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("[BEYOND COMMUNITY] AI 3D viewer failed:", error);
  }

  componentDidUpdate(previousProps) {
    if (
      previousProps.resetKey !== this.props.resetKey &&
      this.state.hasError
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="community-ai-viewer-error">
          <Sparkles size={30} strokeWidth={1.1} />
          <strong>3D preview could not be loaded.</strong>
          <span>The published image is still available on the Community card.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

function CommunityAiViewer({ item, session }) {
  const [ownedAssets, setOwnedAssets] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function resolveAssets() {
      // Always prefer BEYOND's archived Supabase GLB for the owner.
      // Meshy's original glb_url can expire or reject browser fetches.
      if (
        !session?.user?.id ||
        item?.user_id !== session.user.id
      ) {
        setOwnedAssets(null);
        return;
      }

      const assets = await resolveOwnedAiGenerationAssets({
        item,
        userId: session.user.id,
      });

      if (mounted) {
        setOwnedAssets(assets);
      }
    }

    resolveAssets();

    return () => {
      mounted = false;
    };
  }, [item, session?.user?.id]);

  const modelUrl =
    ownedAssets?.glb_signed_url ||
    ownedAssets?.glb_url ||
    item?.source_payload?.glbUrl ||
    communityAiModelUrl(item);

  if (!modelUrl) {
    return (
      <div className="community-ai-viewer-error">
        <Sparkles size={30} strokeWidth={1.1} />
        <strong>No public 3D preview is available.</strong>
      </div>
    );
  }

  return (
    <div className="community-3d-canvas">
      <CommunityAiViewerErrorBoundary resetKey={item.id}>
        <Canvas
          camera={{
            position: [3.4, 2.6, 4.2],
            fov: 42,
          }}
          dpr={[1, 1.6]}
          gl={{
            antialias: true,
            alpha: true,
          }}
        >
          <color attach="background" args={["#061018"]} />

          <ambientLight intensity={1.1} />

          <directionalLight
            position={[4, 6, 5]}
            intensity={2}
          />

          <Suspense fallback={null}>
            <CommunityAiModel url={modelUrl} />

            <Environment
              preset="city"
              environmentIntensity={0.45}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={0.35}
            maxDistance={20}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </CommunityAiViewerErrorBoundary>

      <div className="community-3d-hint">
        <Rotate3D size={14} strokeWidth={1.45} />
        Drag to rotate · scroll/pinch to zoom · right-drag/two fingers to pan
      </div>
    </div>
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
  const [commentRows, setCommentRows] = useState([]);
  const [viewerComments, setViewerComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [nextItems, nextLikes, nextCommentRows] = await Promise.all([
        listCommunityItems(),
        listCommunityLikes(),
        listCommunityCommentCounts(),
      ]);

      setItems(nextItems);
      setLikes(nextLikes);
      setCommentRows(nextCommentRows);
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

  useEffect(() => {
    let active = true;

    async function loadViewerComments() {
      if (!viewerItem?.id) {
        setViewerComments([]);
        setCommentText("");
        return;
      }

      setCommentLoading(true);
      setCommentText("");

      try {
        const nextComments = await listCommunityComments({
          itemId: viewerItem.id,
        });

        if (active) {
          setViewerComments(nextComments);
        }
      } catch (commentError) {
        console.error("[BEYOND COMMUNITY] Comments failed:", commentError);
        if (active) {
          setViewerComments([]);
        }
      } finally {
        if (active) {
          setCommentLoading(false);
        }
      }
    }

    loadViewerComments();

    return () => {
      active = false;
    };
  }, [viewerItem?.id]);

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

  const commentCountByItem = useMemo(() => {
    const map = new Map();

    commentRows.forEach((row) => {
      map.set(
        row.item_id,
        (map.get(row.item_id) || 0) + 1
      );
    });

    return map;
  }, [commentRows]);

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

  function sessionCreatorName() {
    const metadata = session?.user?.user_metadata || {};
    const direct =
      metadata.full_name ||
      metadata.name ||
      metadata.display_name ||
      "";

    if (String(direct).trim()) {
      return String(direct).trim();
    }

    const email = String(session?.user?.email || "").trim();
    return email ? email.split("@")[0] : "BEYOND Creator";
  }

  async function submitComment(event) {
    event?.preventDefault?.();

    if (!viewerItem?.id) return;

    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    const body = commentText.trim();
    if (!body) return;

    setCommentBusy(true);
    setError("");

    try {
      const created = await addCommunityComment({
        itemId: viewerItem.id,
        userId: session.user.id,
        creatorName: sessionCreatorName(),
        body,
      });

      setViewerComments((current) => [
        ...current,
        created,
      ]);

      setCommentRows((current) => [
        ...current,
        {
          item_id: viewerItem.id,
        },
      ]);

      setCommentText("");
    } catch (commentError) {
      console.error("[BEYOND COMMUNITY] Comment failed:", commentError);
      setError(commentError?.message || "Could not post this comment.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeComment(comment) {
    if (!session?.user?.id || comment?.user_id !== session.user.id) {
      return;
    }

    setCommentBusy(true);

    try {
      await deleteCommunityComment({
        commentId: comment.id,
        userId: session.user.id,
      });

      setViewerComments((current) =>
        current.filter((entry) => entry.id !== comment.id)
      );

      let removed = false;
      setCommentRows((current) =>
        current.filter((row) => {
          if (!removed && row.item_id === comment.item_id) {
            removed = true;
            return false;
          }
          return true;
        })
      );
    } catch (commentError) {
      console.error("[BEYOND COMMUNITY] Delete comment failed:", commentError);
      setError(commentError?.message || "Could not delete this comment.");
    } finally {
      setCommentBusy(false);
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

  async function remixAiModel(item) {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setBusyId(`ai-remix:${item.id}`);
    setError("");

    try {
      const payload = item.source_payload || {};
      let modelUrl = null;

      // For the owner, ALWAYS resolve the archived BEYOND asset first.
      // This avoids expired / CORS-blocked Meshy URLs.
      if (item.user_id === session.user.id) {
        const assets = await resolveOwnedAiGenerationAssets({
          item,
          userId: session.user.id,
        });

        modelUrl =
          assets?.glb_signed_url ||
          assets?.glb_url ||
          null;
      }

      if (!modelUrl) {
        modelUrl = payload.glbUrl || null;
      }

      if (!modelUrl) {
        modelUrl = `/.netlify/functions/get-community-ai-model?id=${encodeURIComponent(
          item.id
        )}`;
      }

      // Download BEFORE navigating to Studio. Passing the actual File object
      // makes the Community -> Creator handoff independent of a second fetch.
      const response = await fetch(modelUrl);

      if (!response.ok) {
        throw new Error(
          `Unable to download the AI model for Remix (${response.status}).`
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The AI model file is empty.");
      }

      const safeName = String(
        item.title || "AI Community Model"
      )
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim()
        .slice(0, 60) || "AI Community Model";

      const remixFile = new File(
        [blob],
        `${safeName}.glb`,
        {
          type: blob.type || "model/gltf-binary",
        }
      );

      setViewerItem(null);

      window.dispatchEvent(
        new CustomEvent("beyond-community-ai-remix", {
          detail: {
            itemId: item.id,
            title: item.title || "AI Community Model",
            file: remixFile,
            modelUrl,
            fileExtension: "glb",
            sourcePayload: payload,
          },
        })
      );

      window.setTimeout(() => {
        document.getElementById("creator")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    } catch (remixError) {
      console.error("[BEYOND COMMUNITY] AI remix failed:", remixError);
      setError(
        remixError?.message ||
          "Could not open this AI model in Creator."
      );
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
              const commentCount = commentCountByItem.get(item.id) || 0;
              const isAi = item.source_type === "ai_model";

              return (
                <article
                  className="community-card"
                  key={item.id}
                >
                  <button
                    type="button"
                    className="community-card-preview is-viewable"
                    onClick={() => setViewerItem(item)}
                    aria-label={`View ${item.title || "creation"} in 3D`}
                  >
                    {isAi ? (
                      item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" />
                      ) : (
                        <div className="community-card-placeholder">
                          <Sparkles size={46} strokeWidth={1.05} />
                        </div>
                      )
                    ) : (
                      <CommunityCardProjectPreview item={item} />
                    )}

                    <span
                      className={`community-type ${
                        isAi ? "ai" : "creator"
                      }`}
                    >
                      {isAi ? "AI CREATED" : "CREATOR"}
                    </span>

                    <span className="community-view-3d-badge">
                      <Rotate3D size={13} strokeWidth={1.5} />
                      VIEW IN 3D
                    </span>
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

                      <button
                        type="button"
                        className="community-comment-count"
                        onClick={() => setViewerItem(item)}
                        aria-label={`Open ${commentCount} comments`}
                      >
                        <MessageCircle size={15} strokeWidth={1.5} />
                        {commentCount}
                      </button>

                      {isAi ? (
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
                            onClick={() => remixAiModel(item)}
                            disabled={busyId === `ai-remix:${item.id}`}
                          >
                            <Copy size={14} strokeWidth={1.45} />
                            {busyId === `ai-remix:${item.id}`
                              ? "Opening…"
                              : "Remix"}
                          </button>
                        </>
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

      {viewerItem && (
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
                  By {viewerItem.creator_name || "BEYOND Creator"} · {viewerItem.source_type === "ai_model" ? "AI-generated public 3D preview" : "Read-only public preview"}
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

            {viewerItem.source_type === "ai_model" ? (
              <CommunityAiViewer item={viewerItem} session={session} />
            ) : (
              <CommunityProjectViewer item={viewerItem} />
            )}

            <div className="community-discussion">
              <div className="community-discussion-intro">
                <div>
                  <span>COMMUNITY DETAILS</span>
                  <h4>{viewerItem.title || "Untitled Creation"}</h4>
                </div>

                <div className="community-discussion-stats">
                  <button
                    type="button"
                    className={likedByMe.has(viewerItem.id) ? "liked" : ""}
                    onClick={() => toggleLike(viewerItem)}
                    disabled={busyId === `like:${viewerItem.id}`}
                  >
                    <Heart
                      size={15}
                      strokeWidth={1.5}
                      fill={likedByMe.has(viewerItem.id) ? "currentColor" : "none"}
                    />
                    {likeCountByItem.get(viewerItem.id) || 0}
                  </button>

                  <span>
                    <MessageCircle size={15} strokeWidth={1.5} />
                    {commentCountByItem.get(viewerItem.id) || 0}
                  </span>
                </div>
              </div>

              <div className="community-detail-meta">
                <span>
                  BY {viewerItem.creator_name || "BEYOND CREATOR"}
                </span>
                <span>
                  {viewerItem.source_type === "ai_model" ? "AI CREATED" : "CREATOR PROJECT"}
                </span>
                <span>{formatCommunityDate(viewerItem.created_at)}</span>
              </div>

              {viewerItem.description && (
                <p className="community-detail-description">
                  {viewerItem.description}
                </p>
              )}

              {!!viewerItem.tags?.length && (
                <div className="community-tags community-detail-tags">
                  {viewerItem.tags.map((tag) => (
                    <span key={`${viewerItem.id}-detail-${tag}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="community-comments-head">
                <div>
                  <span>DISCUSSION</span>
                  <strong>
                    {commentCountByItem.get(viewerItem.id) || 0} comments
                  </strong>
                </div>
              </div>

              <div className="community-comments-list">
                {commentLoading ? (
                  <div className="community-comments-empty">
                    Loading discussion…
                  </div>
                ) : viewerComments.length ? (
                  viewerComments.map((comment) => (
                    <article
                      className="community-comment"
                      key={comment.id}
                    >
                      <div>
                        <strong>
                          {comment.creator_name || "BEYOND Creator"}
                        </strong>
                        <span>{formatCommunityDate(comment.created_at)}</span>
                      </div>

                      <p>{comment.body}</p>

                      {comment.user_id === session?.user?.id && (
                        <button
                          type="button"
                          className="community-comment-delete"
                          onClick={() => removeComment(comment)}
                          disabled={commentBusy}
                          aria-label="Delete your comment"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="community-comments-empty">
                    No comments yet. Start the discussion.
                  </div>
                )}
              </div>

              <form
                className="community-comment-form"
                onSubmit={submitComment}
              >
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value.slice(0, 500))}
                  placeholder={
                    session?.user?.id
                      ? "Share feedback, an idea, or how you would remix it…"
                      : "Log in to join the discussion."
                  }
                  disabled={!session?.user?.id || commentBusy}
                  rows={3}
                  maxLength={500}
                />

                <div>
                  <span>{commentText.length} / 500</span>

                  <button
                    type="submit"
                    disabled={!session?.user?.id || !commentText.trim() || commentBusy}
                  >
                    <Send size={14} strokeWidth={1.5} />
                    {commentBusy ? "Posting…" : "Post comment"}
                  </button>
                </div>
              </form>
            </div>

            <div className="community-viewer-footer">
              {viewerItem.source_type === "ai_model" ? (
                <>
                  <div>
                    <strong>
                      Want to change this AI creation?
                    </strong>

                    <span>
                      Remix imports the printable 3MF into Studio as an editable mesh. The Community original stays unchanged.
                    </span>
                  </div>

                  <div className="community-viewer-actions">
                    <button
                      type="button"
                      className="community-secondary-action"
                      onClick={() => {
                        useAiModel(viewerItem);
                        setViewerItem(null);
                      }}
                    >
                      Use for Print
                    </button>

                    <button
                      type="button"
                      className="community-primary-action community-viewer-remix"
                      onClick={() => remixAiModel(viewerItem)}
                      disabled={busyId === `ai-remix:${viewerItem.id}`}
                    >
                      <Copy size={14} strokeWidth={1.45} />
                      {busyId === `ai-remix:${viewerItem.id}`
                        ? "Opening…"
                        : "Remix in Creator"}
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default BeyondCommunity;
