"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_OWNERS = "__all__";

export type KanbanFiltersState = {
  ownerId: string;
  search: string;
  onlyOverdue: boolean;
};

export const DEFAULT_KANBAN_FILTERS: KanbanFiltersState = {
  ownerId: "",
  search: "",
  onlyOverdue: false,
};

type Member = { id: string; full_name: string | null };

export function KanbanFilters({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: KanbanFiltersState;
  onChange: (next: KanbanFiltersState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Buscar por título ou cliente..."
          className="pl-8"
          aria-label="Buscar propostas"
        />
      </div>

      <Select
        value={value.ownerId || ALL_OWNERS}
        onValueChange={(v) =>
          onChange({ ...value, ownerId: v === ALL_OWNERS ? "" : v })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por responsável">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OWNERS}>Todos os responsáveis</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name ?? "Sem nome"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label className="flex items-center gap-1.5 text-sm font-normal">
        <input
          type="checkbox"
          checked={value.onlyOverdue}
          onChange={(e) => onChange({ ...value, onlyOverdue: e.target.checked })}
          className="size-4 rounded border-input"
        />
        Só atrasados
      </Label>
    </div>
  );
}
