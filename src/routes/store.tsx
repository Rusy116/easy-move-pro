import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const productsQueryOptions = queryOptions({
  queryKey: ["digital_products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("digital_products")
      .select("*")
      .eq("published", true)
      .order("price_cents");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Digital Products Store — Easy Moving" },
      { name: "description", content: "Printable checklists, inventory trackers, and address-change kits to make your move effortless." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(productsQueryOptions);
  },
  component: StorePage,
});

function StorePage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Digital store</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Move like a pro.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Templates, trackers, and printable guides built by professional relocation coordinators.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div
                className="aspect-[4/3] rounded-xl"
                style={{ background: "linear-gradient(135deg, oklch(0.94 0.02 155), oklch(0.86 0.05 55))" }}
              />
              <h3 className="mt-6 font-serif text-2xl font-medium">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <div className="font-serif text-2xl">
                  ${(p.price_cents / 100).toFixed(2)}
                </div>
                <Button
                  className="rounded-full"
                  onClick={() => toast.info("Checkout coming soon — enable Stripe to accept payments.")}
                >
                  Buy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
