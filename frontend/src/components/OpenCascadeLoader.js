/* ======================================================================
   BEYOND CREATOR — OPENCASCADE LOADER V30
   ----------------------------------------------------------------------
   Vite-compatible OpenCascade loader.
   Loads the WASM binary as a URL instead of letting Vite parse it
   as a JavaScript/WebAssembly module.
   ====================================================================== */

import initOpenCascade from "opencascade.js/dist/opencascade.full.js";
import openCascadeWasmUrl from "opencascade.js/dist/opencascade.full.wasm?url";

import { createOpenCascadeKernelAdapter } from "./OpenCascadeKernelAdapter";

let initPromise = null;

export function initializeBeyondOpenCascade({
  fallbackBuildPreview,
  fallbackTopology,
} = {}) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const oc = await initOpenCascade({
      locateFile: (path) => {
        if (path.endsWith(".wasm")) {
          return openCascadeWasmUrl;
        }

        return path;
      },
    });

    const adapter = createOpenCascadeKernelAdapter(oc, {
      fallbackBuildPreview,
      fallbackTopology,
    });

    if (typeof window === "undefined" || !window.BeyondCadKernel) {
      throw new Error("BeyondCadKernel bridge is not installed yet");
    }

    window.BeyondCadKernel.register(adapter);

    return {
      oc,
      adapter,
    };
  })().catch((error) => {
    console.error("[BEYOND CAD] OpenCascade initialization failed:", error);

    initPromise = null;
    throw error;
  });

  return initPromise;
}