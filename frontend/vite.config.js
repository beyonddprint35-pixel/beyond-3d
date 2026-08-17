import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function removeRemoteCityEnvironment() {
  return {
    name: "remove-remote-city-environment",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/components/BeyondCreator.jsx")) {
        return null;
      }

      let updated = code.replace(/^\s{2}Environment,\r?\n/m, "");

      updated = updated.replace(
        /\n\s*\{!flat2D && \(\s*<Environment\s+preset="city"\s+environmentIntensity=\{\s*0\.22\s*\}\s*\/>\s*\)\}/m,
        ""
      );

      if (updated === code) {
        return null;
      }

      return {
        code: updated,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [removeRemoteCityEnvironment(), react()],

  optimizeDeps: {
    exclude: ["opencascade.js"],
  },
});