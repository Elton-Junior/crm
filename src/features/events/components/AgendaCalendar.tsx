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
import { useTaskDeadlinesRange } from "@/features/tasks/hooks";

import { useEventsRange, useMoveEvent } from "../hooks";
import { expandRecurringEvents } from "../recurrence";

const DEADLINE_COLOR = "#f59e0b";

export function AgendaCalendar({
  filters,
  onSelectRange,
  onClickEvent,
  onClickTaskDeadline,
}: {
  filters: { ownerId?: string; kinds?: EventKind[] };
  onSelectRange: (start: Date, end: Date, allDay: boolean) => void;
  onClickEvent: (eventId: string) => void;
  onClickTaskDeadline: (taskId: string, projectId: string) => void;
}) {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const { data: events } = useEventsRange(range?.from ?? "", range?.to ?? "", filters);
  const { data: taskDeadlines } = useTaskDeadlinesRange(range?.from ?? "", range?.to ?? "");
  const moveEvent = useMoveEvent();

  const calendarEvents = useMemo(() => {
    if (!events || !range) return [];
    const occurrences = expandRecurringEvents(
      events,
      new Date(range.from),
      new Date(range.to),
    );

    const eventItems = occurrences.map((occ) => ({
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

    // Prazos de tarefa entram como pseudo-evento "deadline" (§4.4) — não
    // vêm da tabela events, só a query une os dois na UI. editable:false
    // porque mover o prazo aqui exigiria reabrir o dialog da tarefa.
    const deadlineItems = (taskDeadlines ?? []).map((task) => ({
      id: `task-deadline:${task.id}`,
      title: `Prazo: ${task.title}`,
      start: task.due_on,
      allDay: true,
      editable: false,
      backgroundColor: DEADLINE_COLOR,
      borderColor: DEADLINE_COLOR,
      extendedProps: {
        isTaskDeadline: true,
        taskId: task.id,
        projectId: task.project_id,
      },
    }));

    return [...eventItems, ...deadlineItems];
  }, [events, taskDeadlines, range]);

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
        if (info.event.extendedProps.isTaskDeadline) {
          onClickTaskDeadline(
            info.event.extendedProps.taskId as string,
            info.event.extendedProps.projectId as string,
          );
          return;
        }
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
