import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  build: {
    target: ["es2019", "safari14"],
  },
  plugins: [react()],
});
