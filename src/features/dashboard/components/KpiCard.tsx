import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Stat tile (dataviz skill: label + value + delta), não um "gráfico de uma
 * barra só". Delta usa as cores de status good/critical — as 4 métricas do
 * Dashboard são todas "up = bom" (receita, pipeline, conversão, clientes).
 */
export function KpiCard({
  label,
  value,
  current,
  previous,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
}) {
  const delta = formatDelta(current, previous);

  return (
    <Card>
      <CardContent className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {delta === null ? (
          <p className="text-xs text-muted-foreground">sem período anterior</p>
        ) : (
          <p
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              delta > 0
                ? "text-green-600 dark:text-green-400"
                : delta < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
            )}
          >
            {delta > 0 ? (
              <ArrowUpIcon className="size-3" />
            ) : delta < 0 ? (
              <ArrowDownIcon className="size-3" />
            ) : (
              <MinusIcon className="size-3" />
            )}
            {Math.abs(delta).toFixed(1)}% vs. período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
