import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { US_STATES, stateName } from "@/lib/us-states";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

/** Searchable US state picker — always usable, even when auto-detection fails. */
export function StateSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="State"
          className={cn(
            "h-10 w-full justify-between px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value ? value : "Select state"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search state…" />
          <CommandList>
            <CommandEmpty>No state found.</CommandEmpty>
            <CommandGroup>
              {US_STATES.map((s) => (
                <CommandItem
                  key={s.code}
                  value={`${s.name} ${s.code}`}
                  onSelect={() => {
                    onChange(s.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === s.code ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { stateName };
