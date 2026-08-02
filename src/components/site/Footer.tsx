import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-1">
            <span className="font-serif text-xl font-semibold text-primary">{t("site.brand")}</span>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          <FooterCol
            title={t("footer.col.platform")}
            items={[
              [t("site.nav.calculator"), "/calculator"],
              [t("site.nav.services"), "/services"],
              [t("footer.link.aiTools"), "/ai-tools"],
              [t("footer.link.store"), "/store"],
              [t("common.search"), "/search"],
            ]}
          />
          <FooterCol
            title={t("footer.col.locations")}
            items={[
              [t("footer.link.states"), "/states"],
              [t("site.nav.cities"), "/cities"],
              [t("footer.link.routes"), "/routes"],
            ]}
          />
          <FooterCol
            title={t("footer.col.forMovers")}
            items={[
              [t("footer.link.join"), "/for-movers"],
              [t("footer.link.apply"), "/partners/apply"],
              [t("footer.link.movingLeads"), "/moving-leads"],
              [t("footer.link.exclusiveLeads"), "/exclusive-moving-leads"],
              [t("footer.link.crm"), "/moving-company-crm"],
              [t("footer.link.partners"), "/partners"],
            ]}
          />
          <FooterCol
            title={t("footer.col.company")}
            items={[
              [t("site.nav.about"), "/about"],
              [t("site.nav.blog"), "/blog"],
              [t("footer.link.resources"), "/resources"],
              [t("site.nav.contact"), "/contact"],
            ]}
          />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs text-muted-foreground">{t("footer.coverage")}</p>
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
            <Link
              to={to}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
