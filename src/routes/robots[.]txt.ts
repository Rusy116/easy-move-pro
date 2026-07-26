import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { ENABLE_INDEXING } from "@/lib/seo-config";

const ALLOW_BODY = `User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /admin
Disallow: /auth
`;

// Development posture: block every crawler until ENABLE_INDEXING is switched on.
const BLOCK_BODY = `User-agent: *
Disallow: /
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
