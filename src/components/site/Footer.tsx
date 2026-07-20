import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <span className="font-serif text-xl font-semibold text-primary">Easy Moving</span>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The AI-powered moving marketplace. Instant quotes, vetted movers, and a calmer relocation.
            </p>
          </div>
          <FooterCol title="Platform" items={[["Calculator", "/calculator"], ["Services", "/services"], ["City Pages", "/cities"], ["Digital Store", "/store"]]} />
          <FooterCol title="For Movers" items={[["Partners", "/partners"], ["Moving Leads", "/moving-leads"], ["Exclusive Leads", "/exclusive-moving-leads"], ["CRM", "/moving-company-crm"], ["Software", "/moving-company-software"], ["Join Easy Moving", "/join"]]} />
          <FooterCol title="Company" items={[["About", "/about"], ["Blog", "/blog"], ["Contact", "/contact"]]} />
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Easy Moving Logistics. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Serving all 50 states.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2">
        {items.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
