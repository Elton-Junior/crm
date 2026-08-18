"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseIcon,
  FileTextIcon,
  Loader2Icon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { GlobalSearchResult } from "@/server/search";

import { globalSearch } from "../actions";

const EMPTY_RESULT: GlobalSearchResult = { clients: [], deals: [], contracts: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult>(EMPTY_RESULT);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) return;

    const timeout = setTimeout(() => {
      setIsSearching(true);
      globalSearch(term).then((result) => {
        setResults(result.ok ? result.data : EMPTY_RESULT);
        setIsSearching(false);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const hasQuery = query.trim() !== "";
  const hasResults =
    results.clients.length > 0 || results.deals.length > 0 || results.contracts.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-3.5" />
        Buscar
        <kbd className="ml-2 rounded border bg-muted px-1.5 text-[10px]">⌘K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar clientes, propostas ou contratos..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Buscando...
            </div>
          )}

          {!isSearching && hasQuery && !hasResults && (
            <CommandEmpty>Nenhum resultado para &quot;{query}&quot;.</CommandEmpty>
          )}

          {!isSearching && !hasQuery && (
            <CommandEmpty>Digite para buscar em clientes, propostas e contratos.</CommandEmpty>
          )}

          {!isSearching && hasQuery && results.clients.length > 0 && (
            <CommandGroup heading="Clientes">
              {results.clients.map((hit) => (
                <CommandItem key={hit.id} value={hit.id} onSelect={() => go(hit.href)}>
                  <UsersIcon />
                  {hit.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isSearching && hasQuery && results.deals.length > 0 && (
            <CommandGroup heading="Propostas">
              {results.deals.map((hit) => (
                <CommandItem key={hit.id} value={hit.id} onSelect={() => go(hit.href)}>
                  <BriefcaseIcon />
                  {hit.title}
                  {hit.subtitle && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {hit.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isSearching && hasQuery && results.contracts.length > 0 && (
            <CommandGroup heading="Contratos">
              {results.contracts.map((hit) => (
                <CommandItem key={hit.id} value={hit.id} onSelect={() => go(hit.href)}>
                  <FileTextIcon />
                  {hit.title}
                  {hit.subtitle && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {hit.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
