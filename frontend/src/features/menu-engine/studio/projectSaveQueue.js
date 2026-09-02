// Keep each menu's pending edits independent and serialize writes per project.
export function createProjectSaveQueue({ save, onState = () => {}, delay = 650 }) {
  const entries = new Map();

  async function flushProject(projectId) {
    const entry = entries.get(projectId);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    if (entry.running) await entry.running;
    if (!entry.pending) return;
    entry.running = (async () => {
      while (entry.pending) {
        const draft = entry.pending;
        entry.pending = null;
        try {
          const result = await save(draft);
          onState("saved", { projectId, updatedAt: result?.updated_at || null });
        } catch (error) {
          // Retain the failed draft unless newer edits have already replaced it.
          if (!entry.pending) entry.pending = draft;
          onState("error", { projectId, message: error?.message || "Cloud save failed." });
          throw error;
        }
      }
    })();
    try { await entry.running; } finally { entry.running = null; }
  }

  return {
    enqueue(projectId, draft) {
      const entry = entries.get(projectId) || { pending: null, timer: null, running: null };
      entries.set(projectId, entry);
      entry.pending = draft;
      clearTimeout(entry.timer);
      onState("saving", { projectId });
      entry.timer = setTimeout(() => { flushProject(projectId).catch(() => {}); }, delay);
    },
    async flush(projectId) {
      if (projectId) return flushProject(projectId);
      await Promise.all([...entries.keys()].map(flushProject));
    },
  };
}
