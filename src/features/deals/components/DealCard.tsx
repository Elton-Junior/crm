import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardDeal } from "@/server/deals";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Conteúdo do card — o casco arrastável vem do KanbanCard genérico
 * (src/components/kanban/), que envolve isto via `renderCard`. */
export function DealCard({ deal }: { deal: BoardDeal }) {
  const isOverdue =
    deal.expected_close &&
    deal.status === "open" &&
    new Date(deal.expected_close) < new Date();

  return (
    <>
      <p className="text-sm font-medium">{deal.title}</p>
      {deal.client ? (
        <p className="truncate text-xs text-muted-foreground">{deal.client.name}</p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {formatCurrency(deal.value_cents)}
        </span>
        <Avatar size="sm">
          <AvatarFallback>{initials(deal.owner?.full_name)}</AvatarFallback>
        </Avatar>
      </div>
      {deal.expected_close ? (
        <p className={cn("text-xs", isOverdue ? "text-destructive" : "text-muted-foreground")}>
          previsão {formatDate(deal.expected_close)}
        </p>
      ) : null}
      {deal.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {deal.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
