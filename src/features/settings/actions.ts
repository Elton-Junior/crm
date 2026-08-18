"use server";

import { generateKeyBetween } from "fractional-indexing";
import { revalidatePath } from "next/cache";

import { requireOrg, requireRole, requireUser } from "@/lib/auth";
import * as dealsService from "@/server/deals";
import * as organizationsService from "@/server/organizations";
import * as profilesService from "@/server/profiles";
import * as teamService from "@/server/team";

import {
  inviteMemberSchema,
  memberRoleSchema,
  organizationFormSchema,
  profileFormSchema,
  stageFormSchema,
} from "./schema";

const ALLOWED_AVATAR_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function updateProfile(input: unknown) {
  const parsed = profileFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, user } = await requireUser();
  const result = await profilesService.updateProfile(supabase, {
    userId: user.id,
    fullName: parsed.data.fullName,
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: null };
}

export async function createAvatarUploadUrl(params: {
  fileName: string;
  mime: string;
  size: number;
}) {
  if (!ALLOWED_AVATAR_MIME.includes(params.mime)) {
    return { ok: false as const, errors: { _form: ["Tipo de arquivo não permitido."] } };
  }
  if (params.size > MAX_AVATAR_BYTES) {
    return { ok: false as const, errors: { _form: ["Arquivo maior que 2 MB."] } };
  }

  const { supabase, user } = await requireUser();
  const result = await profilesService.createAvatarUploadUrl(supabase, {
    userId: user.id,
    fileName: params.fileName,
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };
  return { ok: true as const, data: result.data };
}

export async function confirmAvatarUpload(path: string) {
  const { supabase, user } = await requireUser();
  const result = await profilesService.confirmAvatarUpload(supabase, { userId: user.id, path });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: result.data };
}

export async function updateOrganization(input: unknown) {
  const parsed = organizationFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await organizationsService.updateOrganization(supabase, {
    orgId,
    name: parsed.data.name,
    logoUrl: parsed.data.logoUrl,
    timezone: parsed.data.timezone,
    currency: parsed.data.currency.toUpperCase(),
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: null };
}

export async function inviteMember(input: unknown) {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await teamService.inviteMember(supabase, {
    orgId,
    email: parsed.data.email,
    role: parsed.data.role,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: null };
}

export async function removeMember(membershipId: string) {
  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await teamService.removeMember(supabase, { orgId, membershipId });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: null };
}

export async function updateMemberRole(membershipId: string, role: string) {
  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) {
    return { ok: false as const, errors: { _form: ["Papel inválido."] } };
  }

  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await teamService.updateMemberRole(supabase, {
    orgId,
    membershipId,
    role: parsedRole.data,
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  return { ok: true as const, data: null };
}

export async function createPipelineStage(pipelineId: string, input: unknown) {
  const parsed = stageFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const stages = await dealsService.listStages(supabase, orgId, pipelineId);
  const position = generateKeyBetween(stages.at(-1)?.position ?? null, null);

  const created = await dealsService.createStage(supabase, {
    orgId,
    pipelineId,
    name: parsed.data.name,
    color: parsed.data.color,
    position,
  });
  if (!created.ok) return { ok: false as const, errors: { _form: [created.error] } };

  const wipLimit = parsed.data.wipLimit === "" ? null : Number(parsed.data.wipLimit);
  if (wipLimit !== null || parsed.data.isWon || parsed.data.isLost) {
    const updated = await dealsService.updateStage(supabase, {
      orgId,
      stageId: created.data.id,
      wipLimit,
      isWon: parsed.data.isWon,
      isLost: parsed.data.isLost,
    });
    if (!updated.ok) return { ok: false as const, errors: { _form: [updated.error] } };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/propostas");
  return { ok: true as const, data: created.data };
}

export async function updatePipelineStage(stageId: string, input: unknown) {
  const parsed = stageFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await dealsService.updateStage(supabase, {
    orgId,
    stageId,
    name: parsed.data.name,
    color: parsed.data.color,
    wipLimit: parsed.data.wipLimit === "" ? null : Number(parsed.data.wipLimit),
    isWon: parsed.data.isWon,
    isLost: parsed.data.isLost,
  });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

export async function deletePipelineStage(stageId: string) {
  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const result = await dealsService.deleteStage(supabase, { orgId, stageId });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

/**
 * Reordena uma coluna um passo para trás/frente. Sem drag-and-drop aqui
 * (isso já existe no board — item 11); botões de mover bastam para o editor
 * de Configurações e evitam duplicar a máquina de dnd-kit numa segunda tela.
 */
export async function movePipelineStage(
  pipelineId: string,
  stageId: string,
  direction: "up" | "down",
) {
  const { supabase, orgId } = await requireRole(["owner", "admin"]);
  const stages = await dealsService.listStages(supabase, orgId, pipelineId);
  const index = stages.findIndex((s) => s.id === stageId);
  if (index === -1) return { ok: false as const, errors: { _form: ["Coluna não encontrada."] } };

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= stages.length) {
    return { ok: true as const, data: null };
  }

  const others = stages.filter((s) => s.id !== stageId);
  const insertAt = direction === "up" ? targetIndex : targetIndex - 1;
  const prev = others[insertAt - 1]?.position ?? null;
  const next = others[insertAt]?.position ?? null;
  const position = generateKeyBetween(prev, next);

  const result = await dealsService.moveStage(supabase, { orgId, stageId, position });
  if (!result.ok) return { ok: false as const, errors: { _form: [result.error] } };

  revalidatePath("/configuracoes");
  revalidatePath("/propostas");
  return { ok: true as const, data: null };
}

export async function getDefaultPipelineId() {
  const { supabase, orgId } = await requireOrg();
  return dealsService.getDefaultPipelineId(supabase, orgId);
}
