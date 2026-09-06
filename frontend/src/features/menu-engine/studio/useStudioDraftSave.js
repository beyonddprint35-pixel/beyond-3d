import { useEffect, useRef, useState } from "react";
import { readMenuStudioV2Draft, writeMenuStudioV2Draft } from "./menuStudioV2Session";

const LANGUAGES = ["en", "he", "ar"];

function text(value) {
  return value == null ? "" : String(value);
}

function localized(value) {
  return value && typeof value === "object" ? value : {};
}

function clearOtherLanguages(value, sourceLanguage) {
  const next = { ...localized(value) };
  LANGUAGES.forEach((language) => {
    if (language !== sourceLanguage) next[language] = "";
  });
  return next;
}

function entryMap(list = []) {
  return new Map((Array.isArray(list) ? list : []).map((entry) => [entry?.id, entry]));
}

function invalidateChangedPrimaryTranslations(previousDraft, nextDraft) {
  if (!previousDraft?.menu || !nextDraft?.menu) return nextDraft;
  const sourceLanguage = LANGUAGES.includes(nextDraft.contentLanguage)
    ? nextDraft.contentLanguage
    : LANGUAGES.includes(nextDraft.menu.default_language)
      ? nextDraft.menu.default_language
      : "en";

  const previousGroups = entryMap(previousDraft.menu.groups);
  const previousItems = entryMap(previousDraft.menu.items);
  let changed = false;

  const groups = (nextDraft.menu.groups || []).map((group) => {
    const previous = previousGroups.get(group.id);
    if (!previous) return group;
    let next = group;
    for (const field of ["name", "note"]) {
      const before = text(localized(previous[field])[sourceLanguage]);
      const after = text(localized(group[field])[sourceLanguage]);
      if (before !== after) {
        next = { ...next, [field]: clearOtherLanguages(group[field], sourceLanguage) };
        changed = true;
      }
    }
    return next;
  });

  const items = (nextDraft.menu.items || []).map((item) => {
    const previous = previousItems.get(item.id);
    if (!previous) return item;
    let next = item;
    for (const field of ["name", "description"]) {
      const before = text(localized(previous[field])[sourceLanguage]);
      const after = text(localized(item[field])[sourceLanguage]);
      if (before !== after) {
        next = { ...next, [field]: clearOtherLanguages(item[field], sourceLanguage) };
        changed = true;
      }
    }
    return next;
  });

  if (!changed) return nextDraft;
  return {
    ...nextDraft,
    menu: {
      ...nextDraft.menu,
      groups,
      items,
    },
    profile: {
      ...(nextDraft.profile || {}),
      aiTranslationsReady: false,
    },
  };
}

function prepareFreshDraft(draft) {
  return invalidateChangedPrimaryTranslations(readMenuStudioV2Draft(), draft);
}

function writePreparedDraft(draft) {
  return writeMenuStudioV2Draft(draft);
}

function replaceObjectContents(target, source) {
  if (!target || typeof target !== "object" || !source || typeof source !== "object") return;
  Object.keys(target).forEach((key) => {
    if (!(key in source)) delete target[key];
  });
  Object.entries(source).forEach(([key, value]) => {
    target[key] = value;
  });
}

export function useStudioDraftFlush(draft) {
  const latest = useRef(draft);
  latest.current = prepareFreshDraft(draft);
  useEffect(() => {
    const flush = (event) => {
      const saved = writePreparedDraft(latest.current);
      if (event?.detail && !saved) event.detail.saved = false;
    };
    window.addEventListener("beyond-menu-studio-flush-draft", flush);
    return () => window.removeEventListener("beyond-menu-studio-flush-draft", flush);
  }, []);
}

export default function useStudioDraftSave(draft) {
  useStudioDraftFlush(draft);
  const liveDraft = useRef(draft);
  liveDraft.current = draft;
  const latest = useRef(draft);
  latest.current = prepareFreshDraft(draft);
  const [state, setState] = useState("saved");
  const [, forceTranslationSync] = useState(0);
  const { menu, design, designId, profile, contentLanguage } = draft;

  useEffect(() => {
    const applyTranslations = (event) => {
      const translatedMenu = event?.detail?.menu;
      const liveMenu = liveDraft.current?.menu;
      if (!translatedMenu || !liveMenu) return;
      replaceObjectContents(liveMenu, translatedMenu);
      latest.current = {
        ...latest.current,
        menu: liveMenu,
        profile: {
          ...(latest.current?.profile || {}),
          ...(event?.detail?.profile || {}),
        },
      };
      forceTranslationSync((current) => current + 1);
    };

    window.addEventListener("beyond-menu-translations-applied", applyTranslations);
    return () => window.removeEventListener("beyond-menu-translations-applied", applyTranslations);
  }, []);

  useEffect(() => {
    setState("saving");
    const timer = window.setTimeout(() => setState(writePreparedDraft(latest.current) ? "saved" : "error"), 350);
    return () => window.clearTimeout(timer);
  }, [menu, design, designId, profile, contentLanguage]);
  return state;
}
