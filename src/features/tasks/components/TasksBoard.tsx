"use client";

import { useState } from "react";

import { KanbanBoard as GenericKanbanBoard } from "@/components/kanban/KanbanBoard";
import type { KanbanAdapter, KanbanColumnData } from "@/components/kanban/types";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardTask } from "@/server/tasks";

import { useMoveColumn, useMoveTask, useTaskBoard } from "../hooks";
import { QuickAddTask } from "./QuickAddTask";
import { TaskCard } from "./TaskCard";
import { TaskDetailDialog } from "./TaskDetailDialog";

type Member = { id: string; full_name: string | null };

const taskAdapter: KanbanAdapter<BoardTask> = {
  getId: (task) => task.id,
  getColumnId: (task) => task.column_id,
  getPosition: (task) => task.position,
};

export function TasksBoard({
  projectId,
  members,
}: {
  projectId: string;
  members: Member[];
}) {
  const { data: board, isLoading } = useTaskBoard(projectId);
  const moveTask = useMoveTask(projectId);
  const moveColumn = useMoveColumn(projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (isLoading || !board) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  const columns: KanbanColumnData[] = board.columns.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    position: c.position,
  }));

  return (
    <>
      <GenericKanbanBoard
        columns={columns}
        itemsByColumn={board.tasksByColumn}
        adapter={taskAdapter}
        renderCard={(task) => <TaskCard task={task} />}
        onCardClick={(task) => setSelectedTaskId(task.id)}
        renderColumnHeaderRight={(column) => {
          const boardColumn = board.columns.find((c) => c.id === column.id);
          if (!boardColumn) return null;
          const count = board.tasksByColumn[column.id]?.length ?? 0;
          return (
            <span className="text-xs text-muted-foreground">
              {count}
              {boardColumn.wip_limit ? `/${boardColumn.wip_limit}` : ""}
            </span>
          );
        }}
        renderColumnFooter={(column) => (
          <QuickAddTask
            projectId={projectId}
            columnId={column.id}
            tasks={board.tasksByColumn[column.id] ?? []}
          />
        )}
        onItemMove={({ itemId, fromColumnId, toColumnId, position }) => {
          moveTask.mutate({ taskId: itemId, fromColumnId, toColumnId, position });
        }}
        onColumnMove={({ columnId, position }) => moveColumn.mutate({ columnId, position })}
      />

      <TaskDetailDialog
        taskId={selectedTaskId}
        projectId={projectId}
        members={members}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </>
  );
}
