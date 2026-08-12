"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/auth";
import * as dealsService from "@/server/deals";

import {
  moveDealSchema,
  moveStageSchema,
  quickCreateDealSchema,
  updateStageSchema,
} from "./schema";

export async function getBoardData(pipelineId: string) {
  const { supabase, orgId } = await requireOrg();
  return dealsService.getBoard(supabase, orgId, pipelineId);
}

export async function moveDeal(input: unknown) {
  const parsed = moveDealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await dealsService.move(supabase, {
    orgId,
    actorId: user.id,
    dealId: parsed.data.dealId,
    toStageId: parsed.data.toStageId,
    position: parsed.data.position,
    lostReason: parsed.data.lostReason,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

export async function moveStage(input: unknown) {
  const parsed = moveStageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await dealsService.moveStage(supabase, {
    orgId,
    stageId: parsed.data.stageId,
    position: parsed.data.position,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

export async function createDeal(pipelineId: string, input: unknown) {
  const parsed = quickCreateDealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await dealsService.createQuick(supabase, {
    orgId,
    actorId: user.id,
    pipelineId,
    stageId: parsed.data.stageId,
    title: parsed.data.title,
    position: parsed.data.position,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/propostas");
  return { ok: true as const, data: result.data };
}

export async function updateStage(input: unknown) {
  const parsed = updateStageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await dealsService.updateStage(supabase, {
    orgId,
    stageId: parsed.data.stageId,
    name: parsed.data.name,
    color: parsed.data.color,
    wipLimit: parsed.data.wipLimit,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

export async function deleteStage(stageId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await dealsService.deleteStage(supabase, { orgId, stageId });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}
