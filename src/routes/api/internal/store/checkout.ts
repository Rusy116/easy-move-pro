// ---------------------------------------------------------------------------
// STEP K — Lovable-hosted privileged checkout endpoint.
//
// Runs inside the Lovable-managed runtime where the service-role credential
// for the authoritative backend exists. Narrowly scoped to Store checkout:
// it accepts product SLUGS and buyer contact details only — never table
// names, columns, SQL, prices or user ids.
//
// Authentication: HMAC-SHA256 over `timestamp.nonce.rawBody` using the
// server-only BRIDGE_SHARED_SECRET.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_ITEMS = 10;

const payloadSchema = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9-]+$/).max(100)).min(1).max(MAX_ITEMS),
  email: z.string().email().max(160),
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).default(""),
  returnUrl: z.string().url().max(500),
  environment: z.enum(["live", "sandbox"]),
});

export const Route = createFileRoute("/api/internal/store/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBridgeRequest, BRIDGE_HEADERS } = await import(
          "@/lib/store/bridge.server"
        );

        const verified = await verifyBridgeRequest(request);
        if (!verified.ok) {
          console.warn("[store-bridge] rejected request:", verified.reason);
          return Response.json({ error: "Unauthorized" }, { status: verified.status });
        }

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(verified.rawBody));
        } catch {
          return Response.json({ error: "Invalid checkout request" }, { status: 400 });
        }

        // Buyer identity is derived from a verified access token only; the
        // payload can never assert a user id.
        const buyerToken = request.headers.get(BRIDGE_HEADERS.buyerToken);
        const { resolveBuyerUserIdFromToken } = await import("@/lib/store/buyer.server");
        const userId = await resolveBuyerUserIdFromToken(buyerToken);

        const { runStoreCheckout } = await import("@/lib/store/checkout-core.server");
        const result = await runStoreCheckout(
          {
            slugs: parsed.slugs,
            email: parsed.email.trim().toLowerCase(),
            firstName: parsed.firstName.trim(),
            lastName: parsed.lastName.trim(),
            returnUrl: parsed.returnUrl,
            environment: parsed.environment,
          },
          userId,
        );

        return Response.json(result, { status: 200 });
      },
    },
  },
});
