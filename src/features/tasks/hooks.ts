"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { firstErrorMessage } from "@/lib/action-errors";
import type { Board } from "@/server/tasks";

import { createTask, getBoardData, moveColumn, moveTask } from "./actions";

export function taskBoardKey(projectId: string) {
  return ["task-board", projectId] as const;
}

export function useTaskBoard(projectId: string) {
  return useQuery({
    queryKey: taskBoardKey(projectId),
    queryFn: () => getBoardData(projectId),
  });
}

function applyTaskMove(
  board: Board,
  params: { taskId: string; fromColumnId: string; toColumnId: string; position: string },
): Board {
  const fromTasks = board.tasksByColumn[params.fromColumnId] ?? [];
  const task = fromTasks.find((t) => t.id === params.taskId);
  if (!task) return board;

  const isDoneColumn = board.columns.find((c) => c.id === params.toColumnId)?.is_done ?? false;
  const updatedTask = {
    ...task,
    column_id: params.toColumnId,
    position: params.position,
    status: isDoneColumn ? ("done" as const) : ("todo" as const),
  };
  const newFrom = fromTasks.filter((t) => t.id !== params.taskId);
  const toTasks =
    params.fromColumnId === params.toColumnId
      ? newFrom
      : (board.tasksByColumn[params.toColumnId] ?? []);
  const newTo = [...toTasks, updatedTask].sort((a, b) => (a.position < b.position ? -1 : 1));

  return {
    ...board,
    tasksByColumn: {
      ...board.tasksByColumn,
      [params.fromColumnId]: newFrom,
      [params.toColumnId]: newTo,
    },
  };
}

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      taskId: string;
      fromColumnId: string;
      toColumnId: string;
      position: string;
    }) => {
      const result = await moveTask(vars);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível mover o card."));
      }
      return result;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: taskBoardKey(projectId) });
      const prev = qc.getQueryData<Board>(taskBoardKey(projectId));
      if (prev) qc.setQueryData<Board>(taskBoardKey(projectId), applyTaskMove(prev, vars));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskBoardKey(projectId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o card.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskBoardKey(projectId) }),
  });
}

function applyColumnMove(board: Board, params: { columnId: string; position: string }): Board {
  const updated = board.columns.map((c) =>
    c.id === params.columnId ? { ...c, position: params.position } : c,
  );
  updated.sort((a, b) => (a.position < b.position ? -1 : 1));
  return { ...board, columns: updated };
}

export function useMoveColumn(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { columnId: string; position: string }) => {
      const result = await moveColumn(vars);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível mover a coluna."));
      }
      return result;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: taskBoardKey(projectId) });
      const prev = qc.getQueryData<Board>(taskBoardKey(projectId));
      if (prev) qc.setQueryData<Board>(taskBoardKey(projectId), applyColumnMove(prev, vars));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskBoardKey(projectId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Não foi possível mover a coluna.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskBoardKey(projectId) }),
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { columnId: string; title: string; position: string }) => {
      const result = await createTask(projectId, vars);
      if (!result.ok) {
        throw new Error(firstErrorMessage(result.errors, "Não foi possível criar a tarefa."));
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a tarefa.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskBoardKey(projectId) }),
  });
}
