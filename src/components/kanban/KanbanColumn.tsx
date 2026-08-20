"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";

import { KanbanCard } from "./KanbanCard";
import type { KanbanAdapter, KanbanColumnData } from "./types";

export function KanbanColumn<T>({
  column,
  items,
  adapter,
  renderCard,
  onCardClick,
  headerRight,
  subheader,
  footer,
  widthClassName = "w-72",
}: {
  column: KanbanColumnData;
  items: T[];
  adapter: KanbanAdapter<T>;
  renderCard: (item: T) => ReactNode;
  onCardClick?: (item: T) => void;
  headerRight?: ReactNode;
  subheader?: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: "column" } });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `dropzone:${column.id}`,
    data: { type: "column-dropzone", columnId: column.id },
  });

  return (
    <div
      ref={setSortableRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
        widthClassName,
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
          style={{ backgroundColor: column.color }}
        />
        <span className="flex-1 truncate text-sm font-medium">{column.name}</span>
        {headerRight}
      </div>

      {subheader}

      <div
        ref={setDroppableRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-md p-0.5",
          isOver && "bg-accent/50",
        )}
      >
        <SortableContext items={items.map(adapter.getId)} strategy={verticalListSortingStrategy}>
          {items.map((item) => {
            const id = adapter.getId(item);
            return (
              <KanbanCard
                key={id}
                id={id}
                columnId={column.id}
                onClick={onCardClick ? () => onCardClick(item) : undefined}
              >
                {renderCard(item)}
              </KanbanCard>
            );
          })}
        </SortableContext>
      </div>

      {footer}
    </div>
  );
}
