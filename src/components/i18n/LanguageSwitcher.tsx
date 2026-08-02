import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LOCALE_LIST, useI18n } from "@/i18n";

/**
 * Top-bar language switcher. Changing the language updates the UI instantly
 * and persists the choice on the user's profile.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALE_LIST.find((l) => l.code === locale)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full gap-1.5 px-2.5"
          aria-label={t("common.language")}
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span aria-hidden>{current.flag}</span>
          {!compact && <span className="text-xs font-medium">{current.code.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LOCALE_LIST.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => setLocale(l.code)}
            className={l.code === locale ? "font-semibold" : undefined}
          >
            <span className="mr-2" aria-hidden>
              {l.flag}
            </span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
