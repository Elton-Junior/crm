"use client";

import { useState } from "react";

import { AgendaCalendar } from "./AgendaCalendar";
import {
  AgendaSidebar,
  DEFAULT_AGENDA_FILTERS,
  type AgendaFilters,
} from "./AgendaSidebar";
import { EventFormDialog } from "./EventFormDialog";

type Member = { id: string; full_name: string | null };

type DialogState =
  | { mode: "create"; start: Date; end: Date; allDay: boolean }
  | { mode: "edit"; eventId: string };

export function AgendaPageClient({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [filters, setFilters] = useState<AgendaFilters>(DEFAULT_AGENDA_FILTERS);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const effectiveOwnerId = filters.onlyMine ? currentUserId : filters.ownerId;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <AgendaCalendar
          filters={{
            ownerId: effectiveOwnerId || undefined,
            kinds: filters.kinds.length > 0 ? filters.kinds : undefined,
          }}
          onSelectRange={(start, end, allDay) => {
            // FullCalendar usa fim exclusivo pra seleções de dia inteiro
            // (ex.: clicar no dia 17 dá start=17, end=18); o formulário
            // trata o campo "Fim" como inclusivo, então ajusta 1 dia aqui.
            const adjustedEnd = allDay
              ? new Date(end.getTime() - 24 * 60 * 60 * 1000)
              : end;
            setDialogState({ mode: "create", start, end: adjustedEnd, allDay });
          }}
          onClickEvent={(eventId) => setDialogState({ mode: "edit", eventId })}
        />
      </div>

      <AgendaSidebar
        members={members}
        currentUserId={currentUserId}
        value={filters}
        onChange={setFilters}
        onSelectEvent={(eventId) => setDialogState({ mode: "edit", eventId })}
      />

      {dialogState ? (
        <EventFormDialog
          key={
            dialogState.mode === "edit"
              ? dialogState.eventId
              : dialogState.start.toISOString()
          }
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null);
          }}
          eventId={dialogState.mode === "edit" ? dialogState.eventId : null}
          prefill={
            dialogState.mode === "create"
              ? { start: dialogState.start, end: dialogState.end, allDay: dialogState.allDay }
              : null
          }
          members={members}
        />
      ) : null}
    </div>
  );
}
