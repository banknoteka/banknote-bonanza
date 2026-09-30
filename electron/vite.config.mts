// Standalone SPA build used only for the Windows desktop (.exe) package.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  base: "./",
  publicDir: path.resolve(__dirname, "../public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  build: { outDir: path.resolve(__dirname, "../electron-dist"), emptyOutDir: true },
});
