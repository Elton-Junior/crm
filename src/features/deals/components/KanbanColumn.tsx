"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardDeal, PipelineStage } from "@/server/deals";

import { ColumnMenu } from "./ColumnMenu";
import { DealCard } from "./DealCard";
import { QuickAddDeal } from "./QuickAddDeal";

export function KanbanColumn({
  pipelineId,
  stage,
  deals,
  onCardClick,
}: {
  pipelineId: string;
  stage: PipelineStage;
  deals: BoardDeal[];
  onCardClick: (dealId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, data: { type: "stage" } });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `dropzone:${stage.id}`,
    data: { type: "stage-dropzone", stageId: stage.id },
  });

  const total = deals.reduce((sum, d) => sum + d.value_cents, 0);

  return (
    <div
      ref={setSortableRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
        isDragging && "opacity-50",
      )}
    >
      <div
        className="flex cursor-grab items-center gap-1.5 px-1 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <span className="flex-1 truncate text-sm font-medium">{stage.name}</span>
        <span className="text-xs text-muted-foreground">
          {deals.length}
          {stage.wip_limit ? `/${stage.wip_limit}` : ""}
        </span>
        <ColumnMenu pipelineId={pipelineId} stage={stage} />
      </div>
      <p className="px-1 text-xs text-muted-foreground">{formatCurrency(total)}</p>

      <div
        ref={setDroppableRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-md p-0.5",
          isOver && "bg-accent/50",
        )}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onCardClick(deal.id)}
            />
          ))}
        </SortableContext>
      </div>

      <QuickAddDeal pipelineId={pipelineId} stageId={stage.id} deals={deals} />
    </div>
  );
}
