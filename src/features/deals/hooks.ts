"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Board } from "@/server/deals";

import {
  createDeal,
  deleteStage,
  getBoardData,
  moveDeal,
  moveStage,
  updateStage,
} from "./actions";

function boardKey(pipelineId: string) {
  return ["board", pipelineId] as const;
}

type ActionErrors = Record<string, string[] | undefined> | { _form: string[] };

function firstErrorMessage(errors: ActionErrors, fallback: string): string {
  if ("_form" in errors) return errors._form?.[0] ?? fallback;
  for (const value of Object.values(errors)) {
    if (value && value.length > 0) return value[0];
  }
  return fallback;
}

export function useBoard(pipelineId: string) {
  return useQuery({
    queryKey: boardKey(pipelineId),
    queryFn: () => getBoardData(pipelineId),
  });
}

function applyDealMove(
  board: Board,
  params: {
    dealId: string;
    fromStageId: string;
    toStageId: string;
    position: string;
  },
): Board {
  const fromDeals = board.dealsByStage[params.fromStageId] ?? [];
  const deal = fromDeals.find((d) => d.id === params.dealId);
  if (!deal) return board;

  const updatedDeal = {
    ...deal,
    stage_id: params.toStageId,
    position: params.position,
  };
  const newFrom = fromDeals.filter((d) => d.id !== params.dealId);
  const toDeals =
    params.fromStageId === params.toStageId
      ? newFrom
      : (board.dealsByStage[params.toStageId] ?? []);
  const newTo = [...toDeals, updatedDeal].sort((a, b) =>
    a.position < b.position ? -1 : 1,
  );

  return {
    ...board,
    dealsByStage: {
      ...board.dealsByStage,
      [params.fromStageId]: newFrom,
      [params.toStageId]: newTo,
    },
  };
}

export function useMoveDeal(pipelineId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      dealId: string;
      fromStageId: string;
      toStageId: string;
      position: string;
      lostReason?: string;
    }) => {
      const result = await moveDeal(vars);
      if (!result.ok) {
        throw new Error(
          firstErrorMessage(result.errors, "Não foi possível mover o card."),
        );
      }
      return result;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: boardKey(pipelineId) });
      const prev = qc.getQueryData<Board>(boardKey(pipelineId));
      if (prev) {
        qc.setQueryData<Board>(boardKey(pipelineId), applyDealMove(prev, vars));
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(pipelineId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Não foi possível mover o card.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
    },
  });
}

function applyStageMove(
  board: Board,
  params: { stageId: string; position: string },
): Board {
  const updated = board.stages.map((s) =>
    s.id === params.stageId ? { ...s, position: params.position } : s,
  );
  updated.sort((a, b) => (a.position < b.position ? -1 : 1));
  return { ...board, stages: updated };
}

export function useMoveStage(pipelineId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { stageId: string; position: string }) => {
      const result = await moveStage(vars);
      if (!result.ok) {
        throw new Error(
          firstErrorMessage(result.errors, "Não foi possível mover a coluna."),
        );
      }
      return result;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: boardKey(pipelineId) });
      const prev = qc.getQueryData<Board>(boardKey(pipelineId));
      if (prev) {
        qc.setQueryData<Board>(boardKey(pipelineId), applyStageMove(prev, vars));
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKey(pipelineId), ctx.prev);
      toast.error(err instanceof Error ? err.message : "Não foi possível mover a coluna.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
    },
  });
}

export function useCreateDeal(pipelineId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { stageId: string; title: string; position: string }) => {
      const result = await createDeal(pipelineId, vars);
      if (!result.ok) {
        throw new Error(
          firstErrorMessage(result.errors, "Não foi possível criar a proposta."),
        );
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a proposta.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
    },
  });
}

export function useUpdateStage(pipelineId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      stageId: string;
      name?: string;
      color?: string;
      wipLimit?: number | null;
    }) => {
      const result = await updateStage(vars);
      if (!result.ok) {
        throw new Error(
          firstErrorMessage(result.errors, "Não foi possível atualizar a coluna."),
        );
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a coluna.");
    },
    onSuccess: () => {
      toast.success("Coluna atualizada.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
    },
  });
}

export function useDeleteStage(pipelineId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      const result = await deleteStage(stageId);
      if (!result.ok) {
        throw new Error(
          firstErrorMessage(result.errors, "Não foi possível excluir a coluna."),
        );
      }
      return result;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a coluna.");
    },
    onSuccess: () => {
      toast.success("Coluna excluída.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
    },
  });
}
