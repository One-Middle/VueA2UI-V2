import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "A2UIRenderer",
      fileName: "index"
    },
    rollupOptions: {
      external: ["@a2ui-platform/shared"]
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"]
  }
});
