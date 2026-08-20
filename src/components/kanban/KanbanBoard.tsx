"use client";

import { useState, type ReactNode } from "react";
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

import { cn } from "@/lib/utils";

import { KANBAN_CARD_SHELL_CLASS } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";
import { positionForIndex } from "./ordering";
import type { KanbanAdapter, KanbanColumnData } from "./types";

/**
 * Board de Kanban genérico (ARQUITETURA-EXPANSAO.md §2) — dnd-kit, índice
 * fracionário, drag de card E de coluna, update otimista fica por conta de
 * quem chama `onItemMove`/`onColumnMove` (normalmente uma mutation do
 * TanStack Query com `onMutate`). Este componente só decide a posição final
 * e delega a decisão de "o que fazer com o move" para o domínio — por isso
 * `onItemMove` não é assíncrono nem comita nada sozinho: o chamador pode
 * interceptar (ex.: pedir confirmação) antes de efetivar.
 */
export function KanbanBoard<T>({
  columns,
  itemsByColumn,
  adapter,
  renderCard,
  onCardClick,
  renderColumnHeaderRight,
  renderColumnSubheader,
  renderColumnFooter,
  renderColumnPreview,
  onItemMove,
  onColumnMove,
  widthClassName,
}: {
  columns: KanbanColumnData[];
  itemsByColumn: Record<string, T[]>;
  adapter: KanbanAdapter<T>;
  renderCard: (item: T) => ReactNode;
  onCardClick?: (item: T) => void;
  renderColumnHeaderRight?: (column: KanbanColumnData) => ReactNode;
  renderColumnSubheader?: (column: KanbanColumnData) => ReactNode;
  renderColumnFooter?: (column: KanbanColumnData) => ReactNode;
  renderColumnPreview?: (column: KanbanColumnData) => ReactNode;
  onItemMove: (params: {
    itemId: string;
    fromColumnId: string;
    toColumnId: string;
    position: string;
  }) => void;
  onColumnMove: (params: { columnId: string; position: string }) => void;
  widthClassName?: string;
}) {
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumnData | null>(null);

  const sensors = useSensors(
    // distância de 8px evita que um clique simples vire drag (§7.6, regra 1).
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === "item") {
      const itemId = String(event.active.id);
      const columnId = event.active.data.current?.columnId as string;
      const item = itemsByColumn[columnId]?.find((i) => adapter.getId(i) === itemId);
      setActiveItem(item ?? null);
    } else if (type === "column") {
      const column = columns.find((c) => c.id === event.active.id);
      setActiveColumn(column ?? null);
    }
  }

  function resolveTargetColumnId(over: NonNullable<DragEndEvent["over"]>): string {
    const overType = over.data.current?.type;
    if (overType === "item") return over.data.current?.columnId as string;
    if (overType === "column-dropzone") return over.data.current?.columnId as string;
    return String(over.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    setActiveColumn(null);
    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      if (active.id === over.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      const finalIndex = reordered.findIndex((c) => c.id === active.id);
      const others = reordered.filter((c) => c.id !== active.id);
      const position = positionForIndex(others, finalIndex);

      onColumnMove({ columnId: String(active.id), position });
      return;
    }

    if (activeType === "item") {
      const itemId = String(active.id);
      const fromColumnId = active.data.current?.columnId as string;
      const toColumnId = resolveTargetColumnId(over);
      if (!toColumnId) return;

      const overType = over.data.current?.type;
      const overItemId = overType === "item" ? String(over.id) : null;

      const destItems = (itemsByColumn[toColumnId] ?? [])
        .filter((i) => adapter.getId(i) !== itemId)
        .map((i) => ({ id: adapter.getId(i), position: adapter.getPosition(i) }));
      const overIndex = overItemId ? destItems.findIndex((i) => i.id === overItemId) : -1;
      const toIndex = overIndex === -1 ? destItems.length : overIndex;
      const position = positionForIndex(destItems, toIndex);

      onItemMove({ itemId, fromColumnId, toColumnId, position });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columns.map((c) => c.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={itemsByColumn[column.id] ?? []}
              adapter={adapter}
              renderCard={renderCard}
              onCardClick={onCardClick}
              headerRight={renderColumnHeaderRight?.(column)}
              subheader={renderColumnSubheader?.(column)}
              footer={renderColumnFooter?.(column)}
              widthClassName={widthClassName}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className={cn(KANBAN_CARD_SHELL_CLASS, "shadow-lg")}>{renderCard(activeItem)}</div>
        ) : null}
        {activeColumn ? (
          renderColumnPreview ? (
            renderColumnPreview(activeColumn)
          ) : (
            <div
              className={cn("rounded-lg border bg-muted/50 p-2 text-sm font-medium shadow-lg", widthClassName ?? "w-72")}
              style={{ borderColor: activeColumn.color }}
            >
              {activeColumn.name}
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
