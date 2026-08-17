import { FileTextIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { CONTRACT_STATUS_LABELS } from "@/features/contracts/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClientContract } from "@/server/contracts";

export function ClientContractsTab({ contracts }: { contracts: ClientContract[] }) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="Nenhum contrato vinculado"
        description="Contratos cadastrados para este cliente aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {contracts.map((contract) => (
        <li key={contract.id} className="flex items-center justify-between gap-4 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{contract.title}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline">{CONTRACT_STATUS_LABELS[contract.status]}</Badge>
              {contract.end_date ? (
                <span>vigência até {formatDate(contract.end_date)}</span>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium">
            {formatCurrency(contract.value_cents)}
          </span>
        </li>
      ))}
    </ul>
  );
}
