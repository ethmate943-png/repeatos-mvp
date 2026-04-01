import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RepeatOSWidget",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
