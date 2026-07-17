import { CheckCircle2, XCircle, Shield } from "lucide-react";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

export interface InsuranceDetails {
  tier: InsuranceTier;
  title: string;
  tagline: string;
  price: string;
  covered: string[];
  notCovered: string[];
  claimProcess: string;
  maxReimbursement: string;
  deductible: string;
  recommendedFor: string;
}

export const INSURANCE_DETAILS: Record<InsuranceTier, InsuranceDetails> = {
  basic: {
    tier: "basic",
    title: "Basic Coverage",
    tagline: "Included with every move — legal minimum liability",
    price: "Included (free)",
    covered: [
      "Loss or damage caused by the moving crew during transport",
      "Reimbursement at $0.60 per pound per item, regardless of value",
    ],
    notCovered: [
      "Actual replacement value of damaged items",
      "High-value items (art, electronics, jewelry)",
      "Items packed by the customer",
      "Damage from natural disasters or third parties",
    ],
    claimProcess:
      "Submit a written claim within 9 months of delivery. Include photos, receipts, and the inventory sheet. Claims are typically resolved in 30–60 days.",
    maxReimbursement: "$0.60 per pound per item",
    deductible: "None",
    recommendedFor: "Budget moves with mostly low-value or replaceable items.",
  },
  standard: {
    tier: "standard",
    title: "Standard Coverage",
    tagline: "Full replacement up to your declared value",
    price: "~0.6% of declared value",
    covered: [
      "Repair or cash reimbursement up to declared value",
      "Damage caused by the moving crew or during transport",
      "Standard household furniture, appliances, and boxes",
    ],
    notCovered: [
      "Items of extraordinary value not listed on the high-value inventory",
      "Items packed by the customer unless there is external box damage",
      "Cash, deeds, or documents",
    ],
    claimProcess:
      "File a claim within 30 days of delivery through our claims portal. An adjuster reviews within 15 business days. Repairs are scheduled or a check is issued.",
    maxReimbursement: "Up to your declared value (typically $6 per lb)",
    deductible: "$250",
    recommendedFor: "Most households — the best balance of protection and cost.",
  },
  full: {
    tier: "full",
    title: "Full Value Protection",
    tagline: "Repair, replace, or reimburse at full value",
    price: "~1.4% of declared value",
    covered: [
      "Repair to original condition",
      "Replacement with a like item",
      "Cash settlement at full current market value",
      "High-value items when listed on the inventory",
    ],
    notCovered: [
      "Items of extraordinary value not disclosed before the move",
      "Perishables and hazardous materials",
      "Pre-existing damage",
    ],
    claimProcess:
      "File a claim within 60 days of delivery. Priority handling with an assigned claims specialist. Most claims resolve within 21 days.",
    maxReimbursement: "Full declared value with no per-pound cap",
    deductible: "$0 (waived)",
    recommendedFor:
      "High-value households, long-distance moves, and irreplaceable items.",
  },
};

function ModalBody({ d }: { d: InsuranceDetails }) {
  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Price
          </span>
        </div>
        <div className="mt-1 text-lg font-semibold">{d.price}</div>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What is covered
        </h4>
        <ul className="space-y-1.5">
          {d.covered.map((c) => (
            <li key={c} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What is not covered
        </h4>
        <ul className="space-y-1.5">
          {d.notCovered.map((c) => (
            <li key={c} className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label="Maximum reimbursement" value={d.maxReimbursement} />
        <InfoRow label="Deductible" value={d.deductible} />
      </div>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Claim process
        </h4>
        <p className="text-muted-foreground">{d.claimProcess}</p>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recommended for
        </h4>
        <p className="text-muted-foreground">{d.recommendedFor}</p>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
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
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-serif text-2xl">{d.title}</DrawerTitle>
            <DrawerDescription>{d.tagline}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">
            <ModalBody d={d} />
          </div>
          <DrawerFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleSelect} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Select This Coverage
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{d.title}</DialogTitle>
          <DialogDescription>{d.tagline}</DialogDescription>
        </DialogHeader>
        <ModalBody d={d} />
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSelect} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Select This Coverage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
