import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {studioCockpitPlugin} from "./src/viteCockpit";

export default defineConfig({
  plugins: [react(), studioCockpitPlugin()],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    sourcemap: true,
  },
});
