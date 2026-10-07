import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PREFIXES = [
  "/auth",
  "/plants",
  "/locations",
  "/asset-types",
  "/assets",
  "/maintenance-plans",
  "/work-orders",
  "/spare-parts",
  "/notifications",
  "/audit",
  "/health",
];

export default defineConfig({
  base: "/app/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      API_PREFIXES.map((p) => [
        p,
        { target: "http://localhost:3000", changeOrigin: true },
      ]),
    ),
  },
});
