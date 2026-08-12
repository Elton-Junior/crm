import { z } from "zod";

export const quickCreateDealSchema = z.object({
  stageId: z.string().uuid(),
  title: z.string().trim().min(1, "Informe um título.").max(200),
  // Índice fracionário calculado no cliente (§7.6) — o servidor só persiste.
  position: z.string().min(1),
});

export const moveDealSchema = z.object({
  dealId: z.string().uuid(),
  toStageId: z.string().uuid(),
  position: z.string().min(1),
  lostReason: z.string().trim().max(500).optional(),
});

export const moveStageSchema = z.object({
  stageId: z.string().uuid(),
  position: z.string().min(1),
});

export const updateStageSchema = z.object({
  stageId: z.string().uuid(),
  name: z.string().trim().min(1, "Informe um nome.").max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.")
    .optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
});

export type QuickCreateDealInput = z.infer<typeof quickCreateDealSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
