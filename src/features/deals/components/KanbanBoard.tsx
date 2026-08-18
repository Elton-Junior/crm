"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Skeleton } from "@/components/ui/skeleton";
import type { BoardDeal } from "@/server/deals";

import { useBoard, useMoveDeal, useMoveStage } from "../hooks";
import { positionForIndex } from "../ordering";
import type { KanbanFiltersState } from "./KanbanFilters";
import { DealCard } from "./DealCard";
import { DealDetailDialog } from "./DealDetailDialog";
import { KanbanColumn } from "./KanbanColumn";
import { LostReasonDialog } from "./LostReasonDialog";

type PendingLostMove = {
  dealId: string;
  fromStageId: string;
  toStageId: string;
  position: string;
};

type Member = { id: string; full_name: string | null };

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

  const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [pendingLostMove, setPendingLostMove] = useState<PendingLostMove | null>(null);
  // Inicializado a partir de ?deal= (deep link da busca global, item 18) —
  // lazy initializer em vez de efeito, só roda uma vez na montagem.
  const [selectedDealId, setSelectedDealId] = useState<string | null>(() =>
    searchParams.get("deal"),
  );

  const sensors = useSensors(
    // distância de 8px evita que um clique simples vire drag (§7.6, regra 1).
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const activeStage = useMemo(
    () => board?.stages.find((s) => s.id === activeStageId) ?? null,
    [board, activeStageId],
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

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === "deal") {
      const dealId = String(event.active.id);
      const stageId = event.active.data.current?.stageId as string;
      const deal = visibleDealsByStage[stageId]?.find((d) => d.id === dealId);
      setActiveDeal(deal ?? null);
    } else if (type === "stage") {
      setActiveStageId(String(event.active.id));
    }
  }

  function resolveTargetStageId(over: NonNullable<DragEndEvent["over"]>): string {
    const overType = over.data.current?.type;
    if (overType === "deal") return over.data.current?.stageId as string;
    if (overType === "stage-dropzone") return over.data.current?.stageId as string;
    return String(over.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);
    setActiveStageId(null);
    if (!board || !over) return;

    const activeType = active.data.current?.type;

    if (activeType === "stage") {
      if (active.id === over.id) return;
      const stages = board.stages;
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(stages, oldIndex, newIndex);
      const finalIndex = reordered.findIndex((s) => s.id === active.id);
      const others = reordered.filter((s) => s.id !== active.id);
      const position = positionForIndex(others, finalIndex);

      moveStage.mutate({ stageId: String(active.id), position });
      return;
    }

    if (activeType === "deal") {
      const dealId = String(active.id);
      const fromStageId = active.data.current?.stageId as string;
      const toStageId = resolveTargetStageId(over);
      if (!toStageId) return;

      const overType = over.data.current?.type;
      const overDealId = overType === "deal" ? String(over.id) : null;

      const destDeals = (visibleDealsByStage[toStageId] ?? []).filter(
        (d) => d.id !== dealId,
      );
      const overIndex = overDealId
        ? destDeals.findIndex((d) => d.id === overDealId)
        : -1;
      const toIndex = overIndex === -1 ? destDeals.length : overIndex;
      const position = positionForIndex(destDeals, toIndex);

      const targetStage = board.stages.find((s) => s.id === toStageId);
      if (targetStage?.is_lost && fromStageId !== toStageId) {
        setPendingLostMove({ dealId, fromStageId, toStageId, position });
        return;
      }

      moveDeal.mutate({ dealId, fromStageId, toStageId, position });
    }
  }

  if (isLoading || !board) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={board.stages.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                pipelineId={pipelineId}
                stage={stage}
                deals={visibleDealsByStage[stage.id] ?? []}
                onCardClick={setSelectedDealId}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
          {activeStage ? (
            <div
              className="w-72 rounded-lg border bg-muted/50 p-2 text-sm font-medium shadow-lg"
              style={{ borderColor: activeStage.color }}
            >
              {activeStage.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
