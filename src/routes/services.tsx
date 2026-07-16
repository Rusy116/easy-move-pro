import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Truck, Warehouse, Wrench, Piano, Route as RouteIcon, ShieldCheck, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

const SERVICES = [
  { icon: Truck, title: "Local moves", copy: "Same-city moves with hourly transparent pricing.", tag: "From $500" },
  { icon: RouteIcon, title: "Long-distance", copy: "Interstate moves with locked flat rates and GPS tracking.", tag: "From $1,800" },
  { icon: Boxes, title: "Full-service packing", copy: "Certified crews, premium materials, room-by-room inventory.", tag: "Add-on" },
  { icon: Warehouse, title: "Storage", copy: "Climate-controlled short & long-term storage nationwide.", tag: "Add-on" },
  { icon: Wrench, title: "Furniture assembly", copy: "IKEA, West Elm, custom pieces — we handle it.", tag: "Add-on" },
  { icon: Piano, title: "Heavy & specialty", copy: "Pianos, safes, gym equipment, art. Insured and specialized.", tag: "Add-on" },
  { icon: ShieldCheck, title: "Licensed & insured", copy: "Every partner mover is DOT-licensed and fully insured.", tag: "Included" },
  { icon: Sparkles, title: "AI move manager", copy: "Automated checklists, address changes, and utility set-up.", tag: "Included" },
];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Moving Services — Easy Moving" },
      { name: "description", content: "Local moves, long-distance moves, packing, storage, assembly, heavy items, and AI-powered move management." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">What we do</span>
          <h1 className="mt-3 font-serif text-5xl font-medium">Everything a move needs.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Mix and match services. Every quote itemizes exactly what's included — no surprise line items.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {s.tag}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card p-10 text-center">
          <h2 className="font-serif text-3xl font-medium">See prices for your move</h2>
          <p className="mt-3 text-muted-foreground">Get an instant, itemized estimate in 30 seconds.</p>
          <div className="mt-6">
            <Link to="/calculator">
              <Button size="lg" className="rounded-full">Get Instant Quote</Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
