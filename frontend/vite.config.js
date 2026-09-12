import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devPort = 5174;
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "";

export default defineConfig({
  plugins: [react()],

  server: {
    // Listen on every interface so GitHub Codespaces can detect and forward
    // the dev server. Keep the development port fixed so we always know which
    // forwarded URL belongs to the active Beyond Menu Studio instance.
    host: "0.0.0.0",
    port: devPort,
    strictPort: true,
    // A Codespaces forwarded URL includes the port in the hostname.
    // Allow the Codespaces forwarding domain for the fixed development port.
    allowedHosts: codespacesForwardingDomain
      ? [`.${codespacesForwardingDomain}`]
      : [],
  },

  optimizeDeps: {
    exclude: ["opencascade.js"],
  },
});
