"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import type { EventKind } from "@/server/events";

import { useEventsRange } from "../hooks";
import { expandRecurringEvents } from "../recurrence";
import { EVENT_KIND_LABELS } from "../schema";

const ALL_OWNERS = "__all__";
const ALL_KINDS = Object.keys(EVENT_KIND_LABELS) as EventKind[];

export type AgendaFilters = {
  ownerId: string;
  kinds: EventKind[];
  onlyMine: boolean;
};

export const DEFAULT_AGENDA_FILTERS: AgendaFilters = {
  ownerId: "",
  kinds: [],
  onlyMine: false,
};

type Member = { id: string; full_name: string | null };

const KIND_DOT_COLORS: Record<EventKind, string> = {
  meeting: "bg-blue-500",
  call: "bg-violet-500",
  task: "bg-amber-500",
  deadline: "bg-red-500",
  other: "bg-slate-500",
};

export function AgendaSidebar({
  members,
  currentUserId,
  value,
  onChange,
  onSelectEvent,
}: {
  members: Member[];
  currentUserId: string;
  value: AgendaFilters;
  onChange: (next: AgendaFilters) => void;
  onSelectEvent: (eventId: string) => void;
}) {
  const effectiveOwnerId = value.onlyMine ? currentUserId : value.ownerId;

  const now = useMemo(() => new Date(), []);
  const horizon = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 90);
    return d;
  }, [now]);

  const { data: upcomingRaw } = useEventsRange(now.toISOString(), horizon.toISOString(), {
    ownerId: effectiveOwnerId || undefined,
    kinds: value.kinds.length > 0 ? value.kinds : undefined,
  });

  const upcoming = useMemo(() => {
    if (!upcomingRaw) return [];
    return expandRecurringEvents(upcomingRaw, now, horizon)
      .filter((e) => new Date(e.starts_at) >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 5);
  }, [upcomingRaw, now, horizon]);

  function toggleKind(kind: EventKind) {
    onChange({
      ...value,
      kinds: value.kinds.includes(kind)
        ? value.kinds.filter((k) => k !== kind)
        : [...value.kinds, kind],
    });
  }

  return (
    <div className="w-64 shrink-0 space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo de evento</p>
        {ALL_KINDS.map((kind) => (
          <label key={kind} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.kinds.length === 0 || value.kinds.includes(kind)}
              onChange={() => toggleKind(kind)}
              className="size-4 rounded border-input"
            />
            <span className={`size-2 rounded-full ${KIND_DOT_COLORS[kind]}`} />
            {EVENT_KIND_LABELS[kind]}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Responsável</p>
        <Select
          value={value.ownerId || ALL_OWNERS}
          onValueChange={(v) => onChange({ ...value, ownerId: v === ALL_OWNERS ? "" : v })}
          disabled={value.onlyMine}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OWNERS}>Todos</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name ?? "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Label className="flex items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          checked={value.onlyMine}
          onChange={(e) => onChange({ ...value, onlyMine: e.target.checked })}
          className="size-4 rounded border-input"
        />
        Só meus eventos
      </Label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Próximos eventos</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada nos próximos 90 dias.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((event) => (
              <li key={event.occurrenceId}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event.id)}
                  className="block w-full rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.starts_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
