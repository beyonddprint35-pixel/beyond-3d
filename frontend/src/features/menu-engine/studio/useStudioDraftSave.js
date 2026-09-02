import { useEffect, useRef, useState } from "react";
import { writeMenuStudioV2Draft } from "./menuStudioV2Session";

export function useStudioDraftFlush(draft) {
  const latest = useRef(draft);
  latest.current = draft;
  useEffect(() => {
    const flush = (event) => {
      const saved = writeMenuStudioV2Draft(latest.current);
      if (event?.detail && !saved) event.detail.saved = false;
    };
    window.addEventListener("beyond-menu-studio-flush-draft", flush);
    return () => window.removeEventListener("beyond-menu-studio-flush-draft", flush);
  }, []);
}

export default function useStudioDraftSave(draft) {
  useStudioDraftFlush(draft);
  const latest = useRef(draft);
  latest.current = draft;
  const [state, setState] = useState("saved");
  const { menu, design, designId, profile, contentLanguage } = draft;
  useEffect(() => {
    setState("saving");
    const timer = window.setTimeout(() => setState(writeMenuStudioV2Draft(latest.current) ? "saved" : "error"), 350);
    return () => window.clearTimeout(timer);
  }, [menu, design, designId, profile, contentLanguage]);
  return state;
}
