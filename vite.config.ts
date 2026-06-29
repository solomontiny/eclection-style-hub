import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // 🚫 Force static build behavior (disable SSR pipeline output)
  tanstackStart: {
    ssr: false,
  },

  vite: {
    build: {
      outDir: "dist",
      emptyOutDir: true,

      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});