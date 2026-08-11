import { KanbanSquareIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClientDeal } from "@/server/deals";

export function ClientDealsTab({ deals }: { deals: ClientDeal[] }) {
  if (deals.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquareIcon}
        title="Nenhuma proposta vinculada"
        description="Propostas criadas para este cliente no Kanban aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {deals.map((deal) => (
        <li key={deal.id} className="flex items-center justify-between gap-4 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{deal.title}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {deal.stage ? (
                <>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: deal.stage.color }}
                  />
                  {deal.stage.name}
                </>
              ) : (
                "Sem etapa"
              )}
              {deal.expected_close ? (
                <span>· previsão {formatDate(deal.expected_close)}</span>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium">
            {formatCurrency(deal.value_cents)}
          </span>
        </li>
      ))}
    </ul>
  );
}
