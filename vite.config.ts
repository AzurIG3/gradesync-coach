// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    optimizeDeps: {
      // Pre-bundle these so the dev optimizer never re-bundles mid-session, which
      // would swap React instances and cause "Invalid hook call" / null hook errors.
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "@tanstack/react-router",
        "@tanstack/router-core",
        "@tanstack/router-core/isServer",
        "@tanstack/router-core/ssr/client",
        "@tanstack/react-query",
        "seroval",
        // Heavy libs loaded lazily during note extraction. Without pre-bundling,
        // the first upload triggers a mid-session re-optimize + reload that can
        // leave a null React instance ("Cannot read properties of null").
        "xlsx",
        "mammoth/mammoth.browser.js",
        // Notes-only render dependencies must also be present before the first
        // navigation. Discovering them later makes Vite rebuild the dependency
        // graph while React is mounted, which can leave hooks on a stale copy.
        "recharts",
        "react-markdown",
        "remark-gfm",
        "remark-math",
        "rehype-katex",
        "react-katex",
        "katex",
      ],
    },
  },
});
