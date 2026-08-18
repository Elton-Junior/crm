"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { PERIOD_LABELS, type PeriodOption } from "../schema";

const PRESETS: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export function PeriodSelector({
  value,
  customFrom,
  customTo,
}: {
  value: PeriodOption;
  customFrom?: string;
  customTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(customFrom ?? "");
  const [to, setTo] = useState(customTo ?? "");

  function apply(period: PeriodOption, range?: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon />
          {PERIOD_LABELS[value]}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => apply(preset)}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent",
                value === preset && "font-semibold",
              )}
            >
              {PERIOD_LABELS[preset]}
              {value === preset ? <CheckIcon className="size-4" /> : null}
            </button>
          ))}
        </div>
        <div className="space-y-2 border-t p-3">
          <p className="text-xs font-medium text-muted-foreground">Customizado</p>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!from || !to}
            onClick={() => apply("custom", { from, to })}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
