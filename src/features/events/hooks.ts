"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { firstErrorMessage } from "@/lib/action-errors";
import type { EventKind } from "@/server/events";

import {
  createEvent,
  deleteEvent,
  getEventsRange,
  moveEvent,
  updateEvent,
} from "./actions";
import type { EventFormInput } from "./schema";

export function eventsKey(
  from: string,
  to: string,
  filters: { ownerId?: string; kinds?: EventKind[] },
) {
  return [
    "events",
    from,
    to,
    filters.ownerId ?? "",
    (filters.kinds ?? []).join(","),
  ] as const;
}

export function useEventsRange(
  from: string,
  to: string,
  filters: { ownerId?: string; kinds?: EventKind[] },
) {
  return useQuery({
    queryKey: eventsKey(from, to, filters),
    queryFn: () => getEventsRange({ from, to, ...filters }),
    enabled: Boolean(from && to),
  });
}

function invalidateEvents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["events"] });
}

export function useCreateEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: EventFormInput) => {
      const result = await createEvent(values);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível criar o evento."));
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o evento.");
    },
    onSuccess: () => {
      toast.success("Evento criado.");
    },
    onSettled: () => invalidateEvents(qc),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { eventId: string; values: EventFormInput }) => {
      const result = await updateEvent(vars.eventId, vars.values);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível salvar o evento."));
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o evento.");
    },
    onSuccess: () => {
      toast.success("Evento atualizado.");
    },
    onSettled: () => invalidateEvents(qc),
  });
}

/**
 * eventDrop/eventResize: o próprio FullCalendar já move o card
 * visualmente antes do handler rodar, então não precisamos de update
 * otimista aqui — só persistir, e chamar `info.revert()` (no handler que
 * usa este hook) se der erro.
 */
export function useMoveEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { eventId: string; startsAt: string; endsAt: string }) => {
      const result = await moveEvent(vars.eventId, vars.startsAt, vars.endsAt);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível mover o evento."));
      }
      return result;
    },
    onSettled: () => invalidateEvents(qc),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const result = await deleteEvent(eventId);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível excluir o evento."));
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
    },
    onSuccess: () => {
      toast.success("Evento excluído.");
    },
    onSettled: () => invalidateEvents(qc),
  });
}
