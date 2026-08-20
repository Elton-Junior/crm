import "server-only";

import { notFound } from "next/navigation";

import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";
import * as projectsService from "@/server/projects";

import { projectListParamsSchema } from "./schema";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getProjectsList(rawParams: RawSearchParams) {
  const params = projectListParamsSchema.parse({
    q: first(rawParams.q),
    status: first(rawParams.status),
    clientId: first(rawParams.clientId),
  });

  const { supabase, orgId } = await requireOrg();

  const [projects, members] = await Promise.all([
    projectsService.list(supabase, orgId, {
      search: params.q,
      status: params.status,
      clientId: params.clientId,
    }),
    clientsService.listMembers(supabase, orgId),
  ]);

  return {
    projects,
    members,
    params,
    hasFilters: Boolean(params.q || params.status || params.clientId),
  };
}

export async function getProjectDetail(projectId: string) {
  const { supabase, orgId } = await requireOrg();

  const [project, members] = await Promise.all([
    projectsService.getById(supabase, orgId, projectId),
    clientsService.listMembers(supabase, orgId),
  ]);

  if (!project) notFound();

  return { project, members };
}
