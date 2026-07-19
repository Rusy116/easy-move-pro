import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between animate-fade-in-soft">
      <div className="flex min-w-0 items-center gap-4">
        {icon && (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sage to-ochre text-primary-foreground shadow-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ochre">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-1 truncate font-serif text-3xl font-medium md:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 justify-self-end">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "info" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    success: "text-emerald-700",
    warning: "text-amber-700",
    info: "text-sky-700",
    danger: "text-rose-700",
  };
  return (
    <div className="card-premium card-premium-hover p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className={`mt-2 font-serif text-2xl md:text-3xl font-medium tabular-nums ${tones[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SectionShell({
  title,
  right,
  children,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-premium p-4 sm:p-6">
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="font-serif text-lg font-medium tracking-tight">{title}</h2>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  );
}
