"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchDealsByClient } from "@/features/deals/actions";
import { cn } from "@/lib/utils";

type DealOption = { id: string; title: string };

export function DealCombobox({
  clientId,
  value,
  selectedTitle,
  onChange,
}: {
  clientId: string;
  value: string;
  selectedTitle: string | null;
  onChange: (deal: DealOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DealOption[]>([]);

  useEffect(() => {
    if (!open || !clientId) return;

    const timeout = setTimeout(() => {
      searchDealsByClient(clientId, query).then((result) => {
        setResults(result.ok ? result.data : []);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open, clientId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={!clientId}
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {!clientId
              ? "Selecione um cliente primeiro"
              : value
                ? (selectedTitle ?? "Proposta selecionada")
                : "Selecionar proposta (opcional)..."}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar proposta..."
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {value ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Remover proposta vinculada
            </button>
          ) : null}
          {results.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhuma proposta encontrada.
            </p>
          ) : (
            results.map((deal) => (
              <button
                key={deal.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(deal);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn("size-4", value === deal.id ? "opacity-100" : "opacity-0")}
                />
                {deal.title}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
