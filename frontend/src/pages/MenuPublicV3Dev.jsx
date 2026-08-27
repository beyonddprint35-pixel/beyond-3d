import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MenuRenderer from "../features/menu-engine/renderer/MenuRenderer";
import { loadResilientPublishedMenu } from "../features/menu-engine/data/publishedMenuRepository";

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

  if (state.status === "loading") return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui"}}>Loading menu…</div>;
  if (state.status === "error") return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui"}}>Menu temporarily unavailable.</div>;

  return <MenuRenderer menu={state.payload.menu} design={state.payload.designSettings} />;
}
