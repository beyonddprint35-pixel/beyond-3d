/* ======================================================================
   BEYOND CREATOR — CAD KERNEL RUNTIME V23
   ----------------------------------------------------------------------
   A tiny dependency-free runtime router between SketchWorkspace and a
   future BRep/WASM backend (OpenCascade, occt-wasm, server kernel, etc.).

   Important design rule:
   - SketchWorkspace renders synchronously.
   - A WASM backend must finish initializing BEFORE it is registered.
   - Once registered, buildPreview()/topology() must be synchronous.
   - Advanced modeling commands may be async.

   This keeps the existing mesh/CSG preview as a safe fallback while giving
   Beyond one stable kernel contract for the rest of the app.
   ====================================================================== */

export const CAD_KERNEL_API_VERSION = 2;

const EMPTY_CAPABILITIES = Object.freeze({
  persistentTopology: false,
  featureFaceSketching: false,
  stackedSameDirectionFeatures: false,
  exactFeatureEdgeFillet: false,
  shell: false,
  revolve: false,
  sweep: false,
  loft: false,
  planarBodyTransform: false,
  multiFaceSelection: false,
  constructionReferences: false,
  brep: false,
  stepExport: false,
  nativePrism: false,
  nativeBoolean: false,
  nativeTessellation: false,
  nativeFillet: false,
  nativeChamfer: false,
  nativeShell: false,
  nativeRevolve: false,
  nativeSweep: false,
  nativeLoft: false,
});

function normalizeCapabilities(value = {}) {
  return { ...EMPTY_CAPABILITIES, ...value };
}

function backendLabel(backend) {
  return backend?.name || backend?.id || "Unnamed CAD kernel";
}

function validateBackend(backend) {
  if (!backend || typeof backend !== "object") {
    throw new Error("CAD kernel backend must be an object");
  }
  if (backend.apiVersion !== CAD_KERNEL_API_VERSION) {
    throw new Error(
      `CAD kernel API mismatch. Expected ${CAD_KERNEL_API_VERSION}, received ${backend.apiVersion ?? "none"}`
    );
  }
  if (typeof backend.buildPreview !== "function") {
    throw new Error("CAD kernel backend must implement buildPreview(draft)");
  }
  if (typeof backend.topology !== "function") {
    throw new Error("CAD kernel backend must implement topology(draft)");
  }
}

export function createCadKernelRuntime(fallbackBackend) {
  validateBackend(fallbackBackend);

  let activeBackend = null;
  const listeners = new Set();

  const notify = () => {
    const info = runtime.info();
    listeners.forEach((listener) => {
      try {
        listener(info);
      } catch (error) {
        console.warn("Beyond CAD kernel listener failed:", error);
      }
    });
  };

  const runtime = {
    apiVersion: CAD_KERNEL_API_VERSION,

    get backend() {
      return activeBackend || fallbackBackend;
    },

    info() {
      const backend = activeBackend || fallbackBackend;
      const capabilities = normalizeCapabilities(backend.capabilities);
      return {
        apiVersion: CAD_KERNEL_API_VERSION,
        id: backend.id || "mesh-preview",
        name: backendLabel(backend),
        mode: activeBackend ? "brep" : "fallback",
        connected: Boolean(activeBackend),
        capabilities,
      };
    },

    capabilities() {
      return this.info().capabilities;
    },

    supports(capability) {
      return Boolean(this.capabilities()[capability]);
    },

    register(backend) {
      validateBackend(backend);
      activeBackend = backend;
      notify();
      return this.info();
    },

    unregister() {
      activeBackend = null;
      notify();
      return this.info();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    buildPreview(draft) {
      const backend = activeBackend || fallbackBackend;
      try {
        return backend.buildPreview(draft);
      } catch (error) {
        if (backend !== fallbackBackend) {
          console.warn(
            `Beyond BRep kernel preview failed; using ${backendLabel(fallbackBackend)} instead:`,
            error
          );
          return fallbackBackend.buildPreview(draft);
        }
        throw error;
      }
    },

    topology(draft) {
      const backend = activeBackend || fallbackBackend;
      try {
        return backend.topology(draft);
      } catch (error) {
        if (backend !== fallbackBackend) {
          console.warn(
            `Beyond BRep topology failed; using ${backendLabel(fallbackBackend)} instead:`,
            error
          );
          return fallbackBackend.topology(draft);
        }
        throw error;
      }
    },

    async runTool(tool, context) {
      const backend = activeBackend;
      if (!backend) {
        return {
          ok: false,
          reason: "kernel-unavailable",
          message: `${tool} requires the BRep CAD kernel`,
        };
      }

      if (!this.supports(tool)) {
        return {
          ok: false,
          reason: "unsupported-capability",
          message: `${backendLabel(backend)} does not advertise ${tool} support`,
        };
      }

      if (typeof backend.runTool === "function") {
        return backend.runTool(tool, context);
      }

      if (typeof backend[tool] === "function") {
        return backend[tool](context);
      }

      return {
        ok: false,
        reason: "missing-command",
        message: `${backendLabel(backend)} advertises ${tool}, but no command handler is registered`,
      };
    },

    installGlobalBridge() {
      if (typeof window === "undefined") return;

      const bridge = {
        apiVersion: CAD_KERNEL_API_VERSION,
        register: (backend) => runtime.register(backend),
        unregister: () => runtime.unregister(),
        info: () => runtime.info(),
      };

      Object.defineProperty(window, "BeyondCadKernel", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: bridge,
      });
    },
  };

  return runtime;
}

/*
  Expected initialized BRep backend shape:

  window.BeyondCadKernel.register({
    apiVersion: 2,
    id: "opencascade-wasm",
    name: "OpenCascade BRep",
    capabilities: {
      persistentTopology: true,
      exactFeatureEdgeFillet: true,
      shell: true,
      revolve: true,
      sweep: true,
      loft: true,
      brep: true,
      stepExport: true,
    },
    buildPreview(draft) { return THREE.BufferGeometry; },
    topology(draft) { return [{ id, type, ... }]; },
    async runTool(tool, context) { return { ok: true, ... }; },
  });
*/