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
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        lobby: "lobby.html", // thêm entry mới
      },
    },
  },
});
