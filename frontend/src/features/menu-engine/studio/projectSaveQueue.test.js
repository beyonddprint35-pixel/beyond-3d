import test from "node:test";
import assert from "node:assert/strict";
import { createProjectSaveQueue } from "./projectSaveQueue.js";

test("edits to two menus both survive a rapid switch", async () => {
  const saved = [];
  const queue = createProjectSaveQueue({ save: async (draft) => saved.push(draft) });
  queue.enqueue("a", { projectId: "a", value: "old" });
  queue.enqueue("a", { projectId: "a", value: "latest" });
  queue.enqueue("b", { projectId: "b", value: "other" });
  await queue.flush();
  assert.deepEqual(saved, [{ projectId: "a", value: "latest" }, { projectId: "b", value: "other" }]);
});

test("a newer edit waits for an in-flight save and finishes last", async () => {
  const saved = [];
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const queue = createProjectSaveQueue({ save: async (draft) => { if (draft === 1) await pending; saved.push(draft); } });
  queue.enqueue("a", 1);
  const first = queue.flush("a");
  queue.enqueue("a", 2);
  const second = queue.flush("a");
  assert.deepEqual(saved, []);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(saved, [1, 2]);
});

test("a failed save blocks switching and can be retried without dropping edits", async () => {
  let fail = true;
  const saved = [];
  const queue = createProjectSaveQueue({ save: async (draft) => { if (fail) throw new Error("offline"); saved.push(draft); } });
  queue.enqueue("a", "unsaved");
  await assert.rejects(queue.flush("a"), /offline/);
  fail = false;
  await queue.flush("a");
  assert.deepEqual(saved, ["unsaved"]);
});
