/* ======================================================================
   BEYOND CREATOR — OPENCASCADE LOADER
   TEMPORARY DEPLOY-SAFE FALLBACK

   Native OpenCascade loading is intentionally disabled for now.
   SketchWorkspace will automatically continue with the mesh/CSG fallback.
   We will restore the BRep loader when development resumes.
   ====================================================================== */

let initPromise = null;

export function initializeBeyondOpenCascade() {
  if (initPromise) return initPromise;

  initPromise = Promise.reject(
    new Error("OpenCascade temporarily disabled — mesh fallback active")
  );

  return initPromise;
}

export function resetBeyondOpenCascade() {
  initPromise = null;
}