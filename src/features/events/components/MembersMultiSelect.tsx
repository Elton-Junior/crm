"use client";

import { useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Member = { id: string; full_name: string | null };

export function MembersMultiSelect({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  const label =
    value.length === 0
      ? "Selecionar participantes..."
      : `${value.length} participante${value.length > 1 ? "s" : ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
            {label}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <div className="max-h-56 overflow-y-auto">
          {members.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhum membro na organização.
            </p>
          ) : (
            members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={value.includes(member.id)}
                  onChange={() => toggle(member.id)}
                  className="size-4 rounded border-input"
                />
                {member.full_name ?? "Sem nome"}
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
