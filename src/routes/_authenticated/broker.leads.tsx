import { createFileRoute } from "@tanstack/react-router";
import { BrokerLeadsWorkspace } from "@/components/broker/BrokerLeadsWorkspace";

export const Route = createFileRoute("/_authenticated/broker/leads")({
  head: () => ({ meta: [{ title: "Broker leads — Easy Move Pro" }] }),
  component: BrokerLeadsWorkspace,
});
