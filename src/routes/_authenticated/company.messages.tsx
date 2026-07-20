import { createFileRoute } from "@tanstack/react-router";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/messages")({
  head: () => ({ meta: [{ title: "Messages — Company Portal" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { loading, company, reload } = useMoverPortal();
  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;
  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <div className="card-premium p-10 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif text-xl">Messages</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Conversations with broker and customer arrive in Phase 5C.
        </p>
      </div>
    </div>
  );
}
