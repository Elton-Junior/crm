"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { KanbanBoard as GenericKanbanBoard } from "@/components/kanban/KanbanBoard";
import type { KanbanAdapter, KanbanColumnData } from "@/components/kanban/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { BoardDeal } from "@/server/deals";

import { useBoard, useMoveDeal, useMoveStage } from "../hooks";
import type { KanbanFiltersState } from "./KanbanFilters";
import { ColumnMenu } from "./ColumnMenu";
import { DealCard } from "./DealCard";
import { DealDetailDialog } from "./DealDetailDialog";
import { LostReasonDialog } from "./LostReasonDialog";
import { QuickAddDeal } from "./QuickAddDeal";

type PendingLostMove = {
  dealId: string;
  fromStageId: string;
  toStageId: string;
  position: string;
};

type Member = { id: string; full_name: string | null };

const dealAdapter: KanbanAdapter<BoardDeal> = {
  getId: (deal) => deal.id,
  getColumnId: (deal) => deal.stage_id,
  getPosition: (deal) => deal.position,
};

function matchesFilters(deal: BoardDeal, filters: KanbanFiltersState): boolean {
  if (filters.ownerId && deal.owner?.id !== filters.ownerId) return false;
  if (filters.onlyOverdue) {
    const overdue =
      deal.status === "open" &&
      deal.expected_close !== null &&
      new Date(deal.expected_close) < new Date();
    if (!overdue) return false;
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    const matchesTitle = deal.title.toLowerCase().includes(term);
    const matchesClient = deal.client?.name.toLowerCase().includes(term) ?? false;
    if (!matchesTitle && !matchesClient) return false;
  }
  return true;
}

export function KanbanBoard({
  pipelineId,
  filters,
  members,
}: {
  pipelineId: string;
  filters: KanbanFiltersState;
  members: Member[];
}) {
  const { data: board, isLoading } = useBoard(pipelineId);
  const moveDeal = useMoveDeal(pipelineId);
  const moveStage = useMoveStage(pipelineId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pendingLostMove, setPendingLostMove] = useState<PendingLostMove | null>(null);
  // Inicializado a partir de ?deal= (deep link da busca global, item 18) —
  // lazy initializer em vez de efeito, só roda uma vez na montagem.
  const [selectedDealId, setSelectedDealId] = useState<string | null>(() =>
    searchParams.get("deal"),
  );

  const visibleDealsByStage = useMemo(() => {
    if (!board) return {};
    const result: Record<string, BoardDeal[]> = {};
    for (const stage of board.stages) {
      result[stage.id] = (board.dealsByStage[stage.id] ?? []).filter((d) =>
        matchesFilters(d, filters),
      );
    }
    return result;
  }, [board, filters]);

  if (isLoading || !board) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  const columns: KanbanColumnData[] = board.stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    position: s.position,
  }));

  return (
    <>
      <GenericKanbanBoard
        columns={columns}
        itemsByColumn={visibleDealsByStage}
        adapter={dealAdapter}
        renderCard={(deal) => <DealCard deal={deal} />}
        onCardClick={(deal) => setSelectedDealId(deal.id)}
        renderColumnHeaderRight={(column) => {
          const stage = board.stages.find((s) => s.id === column.id);
          if (!stage) return null;
          const count = visibleDealsByStage[column.id]?.length ?? 0;
          return (
            <>
              <span className="text-xs text-muted-foreground">
                {count}
                {stage.wip_limit ? `/${stage.wip_limit}` : ""}
              </span>
              <ColumnMenu pipelineId={pipelineId} stage={stage} />
            </>
          );
        }}
        renderColumnSubheader={(column) => {
          const total = (visibleDealsByStage[column.id] ?? []).reduce(
            (sum, d) => sum + d.value_cents,
            0,
          );
          return <p className="px-1 text-xs text-muted-foreground">{formatCurrency(total)}</p>;
        }}
        renderColumnFooter={(column) => (
          <QuickAddDeal
            pipelineId={pipelineId}
            stageId={column.id}
            deals={visibleDealsByStage[column.id] ?? []}
          />
        )}
        onItemMove={({ itemId, fromColumnId, toColumnId, position }) => {
          const targetStage = board.stages.find((s) => s.id === toColumnId);
          if (targetStage?.is_lost && fromColumnId !== toColumnId) {
            setPendingLostMove({
              dealId: itemId,
              fromStageId: fromColumnId,
              toStageId: toColumnId,
              position,
            });
            return;
          }
          moveDeal.mutate({ dealId: itemId, fromStageId: fromColumnId, toStageId: toColumnId, position });
        }}
        onColumnMove={({ columnId, position }) => moveStage.mutate({ stageId: columnId, position })}
      />

      <LostReasonDialog
        open={pendingLostMove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLostMove(null);
        }}
        isPending={moveDeal.isPending}
        onCancel={() => setPendingLostMove(null)}
        onConfirm={(reason) => {
          if (!pendingLostMove) return;
          moveDeal.mutate(
            { ...pendingLostMove, lostReason: reason },
            { onSuccess: () => setPendingLostMove(null) },
          );
        }}
      />

      <DealDetailDialog
        dealId={selectedDealId}
        pipelineId={pipelineId}
        stages={board.stages}
        members={members}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDealId(null);
            if (searchParams.has("deal")) router.replace(pathname);
          }
        }}
      />
    </>
  );
}
