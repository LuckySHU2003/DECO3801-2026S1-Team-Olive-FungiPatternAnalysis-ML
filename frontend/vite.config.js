// Vite build and dev server configuration
// Enables React fast refresh plugin and the "@" path alias pointing to ./src
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // "@/components/ui/button" → "./src/components/ui/button"
      "@": path.resolve(__dirname, "./src"),
    },
  },
});