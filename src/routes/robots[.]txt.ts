import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { ENABLE_INDEXING } from "@/lib/seo-config";

const SITEMAP = "Sitemap: https://easymove.pro/sitemap.xml";

// Private, transactional and internal surfaces stay out of the index. Public
// SEO pages (home, services, states, counties, routes, cities, products,
// blog, city calculators) remain fully crawlable.
const ALLOW_BODY = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /dashboard
Disallow: /auth
Disallow: /company
Disallow: /broker
Disallow: /customer
Disallow: /ai
Disallow: /portal
Disallow: /quote
Disallow: /register-company
Disallow: /api/
Disallow: /search
Disallow: /*?

${SITEMAP}
`;

// Development posture: block every crawler until ENABLE_INDEXING is switched on.
const BLOCK_BODY = `User-agent: *
Disallow: /

${SITEMAP}
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(ENABLE_INDEXING ? ALLOW_BODY : BLOCK_BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
