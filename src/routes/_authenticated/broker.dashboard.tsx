import { createFileRoute } from "@tanstack/react-router";
import { BrokerLeadsWorkspace } from "@/components/broker/BrokerLeadsWorkspace";

export const Route = createFileRoute("/_authenticated/broker/dashboard")({
  head: () => ({ meta: [{ title: "Broker dashboard — Easy Move Pro" }] }),
  component: BrokerLeadsWorkspace,
});
