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
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import {
  Bell,
  Bookmark,
  Box,
  CheckCheck,
  Copy,
  Heart,
  MessageCircle,
  Search,
  Send,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Settings2,
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
  listCommunityFollows,
  listCommunityRecentComments,
  listCommunitySaves,
  listCommunityFeatured,
  setCommunityFeatured,
  removeCommunityFeatured,
  remixCommunityProject,
  resolveOwnedAiGenerationAssets,
  setCommunityLike,
  setCommunityFollow,
  setCommunitySave,
  unpublishCommunitySource,
  updateCommunityPublication,
} from "../lib/communityStore";

import "./BeyondCommunity.css";

// BEYOND_COMMUNITY_AI_3D_AND_REMIX_V5
// BEYOND_COMMUNITY_DISCOVERY_FOLLOWING
// BEYOND_COMMUNITY_ACTIVITY_CENTER
// BEYOND_COMMUNITY_SAVED_CREATIONS
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


function communityPermissions(item) {
  const permissions =
    item?.source_payload?.permissions || {};

  return {
    allowRemix:
      permissions.allowRemix !== false,
    allowComments:
      permissions.allowComments !== false,
    allowUseForPrint:
      permissions.allowUseForPrint !== false,
  };
}

function BeyondCommunity({
  session,
  onRequireAuth,
  isAdmin = false,
}) {
  const [items, setItems] = useState([]);
  const [likes, setLikes] = useState([]);

  // BEYOND_COMMUNITY_FEATURED_V1
  const [featuredRows, setFeaturedRows] =
    useState([]);

  const [communityExpanded, setCommunityExpanded] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [follows, setFollows] = useState([]);
  const [saves, setSaves] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activitySeenAt, setActivitySeenAt] = useState(0);
  const [followBusyUserId, setFollowBusyUserId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [viewerItem, setViewerItem] = useState(null);
  const [commentRows, setCommentRows] = useState([]);
  const [viewerComments, setViewerComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [creatorProfileUserId, setCreatorProfileUserId] = useState(null);
  const [publicationEditing, setPublicationEditing] = useState(false);
  const [publicationSaving, setPublicationSaving] = useState(false);
  const [publicationTitle, setPublicationTitle] = useState("");
  const [publicationDescription, setPublicationDescription] = useState("");
  const [publicationTags, setPublicationTags] = useState("");
  const [publicationAllowRemix, setPublicationAllowRemix] = useState(true);
  const [publicationAllowComments, setPublicationAllowComments] = useState(true);
  const [publicationAllowUseForPrint, setPublicationAllowUseForPrint] = useState(true);

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

      // Homepage highlights are optional and must never
      // take the full Community feed offline.
      try {
        const nextFeatured =
          await listCommunityFeatured();

        setFeaturedRows(
          nextFeatured
        );
      } catch (featuredLoadError) {
        console.warn(
          "[BEYOND COMMUNITY] Featured creations unavailable:",
          featuredLoadError
        );

        setFeaturedRows([]);
      }

      // Following is deliberately optional. A new social table must never
      // take the public Community feed, previews, likes, comments or Remix offline.
      try {
        const nextFollows = await listCommunityFollows();
        setFollows(nextFollows);
      } catch (followLoadError) {
        console.warn(
          "[BEYOND COMMUNITY] Follows unavailable:",
          followLoadError
        );
        setFollows([]);
      }

      // Saved creations are private per-account state. A missing/new table must
      // never take the public Community feed offline.
      try {
        const nextSaves = await listCommunitySaves({
          userId: session?.user?.id,
        });
        setSaves(nextSaves);
      } catch (saveLoadError) {
        console.warn(
          "[BEYOND COMMUNITY] Saved creations unavailable:",
          saveLoadError
        );
        setSaves([]);
      }

      // Activity is also optional. It uses the already-public social tables and
      // must never be able to take the Community feed offline.
      try {
        const nextRecentComments =
          await listCommunityRecentComments();
        setRecentComments(nextRecentComments);
      } catch (activityLoadError) {
        console.warn(
          "[BEYOND COMMUNITY] Activity comments unavailable:",
          activityLoadError
        );
        setRecentComments([]);
      }

      // Comments are deliberately optional. A comments-table issue must never
      // take the Community feed, 3D previews, likes or Remix offline.
      try {
        const nextCommentRows =
          await listCommunityCommentCounts();
        setCommentRows(nextCommentRows);
      } catch (commentCountError) {
        console.warn(
          "[BEYOND COMMUNITY] Comment counts unavailable:",
          commentCountError
        );
        setCommentRows([]);
      }
    } catch (loadError) {
      console.error("[BEYOND COMMUNITY] Load failed:", loadError);
      setError("Beyond Community could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

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
    if (!viewerItem) {
      setPublicationEditing(false);
      return;
    }

    const permissions = communityPermissions(viewerItem);
    setPublicationEditing(false);
    setPublicationTitle(viewerItem.title || "");
    setPublicationDescription(viewerItem.description || "");
    setPublicationTags((viewerItem.tags || []).join(", "));
    setPublicationAllowRemix(permissions.allowRemix);
    setPublicationAllowComments(permissions.allowComments);
    setPublicationAllowUseForPrint(permissions.allowUseForPrint);
  }, [viewerItem?.id]);

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

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setActivitySeenAt(0);
      setActivityOpen(false);
      return;
    }

    const stored = Number(
      window.localStorage.getItem(
        `beyond-community-activity-seen:${userId}`
      ) || 0
    );

    setActivitySeenAt(Number.isFinite(stored) ? stored : 0);
  }, [session?.user?.id]);

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

  const savedByMe = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return new Set();

    return new Set(
      saves
        .filter((save) => save.user_id === userId)
        .map((save) => save.item_id)
    );
  }, [saves, session?.user?.id]);

  const followingCreatorIds = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return new Set();

    return new Set(
      follows
        .filter((follow) => follow.follower_id === userId)
        .map((follow) => follow.creator_user_id)
    );
  }, [follows, session?.user?.id]);

  const activityItems = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return [];

    const myItems = items.filter((item) => item.user_id === userId);
    const myItemById = new Map(myItems.map((item) => [item.id, item]));
    const nameByUserId = new Map();

    items.forEach((item) => {
      if (item.user_id && item.creator_name && !nameByUserId.has(item.user_id)) {
        nameByUserId.set(item.user_id, item.creator_name);
      }
    });

    const events = [];

    likes.forEach((like) => {
      const item = myItemById.get(like.item_id);
      if (!item || like.user_id === userId) return;

      events.push({
        id: `like:${like.item_id}:${like.user_id}:${like.created_at || ""}`,
        type: "like",
        createdAt: like.created_at,
        actorUserId: like.user_id,
        actorName: nameByUserId.get(like.user_id) || "A Community member",
        item,
        title: "liked your creation",
        detail: item.title || "Untitled Creation",
      });
    });

    recentComments.forEach((comment) => {
      const item = myItemById.get(comment.item_id);
      if (!item || comment.user_id === userId) return;

      events.push({
        id: `comment:${comment.id}`,
        type: "comment",
        createdAt: comment.created_at,
        actorUserId: comment.user_id,
        actorName: comment.creator_name || nameByUserId.get(comment.user_id) || "A Community member",
        item,
        title: "commented on your creation",
        detail: String(comment.body || "").trim(),
      });
    });

    follows.forEach((follow) => {
      if (follow.creator_user_id !== userId) return;

      events.push({
        id: `follow:${follow.follower_id}:${follow.created_at || ""}`,
        type: "follow",
        createdAt: follow.created_at,
        actorUserId: follow.follower_id,
        actorName: nameByUserId.get(follow.follower_id) || "A Community member",
        item: null,
        title: "started following you",
        detail: "",
      });
    });

    return events
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 40);
  }, [
    session?.user?.id,
    items,
    likes,
    recentComments,
    follows,
  ]);

  const unreadActivityCount = useMemo(() => {
    if (!activitySeenAt) return activityItems.length;

    return activityItems.filter(
      (entry) =>
        new Date(entry.createdAt || 0).getTime() > activitySeenAt
    ).length;
  }, [activityItems, activitySeenAt]);

  function markActivityRead() {
    const userId = session?.user?.id;
    if (!userId) return;

    const now = Date.now();
    setActivitySeenAt(now);
    window.localStorage.setItem(
      `beyond-community-activity-seen:${userId}`,
      String(now)
    );
  }

  function toggleActivity() {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setActivityOpen((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(markActivityRead, 120);
      }
      return next;
    });
  }

  function openActivityEntry(entry) {
    setActivityOpen(false);

    if (entry.item) {
      setCreatorProfileUserId(null);
      setViewerItem(entry.item);
      return;
    }

    if (entry.actorUserId) {
      const actorItem = items.find(
        (item) => item.user_id === entry.actorUserId
      );

      if (actorItem) {
        openCreatorProfile(actorItem);
      }
    }
  }

  const visibleItems = useMemo(() => {
    let next = [...items];

    if (filter === "saved") {
      next = next.filter((item) => savedByMe.has(item.id));
    } else if (filter === "following") {
      next = next.filter((item) =>
        followingCreatorIds.has(item.user_id)
      );
    } else if (filter === "creator") {
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

    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      next = next.filter((item) => {
        const searchable = [
          item.title,
          item.description,
          item.creator_name,
          ...(Array.isArray(item.tags) ? item.tags : []),
          item.source_type === "ai_model" ? "AI Created" : "Creator",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      });
    }

    return next;
  }, [
    filter,
    items,
    likeCountByItem,
    followingCreatorIds,
    savedByMe,
    searchQuery,
  ]);

  // ========================================================
  // BEYOND COMMUNITY FEATURED HOMEPAGE
  // ========================================================

  const featuredPositionByItem =
    useMemo(() => {
      const map = new Map();

      featuredRows.forEach(
        (row) => {
          map.set(
            row.item_id,
            Number(
              row.position
            )
          );
        }
      );

      return map;
    }, [featuredRows]);


  const featuredItems =
    useMemo(() => {
      const byId =
        new Map(
          items.map(
            (item) => [
              item.id,
              item,
            ]
          )
        );

      return [...featuredRows]
        .sort(
          (a, b) =>
            Number(a.position) -
            Number(b.position)
        )
        .map(
          (row) =>
            byId.get(
              row.item_id
            )
        )
        .filter(Boolean)
        .slice(0, 3);
    }, [
      items,
      featuredRows,
    ]);


  const displayItems =
    communityExpanded
      ? visibleItems
      : featuredItems;


  const creatorProfileItems = useMemo(() => {
    if (!creatorProfileUserId) return [];
    return items.filter(
      (item) => item.user_id === creatorProfileUserId
    );
  }, [creatorProfileUserId, items]);

  const creatorProfileStats = useMemo(() => {
    const creationIds = new Set(
      creatorProfileItems.map((item) => item.id)
    );

    return {
      creations: creatorProfileItems.length,
      likes: likes.filter((like) => creationIds.has(like.item_id)).length,
      comments: commentRows.filter((row) => creationIds.has(row.item_id)).length,
      followers: follows.filter(
        (follow) => follow.creator_user_id === creatorProfileUserId
      ).length,
    };
  }, [
    creatorProfileItems,
    creatorProfileUserId,
    likes,
    commentRows,
    follows,
  ]);

  const creatorProfileName =
    creatorProfileItems[0]?.creator_name ||
    "BEYOND Creator";

  const creatorProfileIsMe =
    Boolean(
      creatorProfileUserId &&
        creatorProfileUserId === session?.user?.id
    );

  const creatorProfileFollowed =
    Boolean(
      creatorProfileUserId &&
        followingCreatorIds.has(creatorProfileUserId)
    );

  function changeFilter(nextFilter) {
    if (["following", "saved"].includes(nextFilter) && !session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setFilter(nextFilter);
  }

  async function toggleCreatorFollow() {
    if (!creatorProfileUserId) return;

    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    if (creatorProfileIsMe) return;

    setFollowBusyUserId(creatorProfileUserId);

    try {
      const nowFollowing = await setCommunityFollow({
        creatorUserId: creatorProfileUserId,
        userId: session.user.id,
        following: creatorProfileFollowed,
      });

      setFollows((current) => {
        const withoutCurrent = current.filter(
          (follow) =>
            !(
              follow.follower_id === session.user.id &&
              follow.creator_user_id === creatorProfileUserId
            )
        );

        if (!nowFollowing) return withoutCurrent;

        return [
          ...withoutCurrent,
          {
            follower_id: session.user.id,
            creator_user_id: creatorProfileUserId,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (followError) {
      console.error("[BEYOND COMMUNITY] Follow failed:", followError);
      setError(
        followError?.message ||
          "Could not update this creator follow."
      );
    } finally {
      setFollowBusyUserId(null);
    }
  }

  function openCreatorProfile(item) {
    if (!item?.user_id) return;
    setViewerItem(null);
    setCreatorProfileUserId(item.user_id);
  }

  async function savePublicationSettings(event) {
    event?.preventDefault?.();

    if (!viewerItem || !session?.user?.id) return;

    setPublicationSaving(true);
    setError("");

    try {
      const updated = await updateCommunityPublication({
        item: viewerItem,
        userId: session.user.id,
        title: publicationTitle,
        description: publicationDescription,
        tags: publicationTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        allowRemix: publicationAllowRemix,
        allowComments: publicationAllowComments,
        allowUseForPrint: publicationAllowUseForPrint,
      });

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );
      setViewerItem(updated);
      setPublicationEditing(false);
    } catch (publicationError) {
      console.error(
        "[BEYOND COMMUNITY] Publication update failed:",
        publicationError
      );
      setError(
        publicationError?.message ||
          "Could not update this Community publication."
      );
    } finally {
      setPublicationSaving(false);
    }
  }

  async function removePublicationFromCommunity() {
    if (!viewerItem || !session?.user?.id) return;

    const confirmed = window.confirm(
      `Remove “${viewerItem.title || "this creation"}” from Beyond Community? Your original project/model will not be deleted.`
    );

    if (!confirmed) return;

    setPublicationSaving(true);

    try {
      await unpublishCommunitySource({
        userId: session.user.id,
        sourceType: viewerItem.source_type,
        sourceId: viewerItem.source_id,
      });

      setItems((current) =>
        current.filter((item) => item.id !== viewerItem.id)
      );
      setViewerItem(null);
    } catch (publicationError) {
      setError(
        publicationError?.message ||
          "Could not remove this Community publication."
      );
    } finally {
      setPublicationSaving(false);
    }
  }

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

  async function toggleSave(item) {
    if (!session?.user?.id) {
      onRequireAuth?.();
      return;
    }

    setBusyId(`save:${item.id}`);

    try {
      const wasSaved = savedByMe.has(item.id);
      const nowSaved = await setCommunitySave({
        itemId: item.id,
        userId: session.user.id,
        saved: wasSaved,
      });

      setSaves((current) => {
        const withoutCurrent = current.filter(
          (save) =>
            !(
              save.item_id === item.id &&
              save.user_id === session.user.id
            )
        );

        if (!nowSaved) return withoutCurrent;

        return [
          ...withoutCurrent,
          {
            item_id: item.id,
            user_id: session.user.id,
            created_at: new Date().toISOString(),
          },
        ];
      });
    } catch (saveError) {
      console.error("[BEYOND COMMUNITY] Save failed:", saveError);
      setError(saveError?.message || "Could not save this creation.");
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

  async function toggleCommunityFeatured(
    item
  ) {
    if (
      !isAdmin ||
      !session?.user?.id ||
      !item?.id
    ) {
      return;
    }

    const existingPosition =
      featuredPositionByItem.get(
        item.id
      );

    setBusyId(
      `feature:${item.id}`
    );

    setError("");

    try {
      if (existingPosition) {
        await removeCommunityFeatured({
          itemId: item.id,
        });
      } else {
        const occupied =
          new Set(
            featuredRows.map(
              (row) =>
                Number(
                  row.position
                )
            )
          );

        const nextPosition =
          [1, 2, 3].find(
            (position) =>
              !occupied.has(
                position
              )
          );

        if (!nextPosition) {
          throw new Error(
            "You already have 3 highlighted models. Remove one first."
          );
        }

        await setCommunityFeatured({
          itemId: item.id,
          position:
            nextPosition,
          userId:
            session.user.id,
        });
      }

      const nextFeatured =
        await listCommunityFeatured();

      setFeaturedRows(
        nextFeatured
      );
    } catch (
      featureError
    ) {
      console.error(
        "[BEYOND COMMUNITY] Feature update failed:",
        featureError
      );

      setError(
        featureError?.message ||
          "Could not update Community highlights."
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
    <section
      className={`beyond-community ${
        communityExpanded
          ? "is-expanded"
          : "is-compact"
      }`}
      id="community"
    >
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
              ["following", "Following"],
              ["saved", "Saved"],
              ["creator", "Creator"],
              ["ai", "AI Created"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => changeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="community-toolbar-actions">
            <label className="community-search">
              <Search size={14} strokeWidth={1.45} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search creations, creators, tags…"
                aria-label="Search Beyond Community"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear Community search"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              )}
            </label>

            <button
              type="button"
              className={`community-activity-button ${
                activityOpen ? "active" : ""
              }`}
              onClick={toggleActivity}
              aria-label="Community activity"
              aria-expanded={activityOpen}
            >
              <Bell size={15} strokeWidth={1.45} />
              {unreadActivityCount > 0 && (
                <span className="community-activity-badge">
                  {unreadActivityCount > 9 ? "9+" : unreadActivityCount}
                </span>
              )}
            </button>

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
        </div>

        {activityOpen && (
          <div className="community-activity-panel">
            <div className="community-activity-head">
              <div>
                <span>YOUR COMMUNITY</span>
                <strong>Activity</strong>
              </div>

              <button
                type="button"
                onClick={markActivityRead}
                disabled={!activityItems.length}
              >
                <CheckCheck size={14} strokeWidth={1.5} />
                Mark read
              </button>
            </div>

            {!activityItems.length ? (
              <div className="community-activity-empty">
                <Bell size={22} strokeWidth={1.25} />
                <strong>No activity yet</strong>
                <span>Likes, comments and new followers will appear here.</span>
              </div>
            ) : (
              <div className="community-activity-list">
                {activityItems.map((entry) => {
                  const unread =
                    new Date(entry.createdAt || 0).getTime() > activitySeenAt;

                  return (
                    <button
                      type="button"
                      className={`community-activity-row ${
                        unread ? "unread" : ""
                      }`}
                      key={entry.id}
                      onClick={() => openActivityEntry(entry)}
                    >
                      <span className={`community-activity-icon ${entry.type}`}>
                        {entry.type === "like" ? (
                          <Heart size={14} strokeWidth={1.5} fill="currentColor" />
                        ) : entry.type === "comment" ? (
                          <MessageCircle size={14} strokeWidth={1.5} />
                        ) : (
                          <UserPlus size={14} strokeWidth={1.5} />
                        )}
                      </span>

                      <span className="community-activity-copy">
                        <strong>{entry.actorName}</strong>
                        <span>{entry.title}</span>
                        {entry.detail && <small>{entry.detail}</small>}
                      </span>

                      <time>
                        {formatCommunityDate(entry.createdAt)}
                      </time>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!loading && searchQuery.trim() && (
          <div className="community-search-summary">
            <strong>{visibleItems.length}</strong>
            <span>result{visibleItems.length === 1 ? "" : "s"} for “{searchQuery.trim()}”</span>
          </div>
        )}

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
        ) : !displayItems.length ? (
          <div className="community-empty">
            <Sparkles size={32} strokeWidth={1.15} />

            <strong>
              {searchQuery.trim()
                ? "No matching creations."
                : filter === "following"
                  ? "Your Following feed is empty."
                  : filter === "saved"
                    ? "You have no saved creations yet."
                    : "No creations here yet."}
            </strong>

            <span>
              {searchQuery.trim()
                ? "Try another title, creator name, or tag."
                : filter === "following"
                  ? "Open a creator profile and follow them to build your personal feed."
                  : filter === "saved"
                    ? "Use the bookmark button on any Community creation to keep it here for later."
                    : "Open My Projects or My Models and choose Share to Beyond Community."}
            </span>
          </div>
        ) : (
          <div className="community-grid">
            {displayItems.map((item) => {
              const liked = likedByMe.has(item.id);
              const saved = savedByMe.has(item.id);
              const likeCount = likeCountByItem.get(item.id) || 0;
              const commentCount = commentCountByItem.get(item.id) || 0;
              const isAi = item.source_type === "ai_model";
              const permissions = communityPermissions(item);

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
                      <button
                        type="button"
                        className="community-creator-link"
                        onClick={() => openCreatorProfile(item)}
                      >
                        <UserRound size={11} strokeWidth={1.5} />
                        BY {item.creator_name || "BEYOND CREATOR"}
                      </button>

                      <span>
                        {formatCommunityDate(item.created_at)}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        className={`community-feature-control ${
                          featuredPositionByItem.has(item.id)
                            ? "active"
                            : ""
                        }`}
                        disabled={
                          busyId ===
                          `feature:${item.id}`
                        }
                        onClick={() =>
                          toggleCommunityFeatured(
                            item
                          )
                        }
                      >
                        {featuredPositionByItem.has(item.id)
                          ? `FEATURED ${featuredPositionByItem.get(item.id)}`
                          : "HIGHLIGHT"}
                      </button>
                    )}

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

                      <button
                        type="button"
                        className={`community-save ${saved ? "saved" : ""}`}
                        onClick={() => toggleSave(item)}
                        disabled={busyId === `save:${item.id}`}
                        aria-label={saved ? "Remove from saved creations" : "Save creation"}
                        title={saved ? "Saved" : "Save for later"}
                      >
                        <Bookmark
                          size={15}
                          strokeWidth={1.5}
                          fill={saved ? "currentColor" : "none"}
                        />
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

                          {permissions.allowRemix && (
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
                          )}
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

                          {permissions.allowRemix && (
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
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="community-show-more-wrap">

          {!communityExpanded &&
            featuredItems.length === 0 && (
              <span className="community-featured-empty-note">
                No highlighted creations selected yet.
              </span>
            )}

          <button
            type="button"
            className="community-show-more"
            onClick={() => {
              setCommunityExpanded(
                (current) =>
                  !current
              );

              if (
                communityExpanded
              ) {
                setFilter("new");
                setSearchQuery("");
                setActivityOpen(false);
              }
            }}
          >
            {communityExpanded
              ? "Show less"
              : "Show more"}

            <span>
              {communityExpanded
                ? "↑"
                : "→"}
            </span>
          </button>

          {isAdmin &&
            !communityExpanded && (
              <small>
                ADMIN · Open all models to manage highlights
              </small>
            )}

        </div>

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
                  <button
                    type="button"
                    className="community-viewer-creator-link"
                    onClick={() => openCreatorProfile(viewerItem)}
                  >
                    By {viewerItem.creator_name || "BEYOND Creator"}
                  </button>
                  <span> · {viewerItem.source_type === "ai_model" ? "AI-generated public 3D preview" : "Read-only public preview"}</span>
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

                  <button
                    type="button"
                    className={savedByMe.has(viewerItem.id) ? "saved" : ""}
                    onClick={() => toggleSave(viewerItem)}
                    disabled={busyId === `save:${viewerItem.id}`}
                    aria-label={savedByMe.has(viewerItem.id) ? "Remove from saved creations" : "Save creation"}
                  >
                    <Bookmark
                      size={15}
                      strokeWidth={1.5}
                      fill={savedByMe.has(viewerItem.id) ? "currentColor" : "none"}
                    />
                    {savedByMe.has(viewerItem.id) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>

              <div className="community-detail-meta">
                <button
                  type="button"
                  className="community-creator-link community-detail-creator-link"
                  onClick={() => openCreatorProfile(viewerItem)}
                >
                  <UserRound size={11} strokeWidth={1.5} />
                  BY {viewerItem.creator_name || "BEYOND CREATOR"}
                </button>
                <span>
                  {viewerItem.source_type === "ai_model" ? "AI CREATED" : "CREATOR PROJECT"}
                </span>
                <span>{formatCommunityDate(viewerItem.created_at)}</span>

                {viewerItem.user_id === session?.user?.id && (
                  <button
                    type="button"
                    className="community-publication-edit-trigger"
                    onClick={() => setPublicationEditing((value) => !value)}
                  >
                    <Settings2 size={12} strokeWidth={1.5} />
                    {publicationEditing ? "Close settings" : "Edit publication"}
                  </button>
                )}
              </div>

              {publicationEditing &&
                viewerItem.user_id === session?.user?.id && (
                <form
                  className="community-publication-editor"
                  onSubmit={savePublicationSettings}
                >
                  <div className="community-publication-editor-head">
                    <div>
                      <span>PUBLICATION SETTINGS</span>
                      <strong>Control how your creation appears and can be reused.</strong>
                    </div>
                  </div>

                  <label>
                    <span>TITLE</span>
                    <input
                      value={publicationTitle}
                      onChange={(event) => setPublicationTitle(event.target.value.slice(0, 90))}
                      maxLength={90}
                    />
                  </label>

                  <label>
                    <span>DESCRIPTION</span>
                    <textarea
                      value={publicationDescription}
                      onChange={(event) => setPublicationDescription(event.target.value.slice(0, 500))}
                      rows={4}
                      maxLength={500}
                      placeholder="Tell the Community what you made, how you made it, or what inspired it."
                    />
                  </label>

                  <label>
                    <span>TAGS · COMMA SEPARATED</span>
                    <input
                      value={publicationTags}
                      onChange={(event) => setPublicationTags(event.target.value)}
                      placeholder="architecture, organizer, prototype"
                    />
                  </label>

                  <div className="community-publication-toggles">
                    <label>
                      <input
                        type="checkbox"
                        checked={publicationAllowRemix}
                        onChange={(event) => setPublicationAllowRemix(event.target.checked)}
                      />
                      <span>
                        <strong>Allow Remix</strong>
                        <small>Other users can make their own editable copy.</small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={publicationAllowComments}
                        onChange={(event) => setPublicationAllowComments(event.target.checked)}
                      />
                      <span>
                        <strong>Allow Discussion</strong>
                        <small>Community members can comment on this creation.</small>
                      </span>
                    </label>

                    {viewerItem.source_type === "ai_model" && (
                      <label>
                        <input
                          type="checkbox"
                          checked={publicationAllowUseForPrint}
                          onChange={(event) => setPublicationAllowUseForPrint(event.target.checked)}
                        />
                        <span>
                          <strong>Allow Use for Print</strong>
                          <small>Visitors can send this AI creation into the BEYOND print flow.</small>
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="community-publication-editor-actions">
                    <button
                      type="button"
                      className="community-publication-remove"
                      onClick={removePublicationFromCommunity}
                      disabled={publicationSaving}
                    >
                      Remove from Community
                    </button>

                    <button
                      type="submit"
                      className="community-primary-action"
                      disabled={publicationSaving || !publicationTitle.trim()}
                    >
                      {publicationSaving ? "Saving…" : "Save publication"}
                    </button>
                  </div>
                </form>
              )}

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

              {communityPermissions(viewerItem).allowComments ? (
                <>
                  <div className="community-comments-head">
                    <div>
                      <span>DISCUSSION</span>
                      <strong>
                        {commentCountByItem.get(viewerItem.id) || 0} comments
                      </strong>
                    </div>
                  </div>

                  <form
                    className="community-comment-form"
                    onSubmit={submitComment}
                  >
                    <label className="community-comment-compose-label">
                      WRITE A COMMENT
                    </label>

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
                </>
              ) : (
                <div className="community-discussion-disabled">
                  <MessageCircle size={17} strokeWidth={1.4} />
                  Discussion is disabled by the creator for this publication.
                </div>
              )}
            </div>

            <div className="community-viewer-footer">
              {viewerItem.source_type === "ai_model" ? (
                <>
                  <div>
                    <strong>
                      Want to change this AI creation?
                    </strong>

                    <span>
                      Remix opens the published AI mesh in Studio as an editable copy. The Community original stays unchanged.
                    </span>
                  </div>

                  <div className="community-viewer-actions">
                    {communityPermissions(viewerItem).allowUseForPrint && (
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
                    )}

                    {communityPermissions(viewerItem).allowRemix && (
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
                    )}
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

                  {communityPermissions(viewerItem).allowRemix ? (
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
                  ) : (
                    <span className="community-remix-disabled-note">
                      Remix disabled by creator
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {creatorProfileUserId && (
        <div
          className="community-profile-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${creatorProfileName} Community profile`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCreatorProfileUserId(null);
            }
          }}
        >
          <div className="community-profile-modal">
            <div className="community-profile-header">
              <div className="community-profile-avatar">
                {creatorProfileName.slice(0, 1).toUpperCase()}
              </div>

              <div className="community-profile-copy">
                <span>BEYOND CREATOR PROFILE</span>
                <h3>{creatorProfileName}</h3>
                <p>
                  Public creations shared with Beyond Community.
                </p>
              </div>

              {creatorProfileIsMe ? (
                <span className="community-own-profile-badge">
                  <UserCheck size={14} strokeWidth={1.5} />
                  YOUR PROFILE
                </span>
              ) : (
                <button
                  type="button"
                  className={`community-follow-button ${
                    creatorProfileFollowed ? "following" : ""
                  }`}
                  onClick={toggleCreatorFollow}
                  disabled={followBusyUserId === creatorProfileUserId}
                >
                  {creatorProfileFollowed ? (
                    <UserCheck size={15} strokeWidth={1.5} />
                  ) : (
                    <UserPlus size={15} strokeWidth={1.5} />
                  )}
                  {followBusyUserId === creatorProfileUserId
                    ? "Updating…"
                    : creatorProfileFollowed
                      ? "Following"
                      : "Follow"}
                </button>
              )}

              <button
                type="button"
                className="community-profile-close"
                onClick={() => setCreatorProfileUserId(null)}
                aria-label="Close creator profile"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="community-profile-stats">
              <div>
                <strong>{creatorProfileStats.creations}</strong>
                <span>Creations</span>
              </div>
              <div>
                <strong>{creatorProfileStats.likes}</strong>
                <span>Likes</span>
              </div>
              <div>
                <strong>{creatorProfileStats.comments}</strong>
                <span>Comments</span>
              </div>
              <div>
                <strong>{creatorProfileStats.followers}</strong>
                <span>Followers</span>
              </div>
            </div>

            <div className="community-profile-creations">
              {creatorProfileItems.map((item) => (
                <button
                  type="button"
                  className="community-profile-creation"
                  key={`profile-${item.id}`}
                  onClick={() => {
                    setCreatorProfileUserId(null);
                    setViewerItem(item);
                  }}
                >
                  <div className="community-profile-creation-preview">
                    {item.source_type === "ai_model" ? (
                      item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" />
                      ) : (
                        <Sparkles size={30} strokeWidth={1.1} />
                      )
                    ) : (
                      <CommunityCardProjectPreview item={item} />
                    )}
                  </div>

                  <span>
                    {item.source_type === "ai_model" ? "AI CREATED" : "CREATOR"}
                  </span>
                  <strong>{item.title || "Untitled Creation"}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default BeyondCommunity;
