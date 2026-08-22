// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Server routes need non-VITE_ env vars in process.env. Treat checked-in env
// files as local defaults only: deployment-provided values must always win.
const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
    define: {
      __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__: JSON.stringify(
        process.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
          process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
          process.env.GOOGLE_MAPS_BROWSER_KEY ||
          ""
      ),
      __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__: JSON.stringify(
        process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ||
          process.env.GOOGLE_MAPS_TRACKING_ID ||
          ""
      ),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
