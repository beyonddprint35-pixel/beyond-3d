import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devPort = 5174;
const codespacesHost =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-${devPort}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: devPort,
    strictPort: true,
    allowedHosts: codespacesHost ? [codespacesHost] : [],
  },

  optimizeDeps: {
    exclude: ["opencascade.js"],
  },
});
