import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";

export default function AgendaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agenda</h1>
      <EmptyState
        icon={CalendarDaysIcon}
        title="Em construção"
        description="Calendário com FullCalendar chega na Fase 3."
      />
    </div>
  );
}
