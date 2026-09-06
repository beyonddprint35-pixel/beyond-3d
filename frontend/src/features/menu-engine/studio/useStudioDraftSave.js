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

export function useStudioDraftFlush(draft) {
  const latest = useRef(draft);
  latest.current = prepareFreshDraft(draft);
  useEffect(() => {
    const flush = (event) => {
      const prepared = latest.current;
      const saved = writePreparedDraft(prepared);
      if (event?.detail && !saved) event.detail.saved = false;
      if (saved && prepared?.menu) {
        window.dispatchEvent(new CustomEvent("beyond-menu-translations-applied", {
          detail: { menu: prepared.menu, profile: prepared.profile || {} },
        }));
      }
    };
    window.addEventListener("beyond-menu-studio-flush-draft", flush);
    return () => window.removeEventListener("beyond-menu-studio-flush-draft", flush);
  }, []);
}

export default function useStudioDraftSave(draft) {
  useStudioDraftFlush(draft);
  const latest = useRef(draft);
  latest.current = prepareFreshDraft(draft);
  const [state, setState] = useState("saved");
  const { menu, design, designId, profile, contentLanguage } = draft;

  useEffect(() => {
    setState("saving");
    const timer = window.setTimeout(() => setState(writePreparedDraft(latest.current) ? "saved" : "error"), 350);
    return () => window.clearTimeout(timer);
  }, [menu, design, designId, profile, contentLanguage]);
  return state;
}
