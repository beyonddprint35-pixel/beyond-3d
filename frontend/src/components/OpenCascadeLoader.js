import openCascadeFactory from "opencascade.js/dist/opencascade.full.js";
import openCascadeWasmUrl from "opencascade.js/dist/opencascade.full.wasm?url";

import { createOpenCascadeKernelAdapter } from "./OpenCascadeKernelAdapter";

let initPromise = null;
let cachedOc = null;
let cachedAdapter = null;

export async function initializeBeyondOpenCascade(options = {}) {
  if (cachedOc && cachedAdapter) {
    return {
      oc: cachedOc,
      adapter: cachedAdapter,
      reused: true,
    };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const oc = await openCascadeFactory({
        locateFile(path) {
          if (path.endsWith(".wasm")) {
            return openCascadeWasmUrl;
          }

          return path;
        },
      });

      const adapter = createOpenCascadeKernelAdapter(oc, options);

      cachedOc = oc;
      cachedAdapter = adapter;

      return {
        oc,
        adapter,
        reused: false,
      };
    } catch (error) {
      console.error("[Beyond CAD] OpenCascade initialization failed:", error);

      initPromise = null;

      throw error;
    }
  })();

  return initPromise;
}

export function getBeyondOpenCascadeInstance() {
  return cachedOc;
}

export function getBeyondOpenCascadeAdapter() {
  return cachedAdapter;
}

export function resetBeyondOpenCascade() {
  cachedOc = null;
  cachedAdapter = null;
  initPromise = null;
}