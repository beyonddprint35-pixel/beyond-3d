import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Copy,
  Heart,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  listCommunityItems,
  listCommunityLikes,
  remixCommunityProject,
  setCommunityLike,
} from "../lib/communityStore";

import "./BeyondCommunity.css";

function formatCommunityDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  const likeCountByItem = useMemo(() => {
    const map = new Map();
    likes.forEach((like) => {
      map.set(like.item_id, (map.get(like.item_id) || 0) + 1);
    });
    return map;
  }, [likes]);

  const likedByMe = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return new Set();
    return new Set(
      likes
        .filter((like) => like.user_id === userId)
        .map((like) => like.item_id)
    );
  }, [likes, session?.user?.id]);

  const visibleItems = useMemo(() => {
    let next = [...items];

    if (filter === "creator") {
      next = next.filter((item) => item.source_type === "project");
    } else if (filter === "ai") {
      next = next.filter((item) => item.source_type === "ai_model");
    } else if (filter === "popular") {
      next.sort(
        (a, b) =>
          (likeCountByItem.get(b.id) || 0) -
            (likeCountByItem.get(a.id) || 0) ||
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
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
      <div className="community-side-label">COMMUNITY</div>

      <div className="community-heading">
        <div>
          <div className="community-index">04 / BEYOND COMMUNITY</div>
          <h2>
            Made by people.
            <br />
            <span>Shared beyond.</span>
          </h2>
        </div>

        <p>
          Discover objects created in BEYOND Creator and BEYOND AI Studio.
          Like ideas, use AI creations, or remix editable projects into your own workspace.
        </p>
      </div>

      <div className="community-toolbar">
        <div className="community-filters" role="tablist" aria-label="Community filters">
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

      {error && <div className="community-error">{error}</div>}

      {loading ? (
        <div className="community-loading">
          <RefreshCw size={22} strokeWidth={1.35} />
          Loading Beyond Community…
        </div>
      ) : !visibleItems.length ? (
        <div className="community-empty">
          <Sparkles size={32} strokeWidth={1.15} />
          <strong>No creations here yet.</strong>
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
              <article className="community-card" key={item.id}>
                <div className="community-card-preview">
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

                  <span className={`community-type ${isAi ? "ai" : "creator"}`}>
                    {isAi ? "AI CREATED" : "CREATOR"}
                  </span>
                </div>

                <div className="community-card-body">
                  <div className="community-card-kicker">
                    <span>BY {item.creator_name || "BEYOND CREATOR"}</span>
                    <span>{formatCommunityDate(item.created_at)}</span>
                  </div>

                  <h3>{item.title || "Untitled Creation"}</h3>

                  {item.description && <p>{item.description}</p>}

                  {!!item.tags?.length && (
                    <div className="community-tags">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span key={`${item.id}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="community-card-actions">
                    <button
                      type="button"
                      className={`community-like ${liked ? "liked" : ""}`}
                      onClick={() => toggleLike(item)}
                      disabled={busyId === `like:${item.id}`}
                    >
                      <Heart size={15} strokeWidth={1.55} fill={liked ? "currentColor" : "none"} />
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
                      <button
                        type="button"
                        className="community-primary-action"
                        onClick={() => remixProject(item)}
                        disabled={busyId === `remix:${item.id}`}
                      >
                        <Copy size={14} strokeWidth={1.45} />
                        {busyId === `remix:${item.id}` ? "Remixing…" : "Remix in Creator"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BeyondCommunity;
