import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { draftFromMenuStudioProject, listMenuStudioProjects, menuStudioProjectId, setActiveMenuStudioProjectId } from "./menuStudioV2Persistence";
import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "./menuStudioV2Session";
import { MenuStudioWorkspaceContext } from "./menuStudioWorkspaceContext";
import "./MenuDesignAdvancedClarity.css";

// This cache lives only while Studio is open. A reload fetches fresh account data.
export default function MenuStudioWorkspace({ children }) {
  const [cache] = useState(() => ({ projects: null, request: null, drafts: new Map(), preparedId: "", contentReady: new Set(), epoch: 0 }));
  const [accountRevision, setAccountRevision] = useState(0);
  useEffect(() => {
    let owner;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextOwner = session?.user?.id || null;
      if (owner !== undefined && owner !== nextOwner) {
        cache.epoch += 1;
        cache.projects = null;
        cache.request = null;
        cache.drafts.clear();
        cache.contentReady.clear();
        cache.preparedId = "";
        setAccountRevision((value) => value + 1);
      }
      owner = nextOwner;
    });
    return () => subscription.unsubscribe();
  }, [cache]);

  const workspace = useMemo(() => ({
    cachedProjects: () => cache.projects || [],
    loadProjects() {
      if (cache.projects) return Promise.resolve(cache.projects);
      if (cache.request) return cache.request;
      const epoch = cache.epoch;
      cache.request = listMenuStudioProjects().then((projects) => {
        if (epoch !== cache.epoch) throw new Error("The Studio account changed.");
        cache.projects = projects;
        return projects;
      }).finally(() => { if (epoch === cache.epoch) cache.request = null; });
      return cache.request;
    },
    rememberDraft(draft) {
      const id = menuStudioProjectId(draft);
      if (id && draft?.menu) cache.drafts.set(id, draft);
    },
    activateDraft(id) {
      const draft = cache.drafts.get(id) || draftFromMenuStudioProject(cache.projects?.find((project) => project.id === id));
      if (!draft || !writeMenuStudioV2Draft(draft, { queueSave: false })) return false;
      cache.preparedId = id;
      setActiveMenuStudioProjectId(id);
      return true;
    },
    isPrepared(id) {
      return Boolean(id && cache.preparedId === id && menuStudioProjectId(readMenuStudioV2Draft()) === id);
    },
    isContentReady: (id) => cache.contentReady.has(id),
    markContentReady: (id) => { if (id) cache.contentReady.add(id); },
  }), [cache]);

  return <MenuStudioWorkspaceContext.Provider value={workspace}><Fragment key={accountRevision}>{children}</Fragment></MenuStudioWorkspaceContext.Provider>;
}
