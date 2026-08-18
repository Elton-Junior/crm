import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type {
  ExpiringContract,
  StaleDeal,
  UpcomingEvent,
} from "@/server/dashboard";
import { CalendarDaysIcon, FileWarningIcon, KanbanSquareIcon } from "lucide-react";

export function UpcomingEventsList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="Nada nos próximos 7 dias"
        description="Reuniões agendadas aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y">
      {events.map((event) => (
        <li key={event.id} className="py-2 text-sm">
          <p className="truncate font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(event.starts_at)}
            {event.client ? ` · ${event.client.name}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function StaleDealsList({ deals }: { deals: StaleDeal[] }) {
  if (deals.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquareIcon}
        title="Nenhuma proposta parada"
        description="Propostas abertas sem atualização há mais de 14 dias aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y">
      {deals.map((deal) => (
        <li key={deal.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <Link href={`/propostas`} className="min-w-0 hover:underline">
            <p className="truncate font-medium">{deal.title}</p>
            <p className="text-xs text-muted-foreground">
              {deal.client?.name ?? "Sem cliente"} · parada desde{" "}
              {formatDate(deal.updated_at)}
            </p>
          </Link>
          <span className="shrink-0 text-xs font-medium">
            {formatCurrency(deal.value_cents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ExpiringContractsList({ contracts }: { contracts: ExpiringContract[] }) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileWarningIcon}
        title="Nenhum contrato vencendo"
        description="Contratos ativos vencendo nos próximos 60 dias aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y">
      {contracts.map((contract) => (
        <li key={contract.id} className="py-2 text-sm">
          <Link href={`/contratos/${contract.id}`} className="hover:underline">
            <p className="truncate font-medium">{contract.title}</p>
            <p className="text-xs text-muted-foreground">
              {contract.client?.name ?? "Sem cliente"} · vence em{" "}
              {formatDate(contract.end_date)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
