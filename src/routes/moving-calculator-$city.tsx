import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/moving-calculator-$city")({
  component: () => <div>city test</div>,
});
