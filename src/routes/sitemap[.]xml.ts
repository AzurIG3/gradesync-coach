import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://sophia-odyssey.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/subjects", changefreq: "weekly", priority: "0.8" },
          { path: "/schedule", changefreq: "daily", priority: "0.8" },
          { path: "/progress", changefreq: "weekly", priority: "0.7" },
          { path: "/notes", changefreq: "weekly", priority: "0.8" },
          { path: "/assistant", changefreq: "weekly", priority: "0.8" },
          { path: "/timer", changefreq: "monthly", priority: "0.6" },
          { path: "/settings", changefreq: "monthly", priority: "0.4" },
        ];
        const urls = entries.map((e) =>
          `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
