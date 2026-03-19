import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // PDF export is isolated behind a dynamic import, so a larger warning threshold
    // avoids noisy alerts for the export-only bundle while keeping the main app lean.
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-router-dom") || id.includes("react-router")) return "vendor-router";
          if (id.includes("@tanstack/")) return "vendor-tanstack";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("axios")) return "vendor-axios";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/auth": { target: "http://localhost:3000", changeOrigin: true },
      "/admin": { target: "http://localhost:3000", changeOrigin: true },
      "/device": { target: "http://localhost:3000", changeOrigin: true },
      "/health": { target: "http://localhost:3000", changeOrigin: true },
      "/events": { target: "http://localhost:3000", changeOrigin: true },
      "/trace": { target: "http://localhost:3000", changeOrigin: true },
      "/material-requests": { target: "http://localhost:3000", changeOrigin: true },
      "/realtime": { target: "http://localhost:3000", changeOrigin: true, ws: true },
      "/inventory": { target: "http://localhost:3000", changeOrigin: true },
      "/handover-batches": { target: "http://localhost:3000", changeOrigin: true },
      "/scan-sessions": { target: "http://localhost:3000", changeOrigin: true },
      "/labels": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  envDir: "../../", // Load .env from web root
});
