import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { ClientEvent } from "@/server/events";
import type { Database } from "@/types/database";

type EventKind = Database["public"]["Enums"]["event_kind"];

const KIND_LABELS: Record<EventKind, string> = {
  meeting: "Reunião",
  call: "Ligação",
  task: "Tarefa",
  deadline: "Prazo",
  other: "Outro",
};

function EventList({ events }: { events: ClientEvent[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {events.map((event) => (
        <li key={event.id} className="flex items-center justify-between gap-4 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {KIND_LABELS[event.kind]} · {formatDateTime(event.starts_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ClientEventsTab({
  upcoming,
  past,
}: {
  upcoming: ClientEvent[];
  past: ClientEvent[];
}) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="Nenhum evento vinculado"
        description="Reuniões e compromissos com este cliente aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Próximos
        </h3>
        {upcoming.length > 0 ? (
          <EventList events={upcoming} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Anteriores
        </h3>
        {past.length > 0 ? (
          <EventList events={past} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento passado.</p>
        )}
      </section>
    </div>
  );
}
