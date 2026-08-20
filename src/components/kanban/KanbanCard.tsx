"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";

/** Estilo do "casco" do card, reaproveitado pelo preview do DragOverlay
 * (que não passa por este componente — ver KanbanBoard.tsx). */
export const KANBAN_CARD_SHELL_CLASS =
  "cursor-grab space-y-2 rounded-md border bg-card p-3 shadow-xs active:cursor-grabbing";

export function KanbanCard({
  id,
  columnId,
  onClick,
  children,
}: {
  id: string;
  columnId: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "item", columnId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(KANBAN_CARD_SHELL_CLASS, isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}
