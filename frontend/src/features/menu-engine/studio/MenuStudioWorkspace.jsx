import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { draftFromMenuStudioProject, loadMenuStudioProject, menuStudioProjectId, setActiveMenuStudioProjectId } from "./menuStudioV2Persistence";
import { listMenuStudioProjectSummaries } from "./menuStudioProjectIndex";
import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "./menuStudioV2Session";
import { MenuStudioWorkspaceContext } from "./menuStudioWorkspaceContext";
import "./MenuDesignAdvancedClarity.css";

// This cache lives only while Studio is open. The project index is deliberately
// lightweight; full menu payloads are fetched only for the menu being opened.
export default function MenuStudioWorkspace({ children }) {
  const [cache] = useState(() => ({ projects: null, request: null, drafts: new Map(), draftRequests: new Map(), preparedId: "", contentReady: new Set(), epoch: 0 }));
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
        cache.draftRequests.clear();
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
      cache.request = listMenuStudioProjectSummaries().then((projects) => {
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
      const localDraft = readMenuStudioV2Draft();
      const draft = cache.drafts.get(id)
        || (menuStudioProjectId(localDraft) === id ? localDraft : null);
      if (!draft || !writeMenuStudioV2Draft(draft, { queueSave: false })) return false;
      cache.drafts.set(id, draft);
      cache.preparedId = id;
      setActiveMenuStudioProjectId(id);
      return true;
    },

    async prepareDraft(id) {
      if (!id) return null;

      const localDraft = readMenuStudioV2Draft();
      const cachedDraft = cache.drafts.get(id)
        || (menuStudioProjectId(localDraft) === id ? localDraft : null);
      if (cachedDraft?.menu) {
        cache.drafts.set(id, cachedDraft);
        writeMenuStudioV2Draft(cachedDraft, { queueSave: false });
        cache.preparedId = id;
        setActiveMenuStudioProjectId(id);
        return cachedDraft;
      }

      if (cache.draftRequests.has(id)) return cache.draftRequests.get(id);
      const epoch = cache.epoch;
      const request = loadMenuStudioProject(id).then((project) => {
        if (epoch !== cache.epoch) throw new Error("The Studio account changed.");
        const draft = draftFromMenuStudioProject(project);
        if (!draft?.menu) throw new Error("This menu could not be opened.");
        cache.drafts.set(id, draft);
        if (!writeMenuStudioV2Draft(draft, { queueSave: false })) throw new Error("This menu could not be prepared.");
        cache.preparedId = id;
        setActiveMenuStudioProjectId(id);
        return draft;
      }).finally(() => {
        if (epoch === cache.epoch) cache.draftRequests.delete(id);
      });
      cache.draftRequests.set(id, request);
      return request;
    },

    isPrepared(id) {
      return Boolean(id && cache.preparedId === id && menuStudioProjectId(readMenuStudioV2Draft()) === id);
    },
    isContentReady: (id) => cache.contentReady.has(id),
    markContentReady: (id) => { if (id) cache.contentReady.add(id); },
  }), [cache]);

  return <MenuStudioWorkspaceContext.Provider value={workspace}><Fragment key={accountRevision}>{children}</Fragment></MenuStudioWorkspaceContext.Provider>;
}
