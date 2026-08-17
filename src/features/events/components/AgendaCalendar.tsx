"use client";

import { useMemo, useState } from "react";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { toast } from "sonner";

import type { EventKind } from "@/server/events";

import { useEventsRange, useMoveEvent } from "../hooks";
import { expandRecurringEvents } from "../recurrence";

export function AgendaCalendar({
  filters,
  onSelectRange,
  onClickEvent,
}: {
  filters: { ownerId?: string; kinds?: EventKind[] };
  onSelectRange: (start: Date, end: Date, allDay: boolean) => void;
  onClickEvent: (eventId: string) => void;
}) {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const { data: events } = useEventsRange(range?.from ?? "", range?.to ?? "", filters);
  const moveEvent = useMoveEvent();

  const calendarEvents = useMemo(() => {
    if (!events || !range) return [];
    const occurrences = expandRecurringEvents(
      events,
      new Date(range.from),
      new Date(range.to),
    );

    return occurrences.map((occ) => ({
      id: occ.occurrenceId,
      title: occ.title,
      start: occ.starts_at,
      end: occ.ends_at,
      allDay: occ.all_day,
      backgroundColor: occ.color ?? undefined,
      borderColor: occ.color ?? undefined,
      extendedProps: {
        realId: occ.id,
        isRecurringInstance: occ.occurrenceId !== occ.id,
      },
    }));
  }, [events, range]);

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      }}
      buttonText={{
        today: "Hoje",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        list: "Lista",
      }}
      locale={ptBrLocale}
      timeZone="America/Sao_Paulo"
      height="auto"
      selectable
      editable
      events={calendarEvents}
      datesSet={(arg) => {
        setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() });
      }}
      select={(info: DateSelectArg) => {
        onSelectRange(info.start, info.end, info.allDay);
      }}
      eventClick={(info: EventClickArg) => {
        onClickEvent(info.event.extendedProps.realId as string);
      }}
      eventDrop={(info: EventDropArg) => {
        if (info.event.extendedProps.isRecurringInstance) {
          info.revert();
          toast.error("Não é possível mover uma ocorrência recorrente individual.");
          return;
        }
        const start = info.event.start;
        const end = info.event.end ?? start;
        if (!start || !end) return;
        moveEvent.mutate(
          {
            eventId: info.event.extendedProps.realId as string,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          },
          { onError: () => info.revert() },
        );
      }}
      eventResize={(info: EventResizeDoneArg) => {
        if (info.event.extendedProps.isRecurringInstance) {
          info.revert();
          toast.error("Não é possível redimensionar uma ocorrência recorrente individual.");
          return;
        }
        const start = info.event.start;
        const end = info.event.end;
        if (!start || !end) return;
        moveEvent.mutate(
          {
            eventId: info.event.extendedProps.realId as string,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          },
          { onError: () => info.revert() },
        );
      }}
    />
  );
}
