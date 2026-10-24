import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PinFlow dev-szerver és build konfiguráció.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4190,
    strictPort: false,
  },
});
