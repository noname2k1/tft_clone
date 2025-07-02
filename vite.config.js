import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~/": `${path.resolve(__dirname)}/`,
      "~~/": `${path.resolve(__dirname, "assets/scripts")}/`,
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
});
