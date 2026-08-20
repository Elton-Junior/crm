"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/auth";
import * as projectsService from "@/server/projects";

import { projectFormSchema } from "./schema";

function toProjectInput(data: {
  name: string;
  description: string;
  color: string;
  status: projectsService.ProjectInput["status"];
  clientId: string;
  ownerId: string;
  startsOn: string;
  dueOn: string;
  memberIds: string[];
}): projectsService.ProjectInput {
  return data;
}

export async function createProject(input: unknown) {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await projectsService.create(supabase, {
    orgId,
    actorId: user.id,
    input: toProjectInput(parsed.data),
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/projetos");
  return { ok: true as const, data: result.data };
}

export async function updateProject(projectId: string, input: unknown) {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, orgId } = await requireOrg();
  const result = await projectsService.update(supabase, {
    orgId,
    projectId,
    input: toProjectInput(parsed.data),
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
  return { ok: true as const, data: null };
}

export async function getProject(projectId: string) {
  const { supabase, orgId } = await requireOrg();
  const project = await projectsService.getById(supabase, orgId, projectId);
  if (!project) {
    return { ok: false as const, errors: { _form: ["Projeto não encontrado."] } };
  }
  return { ok: true as const, data: project };
}

/** "Criar projeto a partir desta proposta" (§4.4, item 30) — chamado a partir do DealDetailDialog. */
export async function createProjectFromDeal(dealId: string, name: string, clientId: string) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await projectsService.createFromDeal(supabase, {
    orgId,
    actorId: user.id,
    dealId,
    name,
    clientId: clientId || null,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/projetos");
  return { ok: true as const, data: result.data };
}

export async function deleteProject(projectId: string) {
  const { supabase, orgId } = await requireOrg();
  const result = await projectsService.softDelete(supabase, { orgId, projectId });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath("/projetos");
  return { ok: true as const, data: null };
}
