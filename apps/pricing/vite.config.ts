import path from "path";
import {fileURLToPath} from "url";
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(root, "../.."),
  resolve: {
    alias: {
      "@": root,
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 3001,
    host: true,
  },
});
