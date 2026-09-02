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
      .then(payload => active && setState({ status: "ready", payload, error: "" }))
      .catch(error => active && setState({ status: "error", payload: null, error: error?.message || "Menu unavailable" }));
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (state.status !== "ready") return;
    void recordMenuAnalyticsEvent({
      slug: state.payload?.slug || slug,
      type: "menu_view",
      language: state.payload?.menu?.default_language || "",
    });
  }, [slug, state.status, state.payload?.slug, state.payload?.menu?.default_language]);

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
