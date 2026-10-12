import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.PORT || "5000";
  let clientPort = 5173;
  try {
    clientPort =
      Number(new URL(env.CLIENT_ORIGIN || "http://localhost:5173").port) ||
      5173;
  } catch {
    /* Backend reports invalid configuration. */
  }
  return {
    plugins: [react()],
    server: {
      port: clientPort,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}` },
    },
  };
});
