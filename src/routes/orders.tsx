import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOrderLinks } from "@/lib/store/order-lookup.functions";
import { useT } from "@/i18n";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Find my download — Easy Moving" },
      {
        name: "description",
        content:
          "Lost your Easy Moving download link? Enter the email you used at checkout and we'll resend your purchase links.",
      },
      { property: "og:title", content: "Find my download — Easy Moving" },
      {
        property: "og:description",
        content: "Resend the download links for your Easy Moving PDF purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderLookupPage,
});

function OrderLookupPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await requestOrderLinks({ data: { email: email.trim() } });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pub.orders.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-serif text-3xl">{t("pub.orders.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("pub.orders.subtitle")}
        </p>

        <form onSubmit={submit} className="card-premium mt-8 p-6">
          <Label htmlFor="lookup-email">{t("pub.orders.emailLabel")}</Label>
          <Input
            id="lookup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("pub.orders.emailPlaceholder")}
            autoComplete="email"
            required
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {message && (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full rounded-full"
            disabled={!valid || busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("pub.orders.resend")}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {t("pub.orders.haveAccount")}{" "}
          <Link to="/customer/library" className="underline">
            {t("pub.orders.openLibrary")}
          </Link>{" "}
          {t("pub.orders.anytime")}
        </p>
      </section>
    </SiteLayout>
  );
}
