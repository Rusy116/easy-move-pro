import { CheckCircle2, XCircle, Shield, X, Lightbulb, Phone } from "lucide-react";
import type { InsuranceTier } from "@/lib/pricing-engine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface InsuranceDetails {
  tier: InsuranceTier;
  title: string;
  tagline: string;
  price: string;
  covered: string[];
  notCovered: string[];
  maxReimbursement: string;
  deductible: string;
  example: string;
  recommendedFor: string[];
}

export const INSURANCE_DETAILS: Record<InsuranceTier, InsuranceDetails> = {
  basic: {
    tier: "basic",
    title: "Basic Coverage",
    tagline: "Included with every move — legal minimum liability",
    price: "Included (Free)",
    covered: [
      "Loss or damage caused by the moving crew",
      "Reimbursement at $0.60 per pound per item",
      "Standard household goods during transport",
    ],
    notCovered: [
      "Actual replacement value of damaged items",
      "High-value items (art, electronics, jewelry)",
      "Items packed by the customer",
      "Damage from natural disasters or third parties",
    ],
    maxReimbursement: "$0.60 per pound per item",
    deductible: "None",
    example:
      "A 100 lb sofa damaged during the move would be reimbursed up to $60 under Basic Coverage.",
    recommendedFor: [
      "Local moves",
      "Budget moves",
      "Older furniture",
      "Customers who do not need additional protection",
    ],
  },
  standard: {
    tier: "standard",
    title: "Standard Coverage",
    tagline: "Full replacement up to your declared value",
    price: "≈ 0.6% of declared value",
    covered: [
      "Repair or cash reimbursement up to declared value",
      "Damage caused by the moving crew or during transport",
      "Standard furniture, appliances, and boxes",
    ],
    notCovered: [
      "Extraordinary-value items not listed on the inventory",
      "Items packed by the customer (unless the box shows damage)",
      "Cash, deeds, and important documents",
    ],
    maxReimbursement: "Up to your declared value (typically $6 per lb)",
    deductible: "$250",
    example:
      "A $2,000 TV damaged during the move would be repaired or reimbursed at full value, minus a $250 deductible.",
    recommendedFor: [
      "Most household moves",
      "Long-distance moves",
      "Moves with newer furniture and appliances",
      "Customers who want solid protection at a fair price",
    ],
  },
  full: {
    tier: "full",
    title: "Full Value Protection",
    tagline: "Repair, replace, or reimburse at full value",
    price: "≈ 1.4% of declared value",
    covered: [
      "Repair to original condition",
      "Replacement with a like item",
      "Cash settlement at full current market value",
      "High-value items listed on the inventory",
    ],
    notCovered: [
      "Extraordinary-value items not disclosed before the move",
      "Perishables and hazardous materials",
      "Pre-existing damage",
    ],
    maxReimbursement: "Full declared value with no per-pound cap",
    deductible: "$0 (waived)",
    example:
      "A $3,500 antique dresser damaged during the move would be repaired or fully replaced at market value — no deductible.",
    recommendedFor: [
      "High-value households",
      "Long-distance and interstate moves",
      "Antiques, art, and irreplaceable items",
      "Customers who want maximum peace of mind",
    ],
  },
};

function ModalBody({ d }: { d: InsuranceDetails }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Price */}
      <section className="rounded-xl border border-border/60 bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Price
        </div>
        <div className="mt-1 text-lg font-semibold">{d.price}</div>
      </section>

      {/* Covered — green */}
      <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          What's Covered
        </h4>
        <ul className="space-y-1.5">
          {d.covered.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✅</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Not covered — red */}
      <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-700 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          What's NOT Covered
        </h4>
        <ul className="space-y-1.5">
          {d.notCovered.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-0.5 text-red-600 dark:text-red-400">❌</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Max reimbursement + deductible */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Maximum Reimbursement
          </div>
          <div className="mt-0.5 text-sm font-medium">{d.maxReimbursement}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Deductible
          </div>
          <div className="mt-0.5 text-sm font-medium">{d.deductible}</div>
        </div>
      </div>

      {/* Example */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h4 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          <Lightbulb className="h-4 w-4" />
          Example
        </h4>
        <p className="text-sm text-foreground/90">{d.example}</p>
      </section>

      {/* Recommended for — blue */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
          <CheckCircle2 className="h-4 w-4" />
          Recommended For
        </h4>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {d.recommendedFor.map((r) => (
            <li key={r} className="flex gap-2 text-sm">
              <span className="mt-0.5 text-sky-600 dark:text-sky-400">✅</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Help box */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Phone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Need help choosing?</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Our moving specialist can explain the differences and recommend the best
              protection for your move.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

interface Props {
  tier: InsuranceTier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tier: InsuranceTier) => void;
}

export function InsuranceInfoModal({ tier, open, onOpenChange, onSelect }: Props) {
  const isMobile = useIsMobile();
  if (!tier) return null;
  const d = INSURANCE_DETAILS[tier];

  const handleSelect = () => {
    onSelect(tier);
    onOpenChange(false);
    toast.success(`${d.title} selected`, { icon: "✓" });
  };

  const Header = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-serif text-2xl font-medium tracking-tight">{d.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>
      </div>
    </div>
  );

  const Actions = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      <Button onClick={handleSelect} className="gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Select This Coverage
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[94vh]">
          <div className="relative flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              {Header}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <ModalBody d={d} />
            </div>
            <div className="border-t bg-background px-4 py-3">{Actions}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        )}
      >
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle className="font-serif text-2xl font-medium tracking-tight">
            {d.title}
          </DialogTitle>
          <DialogDescription>{d.tagline}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5">
          <ModalBody d={d} />
        </div>
        <DialogFooter className="border-t bg-background px-6 py-3 sm:justify-end">
          {Actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
