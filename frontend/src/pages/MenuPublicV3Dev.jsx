import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { loadResilientPublishedMenu } from "../features/menu-engine/data/publishedMenuRepository";
import { recordMenuAnalyticsEvent } from "../features/menu-engine/analytics/menuAnalytics";

export default function MenuPublicV3Dev() {
  const { slug = "" } = useParams();
  const [state, setState] = useState({ status: "loading", payload: null, error: "" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", payload: null, error: "" });

    loadResilientPublishedMenu(slug)
      .then(async (payload) => {
        if (!active) return;
        setState({ status: "ready", payload, error: "" });

        // A customer menu view belongs to the public menu load itself. Keeping
        // this here (rather than in a second render effect) makes analytics
        // reliable across V3 snapshots, migrated legacy menus and local Vite
        // testing. The database RPC deduplicates repeat views per session.
        const recorded = await recordMenuAnalyticsEvent({
          slug: payload?.slug || slug,
          type: "menu_view",
          language: payload?.menu?.default_language || "",
        });

        if (import.meta.env.DEV && !recorded) {
          console.warn("Public menu loaded, but its analytics view was not recorded.", {
            slug: payload?.slug || slug,
            source: payload?.source || "unknown",
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        setState({ status: "error", payload: null, error: error?.message || "Menu unavailable" });
      });

    return () => { active = false; };
  }, [slug]);

  const handleAnalyticsEvent = useCallback((event) => {
    void recordMenuAnalyticsEvent({
      slug: state.payload?.slug || slug,
      ...event,
    });
  }, [slug, state.payload?.slug]);

  if (state.status === "loading") return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui"}}>Loading menu…</div>;
  if (state.status === "error") return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui"}}>Menu temporarily unavailable.</div>;

  return <MenuRenderer menu={state.payload.menu} design={state.payload.designSettings} onAnalyticsEvent={handleAnalyticsEvent} />;
}
