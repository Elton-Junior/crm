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
import { cn } from "@/lib/utils";

import { searchClients } from "../actions";

type ClientOption = { id: string; name: string };

export function ClientCombobox({
  value,
  selectedName,
  onChange,
}: {
  value: string;
  selectedName: string | null;
  onChange: (client: ClientOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();

    // Todo setState acontece dentro do callback do timeout (assíncrono),
    // nunca direto no corpo do effect — ver nota equivalente no
    // ClientEditSheet sobre a regra react-hooks/set-state-in-effect.
    const timeout = setTimeout(() => {
      if (!trimmed) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      searchClients(trimmed).then((result) => {
        setResults(result.ok ? result.data : []);
        setIsSearching(false);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

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
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? (selectedName ?? "Cliente selecionado") : "Selecionar cliente..."}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente..."
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
              Remover cliente vinculado
            </button>
          ) : null}
          {isSearching ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Buscando...</p>
          ) : results.length === 0 && query.trim() ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            results.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(client);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn("size-4", value === client.id ? "opacity-100" : "opacity-0")}
                />
                {client.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
