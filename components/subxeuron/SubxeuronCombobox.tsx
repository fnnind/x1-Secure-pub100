// ComboBox requires: shadcn PopOver and Command
// % pnpm dlx shadcn@latest add popover command
'use client'
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { AppSubxeuron } from "@/lib/supabase/types";

interface SubxeuronComboboxProps {
  subxeurons: AppSubxeuron[];
  defaultValue?: string;
}

export function SubxeuronCombobox({
  subxeurons,
  defaultValue = "",
}: SubxeuronComboboxProps) {

  const router = useRouter();
  const initialTitle = subxeurons.find((s) => s.slug === defaultValue)?.title ?? defaultValue;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialTitle);

  const handleSelect = (slug: string) => {
    const sub = subxeurons.find((s) => s.slug === slug);
    setValue(sub?.title ?? slug);
    setOpen(false);
    if (slug) router.push(`/create-post?subxeuron=${encodeURIComponent(slug)}`);
    else router.push(`/create-post`);
  };

  // popover with children
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justrify-between"
        >
          {value || "Select a subXeuron"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var-(--raidx-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search subXeuron..." />
          <CommandList>
            <CommandEmpty>No subxeuron found.</CommandEmpty>
            <CommandGroup>
              {subxeurons.map((subxeuron) => (
                <CommandItem
                  key={subxeuron._id}
                  value={subxeuron.slug}
                  onSelect={() => handleSelect(subxeuron.slug)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === subxeuron.title ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {subxeuron.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
