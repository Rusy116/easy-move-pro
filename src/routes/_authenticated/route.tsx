import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const AUTH_RESTORE_RETRY_DELAYS_MS = [0, 150, 350, 700, 1200];

function redirectPreviewProtectedRouteToSessionOrigin() {
  const previewMatch = window.location.host.match(/^id-preview--(.+)\.lovable\.app$/);
  if (!previewMatch) return null;

  return `https://${previewMatch[1]}.lovableproject.com${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function waitForAuthenticatedUser() {
  for (const delay of AUTH_RESTORE_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    // Prefer local session (from storage) to avoid transient network failures
    // bouncing an authenticated user back to /auth.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    // No local session — confirm with the server before redirecting.
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return data.user;
    }
  }

  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const previewSessionOrigin = redirectPreviewProtectedRouteToSessionOrigin();
    if (previewSessionOrigin) {
      window.location.replace(previewSessionOrigin);
      await new Promise<never>(() => {});
    }

    const user = await waitForAuthenticatedUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
