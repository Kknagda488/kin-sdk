import { defineConfig } from "tsup";

export default defineConfig([
  // 1. ESM/CJS Build (for React Apps)
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: false,
    sourcemap: true,
    clean: true,
    minify: true,
    external: ["react", "react-dom"],
    outDir: "dist",
    platform: 'browser'
  },
  // 2. IIFE Build (for CDN / Vanilla HTML)
  {
    entry: ["src/cdn.tsx"],
    format: ["iife"],
    globalName: "KinAI", // Exposes window.KinAI
    minify: true,
    sourcemap: true,
    clean: false, // Don't clean so it doesn't wipe the ESM build
    outDir: "dist/cdn",
    noExternal: [/.*/], // Bundle EVERYTHING including React for the standalone CDN version
    env: {
      NODE_ENV: 'production',
    },
    platform: 'browser'
  }
]);
