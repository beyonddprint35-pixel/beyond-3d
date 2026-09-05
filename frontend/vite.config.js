import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devPort = 5174;
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "";

export default defineConfig({
  plugins: [react()],

  server: {
    // Listen on every interface so GitHub Codespaces can detect and forward
    // the dev server. Prefer 5174, but if an older Vite process still owns it,
    // automatically move to the next free port instead of exiting.
    host: "0.0.0.0",
    port: devPort,
    strictPort: false,
    // A Codespaces forwarded URL includes the actual port in the hostname.
    // Allow the whole forwarding domain so 5175/5176 etc. work too.
    allowedHosts: codespacesForwardingDomain
      ? [`.${codespacesForwardingDomain}`]
      : [],
  },

  optimizeDeps: {
    exclude: ["opencascade.js"],
  },
});
