import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ClientEvent } from "@/server/events";

type Member = { id: string; full_name: string | null };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ClientSummaryCard({
  summary,
}: {
  summary: {
    wonValueCents: number;
    openDealsCount: number;
    nextEvent: ClientEvent | null;
    owner: Member | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Valor total ganho" value={formatCurrency(summary.wonValueCents)} />
        <Row label="Propostas abertas" value={String(summary.openDealsCount)} />
        <Row
          label="Próxima reunião"
          value={
            summary.nextEvent ? formatDateTime(summary.nextEvent.starts_at) : "—"
          }
        />
        <Row label="Responsável" value={summary.owner?.full_name ?? "Sem responsável"} />
      </CardContent>
    </Card>
  );
}
