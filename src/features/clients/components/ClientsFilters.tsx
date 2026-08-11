"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "../schema";

const ALL = "__all__";

type Member = { id: string; full_name: string | null };

export function ClientsFilters({
  members,
  defaultQuery,
}: {
  members: Member[];
  defaultQuery: { q?: string; status?: ClientStatus; ownerId?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultQuery.q ?? "");

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  // Busca com debounce de 300ms — não dispara a cada tecla.
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === (defaultQuery.q ?? "")) return;

    const timeout = setTimeout(() => {
      updateParams({ q: trimmed || undefined });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters = Boolean(
    defaultQuery.q || defaultQuery.status || defaultQuery.ownerId,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, documento ou e-mail..."
          className="pl-8"
          aria-label="Buscar clientes"
        />
      </div>

      <Select
        value={defaultQuery.status ?? ALL}
        onValueChange={(value) =>
          updateParams({ status: value === ALL ? undefined : value })
        }
      >
        <SelectTrigger className="w-[160px]" aria-label="Filtrar por status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaultQuery.ownerId ?? ALL}
        onValueChange={(value) =>
          updateParams({ ownerId: value === ALL ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por responsável">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name ?? "Sem nome"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            router.replace(pathname);
          }}
        >
          <XIcon />
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
