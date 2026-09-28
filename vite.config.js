import { defineConfig } from "vite";
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/tests/**", "**/artifacts/**"] },
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { three: ["three"], icons: ["lucide"] } },
    },
  },
});
